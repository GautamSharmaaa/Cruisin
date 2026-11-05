import {
  randomBytes,
  randomInt,
  randomUUID,
  createHmac,
  timingSafeEqual,
} from "node:crypto";
import type { Permission, EmployeeRole, Principal } from "@cruisin/contracts";
import { rolePermissions, permissions } from "@cruisin/contracts";
import {
  EmployeeModel,
  EmployeeSessionModel,
  EmployeeOtpModel,
} from "../models/employee.model.js";
import { OperationsAuditModel } from "../models/operations-event.model.js";
import { redis } from "../config/redis.js";
import { env } from "../config/env.js";
import { ApiError } from "../utils/api-error.js";
import { sha256 } from "../utils/generate-token.js";
import { withMongoTransaction } from "../utils/mongo-transaction.js";
import { audit, permit, type OperationsContext } from "./operations-context.js";
export const employeeSessionCookie = "cruisinEmployeeSession";
export const employeeCookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "strict" as const,
  path: "/api/v1/employee",
  maxAge: 12 * 60 * 60 * 1000,
};
const digest = (purpose: string, value: string): string =>
  createHmac("sha256", env.JWT_REFRESH_SECRET)
    .update(`employee:${purpose}:${value}`)
    .digest("hex");
export const effectivePermissions = (
  role: EmployeeRole,
  grants: readonly string[],
  denials: readonly string[],
): Permission[] =>
  [...new Set([...rolePermissions[role], ...grants])].filter(
    (p): p is Permission =>
      permissions.includes(p as Permission) && !denials.includes(p),
  );
export interface EmployeeOtpProvider {
  send(phone: string, code: string, challengeId: string): Promise<void>;
}
export class SyntheticEmployeeOtpProvider implements EmployeeOtpProvider {
  async send(
    _phone: string,
    _code: string,
    _challengeId: string,
  ): Promise<void> {
    if (env.APP_ENV !== "development")
      throw new ApiError(503, "Employee OTP delivery is not configured");
  }
}
export const employeeOtpProvider: EmployeeOtpProvider =
  new SyntheticEmployeeOtpProvider();
const anonymousAudit = async (
  action: string,
  entity: string,
  result: "success" | "failure",
  correlationId: string,
): Promise<void> => {
  await OperationsAuditModel.create({
    actor: "anonymous",
    actorKind: "anonymous",
    action,
    entity,
    result,
    summary: "Employee authentication attempt",
    correlationId,
  });
};
export const EmployeeAuthService = {
  async create(
    ctx: OperationsContext,
    input: {
      name: string;
      phone: string;
      role: EmployeeRole;
      grants: Permission[];
      denials: Permission[];
    },
  ): Promise<unknown> {
    permit(ctx, "employees.manage");
    if (ctx.actor.kind !== "admin")
      throw new ApiError(403, "Administrator required");
    if (input.grants.some((p) => !ctx.actor.permissions.includes(p)))
      throw new ApiError(403, "Cannot grant unavailable permissions");
    return withMongoTransaction(async (session) => {
      const [employee] = await EmployeeModel.create(
        [
          {
            ...input,
            employeeId: `CR-${randomUUID().slice(0, 12).toUpperCase()}`,
          },
        ],
        { session },
      );
      await audit(
        ctx,
        "employee.created",
        employee.id,
        "Employee account created",
        session,
      );
      return employee;
    });
  },
  async update(
    ctx: OperationsContext,
    id: string,
    input: {
      version: number;
      name?: string;
      phone?: string;
      role?: EmployeeRole;
      grants?: Permission[];
      denials?: Permission[];
      active?: boolean;
    },
  ): Promise<unknown> {
    permit(ctx, "employees.manage");
    if (ctx.actor.kind !== "admin")
      throw new ApiError(403, "Administrator required");
    if (input.grants?.some((p) => !ctx.actor.permissions.includes(p)))
      throw new ApiError(403, "Cannot grant unavailable permissions");
    return withMongoTransaction(async (session) => {
      const { version, ...changes } = input;
      const employee = await EmployeeModel.findOneAndUpdate(
        { _id: id, version },
        { $set: changes, $inc: { version: 1, sessionVersion: 1 } },
        { new: true, session },
      );
      if (!employee)
        throw new ApiError(409, "Employee changed; reload before saving");
      await audit(
        ctx,
        "employee.permissions_changed",
        id,
        "Account updated and existing sessions revoked",
        session,
      );
      return employee;
    });
  },
  async requestOtp(
    phone: string,
    correlationId: string,
  ): Promise<{
    challengeId: string;
    expiresIn: number;
    developmentCode?: string;
  }> {
    const phoneHash = digest("phone", phone);
    const cooldown = await redis.setIfAbsent(
      `employee:otp:cooldown:${phoneHash}`,
      "1",
      60,
    );
    if (!cooldown)
      throw new ApiError(429, "Please wait before requesting another code");
    const rate = await redis.incrementWithExpiry(
      `employee:otp:rate:${phoneHash}`,
      900,
    );
    if (rate.totalHits > 5)
      throw new ApiError(429, "Too many authentication attempts");
    const employee = await EmployeeModel.findOne({ phone, active: true });
    const challengeId = randomUUID();
    const code = String(randomInt(100000, 1000000));
    await EmployeeOtpModel.create({
      challengeId,
      phoneHash,
      employee: employee?._id,
      sessionVersion: employee?.sessionVersion ?? 0,
      codeHash: digest("otp", `${challengeId}:${code}`),
      expiresAt: new Date(Date.now() + 300000),
    });
    if (employee) await employeeOtpProvider.send(phone, code, challengeId);
    await anonymousAudit(
      "employee.otp_requested",
      challengeId,
      "success",
      correlationId,
    );
    return {
      challengeId,
      expiresIn: 300,
      ...(env.APP_ENV === "development" ? { developmentCode: code } : {}),
    };
  },
  async verifyOtp(
    challengeId: string,
    code: string,
    device: string,
    correlationId: string,
  ): Promise<{ token: string; csrf: string; employee: unknown }> {
    const challenge = await EmployeeOtpModel.findOneAndUpdate(
      {
        challengeId,
        usedAt: { $exists: false },
        expiresAt: { $gt: new Date() },
        attempts: { $lt: 5 },
      },
      { $inc: { attempts: 1 } },
      { new: true },
    ).select("+codeHash");
    const expected = digest("otp", `${challengeId}:${code}`);
    if (
      !challenge ||
      !timingSafeEqual(
        Buffer.from(challenge.codeHash),
        Buffer.from(expected),
      ) ||
      !challenge.employee
    ) {
      await anonymousAudit(
        "employee.login_failed",
        challengeId,
        "failure",
        correlationId,
      );
      throw new ApiError(401, "Code invalid or expired");
    }
    const token = randomBytes(48).toString("base64url");
    const csrf = randomBytes(32).toString("base64url");
    return withMongoTransaction(async (session) => {
      const used = await EmployeeOtpModel.findOneAndUpdate(
        {
          _id: challenge._id,
          attempts: challenge.attempts,
          usedAt: { $exists: false },
          expiresAt: { $gt: new Date() },
        },
        { $set: { usedAt: new Date() } },
        { new: true, session },
      );
      if (!used) throw new ApiError(401, "Code invalid or expired");
      const employee = await EmployeeModel.findOne({
        _id: challenge.employee,
        active: true,
      }).session(session ?? null);
      if (
        !employee ||
        employee.sessionVersion !== challenge.sessionVersion ||
        digest("phone", employee.phone) !== challenge.phoneHash
      )
        throw new ApiError(401, "Code invalid or expired");
      await EmployeeSessionModel.create(
        [
          {
            employee: employee._id,
            tokenHash: sha256(token),
            csrfHash: sha256(csrf),
            sessionVersion: employee.sessionVersion,
            expiresAt: new Date(Date.now() + employeeCookieOptions.maxAge),
            device: device.slice(0, 250),
          },
        ],
        { session },
      );
      const ctx: OperationsContext = {
        actor: {
          id: employee.id,
          kind: "employee",
          name: employee.name,
          permissions: effectivePermissions(
            employee.role as EmployeeRole,
            employee.grants,
            employee.denials,
          ),
        },
        correlationId,
      };
      await audit(
        ctx,
        "employee.login",
        employee.id,
        "Security login; not attendance",
        session,
      );
      return { token, csrf, employee };
    });
  },
  async authenticate(
    token: string,
  ): Promise<{ principal: Principal; sessionId: string; csrfHash: string }> {
    if (!token) throw new ApiError(401, "Employee sign-in required");
    const session = await EmployeeSessionModel.findOne({
      tokenHash: sha256(token),
      revokedAt: { $exists: false },
      expiresAt: { $gt: new Date() },
    }).select("+csrfHash");
    if (!session) throw new ApiError(401, "Employee sign-in required");
    const employee = await EmployeeModel.findOne({
      _id: session.employee,
      active: true,
      sessionVersion: session.sessionVersion,
    });
    if (!employee) throw new ApiError(401, "Employee session revoked");
    return {
      principal: {
        id: employee.id,
        kind: "employee",
        name: employee.name,
        permissions: effectivePermissions(
          employee.role as EmployeeRole,
          employee.grants,
          employee.denials,
        ),
      },
      sessionId: session.id,
      csrfHash: session.csrfHash,
    };
  },
  async revoke(
    ctx: OperationsContext,
    employeeId: string,
    sessionId?: string,
  ): Promise<void> {
    if (employeeId !== ctx.actor.id) permit(ctx, "employees.manage");
    await withMongoTransaction(async (session) => {
      if (sessionId)
        await EmployeeSessionModel.updateOne(
          { _id: sessionId, employee: employeeId },
          { $set: { revokedAt: new Date() } },
          { session },
        );
      else
        await EmployeeModel.updateOne(
          { _id: employeeId },
          { $inc: { sessionVersion: 1 } },
          { session },
        );
      await audit(
        ctx,
        sessionId ? "employee.logout" : "employee.sessions_revoked",
        employeeId,
        "Security session revoked",
        session,
      );
      return true;
    });
  },
};
