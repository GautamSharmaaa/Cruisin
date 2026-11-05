import { EmployeeModel } from "../../models/employee.model.js";
import { withMongoTransaction } from "../../utils/mongo-transaction.js";
import { notify } from "../../services/operations-context.js";
import { TrackedExchangeService } from "../../services/tracked-exchange.service.js";
import { PhysicalUnitsService } from "../../services/physical-units.service.js";
import {
  FulfillmentService,
  measurementSchema,
  courierPolicySchema,
} from "../../services/fulfillment.service.js";
import * as unitValidators from "../../validators/physical-units.validator.js";
import { UnitLabelConfigModel } from "../../models/physical-unit.model.js";
import { OperationsExceptionModel } from "../../models/physical-unit.model.js";
import { permit, audit } from "../../services/operations-context.js";
import {
  Router,
  type Request,
  type Response,
  type RequestHandler,
} from "express";
import { randomUUID } from "node:crypto";
import rateLimit from "express-rate-limit";
import multer from "multer";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth.middleware.js";
import {
  requireOperationsAdmin,
  requireEmployee,
} from "../../middleware/employee.middleware.js";
import { requireBrowserOrigin } from "../../middleware/browser-origin.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { ApiResponse } from "../../utils/api-response.js";
import { ApiError } from "../../utils/api-error.js";
import { employeeBrowserOrigins } from "../../config/origins.js";
import {
  EmployeeAuthService,
  employeeCookieOptions,
  employeeSessionCookie,
} from "../../services/employee-auth.service.js";
import { EmployeeTaskService } from "../../services/employee-task.service.js";
import { ApprovalService } from "../../services/approval.service.js";
import { InventoryOperationsService } from "../../services/inventory-operations.service.js";
import { SopService } from "../../services/sop.service.js";
import { OperationsQueryService } from "../../services/operations-query.service.js";
import { MediaService } from "../../services/media/media.service.js";
import { contextFrom } from "../../services/operations-context.js";
import * as v from "../../validators/operations.validator.js";
export const operationsAdminRouter = Router();
export const employeeRouter = Router();
export const publicMediaRouter = Router();
const run = (
  fn: (req: Request, res: Response) => Promise<unknown>,
): RequestHandler =>
  asyncHandler(async (req, res) => {
    const result = await fn(req, res);
    if (!res.headersSent)
      res.json(new ApiResponse(result ?? null, "Operation completed"));
  });
const id = (req: Request): string => String(req.params.id);
const page = (req: Request): v.OperationPage =>
  v.operationPageSchema.parse(req.query);
const employeeOrigin: RequestHandler = (req, _res, next): void => {
  if (!employeeBrowserOrigins.includes(req.headers.origin ?? "")) {
    next(new ApiError(403, "Employee request origin required"));
    return;
  }
  next();
};
const otpLimit = rateLimit({
  windowMs: 60000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
});
const correlation = (): string => randomUUID();
operationsAdminRouter.use(
  requireAuth,
  requireOperationsAdmin,
  requireBrowserOrigin,
);
operationsAdminRouter.get(
  "/employees",
  validate({ query: v.operationPageSchema }),
  run((req) => OperationsQueryService.employees(contextFrom(req), page(req))),
);
operationsAdminRouter.post(
  "/employees",
  validate({ body: v.employeeCreateSchema }),
  run((req) =>
    EmployeeAuthService.create(
      contextFrom(req),
      v.employeeCreateSchema.parse(req.body),
    ),
  ),
);
operationsAdminRouter.patch(
  "/employees/:id",
  validate({ params: v.operationIdSchema, body: v.employeeUpdateSchema }),
  run((req) =>
    EmployeeAuthService.update(
      contextFrom(req),
      id(req),
      v.employeeUpdateSchema.parse(req.body),
    ),
  ),
);
operationsAdminRouter.post(
  "/employees/:id/revoke",
  validate({ params: v.operationIdSchema }),
  run((req) => EmployeeAuthService.revoke(contextFrom(req), id(req))),
);
operationsAdminRouter.get(
  "/staff-options",
  run((req) => OperationsQueryService.staffOptions(contextFrom(req))),
);
operationsAdminRouter.get(
  "/permissions",
  run(async (req) => contextFrom(req).actor),
);
employeeRouter.post(
  "/auth/request-otp",
  employeeOrigin,
  otpLimit,
  validate({ body: v.employeeOtpRequestSchema }),
  run((req) =>
    EmployeeAuthService.requestOtp(
      v.employeeOtpRequestSchema.parse(req.body).phone,
      correlation(),
    ),
  ),
);
employeeRouter.post(
  "/auth/verify-otp",
  employeeOrigin,
  otpLimit,
  validate({ body: v.employeeOtpVerifySchema }),
  run(async (req, res) => {
    const body = v.employeeOtpVerifySchema.parse(req.body);
    const result = await EmployeeAuthService.verifyOtp(
      body.challengeId,
      body.code,
      req.headers["user-agent"] ?? "",
      correlation(),
    );
    res.cookie(employeeSessionCookie, result.token, employeeCookieOptions);
    return { employee: result.employee, csrf: result.csrf };
  }),
);
employeeRouter.use(requireEmployee);
employeeRouter.get(
  "/session",
  run((req) =>
    OperationsQueryService.me(contextFrom(req), req.employeeSessionId ?? ""),
  ),
);
employeeRouter.get(
  "/sessions",
  run((req) => OperationsQueryService.sessions(contextFrom(req))),
);
employeeRouter.post(
  "/logout",
  run(async (req, res) => {
    await EmployeeAuthService.revoke(
      contextFrom(req),
      contextFrom(req).actor.id,
      req.employeeSessionId,
    );
    res.clearCookie(employeeSessionCookie, {
      ...employeeCookieOptions,
      maxAge: undefined,
    });
    return null;
  }),
);
employeeRouter.post(
  "/logout-all",
  run(async (req, res) => {
    await EmployeeAuthService.revoke(
      contextFrom(req),
      contextFrom(req).actor.id,
    );
    res.clearCookie(employeeSessionCookie, {
      ...employeeCookieOptions,
      maxAge: undefined,
    });
    return null;
  }),
);
employeeRouter.delete(
  "/sessions/:id",
  validate({ params: v.operationIdSchema }),
  run((req) =>
    EmployeeAuthService.revoke(
      contextFrom(req),
      contextFrom(req).actor.id,
      id(req),
    ),
  ),
);
const profileSchema = z
  .object({
    timezone: z
      .string()
      .max(80)
      .refine((value) => {
        try {
          new Intl.DateTimeFormat("en", { timeZone: value });
          return true;
        } catch {
          return false;
        }
      }, "Invalid timezone"),
  })
  .strict();
employeeRouter.patch(
  "/profile",
  validate({ body: profileSchema }),
  run((req) =>
    OperationsQueryService.profile(
      contextFrom(req),
      profileSchema.parse(req.body).timezone,
    ),
  ),
);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 16 * 1024 * 1024, files: 1 },
});
const uploadFields = z
  .object({ visibility: z.enum(["public", "private"]).default("private") })
  .strict();
const content = async (
  req: Request,
  res: Response,
  publicOnly = false,
): Promise<void> => {
  const result = await MediaService.content(
    id(req),
    publicOnly ? undefined : contextFrom(req),
  );
  res
    .set({
      "Content-Type": result.contentType,
      "Cache-Control":
        result.visibility === "private"
          ? "private, no-store"
          : "public, max-age=3600",
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition":
        result.contentType.startsWith("image/") ||
        result.contentType.startsWith("video/")
          ? "inline"
          : "attachment",
    })
    .send(result.body);
};
for (const router of [operationsAdminRouter, employeeRouter]) {
  router.post(
    "/exceptions/:id/assign",
    validate({
      params: v.operationIdSchema,
      body: z
        .object({
          owner: z.string().regex(/^[a-f\d]{24}$/i),
          version: z.number().int().min(0),
        })
        .strict(),
    }),
    run(async (req) => {
      const ctx = contextFrom(req);
      permit(ctx, "tasks.assign");
      return withMongoTransaction(async (session) => {
        if (
          !(await EmployeeModel.exists({
            _id: req.body.owner,
            active: true,
          }).session(session ?? null))
        )
          throw new ApiError(400, "Active exception owner required");
        const e = await OperationsExceptionModel.findOneAndUpdate(
          {
            _id: id(req),
            version: req.body.version,
            status: { $ne: "RESOLVED" },
          },
          {
            $set: { owner: req.body.owner, status: "ASSIGNED" },
            $inc: { version: 1 },
          },
          { new: true, session },
        );
        if (!e) throw new ApiError(409, "Exception changed");
        await audit(
          ctx,
          "exception.assigned",
          e.id,
          "Exception owner assigned",
          session,
        );
        await notify(
          [req.body.owner],
          "exception.assigned",
          e.id,
          e.version,
          "Operational exception assigned",
          session,
        );
        return e;
      });
    }),
  );

  router.post(
    "/units/:code/request-disposition",
    validate({ body: unitValidators.unitDispositionSchema }),
    run((req) =>
      PhysicalUnitsService.requestDisposition(
        contextFrom(req),
        String(req.params.code),
        unitValidators.unitDispositionSchema.parse(req.body),
      ),
    ),
  );
  router.get(
    "/exchange-options",
    run((req) => TrackedExchangeService.options(contextFrom(req))),
  );
  router.post(
    "/exchanges/:id/replacement",
    validate({
      params: v.operationIdSchema,
      body: z.object({ order: z.string().regex(/^[a-f\d]{24}$/i) }).strict(),
    }),
    run((req) =>
      TrackedExchangeService.link(contextFrom(req), id(req), req.body.order),
    ),
  );

  router.get(
    "/summary",
    run((req) => OperationsQueryService.summary(contextFrom(req))),
  );
  router.post(
    "/sops/:id/request-publication",
    validate({ params: v.operationIdSchema, body: v.revisionSchema }),
    run((req) =>
      SopService.requestPublication(
        contextFrom(req),
        id(req),
        req.body.version,
      ),
    ),
  );
  router.post(
    "/units/:code/request-rework",
    validate({
      body: z
        .object({
          version: z.number().int().min(0),
          reason: z.string().min(5).max(2000),
        })
        .strict(),
    }),
    run((req) =>
      PhysicalUnitsService.requestRework(
        contextFrom(req),
        String(req.params.code),
        req.body,
      ),
    ),
  );

  router.get(
    "/unit-label-config",
    run(async (req) => {
      permit(contextFrom(req), "units.generate");
      return UnitLabelConfigModel.findOne({ key: "default" })
        .select("widthMm heightMm marginMm dpi orientation copies -_id")
        .lean();
    }),
  );
  router.post(
    "/unit-label-config",
    validate({
      body: z
        .object({
          widthMm: z.number().min(20).max(210),
          heightMm: z.number().min(20).max(297),
          marginMm: z.number().min(0).max(10),
          dpi: z.number().int().min(100).max(1200),
          orientation: z.enum(["portrait", "landscape"]),
          copies: z.number().int().min(1).max(100),
        })
        .strict(),
    }),
    run(async (req) => {
      const ctx = contextFrom(req);
      permit(ctx, "units.generate");
      if (ctx.actor.kind !== "admin")
        throw new ApiError(403, "Administrator required");
      return UnitLabelConfigModel.findOneAndUpdate(
        { key: "default" },
        { $set: req.body },
        { upsert: true, new: true },
      );
    }),
  );

  router.get(
    "/units",
    validate({ query: v.operationPageSchema }),
    run((req) => PhysicalUnitsService.list(contextFrom(req), page(req))),
  );
  router.post(
    "/units/receive",
    validate({ body: unitValidators.receiveUnitsSchema }),
    run((req) =>
      PhysicalUnitsService.receive(
        contextFrom(req),
        unitValidators.receiveUnitsSchema.parse(req.body),
      ),
    ),
  );
  router.get(
    "/units/reconciliation",
    run((req) => PhysicalUnitsService.reconcile(contextFrom(req))),
  );
  router.get(
    "/units/:code",
    run((req) =>
      PhysicalUnitsService.detail(contextFrom(req), String(req.params.code)),
    ),
  );
  router.get(
    "/units/:code/label",
    run((req) =>
      PhysicalUnitsService.label(contextFrom(req), String(req.params.code)),
    ),
  );
  router.post(
    "/units/:code/qc",
    validate({ body: unitValidators.unitQcSchema }),
    run((req) =>
      PhysicalUnitsService.qc(
        contextFrom(req),
        String(req.params.code),
        unitValidators.unitQcSchema.parse(req.body),
      ),
    ),
  );
  router.post(
    "/units/:code/package",
    validate({ body: unitValidators.unitPackagingSchema }),
    run((req) =>
      PhysicalUnitsService.package(
        contextFrom(req),
        String(req.params.code),
        unitValidators.unitPackagingSchema.parse(req.body),
      ),
    ),
  );
  router.post(
    "/units/:code/pick",
    validate({ body: unitValidators.unitPickSchema }),
    run((req) =>
      PhysicalUnitsService.allocate(
        contextFrom(req),
        String(req.params.code),
        req.body.order,
      ),
    ),
  );
  router.post(
    "/units/:code/return",
    validate({ body: unitValidators.unitReturnSchema }),
    run((req) =>
      PhysicalUnitsService.returnUnit(
        contextFrom(req),
        String(req.params.code),
        unitValidators.unitReturnSchema.parse(req.body),
      ),
    ),
  );
  router.get(
    "/fulfillment",
    validate({
      query: v.operationPageSchema.extend({
        timezone: z.string().max(100).optional(),
        from: z.iso.datetime().optional(),
        to: z.iso.datetime().optional(),
      }),
    }),
    run((req) =>
      FulfillmentService.orders(contextFrom(req), page(req), {
        timezone:
          typeof req.query.timezone === "string"
            ? req.query.timezone
            : undefined,
        from: typeof req.query.from === "string" ? req.query.from : undefined,
        to: typeof req.query.to === "string" ? req.query.to : undefined,
      }),
    ),
  );
  router.get(
    "/fulfillment/:id",
    validate({ params: v.operationIdSchema }),
    run((req) => FulfillmentService.detail(contextFrom(req), id(req))),
  );
  router.post(
    "/fulfillment/:id/measure",
    validate({ params: v.operationIdSchema, body: measurementSchema }),
    run((req) =>
      FulfillmentService.measure(contextFrom(req), id(req), req.body),
    ),
  );
  router.post(
    "/fulfillment/:id/shipping",
    validate({
      params: v.operationIdSchema,
      body: z
        .object({
          action: z.enum(["prepare", "awb", "label", "pickup", "manifest"]),
        })
        .strict(),
    }),
    run((req) =>
      FulfillmentService.shipping(contextFrom(req), id(req), req.body.action),
    ),
  );
  router.get(
    "/fulfillment/:id/label",
    validate({ params: v.operationIdSchema }),
    run((req) => FulfillmentService.label(contextFrom(req), id(req))),
  );
  router.post(
    "/fulfillment/:id/ready",
    validate({
      params: v.operationIdSchema,
      body: z
        .object({
          version: z.number().int().min(0),
          shipment: z.string().regex(/^[a-f\d]{24}$/i),
          awb: z.string().min(1).max(100),
          labelOperationId: z.string().min(1).max(200),
        })
        .strict(),
    }),
    run((req) => FulfillmentService.ready(contextFrom(req), id(req), req.body)),
  );
  router.post(
    "/fulfillment/:id/handover",
    validate({ params: v.operationIdSchema, body: v.revisionSchema }),
    run((req) =>
      FulfillmentService.handover(contextFrom(req), id(req), req.body.version),
    ),
  );
  router.get(
    "/courier-policies",
    run((req) => FulfillmentService.policies(contextFrom(req))),
  );
  router.post(
    "/courier-policies",
    validate({ body: courierPolicySchema }),
    run((req) =>
      FulfillmentService.policy(
        contextFrom(req),
        courierPolicySchema.parse(req.body),
      ),
    ),
  );
  router.post(
    "/exceptions",
    validate({ body: unitValidators.exceptionSchema }),
    run((req) =>
      PhysicalUnitsService.exception(
        contextFrom(req),
        unitValidators.exceptionSchema.parse(req.body),
      ),
    ),
  );
  router.get(
    "/exceptions",
    validate({ query: v.operationPageSchema }),
    run(async (req) => {
      const ctx = contextFrom(req);
      permit(ctx, "tasks.view");
      const filter =
        ctx.actor.kind === "admin"
          ? {}
          : { $or: [{ reporter: ctx.actor.id }, { owner: ctx.actor.id }] };
      const p = page(req);
      const [items, total] = await Promise.all([
        OperationsExceptionModel.find(filter)
          .sort({ createdAt: -1 })
          .skip((p.page - 1) * p.limit)
          .limit(p.limit)
          .lean(),
        OperationsExceptionModel.countDocuments(filter),
      ]);
      return { items, total, page: p.page, pages: Math.ceil(total / p.limit) };
    }),
  );
  router.post(
    "/exceptions/:id/resolve",
    validate({
      params: v.operationIdSchema,
      body: z
        .object({
          version: z.number().int().min(0),
          resolution: z.string().min(5).max(2000),
          owner: z
            .string()
            .regex(/^[a-f\d]{24}$/i)
            .optional(),
        })
        .strict(),
    }),
    run(async (req) => {
      const ctx = contextFrom(req);
      permit(ctx, "tasks.approve");
      const result = await OperationsExceptionModel.findOneAndUpdate(
        {
          _id: id(req),
          version: req.body.version,
          status: { $ne: "RESOLVED" },
        },
        {
          $set: {
            status: "RESOLVED",
            resolution: req.body.resolution,
            resolvedBy: ctx.actor.id,
            ...(req.body.owner ? { owner: req.body.owner } : {}),
          },
          $inc: { version: 1 },
        },
        { new: true },
      );
      if (!result) throw new ApiError(409, "Exception changed");
      await audit(ctx, "exception.resolved", result.id, req.body.resolution);
      return result;
    }),
  );

  router.get(
    "/product-options",
    run((req) => OperationsQueryService.productOptions(contextFrom(req))),
  );
  router.get(
    "/order-options",
    run((req) => OperationsQueryService.orderOptions(contextFrom(req))),
  );
  router.get(
    "/tasks",
    validate({ query: v.operationPageSchema }),
    run((req) => EmployeeTaskService.list(contextFrom(req), page(req))),
  );
  router.post(
    "/tasks",
    validate({ body: v.taskCreateSchema }),
    run((req) =>
      EmployeeTaskService.create(
        contextFrom(req),
        v.taskCreateSchema.parse(req.body),
      ),
    ),
  );
  router.get(
    "/tasks/:id",
    validate({ params: v.operationIdSchema }),
    run((req) => EmployeeTaskService.detail(contextFrom(req), id(req))),
  );
  router.patch(
    "/tasks/:id",
    validate({ params: v.operationIdSchema, body: v.taskUpdateSchema }),
    run((req) =>
      EmployeeTaskService.update(
        contextFrom(req),
        id(req),
        v.taskUpdateSchema.parse(req.body),
      ),
    ),
  );
  router.post(
    "/tasks/:id/transition",
    validate({ params: v.operationIdSchema, body: v.taskTransitionSchema }),
    run((req) =>
      EmployeeTaskService.transition(
        contextFrom(req),
        id(req),
        v.taskTransitionSchema.parse(req.body),
      ),
    ),
  );
  router.post(
    "/approvals",
    validate({ body: v.generalApprovalSchema }),
    run((req) =>
      ApprovalService.request(
        contextFrom(req),
        v.generalApprovalSchema.parse(req.body),
      ),
    ),
  );
  router.get(
    "/approvals",
    validate({ query: v.operationPageSchema }),
    run((req) => ApprovalService.list(contextFrom(req), page(req))),
  );
  router.post(
    "/approvals/:id/review",
    validate({ params: v.operationIdSchema, body: v.approvalReviewSchema }),
    run((req) =>
      ApprovalService.review(
        contextFrom(req),
        id(req),
        v.approvalReviewSchema.parse(req.body),
      ),
    ),
  );
  router.get(
    "/inventory",
    validate({ query: v.operationPageSchema }),
    run((req) => InventoryOperationsService.list(contextFrom(req), page(req))),
  );
  router.post(
    "/inventory/adjustments",
    validate({ body: v.adjustmentSchema }),
    run((req) =>
      InventoryOperationsService.requestAdjustment(
        contextFrom(req),
        v.adjustmentSchema.parse(req.body),
      ),
    ),
  );
  router.post(
    "/inventory/scan",
    validate({ body: v.scanSchema }),
    run((req) =>
      InventoryOperationsService.scan(
        contextFrom(req),
        v.scanSchema.parse(req.body).code,
      ),
    ),
  );
  router.post(
    "/inventory/labels",
    validate({ body: v.labelSchema }),
    run((req) => {
      const b = v.labelSchema.parse(req.body);
      return InventoryOperationsService.label(
        contextFrom(req),
        b.product,
        b.variant,
      );
    }),
  );
  router.delete(
    "/inventory/labels/:id",
    validate({ params: v.operationIdSchema }),
    run((req) =>
      InventoryOperationsService.retireLabel(contextFrom(req), id(req)),
    ),
  );
  router.get(
    "/inventory/:id/returns",
    validate({ params: v.operationIdSchema }),
    run((req) =>
      OperationsQueryService.inspectedReturns(contextFrom(req), id(req)),
    ),
  );
  router.get(
    "/inventory/:id/history",
    validate({ params: v.operationIdSchema, query: v.operationPageSchema }),
    run((req) =>
      OperationsQueryService.ledger(contextFrom(req), id(req), page(req)),
    ),
  );
  router.get(
    "/orders/:id",
    validate({ params: v.operationIdSchema }),
    run((req) => InventoryOperationsService.order(contextFrom(req), id(req))),
  );
  router.post(
    "/orders/:id/scan",
    validate({ params: v.operationIdSchema, body: v.packingScanSchema }),
    run((req) =>
      InventoryOperationsService.pack(
        contextFrom(req),
        id(req),
        v.packingScanSchema.parse(req.body),
      ),
    ),
  );
  router.post(
    "/orders/:id/complete-packing",
    validate({ params: v.operationIdSchema, body: v.packingCompleteSchema }),
    run((req) =>
      InventoryOperationsService.completePacking(
        contextFrom(req),
        id(req),
        v.packingCompleteSchema.parse(req.body),
      ),
    ),
  );
  router.get(
    "/sops",
    validate({ query: v.operationPageSchema }),
    run((req) => SopService.list(contextFrom(req), page(req))),
  );
  router.post(
    "/sops",
    validate({ body: v.sopCreateSchema }),
    run((req) =>
      SopService.create(contextFrom(req), v.sopCreateSchema.parse(req.body)),
    ),
  );
  router.get(
    "/sops/:id",
    validate({ params: v.operationIdSchema }),
    run((req) => SopService.detail(contextFrom(req), id(req))),
  );
  router.patch(
    "/sops/:id",
    validate({ params: v.operationIdSchema, body: v.sopUpdateSchema }),
    run((req) =>
      SopService.update(
        contextFrom(req),
        id(req),
        v.sopUpdateSchema.parse(req.body),
      ),
    ),
  );
  router.post(
    "/sops/:id/publish",
    validate({ params: v.operationIdSchema, body: v.revisionSchema }),
    run((req) =>
      SopService.publish(
        contextFrom(req),
        id(req),
        v.revisionSchema.parse(req.body).version,
      ),
    ),
  );
  router.post(
    "/sops/:id/archive",
    validate({ params: v.operationIdSchema, body: v.revisionSchema }),
    run((req) =>
      SopService.archive(
        contextFrom(req),
        id(req),
        v.revisionSchema.parse(req.body).version,
      ),
    ),
  );
  router.post(
    "/sops/:id/acknowledge",
    validate({ params: v.operationIdSchema, body: v.revisionSchema }),
    run((req) =>
      SopService.acknowledge(
        contextFrom(req),
        id(req),
        v.revisionSchema.parse(req.body).version,
      ),
    ),
  );
  router.get(
    "/sops/:id/history",
    validate({ params: v.operationIdSchema }),
    run((req) => SopService.history(contextFrom(req), id(req))),
  );
  router.post(
    "/sops/:id/suggestions",
    validate({ params: v.operationIdSchema, body: v.sopSuggestionSchema }),
    run((req) =>
      SopService.suggest(
        contextFrom(req),
        id(req),
        v.sopSuggestionSchema.parse(req.body),
      ),
    ),
  );
  router.get(
    "/activity",
    validate({ query: v.operationPageSchema }),
    run((req) => OperationsQueryService.activity(contextFrom(req), page(req))),
  );
  router.get(
    "/notifications",
    validate({ query: v.operationPageSchema }),
    run(async (req) => {
      if (contextFrom(req).actor.permissions.includes("tasks.view"))
        await EmployeeTaskService.deadlineNotifications(contextFrom(req));
      return OperationsQueryService.notifications(contextFrom(req), page(req));
    }),
  );
  router.post(
    "/notifications/:id/read",
    validate({ params: v.operationIdSchema }),
    run((req) =>
      OperationsQueryService.readNotification(contextFrom(req), id(req)),
    ),
  );
  router.get(
    "/media",
    validate({ query: v.operationPageSchema }),
    run((req) => OperationsQueryService.media(contextFrom(req), page(req))),
  );
  router.post(
    "/media",
    upload.single("file"),
    validate({ body: uploadFields }),
    run((req) => {
      if (!req.file) throw new ApiError(400, "File required");
      return MediaService.upload(contextFrom(req), {
        name: req.file.originalname,
        contentType: req.file.mimetype,
        body: req.file.buffer,
        visibility: uploadFields.parse(req.body).visibility,
      });
    }),
  );
  router.get(
    "/media/:id",
    validate({ params: v.operationIdSchema }),
    run((req) => MediaService.metadata(contextFrom(req), id(req))),
  );
  router.get(
    "/media/:id/content",
    validate({ params: v.operationIdSchema }),
    asyncHandler(async (req, res) => content(req, res)),
  );
  router.post(
    "/media/:id/access",
    validate({ params: v.operationIdSchema }),
    run((req) =>
      MediaService.signedAccess(
        contextFrom(req),
        id(req),
        req.employeeSessionId,
      ),
    ),
  );
  router.delete(
    "/media/:id",
    validate({ params: v.operationIdSchema }),
    run((req) => MediaService.remove(contextFrom(req), id(req))),
  );
}
publicMediaRouter.get(
  "/:id/content",
  validate({ params: v.operationIdSchema }),
  asyncHandler(async (req, res) => content(req, res, true)),
);
publicMediaRouter.get(
  "/:id/signed",
  validate({
    params: v.operationIdSchema,
    query: z.object({ token: z.string().min(32).max(100) }),
  }),
  asyncHandler(async (req, res) => {
    const result = await MediaService.signedContent(
      id(req),
      String(req.query.token),
    );
    res
      .set({
        "Content-Type": result.contentType,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition":
          result.contentType.startsWith("image/") ||
          result.contentType.startsWith("video/")
            ? "inline"
            : "attachment",
      })
      .send(result.body);
  }),
);

publicMediaRouter.get(
  "/:id/return-evidence",
  validate({
    params: v.operationIdSchema,
    query: z.object({
      expires: z.coerce.number().int().positive(),
      signature: z.string().regex(/^[a-f0-9]{64}$/),
    }),
  }),
  asyncHandler(async (req, res) => {
    const body = z
      .object({ expires: z.coerce.number(), signature: z.string() })
      .parse(req.query);
    const result = await MediaService.returnEvidenceContent(
      id(req),
      body.expires,
      body.signature,
    );
    res
      .set({
        "Content-Type": result.contentType,
        "Cache-Control": "private, no-store",
        "Referrer-Policy": "no-referrer",
      })
      .send(result.body);
  }),
);
