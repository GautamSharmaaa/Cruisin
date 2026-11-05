import type { RequestHandler } from "express";
import {
  permissions,
  rolePermissions,
  type Permission,
} from "@cruisin/contracts";
import { UserModel } from "../models/user.model.js";
import {
  EmployeeAuthService,
  employeeSessionCookie,
} from "../services/employee-auth.service.js";
import { sha256 } from "../utils/generate-token.js";
import { ApiError } from "../utils/api-error.js";
import { asyncHandler } from "../utils/async-handler.js";
import { employeeBrowserOrigins } from "../config/origins.js";
export const requireEmployee = asyncHandler(async (req, _res, next) => {
  const result = await EmployeeAuthService.authenticate(
    typeof req.cookies?.[employeeSessionCookie] === "string"
      ? req.cookies[employeeSessionCookie]
      : "",
  );
  if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    if (!employeeBrowserOrigins.includes(req.headers.origin ?? ""))
      throw new ApiError(403, "Employee request origin required");
    const csrf = req.headers["x-employee-csrf"];
    if (typeof csrf !== "string" || sha256(csrf) !== result.csrfHash)
      throw new ApiError(403, "Session verification failed");
  }
  req.operationsPrincipal = result.principal;
  req.employeeSessionId = result.sessionId;
  next();
});
export const requireOperationsAdmin = asyncHandler(async (req, _res, next) => {
  if (!req.user) throw new ApiError(401, "Administrator sign-in required");
  const user = await UserModel.findOne({
    _id: req.user.userId,
    isActive: true,
    status: "active",
    role: { $in: ["superadmin", "admin", "manager", "viewer"] },
  });
  if (!user) throw new ApiError(403, "Active administrator required");
  const grants: Permission[] =
    user.role === "superadmin" || user.role === "admin"
      ? [...permissions]
      : user.role === "manager"
        ? [...rolePermissions.operations_manager]
        : ["tasks.view", "orders.view", "inventory.view", "sop.view"];
  req.operationsPrincipal = {
    id: user.id,
    kind: "admin",
    name: user.name,
    permissions: grants,
  };
  next();
});
export const requireOperationsPermission =
  (permission: Permission): RequestHandler =>
  (req, _res, next): void => {
    if (!req.operationsPrincipal?.permissions.includes(permission)) {
      next(new ApiError(403, "Insufficient operational permission"));
      return;
    }
    next();
  };
