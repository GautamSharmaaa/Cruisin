import {OperationsQueryService} from './operations-query.service.js';
import { beforeAll, afterAll, describe, it, expect } from "vitest";
import mongoose, { Types } from "mongoose";
import { randomUUID } from "node:crypto";
import request from "supertest";
import {
  permissions,
  rolePermissions,
  type Principal,
} from "@cruisin/contracts";
import { createApp } from "../app.js";
import { connectRedis, redis } from "../config/redis.js";
import {
  EmployeeAuthService,
  employeeSessionCookie,
} from "./employee-auth.service.js";
import {
  EmployeeModel,
  EmployeeOtpModel,
  EmployeeSessionModel,
} from "../models/employee.model.js";
import { EmployeeTaskModel } from "../models/employee-task.model.js";
import { ApprovalRequestModel } from "../models/approval-request.model.js";
import {
  OperationsAuditModel,
  OperationsNotificationModel,
} from "../models/operations-event.model.js";
import {
  StockMovementModel,
  PackingVerificationModel,
} from "../models/stock-movement.model.js";
import {
  SopDocumentModel,
  SopVersionModel,
} from "../models/sop-document.model.js";
import {
  MediaAssetModel,
  MediaAccessGrantModel,
} from "../models/media-asset.model.js";
import { UserModel } from "../models/user.model.js";
import { ProductModel } from "../models/product.model.js";
import { CategoryModel } from "../models/category.model.js";
import { OrderModel } from "../models/order.model.js";
import { EmployeeTaskService } from "./employee-task.service.js";
import { ApprovalService } from "./approval.service.js";
import { InventoryOperationsService } from "./inventory-operations.service.js";
import { SopService } from "./sop.service.js";
import {
  MediaService,
  validateMediaFile,
  transformedMediaUrl,
} from "./media/media.service.js";
import {
  R2StorageProvider,
  LocalStorageProvider,
} from "./media/storage-provider.js";
import { MediaMigrationService } from "./media/migration.service.js";
import {
  taskCreateSchema,
  adjustmentSchema,
} from "../validators/operations.validator.js";
import { patchObject } from "../validators/patch-object.js";
import { z } from "zod";
import { generateAccessToken } from "../utils/generate-token.js";
import { withMongoTransaction } from "../utils/mongo-transaction.js";
import { reserveInventory } from "./order.service.js";
import type { OperationsContext } from "./operations-context.js";
import { mkdir, writeFile, mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
const app = createApp();
const run = randomUUID().slice(0, 8);
let seq = 0;
const phone = (): string =>
  `+919${String(Date.now()).slice(-7)}${String(++seq).padStart(3, "0")}`;
const ctx = (actor: Principal): OperationsContext => ({
  actor,
  correlationId: randomUUID(),
});
let admin: Principal,
  admin2: Principal,
  worker: Principal,
  other: Principal,
  manager: Principal;
let adminToken = "";
let workerPhone = "";
let workerCookie = "";
let workerCsrf = "";
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aB1UAAAAASUVORK5CYII=",
  "base64",
);
const page = { page: 1, limit: 100 };
const createEmployee = async (
  role:
    | "warehouse_employee"
    | "inventory_manager"
    | "readonly_employee" = "warehouse_employee",
) => {
  const number = phone();
  const result = (await EmployeeAuthService.create(ctx(admin), {
    name: `Worker ${++seq}`,
    phone: number,
    role,
    grants: [],
    denials: [],
  })) as { id: string };
  return {
    number,
    principal: {
      id: result.id,
      kind: "employee" as const,
      name: "Worker",
      permissions: [...rolePermissions[role]],
    },
  };
};
const createTask = async (
  assignees = [worker.id],
  extra: Record<string, unknown> = {},
) =>
  EmployeeTaskService.create(
    ctx(admin),
    taskCreateSchema.parse({
      title: `Task ${run} ${++seq}`,
      assignees,
      ...extra,
    }),
  ) as Promise<{ id: string; version: number; status: string }>;
const product = async (stock = 5) => {
  const category = await CategoryModel.findOneAndUpdate(
    { slug: `ops-${run}` },
    { $setOnInsert: { name: "Operations fixture", slug: `ops-${run}` } },
    { upsert: true, new: true },
  );
  const p = await ProductModel.create({
    title: "Operations Test Product",
    slug: `ops-${run}-${++seq}`,
    description: "Synthetic product for isolated tests",
    richDescription: "Synthetic fixture",
    category: category._id,
    basePrice: 100,
    images: [],
    variants: [
      {
        sku: `OPS-${run}-${seq}`.toUpperCase(),
        size: "M",
        color: "Black",
        colorHex: "#080808",
        price: 100,
        stock,
      },
    ],
    status: "published",
    visibility: "visible",
    isActive: true,
  });
  return {
    product: p.id,
    variant: String(p.variants[0]._id),
    sku: p.variants[0].sku,
    revision: 0,
    stock,
  };
};
beforeAll(async () => {
  const uri = process.env.MONGODB_URI ?? "";
  const u = new URL(uri);
  if (
    !["localhost", "127.0.0.1"].includes(u.hostname) ||
    u.pathname !== "/cruisin-sync-order-analytics-tests"
  )
    throw new Error("Operations integration refuses unsafe DB");
  await mongoose.connect(uri, { autoIndex: true });
  const hello = await mongoose.connection.db!.admin().command({ hello: 1 });
  if (!hello.setName)
    throw new Error("Real transaction tests require the isolated replica set");
  await connectRedis();
  for (const model of [
    EmployeeModel,
    EmployeeOtpModel,
    EmployeeSessionModel,
    EmployeeTaskModel,
    ApprovalRequestModel,
    OperationsAuditModel,
    OperationsNotificationModel,
    StockMovementModel,
    PackingVerificationModel,
    SopDocumentModel,
    SopVersionModel,
    MediaAssetModel,
    MediaAccessGrantModel,
  ])
    await model.init();
  const admins = await UserModel.create([
    {
      name: "Ops Admin",
      email: `ops-${run}@ops.test`,
      passwordHash: "synthetic",
      role: "superadmin",
      isActive: true,
      status: "active",
    },
    {
      name: "Ops Reviewer",
      email: `review-${run}@ops.test`,
      passwordHash: "synthetic",
      role: "admin",
      isActive: true,
      status: "active",
    },
  ]);
  admin = {
    id: admins[0].id,
    kind: "admin",
    name: admins[0].name,
    permissions: [...permissions],
  };
  admin2 = {
    id: admins[1].id,
    kind: "admin",
    name: admins[1].name,
    permissions: [...permissions],
  };
  adminToken = generateAccessToken({
    userId: admin.id,
    email: admins[0].email,
    role: "superadmin",
  });
  const a = await createEmployee();
  worker = a.principal;
  workerPhone = a.number;
  other = (await createEmployee()).principal;
  manager = (await createEmployee("inventory_manager")).principal;
  const challenge = await EmployeeAuthService.requestOtp(
    workerPhone,
    randomUUID(),
  );
  const login = await EmployeeAuthService.verifyOtp(
    challenge.challengeId,
    challenge.developmentCode!,
    "test browser",
    randomUUID(),
  );
  workerCookie = `${employeeSessionCookie}=${login.token}`;
  workerCsrf = login.csrf;
}, 30000);
afterAll(async () => {
  await mongoose.disconnect();
  await redis.quit();
});
describe("employee security against a real isolated MongoDB replica set", () => {
  it("creates unique administrator-owned employee identities", async () => {
    const rows = await EmployeeModel.find({
      _id: { $in: [worker.id, other.id] },
    });
    expect(rows).toHaveLength(2);
    expect(rows[0].employeeId).not.toEqual(rows[1].employeeId);
  });
  it("does not enumerate unknown or inactive accounts during OTP request", async () => {
    const unknown = await EmployeeAuthService.requestOtp(phone(), randomUUID());
    expect(unknown).toHaveProperty("challengeId");
    await expect(
      EmployeeAuthService.verifyOtp(
        unknown.challengeId,
        unknown.developmentCode!,
        "test",
        randomUUID(),
      ),
    ).rejects.toMatchObject({ statusCode: 401 });
    const e = await createEmployee();
    await EmployeeModel.updateOne(
      { _id: e.principal.id },
      { $set: { active: false } },
    );
    const inactive = await EmployeeAuthService.requestOtp(
      e.number,
      randomUUID(),
    );
    await expect(
      EmployeeAuthService.verifyOtp(
        inactive.challengeId,
        inactive.developmentCode!,
        "test",
        randomUUID(),
      ),
    ).rejects.toMatchObject({ statusCode: 401 });
  });
  it("expires codes and enforces one-time consumption", async () => {
    const a = await createEmployee();
    const c = await EmployeeAuthService.requestOtp(a.number, randomUUID());
    await EmployeeAuthService.verifyOtp(
      c.challengeId,
      c.developmentCode!,
      "test",
      randomUUID(),
    );
    await expect(
      EmployeeAuthService.verifyOtp(
        c.challengeId,
        c.developmentCode!,
        "test",
        randomUUID(),
      ),
    ).rejects.toMatchObject({ statusCode: 401 });
    const b = await createEmployee();
    const expired = await EmployeeAuthService.requestOtp(
      b.number,
      randomUUID(),
    );
    await EmployeeOtpModel.updateOne(
      { challengeId: expired.challengeId },
      { $set: { expiresAt: new Date(Date.now() - 1000) } },
    );
    await expect(
      EmployeeAuthService.verifyOtp(
        expired.challengeId,
        expired.developmentCode!,
        "test",
        randomUUID(),
      ),
    ).rejects.toMatchObject({ statusCode: 401 });
  });
  it("limits attempts and resend frequency", async () => {
    const a = await createEmployee();
    const c = await EmployeeAuthService.requestOtp(a.number, randomUUID());
    await expect(
      EmployeeAuthService.requestOtp(a.number, randomUUID()),
    ).rejects.toMatchObject({ statusCode: 429 });
    const wrong = c.developmentCode === "111111" ? "222222" : "111111";
    for (let i = 0; i < 5; i++)
      await expect(
        EmployeeAuthService.verifyOtp(
          c.challengeId,
          wrong,
          "test",
          randomUUID(),
        ),
      ).rejects.toMatchObject({ statusCode: 401 });
    await expect(
      EmployeeAuthService.verifyOtp(
        c.challengeId,
        c.developmentCode!,
        "test",
        randomUUID(),
      ),
    ).rejects.toMatchObject({ statusCode: 401 });
  });
  it("creates secure cookie sessions and rejects missing/foreign CSRF", async () => {
    await request(app).get("/api/v1/employee/tasks").expect(401);
    await request(app)
      .post("/api/v1/employee/logout")
      .set("Cookie", workerCookie)
      .set("Origin", "http://127.0.0.1:3194")
      .expect(403);
    await request(app)
      .post("/api/v1/employee/logout")
      .set("Cookie", workerCookie)
      .set("Origin", "https://untrusted.example")
      .set("X-Employee-Csrf", workerCsrf)
      .expect(403);
    await request(app)
      .get("/api/v1/employee/session")
      .set("Cookie", workerCookie)
      .expect(200);
  });
  it("rejects expired and revoked sessions immediately", async () => {
    const a = await createEmployee();
    const c = await EmployeeAuthService.requestOtp(a.number, randomUUID());
    const l = await EmployeeAuthService.verifyOtp(
      c.challengeId,
      c.developmentCode!,
      "test",
      randomUUID(),
    );
    expect((await EmployeeAuthService.authenticate(l.token)).principal.id).toBe(
      a.principal.id,
    );
    await EmployeeAuthService.revoke(ctx(admin), a.principal.id);
    await expect(
      EmployeeAuthService.authenticate(l.token),
    ).rejects.toMatchObject({ statusCode: 401 });
    const b = await createEmployee();
    const c2 = await EmployeeAuthService.requestOtp(b.number, randomUUID());
    const l2 = await EmployeeAuthService.verifyOtp(
      c2.challengeId,
      c2.developmentCode!,
      "test",
      randomUUID(),
    );
    await EmployeeSessionModel.updateOne(
      { employee: b.principal.id },
      { $set: { expiresAt: new Date(Date.now() - 1000) } },
    );
    await expect(
      EmployeeAuthService.authenticate(l2.token),
    ).rejects.toMatchObject({ statusCode: 401 });
  });
  it("applies permission changes and deactivation with session revocation", async () => {
    const a = await createEmployee();
    const c = await EmployeeAuthService.requestOtp(a.number, randomUUID());
    const l = await EmployeeAuthService.verifyOtp(
      c.challengeId,
      c.developmentCode!,
      "test",
      randomUUID(),
    );
    await EmployeeAuthService.update(ctx(admin), a.principal.id, {
      version: 0,
      active: false,
    });
    await expect(
      EmployeeAuthService.authenticate(l.token),
    ).rejects.toMatchObject({ statusCode: 401 });
  });
  it("denies employee provisioning and unauthorized order/customer access", async () => {
    await expect(
      EmployeeAuthService.create(ctx(worker), {
        name: "Intruder",
        phone: phone(),
        role: "inventory_manager",
        grants: [],
        denials: [],
      }),
    ).rejects.toMatchObject({ statusCode: 403 });
    await request(app)
      .get(`/api/v1/employee/orders/${new Types.ObjectId()}`)
      .set("Cookie", workerCookie)
      .expect(404);
  });
  it("keeps tokens, codes and personal phone data out of audit events", async () => {
    const events = await OperationsAuditModel.find({ actor: worker.id }).lean();
    expect(events.some((e) => e.action === "employee.login")).toBe(true);
    expect(JSON.stringify(events)).not.toContain(workerPhone);
    expect(JSON.stringify(events)).not.toContain(workerCookie.split("=")[1]);
  });
});
describe("tasks, reviews and notifications", () => {
  it("assigns persistent tasks and limits access to their assignees", async () => {
    const t = await createTask();
    expect(await EmployeeTaskService.detail(ctx(worker), t.id)).toMatchObject({
      title: expect.stringContaining(run),
    });
    await expect(
      EmployeeTaskService.detail(ctx(other), t.id),
    ).rejects.toMatchObject({ statusCode: 404 });
    const list = (await EmployeeTaskService.list(ctx(worker), page)) as {
      items: { _id: unknown }[];
    };
    expect(list.items.some((i) => String(i._id) === t.id)).toBe(true);
    expect(
      await OperationsNotificationModel.exists({
        recipient: worker.id,
        entity: t.id,
        event: "task.assigned",
      }),
    ).toBeTruthy();
  });
  it("rejects invalid transitions and stale revisions", async () => {
    const t = await createTask();
    await expect(
      EmployeeTaskService.transition(ctx(worker), t.id, {
        version: 0,
        status: "COMPLETED",
        reason: "",
      }),
    ).rejects.toMatchObject({ statusCode: 409 });
    await EmployeeTaskService.transition(ctx(worker), t.id, {
      version: 0,
      status: "IN_PROGRESS",
      reason: "",
    });
    await expect(
      EmployeeTaskService.update(ctx(worker), t.id, {
        version: 0,
        comment: "stale",
      }),
    ).rejects.toMatchObject({ statusCode: 409 });
  });
  it("atomically allows only one concurrent version update", async () => {
    const t = await createTask();
    const attempts = await Promise.allSettled([
      EmployeeTaskService.update(ctx(worker), t.id, {
        version: 0,
        comment: "first",
      }),
      EmployeeTaskService.update(ctx(worker), t.id, {
        version: 0,
        comment: "second",
      }),
    ]);
    expect(attempts.filter((a) => a.status === "fulfilled")).toHaveLength(1);
  });
  it("requires complete checklists before submission and prevents self approval", async () => {
    const item = { id: randomUUID(), label: "Check SKU", checked: false };
    const t = await createTask([worker.id], { checklist: [item] });
    await EmployeeTaskService.transition(ctx(worker), t.id, {
      version: 0,
      status: "IN_PROGRESS",
      reason: "",
    });
    await expect(
      EmployeeTaskService.transition(ctx(worker), t.id, {
        version: 1,
        status: "SUBMITTED",
        reason: "",
      }),
    ).rejects.toMatchObject({ statusCode: 409 });
    await EmployeeTaskService.update(ctx(worker), t.id, {
      version: 1,
      checklist: [{ ...item, checked: true }],
    });
    await EmployeeTaskService.transition(ctx(worker), t.id, {
      version: 2,
      status: "SUBMITTED",
      reason: "Evidence checked",
    });
    const approval = await ApprovalRequestModel.findOne({ entity: t.id });
    expect(approval?.expectedEntityVersion).toBe(3);
    await expect(
      ApprovalService.review(
        ctx({ ...worker, permissions: [...permissions] }),
        approval!.id,
        { version: 0, status: "APPROVED", notes: "Own work" },
      ),
    ).rejects.toMatchObject({ statusCode: 403 });
    await ApprovalService.review(ctx(admin), approval!.id, {
      version: 0,
      status: "REWORK_REQUIRED",
      notes: "Recheck the size",
    });
    await EmployeeTaskService.transition(ctx(worker), t.id, {
      version: 4,
      status: "IN_PROGRESS",
      reason: "Corrected",
    });
    await EmployeeTaskService.transition(ctx(worker), t.id, {
      version: 5,
      status: "SUBMITTED",
      reason: "Fixed",
    });
    const second = await ApprovalRequestModel.findOne({
      entity: t.id,
      status: "PENDING",
    });
    await ApprovalService.review(ctx(admin2), second!.id, {
      version: 0,
      status: "APPROVED",
      notes: "Verified independently",
    });
    await EmployeeTaskService.transition(ctx(worker), t.id, {
      version: 7,
      status: "COMPLETED",
      reason: "Complete",
    });
    expect((await EmployeeTaskModel.findById(t.id))?.status).toBe("COMPLETED");
  });
  it("rejects repeated review and stale submissions", async () => {
    const t = await createTask();
    await EmployeeTaskService.transition(ctx(worker), t.id, {
      version: 0,
      status: "IN_PROGRESS",
      reason: "",
    });
    await EmployeeTaskService.transition(ctx(worker), t.id, {
      version: 1,
      status: "SUBMITTED",
      reason: "Review",
    });
    const approval = await ApprovalRequestModel.findOne({ entity: t.id });
    await ApprovalService.review(ctx(admin), approval!.id, {
      version: 0,
      status: "REJECTED",
      notes: "Not yet correct",
    });
    await expect(
      ApprovalService.review(ctx(admin2), approval!.id, {
        version: 0,
        status: "APPROVED",
        notes: "Duplicate",
      }),
    ).rejects.toMatchObject({ statusCode: 409 });
  });
  it("honors dependencies and sends deduplicated deadline notifications", async () => {
    const dep = await createTask();
    const t = await createTask([worker.id], {
      dependencies: [dep.id],
      dueAt: new Date(Date.now() + 3600000).toISOString(),
    });
    await expect(
      EmployeeTaskService.transition(ctx(worker), t.id, {
        version: 0,
        status: "IN_PROGRESS",
        reason: "",
      }),
    ).rejects.toMatchObject({ statusCode: 409 });
    await EmployeeTaskService.deadlineNotifications(ctx(worker));
    await EmployeeTaskService.deadlineNotifications(ctx(worker));
    expect(
      await OperationsNotificationModel.countDocuments({
        entity: t.id,
        event: "task.deadline",
        recipient: worker.id,
      }),
    ).toBe(1);
  });
  it("does not let checklist updates reset task metadata or employee grants", async () => {
    expect(
      patchObject(
        z.object({
          title: z.string().default("wrong"),
          checklist: z.array(z.string()).default([]),
        }),
      ).parse({}),
    ).toEqual({});
  });
});
describe("stock authority and packing", () => {
  it("resolves opaque QR labels to actual variants and rejects wrong codes", async () => {
    const p = await product();
    const label = (await InventoryOperationsService.label(
      ctx(manager),
      p.product,
      p.variant,
    )) as { code: string; svg: string; id: string };
    expect(label.svg).toContain("<svg");
    expect(
      await InventoryOperationsService.scan(ctx(worker), label.code),
    ).toMatchObject({ sku: p.sku, size: "M" });
    await InventoryOperationsService.retireLabel(ctx(manager), label.id);
    await expect(
      InventoryOperationsService.scan(ctx(worker), label.code),
    ).rejects.toMatchObject({ statusCode: 404 });
  });
  it("holds corrections until independent approval and logs one immutable movement", async () => {
    const p = await product();
    const a = (await InventoryOperationsService.requestAdjustment(
      ctx(worker),
      adjustmentSchema.parse({
        product: p.product,
        variant: p.variant,
        expectedStock: 5,
        expectedRevision: 0,
        newStock: 4,
        damagedDelta: 1,
        reason: "One damaged unit",
      }),
    )) as { id: string };
    expect((await ProductModel.findById(p.product))!.variants[0].stock).toBe(5);
    await ApprovalService.review(ctx(manager), a.id, {
      version: 0,
      status: "APPROVED",
      notes: "Count verified",
    });
    const v = (await ProductModel.findById(p.product))!.variants[0];
    expect(v.stock).toBe(4);
    expect(v.damagedStock).toBe(1);
    expect(
      await StockMovementModel.countDocuments({
        idempotencyKey: `approval:${a.id}`,
      }),
    ).toBe(1);
    await expect(
      StockMovementModel.updateOne(
        { reference: a.id },
        { $set: { delta: 100 } },
      ),
    ).rejects.toThrow("immutable");
  });
  it("does not approve stale counts after an intervening stock change", async () => {
    const p = await product();
    const a = (await InventoryOperationsService.requestAdjustment(
      ctx(worker),
      adjustmentSchema.parse({
        product: p.product,
        variant: p.variant,
        expectedStock: 5,
        expectedRevision: 0,
        newStock: 7,
        reason: "Count correction",
      }),
    )) as { id: string };
    await ProductModel.updateOne(
      { _id: p.product, "variants._id": p.variant },
      { $inc: { "variants.$.stock": -1, "variants.$.stockRevision": 1 } },
    );
    await expect(
      ApprovalService.review(ctx(manager), a.id, {
        version: 0,
        status: "APPROVED",
        notes: "Stale count",
      }),
    ).rejects.toMatchObject({ statusCode: 409 });
    expect((await ProductModel.findById(p.product))!.variants[0].stock).toBe(4);
  });
  it("prevents overselling with concurrent real transactions", async () => {
    const p = await product(1);
    const item = {
      product: new Types.ObjectId(p.product),
      variant: new Types.ObjectId(p.variant),
      quantity: 1,
      price: 100,
      sku: p.sku,
    };
    const attempts = await Promise.allSettled([
      withMongoTransaction(async (session) => {
        await reserveInventory([item], session);
        return true;
      }),
      withMongoTransaction(async (session) => {
        await reserveInventory([item], session);
        return true;
      }),
    ]);
    expect(attempts.filter((a) => a.status === "fulfilled")).toHaveLength(1);
    expect((await ProductModel.findById(p.product))!.variants[0].stock).toBe(0);
    expect(
      await StockMovementModel.countDocuments({
        variant: p.variant,
        reason: "order_reservation",
      }),
    ).toBe(1);
  });
  it("verifies SKU, size and quantity without triggering shipping/payment state", async () => {
    const p = await product();
    const wrong = await product();
    const address = {
      fullName: "Synthetic Recipient",
      phone: "+919000000001",
      line1: "Fixture address",
      city: "Test",
      state: "Delhi",
      postalCode: "110001",
      country: "India",
    };
    const order = await OrderModel.create({
      items: [
        {
          product: p.product,
          variant: p.variant,
          title: "Synthetic product",
          sku: p.sku,
          size: "M",
          color: "Black",
          quantity: 1,
          price: 100,
          image: "https://example.test/fixture.png",
        },
      ],
      shippingAddress: address,
      billingAddress: address,
      paymentMethod: "cod",
      subtotal: 100,
      tax: 0,
      shipping: 0,
      total: 100,
      orderStatus: "placed",
    });
    const t = await createTask([worker.id], {
      order: order.id,
      category: "order_packaging",
    });
    await expect(
      InventoryOperationsService.pack(ctx(worker), order.id, {
        task: t.id,
        code: wrong.sku,
        version: 0,
      }),
    ).rejects.toMatchObject({ statusCode: 409 });
    await expect(
      InventoryOperationsService.completePacking(ctx(worker), order.id, {
        task: t.id,
        version: 0,
      }),
    ).rejects.toMatchObject({ statusCode: 409 });
    await InventoryOperationsService.pack(ctx(worker), order.id, {
      task: t.id,
      code: p.sku,
      version: 0,
    });
    await expect(
      InventoryOperationsService.pack(ctx(worker), order.id, {
        task: t.id,
        code: p.sku,
        version: 1,
      }),
    ).rejects.toMatchObject({ statusCode: 409 });
    await InventoryOperationsService.completePacking(ctx(worker), order.id, {
      task: t.id,
      version: 1,
    });
    const saved = await OrderModel.findById(order.id);
    expect(saved?.packingVerifiedAt).toBeInstanceOf(Date);
    expect(saved?.orderStatus).toBe("placed");
    expect(saved?.fulfillmentStatus).toBe("pending_logistics");
    expect(saved?.paymentStatus).toBe("pending");
  });
});
describe("SOP versions and media boundaries", () => {
  it("publishes immutable snapshots, checks role access and records acknowledgments", async () => {
    const s = (await SopService.create(ctx(admin), {
      title: "Packaging procedure",
      category: "packaging",
      body: "# Verify\nCheck the label.",
      steps: ["Match SKU"],
      attachments: [],
      roles: ["warehouse_employee"],
      products: [],
    })) as { id: string };
    await expect(SopService.detail(ctx(worker), s.id)).rejects.toMatchObject({
      statusCode: 404,
    });
    await SopService.publish(ctx(admin), s.id, 0);
    expect(await SopService.detail(ctx(worker), s.id)).toMatchObject({
      version: 1,
      status: "PUBLISHED",
    });
    await expect(SopService.detail(ctx(manager), s.id)).rejects.toMatchObject({
      statusCode: 404,
    });
    await SopService.acknowledge(ctx(worker), s.id, 1);
    await SopService.acknowledge(ctx(worker), s.id, 1);
    await expect(
      SopService.update(ctx(worker), s.id, {
        version: 1,
        body: "Unauthorized",
      }),
    ).rejects.toMatchObject({ statusCode: 403 });
    expect(await SopVersionModel.countDocuments({ document: s.id })).toBe(1);
  });
  it("rejects invalid file signatures and traversal keys", async () => {
    expect(() =>
      validateMediaFile(Buffer.from("<script>bad</script>"), "image/png"),
    ).toThrow();
    const storage = new LocalStorageProvider(
      await mkdtemp(join(tmpdir(), "cruisin-media-")),
    );
    await expect(storage.get("../secret", "private")).rejects.toThrow(
      "Invalid media",
    );
    expect(() =>
      transformedMediaUrl("https://media.example.test", "a/b", 640),
    ).not.toThrow();
    expect(() =>
      transformedMediaUrl("https://media.example.test", "a/b", 100000),
    ).toThrow();
  });
  it("keeps private evidence inaccessible without ownership and verifies bytes", async () => {
    const privateAsset = (await MediaService.upload(ctx(worker), {
      name: "evidence.png",
      body: png,
      contentType: "image/png",
      visibility: "private",
    })) as { id: string };
    const body = await MediaService.content(privateAsset.id, ctx(worker));
    expect(body.body.equals(png)).toBe(true);
    await expect(
      MediaService.metadata(ctx(other), privateAsset.id),
    ).rejects.toMatchObject({ statusCode: 404 });
    await request(app)
      .get(`/api/v1/media/${privateAsset.id}/content`)
      .expect(404);
    await expect(
      MediaService.upload(ctx(worker), {
        name: "public.png",
        body: png,
        contentType: "image/png",
        visibility: "public",
      }),
    ).rejects.toMatchObject({ statusCode: 403 });
  });
  it("serves public media and blocks expired signed private access", async () => {
    const a = (await MediaService.upload(ctx(admin), {
      name: "public.png",
      body: png,
      contentType: "image/png",
      visibility: "public",
    })) as { id: string };
    await request(app)
      .get(`/api/v1/media/${a.id}/content`)
      .expect(200)
      .expect("Content-Type", /image\/png/);
    const grant = await MediaService.signedAccess(ctx(admin), a.id);
    expect(
      (await MediaService.signedContent(a.id, grant.token)).body.equals(png),
    ).toBe(true);
    await MediaAccessGrantModel.updateMany(
      { asset: a.id },
      { $set: { expiresAt: new Date(Date.now() - 1000) } },
    );
    await expect(
      MediaService.signedContent(a.id, grant.token),
    ).rejects.toMatchObject({ statusCode: 404 });
  });
  it("requires approval before R2 network operations and separates buckets", () => {
    expect(
      () =>
        new R2StorageProvider({
          endpoint: "https://example.r2.cloudflarestorage.com",
          accessKeyId: "test",
          secretAccessKey: "test",
          publicBucket: "public",
          privateBucket: "private",
          approved: false,
        }),
    ).toThrow("approval");
    expect(
      () =>
        new R2StorageProvider({
          endpoint: "https://example.r2.cloudflarestorage.com",
          accessKeyId: "test",
          secretAccessKey: "test",
          publicBucket: "same",
          privateBucket: "same",
          approved: true,
        }),
    ).toThrow("distinct");
  });
  it("resumes local migrations, handles duplicates and reports missing sources", async () => {
    const dir = await mkdtemp(join(tmpdir(), "cruisin-migrate-"));
    await writeFile(join(dir, "image.png"), png);
    const entry = {
      source: `fixture:${run}`,
      file: "image.png",
      contentType: "image/png",
      visibility: "public" as const,
      associations: ["products.synthetic.image"],
      synthetic: true as const,
    };
    const a = await MediaMigrationService.migrate(ctx(admin), entry, dir);
    const b = await MediaMigrationService.migrate(ctx(admin), entry, dir);
    expect(a.status).toBe("VERIFIED");
    expect(b.asset).toBe(a.asset);
    const missing = await MediaMigrationService.migrate(
      ctx(admin),
      { ...entry, source: `fixture:missing-${run}`, file: "missing.png" },
      dir,
    );
    expect(missing.status).toBe("FAILED");
  });
});

describe('inventory recovery and reviewed exception regressions',()=>{
 it('invalidates outstanding OTPs after the registered phone changes',async()=>{const e=await createEmployee();const otp=await EmployeeAuthService.requestOtp(e.number,randomUUID());await EmployeeAuthService.update(ctx(admin),e.principal.id,{version:0,phone:phone()});await expect(EmployeeAuthService.verifyOtp(otp.challengeId,otp.developmentCode!,'test',randomUUID())).rejects.toMatchObject({statusCode:401});});
 it('cannot edit stock through the ordinary product editor',async()=>{const {ProductService}=await import('./product.service.js');const p=await product();const doc=await ProductModel.findById(p.product);const variants=doc!.variants.map(v=>({...v.toObject(),_id:String(v._id),stock:v.stock+1}));await expect(ProductService.update(p.product,{variants})).rejects.toMatchObject({statusCode:409});expect((await ProductModel.findById(p.product))!.variants[0].stock).toBe(5);});
 it('restocks an inspected customer return once across separate approval requests',async()=>{const {ReturnRequestModel}=await import('../models/return-request.model.js');const p=await product();const returned=await ReturnRequestModel.create({requestNumber:`RET-${run}-${++seq}`,order:new Types.ObjectId(),customer:admin.id,item:{product:p.product,variant:p.variant,sku:p.sku,quantity:2},reason:'Synthetic inspected return',idempotencyKey:randomUUID(),handlingFee:100,status:'quality_check_passed',qualityCheckedAt:new Date()});const input=adjustmentSchema.parse({product:p.product,variant:p.variant,expectedStock:5,expectedRevision:0,newStock:7,reason:'Inspected return accepted',returnReference:returned.id});const approval=await InventoryOperationsService.requestAdjustment(ctx(worker),input) as {id:string};await ApprovalService.review(ctx(manager),approval.id,{version:0,status:'APPROVED',notes:'Independent physical inspection'});await expect(InventoryOperationsService.requestAdjustment(ctx(worker),{...input,expectedStock:7,expectedRevision:1,newStock:9})).rejects.toMatchObject({statusCode:409});expect((await ProductModel.findById(p.product))!.variants[0].stock).toBe(7);expect(await StockMovementModel.countDocuments({idempotencyKey:`return:${returned.id}:${p.variant}`})).toBe(1);});
 it('applies only one RTO restock under concurrent inspection requests',async()=>{const {ShipmentModel}=await import('../models/shipment.model.js');const {LogisticsService}=await import('./logistics/logistics.service.js');const p=await product();const address={fullName:'Synthetic',phone:'+919000000001',line1:'Test lane',city:'Delhi',state:'Delhi',postalCode:'110001',country:'India'};const order=await OrderModel.create({items:[{product:p.product,variant:p.variant,sku:p.sku,title:'Synthetic',quantity:1,price:100,image:'https://example.test/fixture.png'}],shippingAddress:address,billingAddress:address,paymentMethod:'cod',subtotal:100,tax:0,shipping:0,total:100,stockReserved:true});const shipment=await ShipmentModel.create({order:order._id,sourceOrderId:order.id,pickupLocation:'Synthetic',shipmentStatus:'rto_delivered',package:{productWeightKg:1,packagingWeightKg:0,deadWeightKg:1,lengthCm:10,breadthCm:10,heightCm:10},idempotencyKey:`rto-${run}-${++seq}`,rto:{status:'inspection_pending',inventoryRecoveryStatus:'inspection_pending'}});await Promise.allSettled([LogisticsService.markRtoWarehouse(shipment.id,{action:'inspection_passed'},admin.id),LogisticsService.markRtoWarehouse(shipment.id,{action:'inspection_passed'},admin2.id)]);expect((await ProductModel.findById(p.product))!.variants[0].stock).toBe(6);expect(await StockMovementModel.countDocuments({variant:p.variant,reason:'rto_restock'})).toBe(1);});
 it('reserves an exchange replacement once under competing approvals',async()=>{const {ExchangeRequestModel}=await import('../models/exchange-request.model.js');const {ReturnExchangeService}=await import('./logistics/return-exchange.service.js');const p=await product();const exchange=await ExchangeRequestModel.create({requestNumber:`EX-${run}-${++seq}`,order:new Types.ObjectId(),customer:admin.id,originalItem:{product:p.product,variant:p.variant,sku:p.sku,quantity:1},requestedVariant:p.variant,requestedSku:p.sku,status:'requested',handlingFee:100,idempotencyKey:`exchange-${randomUUID()}`});await Promise.allSettled([ReturnExchangeService.actOnExchange(exchange.id,{action:'approve'},admin.id),ReturnExchangeService.actOnExchange(exchange.id,{action:'approve'},admin2.id)]);expect((await ProductModel.findById(p.product))!.variants[0].stock).toBe(4);expect(await StockMovementModel.countDocuments({reference:exchange.id,reason:'exchange_reservation'})).toBe(1);});
 it('reviews product inspection evidence without premature product mutations',async()=>{const p=await product();const a=await ApprovalService.request(ctx(worker),{kind:'inspection',entity:p.product,reason:'Check seams after counting',evidence:[],proposed:{note:'Seams verified',outcome:'pass'}}) as {id:string};expect((await ProductModel.findById(p.product))!.variants[0].stock).toBe(5);await ApprovalService.review(ctx(admin),a.id,{version:0,status:'APPROVED',notes:'Inspection reviewed'});expect((await ApprovalRequestModel.findById(a.id))?.status).toBe('APPROVED');});
 it('deduplicates identical migration content across different source identities',async()=>{const dir=await mkdtemp(join(tmpdir(),'cruisin-dedupe-'));await writeFile(join(dir,'one.png'),png);const base={file:'one.png',contentType:'image/png',visibility:'public' as const,associations:[],synthetic:true as const};const first=await MediaMigrationService.migrate(ctx(admin),{...base,source:`fixture:first-${run}`},dir);const second=await MediaMigrationService.migrate(ctx(admin),{...base,source:`fixture:second-${run}`},dir);expect(first.status).toBe('VERIFIED');expect(second.asset).toBe(first.asset);});
 it('treats regex syntax as literal inventory search text',async()=>{const result=await InventoryOperationsService.list(ctx(worker),{page:1,limit:20,q:'.*'}) as {total:number};expect(result.total).toBe(0);});
});


describe('published SOP and migration delivery regressions',()=>{
 it('keeps the last published procedure readable while a new draft is edited',async()=>{const s=await SopService.create(ctx(admin),{title:'Published instructions',category:'packing',body:'Original published steps',steps:[],attachments:[],roles:[],products:[]}) as {id:string};await SopService.publish(ctx(admin),s.id,0);await SopService.update(ctx(admin),s.id,{version:1,body:'Unpublished changes'});expect(await SopService.detail(ctx(worker),s.id)).toMatchObject({body:'Original published steps',version:1,status:'PUBLISHED'});await SopService.publish(ctx(admin),s.id,2);expect(await SopService.detail(ctx(worker),s.id)).toMatchObject({body:'Unpublished changes',version:3});await expect(SopVersionModel.updateOne({document:s.id,version:1},{$set:{snapshot:{}}})).rejects.toThrow('immutable');});
 it('resolves only verified public legacy media mappings and preserves image metadata',async()=>{const {MediaMigrationModel}=await import('../models/media-asset.model.js');const {resolvePublicMedia}=await import('./media/reference-resolver.service.js');const asset=await MediaService.upload(ctx(admin),{name:'mapped.png',body:png,contentType:'image/png',visibility:'public'}) as {id:string};const old=`https://res.cloudinary.com/synthetic/image/upload/${run}.png`;await MediaMigrationModel.create({source:old,status:'VERIFIED',asset:asset.id});const value=await resolvePublicMedia({images:[{url:old,alt:'Keep the descriptive alternative',width:1,height:1}],description:old,categoryCardImage:old,backgroundVideo:old,imageAltText:old}) as {categoryCardImage:string;backgroundVideo:string;imageAltText:string;images:{url:string;alt:string}[];description:string};expect(value.images[0].url).toContain(`/media/${asset.id}/content`);expect(value.images[0].alt).toBe('Keep the descriptive alternative');expect(value.description).toBe(old);expect(value.categoryCardImage).toContain(`/media/${asset.id}/content`);expect(value.backgroundVideo).toContain(`/media/${asset.id}/content`);expect(value.imageAltText).toBe(old);const missing=await resolvePublicMedia({image:'https://res.cloudinary.com/synthetic/image/upload/unmapped.png'});expect(missing).toEqual({image:'https://res.cloudinary.com/synthetic/image/upload/unmapped.png'});});
});

it('reports operational counts from persisted authorized records',async()=>{const summary=await OperationsQueryService.summary(ctx(worker));expect(summary.tasks.total).toBeGreaterThanOrEqual(0);expect(summary.unreadNotifications).toBeGreaterThanOrEqual(0);expect(Array.isArray(summary.unitStates)).toBe(true);});

it('persists and independently resolves operational exceptions through the API',async()=>{const {PhysicalUnitsService}=await import('./physical-units.service.js');const e=await PhysicalUnitsService.exception(ctx(worker),{type:'Missing unit',severity:'medium',entity:'synthetic-unit-reference',reason:'Synthetic missing unit investigation',evidence:[]});const assigned=await request(app).post(`/api/v1/admin/operations/exceptions/${e.id}/assign`).set('Authorization',`Bearer ${adminToken}`).set('Origin',process.env.ADMIN_URL??'http://127.0.0.1:3193').send({version:0,owner:worker.id});expect(assigned.status).toBe(200);const response=await request(app).post(`/api/v1/admin/operations/exceptions/${e.id}/resolve`).set('Authorization',`Bearer ${adminToken}`).set('Origin',process.env.ADMIN_URL??'http://127.0.0.1:3193').send({version:1,resolution:'Synthetic count investigation reconciled without a stock override'});expect(response.status).toBe(200);const {OperationsExceptionModel}=await import('../models/physical-unit.model.js');expect((await OperationsExceptionModel.findById(e.id))?.status).toBe('RESOLVED');expect(await OperationsAuditModel.exists({entity:e.id,action:'exception.resolved'})).toBeTruthy();});

it('prevents modifying persisted audit and ledger documents through save',async()=>{const event=await OperationsAuditModel.findOne({actor:worker.id});expect(event).toBeTruthy();event!.summary='Attempted rewrite';await expect(event!.save()).rejects.toThrow('append-only');const movement=await StockMovementModel.findOne();expect(movement).toBeTruthy();movement!.reason='Attempted rewrite';await expect(movement!.save()).rejects.toThrow('immutable');});

it('fails closed when the real Redis connection is interrupted during OTP issuance',async()=>{const e=await createEmployee();const count=await EmployeeOtpModel.countDocuments();await redis.quit();try{await expect(EmployeeAuthService.requestOtp(e.number,randomUUID())).rejects.toThrow();expect(await EmployeeOtpModel.countDocuments()).toBe(count);}finally{await redis.connect();expect(await redis.ping()).toBe('PONG');}});

it('requires all newly created V2 variants to enter stock through physical QC and packaging',async()=>{const {ProductService}=await import('./product.service.js');const p=await product(0);const original=(await ProductModel.findById(p.product))!.toObject();const input={...Object.fromEntries(Object.entries(original).filter(([key])=>!["_id","__v"].includes(key))),slug:`new-v2-${run}`,variants:original.variants.map(v=>({...v,sku:`${v.sku}-NEW`,stock:3}))};await expect(ProductService.create(input)).rejects.toThrow();const created=await ProductService.create({...input,variants:input.variants.map(v=>({...v,stock:0}))});expect(created.variants[0].unitTracked).toBe(true);expect(String(created.variants[0]._id)).not.toBe(String(original.variants[0]._id));});

it('counts packing and dispatch work from persisted tasks without leaking another employee work', async () => {
  const {FulfillmentRecordModel}=await import('../models/fulfillment-record.model.js');
  const actor:Principal={id:new Types.ObjectId().toString(),kind:'employee',name:'Summary scope fixture',permissions:['tasks.view','orders.view']};
  const records=[];
  for(const [stage,status,assignee] of [
    ['PICKING','IN_PROGRESS',actor.id],['PACKED','IN_PROGRESS',actor.id],
    ['READY_FOR_HANDOVER','IN_PROGRESS',actor.id],['READY_FOR_HANDOVER','IN_PROGRESS',other.id],
    ['PICKING','CANCELLED',actor.id],['PICKING','COMPLETED',actor.id],
  ] as const){
    const order=new Types.ObjectId();
    const task=await EmployeeTaskModel.create({title:'Synthetic dispatch summary',creator:admin.id,assignees:[assignee],category:'order_packaging',order,status});
    records.push(await FulfillmentRecordModel.create({order,task:task._id,stage}));
  }
  // A new task without a record is also awaiting picking; duplicate tasks must not inflate order counts.
  const order=new Types.ObjectId();
  await EmployeeTaskModel.create([{title:'New fulfillment',creator:admin.id,assignees:[actor.id],category:'order_packaging',order},{title:'Duplicate task fixture',creator:admin.id,assignees:[actor.id],category:'order_packaging',order}]);
  try {
    const summary=await OperationsQueryService.summary(ctx(actor));
    expect(summary).toMatchObject({fulfillment:{awaitingPacking:2,packed:1,readyForHandover:1}});
    const restricted=await OperationsQueryService.summary(ctx({...actor,permissions:['tasks.view']}));
    expect(restricted).toHaveProperty('fulfillment',null);
  } finally {await FulfillmentRecordModel.deleteMany({_id:{$in:records.map(r=>r._id)}});await EmployeeTaskModel.deleteMany({assignees:actor.id});}
});

it('counts only unresolved exceptions reported by or assigned to the employee',async()=>{
  const {OperationsExceptionModel}=await import('../models/physical-unit.model.js');
  const actor:Principal={id:new Types.ObjectId().toString(),kind:'employee',name:'Exception summary fixture',permissions:['tasks.view']};
  const fixtures=await OperationsExceptionModel.create([
    {type:'Missing unit',entity:'summary-fixture',reporter:actor.id,reason:'Synthetic investigation'},
    {type:'Package issue',entity:'summary-fixture',reporter:other.id,owner:actor.id,status:'ASSIGNED',reason:'Synthetic investigation'},
    {type:'Resolved issue',entity:'summary-fixture',reporter:actor.id,status:'RESOLVED',reason:'Synthetic investigation'},
    {type:'Other issue',entity:'summary-fixture',reporter:other.id,reason:'Synthetic investigation'},
  ]);
  try {expect(await OperationsQueryService.summary(ctx(actor))).toHaveProperty('openExceptions',2);}
  finally {await OperationsExceptionModel.deleteMany({_id:{$in:fixtures.map(f=>f._id)}});}
});
