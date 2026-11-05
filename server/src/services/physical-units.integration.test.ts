import sharp from 'sharp';
import {RGBLuminanceSource,HybridBinarizer,BinaryBitmap,QRCodeReader,DecodeHintType} from '@zxing/library';
import { StockMovementModel } from "../models/stock-movement.model.js";
import { ApprovalService } from "./approval.service.js";
import { beforeAll, afterAll, describe, it, expect } from "vitest";
import mongoose from "mongoose";
import { randomUUID } from "node:crypto";
import { permissions } from "@cruisin/contracts";
import { MediaService } from "./media/media.service.js";
import { reserveInventory } from "./order.service.js";
import { withMongoTransaction } from "../utils/mongo-transaction.js";
import { OrderModel } from "../models/order.model.js";
import { FulfillmentService } from "./fulfillment.service.js";
import { PhysicalUnitsService } from "./physical-units.service.js";
import { PhysicalUnitModel } from "../models/physical-unit.model.js";
import { ProductModel } from "../models/product.model.js";
import { CategoryModel } from "../models/category.model.js";
import { SopService } from "./sop.service.js";
import { sopCreateSchema } from "../validators/operations.validator.js";
import { connectRedis, redis } from "../config/redis.js";
import type { OperationsContext } from "./operations-context.js";
const run = randomUUID();
const admin: OperationsContext = {
  actor: {
    id: new mongoose.Types.ObjectId().toString(),
    kind: "admin",
    name: "Admin",
    permissions: [...permissions],
  },
  correlationId: run,
};
let variant: string;
let product: string;
let unit: string;
let productSop: string;
let packagingSop: string;
let evidence: string;
let orderId: string;
const stock = async () => {
  const p = await ProductModel.findById(product);
  return p!.variants.id(variant)!.stock;
};
beforeAll(async () => {
  const url = new URL(process.env.MONGODB_URI!);
  if (
    !["localhost", "127.0.0.1"].includes(url.hostname) ||
    url.pathname !== "/cruisin-sync-order-analytics-tests"
  )
    throw new Error("Unsafe test DB");
  await mongoose.connect(url.href);
  await connectRedis();
  await PhysicalUnitModel.init();
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aB1UAAAAASUVORK5CYII=",
    "base64",
  );
  evidence = (
    (await MediaService.upload(admin, {
      body: png,
      contentType: "image/png",
      name: "synthetic.png",
      visibility: "private",
    })) as { id: string }
  ).id;
  const category = await CategoryModel.create({
    name: "Physical fixture",
    slug: `physical-${run}`,
    image: "https://example.test/fixture.png",
  });
  const p = await ProductModel.create({
    title: "Physical synthetic product",
    slug: `physical-${run}`,
    description: "Synthetic fixture",
    richDescription: "Synthetic fixture",
    category: category._id,
    basePrice: 100,
    status: "published",
    visibility: "visible",
    isActive: true,
    variants: [
      {
        sku: `UNIT-${run}`,
        size: "XL",
        color: "Yellow",
        colorHex: "#ffff00",
        price: 100,
        stock: 0,
      },
    ],
  });
  product = p.id;
  variant = String(p.variants[0]._id);
  for (const kind of ["PRODUCT", "PACKAGING"] as const) {
    const s = (await SopService.create(
      admin,
      sopCreateSchema.parse({
        title: `${kind} fixture`,
        category: kind,
        kind,
        body: "Administrator configured specifications",
        products: [product],
        requirements: [
          {
            key: "inspect",
            label: "Inspect configured specification",
            mandatory: true,
            photo: true,
            scan: kind === "PACKAGING",
          },
        ],
      }),
    )) as { id: string; version: number };
    const review = (await SopService.requestPublication(
      admin,
      s.id,
      s.version,
    )) as { id: string; version: number };
    await ApprovalService.review(
      {
        ...admin,
        actor: { ...admin.actor, id: new mongoose.Types.ObjectId().toString() },
      },
      review.id,
      {
        version: review.version,
        status: "APPROVED",
        notes: "Independent synthetic specification review",
      },
    );
    const published = { id: s.id };
    if (kind === "PRODUCT") productSop = published.id;
    else packagingSop = published.id;
  }
});
afterAll(async () => {
  await mongoose.disconnect();
  await redis.quit();
});
describe("physical units use the commerce stock authority", () => {
  it("receiving is idempotent and does not sell uninspected merchandise", async () => {
    const input = {
      variant,
      quantity: 2,
      location: "A-02",
      idempotencyKey: run,
    };
    const a = await PhysicalUnitsService.receive(admin, input);
    const b = await PhysicalUnitsService.receive(admin, input);
    expect(a.map((u) => u.unitId)).toEqual(b.map((u) => u.unitId));
    expect(new Set(a.map((u) => u.unitId)).size).toBe(2);
    unit = a[0].unitId;
    expect(await stock()).toBe(0);
  });
  it("rejects packaging before QC and prevents QR reprints from changing stock", async () => {
    await expect(
      PhysicalUnitsService.package(admin, unit, {
        sop: packagingSop,
        completed: ["inspect"],
        evidence: [],
        scannedCode: unit,
        version: 0,
      }),
    ).rejects.toThrow();
    const a = await PhysicalUnitsService.label(admin, unit);
    const b = await PhysicalUnitsService.label(admin, unit);
    expect(a.code).toBe(b.code);
    expect(a.svg).toContain("<svg");
    // This is an axis-aligned generated label: verify its encoded pixels directly.
    // Camera finder/detection behavior requires separate real-device acceptance.
    const {data,info}=await sharp(Buffer.from(a.svg)).resize(320,320).flatten({background:"white"}).greyscale().raw().toBuffer({resolveWithObject:true});
    const bitmap=new BinaryBitmap(new HybridBinarizer(new RGBLuminanceSource(new Uint8ClampedArray(data),info.width,info.height)));
    expect(new QRCodeReader().decode(bitmap,new Map([[DecodeHintType.PURE_BARCODE,true]])).getText()).toBe(a.code);
    expect(await stock()).toBe(0);
  });
  it("pins QC to a published product SOP and requires evidence", async () => {
    await expect(
      PhysicalUnitsService.qc(admin, unit, {
        sop: productSop,
        result: "PASSED",
        completed: ["inspect"],
        evidence: [],
        measurements: {},
        version: 0,
      }),
    ).rejects.toThrow();
  });
  it("cannot allocate a quarantined, uninspected or unavailable unit", async () => {
    await expect(
      PhysicalUnitsService.allocate(admin, unit, "000000000000000000000001"),
    ).rejects.toThrow();
    expect(await stock()).toBe(0);
  });
  it("passes real QC, pins immutable SOP versions, and packs exactly once", async () => {
    const inspected = await PhysicalUnitsService.qc(admin, unit, {
      sop: productSop,
      result: "PASSED",
      completed: ["inspect"],
      evidence: [evidence],
      measurements: {},
      version: 0,
    });
    expect(inspected.qc?.sopVersion).toBe(2);
    expect(await stock()).toBe(0);
    const label = await PhysicalUnitsService.label(admin, unit);
    await expect(
      PhysicalUnitsService.package(admin, unit, {
        sop: packagingSop,
        completed: ["inspect"],
        evidence: [evidence],
        scannedCode: "wrong",
        version: 1,
      }),
    ).rejects.toThrow();
    const input = {
      sop: packagingSop,
      completed: ["inspect"],
      evidence: [evidence],
      scannedCode: label.code,
      version: 1,
    };
    const outcomes = await Promise.allSettled([
      PhysicalUnitsService.package(admin, unit, input),
      PhysicalUnitsService.package(admin, unit, input),
    ]);
    expect(outcomes.filter((o) => o.status === "fulfilled")).toHaveLength(1);
    expect(await stock()).toBe(1);
    expect(
      (await PhysicalUnitsService.reconcile(admin)).find(
        (r) => r.variant === variant,
      )?.reconciled,
    ).toBe(true);
  });
  it("reserves the exact unit through existing checkout inventory atomically", async () => {
    orderId = new mongoose.Types.ObjectId().toString();
    const p = await ProductModel.findById(product);
    const sku = p!.variants.id(variant)!.sku;
    const item = {
      product: new mongoose.Types.ObjectId(product),
      variant: new mongoose.Types.ObjectId(variant),
      quantity: 1,
      price: 100,
      sku,
    };
    await withMongoTransaction(async (session) => {
      await reserveInventory([item], session, orderId);
      return true;
    });
    expect(await stock()).toBe(0);
    expect(
      (await PhysicalUnitModel.findOne({ unitId: unit }))?.order?.toString(),
    ).toBe(orderId);
    await expect(
      withMongoTransaction(async (session) => {
        await reserveInventory(
          [item],
          session,
          new mongoose.Types.ObjectId().toString(),
        );
        return true;
      }),
    ).rejects.toThrow();
  });

  it("rejects parcel completion without measurements, evidence or a valid order", async () => {
    await expect(
      FulfillmentService.measure(admin, orderId, {
        weightKg: 0,
        lengthCm: 10,
        widthCm: 10,
        heightCm: 10,
        divisor: 5000,
        courier: "configured test courier",
        evidence: [],
        version: 0,
      }),
    ).rejects.toThrow();
  });
  it("does not create fulfillment tasks for unpaid or cancelled orders", async () => {
    await expect(
      FulfillmentService.ensureTask("000000000000000000000001"),
    ).rejects.toThrow();
  });

  it("fulfills a real persisted synthetic order through the mock Shiprocket boundary", async () => {
    const p = await ProductModel.findById(product);
    const sku = p!.variants.id(variant)!.sku;
    const address = {
      fullName: "Synthetic Receiver",
      phone: "+919000000001",
      line1: "Synthetic local lane",
      city: "Delhi",
      state: "Delhi",
      postalCode: "110001",
      country: "India",
    };
    await OrderModel.create({
      _id: orderId,
      orderNumber: `SYNTH-${run}`,
      items: [
        {
          product,
          variant,
          sku,
          title: "Synthetic",
          size: "XL",
          color: "Yellow",
          quantity: 1,
          price: 100,
          image: "https://example.test/synthetic.png",
        },
      ],
      shippingAddress: address,
      billingAddress: address,
      paymentMethod: "cod",
      paymentMode: "cod",
      paymentStatus: "cod_pending",
      stockReserved: true,
      orderStatus: "placed",
      subtotal: 100,
      tax: 0,
      shipping: 0,
      total: 100,
    });
    const a = await FulfillmentService.ensureTask(orderId);
    const b = await FulfillmentService.ensureTask(orderId);
    expect(a.id).toBe(b.id);
    await PhysicalUnitsService.allocate(admin, unit, orderId);
    await expect(
      PhysicalUnitsService.allocate(admin, unit, orderId),
    ).rejects.toThrow();
    await FulfillmentService.policy(admin, {
      courier: "Synthetic Surface",
      divisor: 6000,
      minWeightKg: 0.01,
      maxWeightKg: 10,
      requireEvidence: true,
    });
    await expect(
      FulfillmentService.measure(admin, orderId, {
        weightKg: 0.5,
        lengthCm: 30,
        widthCm: 20,
        heightCm: 10,
        courier: "Synthetic Surface",
        evidence: [],
        version: 0,
      }),
    ).rejects.toThrow();
    const parcel = await FulfillmentService.measure(admin, orderId, {
      weightKg: 0.5,
      lengthCm: 30,
      widthCm: 20,
      heightCm: 10,
      courier: "Synthetic Surface",
      evidence: [evidence],
      version: 0,
    });
    expect(parcel.volumetricWeightKg).toBe(1);
    expect(parcel.chargeableWeightKg).toBe(1);
    await FulfillmentService.shipping(admin, orderId, "prepare");
    await FulfillmentService.shipping(admin, orderId, "awb");
    await FulfillmentService.shipping(admin, orderId, "label");
    const detail = await FulfillmentService.detail(admin, orderId);
    const shipment = detail.shipments[0];
    expect(shipment.awb).toMatch(/^MOCK/);
    expect(shipment.label?.status).toBe("ready");
    await expect(
      FulfillmentService.ready(admin, orderId, {
        version: 1,
        shipment: String(shipment._id),
        awb: "wrong",
        labelOperationId: shipment.label!.verificationId!,
      }),
    ).rejects.toThrow();
    await FulfillmentService.ready(admin, orderId, {
      version: 1,
      shipment: String(shipment._id),
      awb: shipment.awb!,
      labelOperationId: shipment.label!.verificationId!,
    });
    await FulfillmentService.handover(admin, orderId, 2);
    expect(
      (await FulfillmentService.detail(admin, orderId)).record?.stage,
    ).toBe("HANDED_OVER");
    const events = await StockMovementModel.find({ unit });
    expect(events.some((e) => e.nextState === "READY_FOR_HANDOVER")).toBe(true);
    expect(events.some((e) => e.nextState === "HANDED_OVER")).toBe(true);
    expect((await PhysicalUnitModel.findOne({ unitId: unit }))?.state).toBe(
      "HANDED_OVER",
    );
    const { LogisticsService } =
      await import("./logistics/logistics.service.js");
    await LogisticsService.refreshTracking(String(shipment._id), "admin");
    expect((await PhysicalUnitModel.findOne({ unitId: unit }))?.state).toBe(
      "SHIPPED",
    );
    expect(
      (await PhysicalUnitsService.reconcile(admin)).find(
        (r) => r.variant === variant,
      )?.reconciled,
    ).toBe(true);
  });

  it("requires inspected matching returns and never restocks on a scan or disposition", async () => {
    const { ReturnRequestModel } =
      await import("../models/return-request.model.js");
    const current = await PhysicalUnitModel.findOne({ unitId: unit });
    await expect(
      PhysicalUnitsService.returnUnit(admin, unit, {
        returnRequest: new mongoose.Types.ObjectId().toString(),
        version: current!.version,
        disposition: "REPACKAGE",
        reason: "Synthetic return inspection",
      }),
    ).rejects.toThrow();
    const r = await ReturnRequestModel.create({
      requestNumber: `RET-${run}`,
      order: orderId,
      customer: new mongoose.Types.ObjectId(),
      item: { product, variant, sku: current!.sku, quantity: 1 },
      reason: "Synthetic inspected return",
      handlingFee: 1,
      idempotencyKey: `ret-${run}`,
      status: "quality_check_passed",
      qualityCheckedAt: new Date(),
    });
    const input = {
      returnRequest: r.id,
      version: current!.version,
      disposition: "REPACKAGE" as const,
      reason: "Synthetic inspected return",
    };
    await PhysicalUnitsService.returnUnit(admin, unit, input);
    await expect(
      PhysicalUnitsService.returnUnit(admin, unit, input),
    ).rejects.toThrow();
    expect(await stock()).toBe(0);
    expect((await PhysicalUnitModel.findOne({ unitId: unit }))?.state).toBe(
      "QC_PENDING",
    );
  });
  it("denies unauthorized receiving and changing inputs behind a receipt key", async () => {
    const denied = { ...admin, actor: { ...admin.actor, permissions: [] } };
    await expect(
      PhysicalUnitsService.receive(denied, {
        variant,
        quantity: 1,
        location: "A",
        idempotencyKey: run,
      }),
    ).rejects.toThrow();
    await expect(
      PhysicalUnitsService.receive(admin, {
        variant,
        quantity: 3,
        location: "A",
        idempotencyKey: run,
      }),
    ).rejects.toThrow();
  });
  it("links a tracked exchange to already reserved replacement units without a second deduction", async () => {
    const { TrackedExchangeService } =
      await import("./tracked-exchange.service.js");
    const { ExchangeRequestModel } =
      await import("../models/exchange-request.model.js");
    const { ReturnExchangeService } =
      await import("./logistics/return-exchange.service.js");
    const [u] = await PhysicalUnitsService.receive(admin, {
      variant,
      quantity: 1,
      location: "EX-TEST",
      idempotencyKey: `exchange-unit-${run}`,
    });
    await PhysicalUnitsService.qc(admin, u.unitId, {
      sop: productSop,
      result: "PASSED",
      completed: ["inspect"],
      evidence: [evidence],
      measurements: {},
      version: 0,
    });
    await PhysicalUnitsService.package(admin, u.unitId, {
      sop: packagingSop,
      completed: ["inspect"],
      evidence: [evidence],
      scannedCode: u.code,
      version: 1,
    });
    const customer = new mongoose.Types.ObjectId();
    const replacement = new mongoose.Types.ObjectId();
    const address = {
      fullName: "Synthetic",
      phone: "+919000000001",
      line1: "Synthetic lane",
      city: "Delhi",
      state: "Delhi",
      postalCode: "110001",
      country: "India",
    };
    await withMongoTransaction(async (session) => {
      await reserveInventory(
        [
          {
            product: new mongoose.Types.ObjectId(product),
            variant: new mongoose.Types.ObjectId(variant),
            quantity: 1,
            price: 100,
            sku: u.sku,
          },
        ],
        session,
        String(replacement),
      );
      await OrderModel.create(
        [
          {
            _id: replacement,
            user: customer,
            items: [
              {
                product,
                variant,
                sku: u.sku,
                title: "Synthetic replacement",
                quantity: 1,
                price: 100,
                image: "https://example.test/synthetic.png",
              },
            ],
            shippingAddress: address,
            billingAddress: address,
            paymentMethod: "cod",
            paymentMode: "cod",
            paymentStatus: "cod_pending",
            stockReserved: true,
            orderStatus: "placed",
            subtotal: 100,
            tax: 0,
            shipping: 0,
            total: 100,
          },
        ],
        { session },
      );
      return true;
    });
    const request = await ExchangeRequestModel.create({
      requestNumber: `EX-TRACKED-${run}`,
      order: orderId,
      customer,
      originalItem: { product, variant, sku: u.sku, quantity: 1 },
      requestedVariant: variant,
      requestedSku: u.sku,
      status: "requested",
      handlingFee: 0,
      idempotencyKey: `ex-tracked-${run}`,
    });
    await TrackedExchangeService.link(admin, request.id, String(replacement));
    await ReturnExchangeService.actOnExchange(
      request.id,
      { action: "approve" },
      admin.actor.id,
    );
    expect(await stock()).toBe(0);
    expect(
      (
        await PhysicalUnitModel.findOne({ unitId: u.unitId })
      )?.order?.toString(),
    ).toBe(String(replacement));
    await expect(
      ReturnExchangeService.actOnExchange(
        request.id,
        { action: "approve" },
        admin.actor.id,
      ),
    ).rejects.toThrow();
  });
  it("quarantines damaged sellable units only after independent approval", async () => {
    const [u] = await PhysicalUnitsService.receive(admin, {
      variant,
      quantity: 1,
      location: "DAMAGE-TEST",
      idempotencyKey: `damage-${run}`,
    });
    await PhysicalUnitsService.qc(admin, u.unitId, {
      sop: productSop,
      result: "PASSED",
      completed: ["inspect"],
      evidence: [evidence],
      measurements: {},
      version: 0,
    });
    await PhysicalUnitsService.package(admin, u.unitId, {
      sop: packagingSop,
      completed: ["inspect"],
      evidence: [evidence],
      scannedCode: u.code,
      version: 1,
    });
    expect(await stock()).toBe(1);
    const a = await PhysicalUnitsService.requestDisposition(admin, u.unitId, {
      version: 2,
      state: "DAMAGED",
      reason: "Synthetic damage found in packed stock",
      evidence: [evidence],
    });
    expect(await stock()).toBe(1);
    await expect(
      ApprovalService.review(admin, a.id, {
        version: 0,
        status: "APPROVED",
        notes: "Self approval denied",
      }),
    ).rejects.toThrow();
    await ApprovalService.review(
      {
        ...admin,
        actor: { ...admin.actor, id: new mongoose.Types.ObjectId().toString() },
      },
      a.id,
      {
        version: 0,
        status: "APPROVED",
        notes: "Independent damage evidence review",
      },
    );
    expect(await stock()).toBe(0);
    expect((await PhysicalUnitModel.findOne({ unitId: u.unitId }))?.state).toBe(
      "DAMAGED",
    );
    await expect(
      ApprovalService.review(
        {
          ...admin,
          actor: {
            ...admin.actor,
            id: new mongoose.Types.ObjectId().toString(),
          },
        },
        a.id,
        { version: 0, status: "APPROVED", notes: "Duplicate review" },
      ),
    ).rejects.toThrow();
  });
  it("enforces administrator configured measurement tolerances before a QC pass", async () => {
    const doc = (await SopService.create(admin, {
      kind: "PRODUCT",
      title: "Synthetic measurement acceptance",
      category: "PRODUCT",
      body: "Synthetic measurement values are test-only",
      products: [product],
      measurements: [
        {
          key: "test_width",
          label: "Synthetic width",
          unit: "cm",
          min: 9,
          max: 11,
          required: true,
        },
      ],
    })) as { id: string; version: number };
    const a = (await SopService.requestPublication(
      admin,
      doc.id,
      doc.version,
    )) as { id: string; version: number };
    await ApprovalService.review(
      {
        ...admin,
        actor: { ...admin.actor, id: new mongoose.Types.ObjectId().toString() },
      },
      a.id,
      {
        version: 0,
        status: "APPROVED",
        notes: "Independent measurement specification approved",
      },
    );
    const [u] = await PhysicalUnitsService.receive(admin, {
      variant,
      quantity: 1,
      location: "QC-MEASURE",
      idempotencyKey: `measure-${run}`,
    });
    const input = {
      sop: doc.id,
      result: "PASSED" as const,
      completed: [],
      evidence: [],
      measurements: {},
      version: 0,
    };
    await expect(
      PhysicalUnitsService.qc(admin, u.unitId, input),
    ).rejects.toThrow();
    await expect(
      PhysicalUnitsService.qc(admin, u.unitId, {
        ...input,
        measurements: { test_width: 12 },
      }),
    ).rejects.toThrow();
    const result = await PhysicalUnitsService.qc(admin, u.unitId, {
      ...input,
      measurements: { test_width: 10 },
    });
    expect(result.state).toBe("PACKAGING_PENDING");
  });
  it("requires independent approval to rework failed QC", async () => {
    const received = await PhysicalUnitsService.receive(admin, {
      variant,
      quantity: 1,
      location: "QC-REWORK",
      idempotencyKey: `qc-rework-${run}`,
    });
    const u = received[0];
    await PhysicalUnitsService.qc(admin, u.unitId, {
      sop: productSop,
      result: "FAILED",
      defectCategory: "seam",
      completed: ["inspect"],
      evidence: [evidence],
      measurements: {},
      version: 0,
      reason: "Synthetic seam defect",
    });
    await expect(
      PhysicalUnitsService.qc(admin, u.unitId, {
        sop: productSop,
        result: "PASSED",
        completed: ["inspect"],
        evidence: [evidence],
        measurements: {},
        version: 1,
      }),
    ).rejects.toThrow();
    const a = await PhysicalUnitsService.requestRework(admin, u.unitId, {
      version: 1,
      reason: "Authorize inspected seam rework",
    });
    await expect(
      ApprovalService.review(admin, a.id, {
        version: 0,
        status: "APPROVED",
        notes: "Self approval denied",
      }),
    ).rejects.toThrow();
    await ApprovalService.review(
      {
        ...admin,
        actor: { ...admin.actor, id: new mongoose.Types.ObjectId().toString() },
      },
      a.id,
      { version: 0, status: "APPROVED", notes: "Independent rework accepted" },
    );
    expect((await PhysicalUnitModel.findOne({ unitId: u.unitId }))?.state).toBe(
      "QC_PENDING",
    );
    expect(await stock()).toBe(0);
  });
  it('preserves immutable inspection versions and protects their private evidence',async()=>{
    const bytes=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aB1UAAAAASUVORK5CYII=','base64');const asset=await MediaService.upload(admin,{body:bytes,contentType:'image/png',name:'historical-inspection.png',visibility:'private'}) as {id:string};
    const [u]=await PhysicalUnitsService.receive(admin,{variant,quantity:1,location:'ARCHIVE-TEST',idempotencyKey:`archive-${run}`});await PhysicalUnitsService.qc(admin,u.unitId,{sop:productSop,result:'PASSED',completed:['inspect'],evidence:[asset.id],measurements:{},version:0});
    const detail=await PhysicalUnitsService.detail(admin,u.unitId) as unknown as {inspectionHistory?:{kind:string;sopVersion:number}[]};expect(detail.inspectionHistory).toHaveLength(1);expect(detail.inspectionHistory![0].sopVersion).toBe(2);await expect(MediaService.remove(admin,asset.id)).rejects.toThrow('Referenced evidence');
  });
  it("measures a 500-unit synthetic receiving and indexed page query", async () => {
    const start = performance.now();
    const units = await PhysicalUnitsService.receive(admin, {
      variant,
      quantity: 500,
      location: "SYNTH-PERF",
      idempotencyKey: `perf-${run}`,
    });
    const receiveMs = performance.now() - start;
    const before = performance.now();
    const result = await PhysicalUnitsService.list(admin, {
      page: 1,
      limit: 20,
      q: units[0].unitId,
    });
    const queryMs = performance.now() - before;
    expect(result.items).toHaveLength(1);
    expect(result.items[0].unitId).toBe(units[0].unitId);
    console.log(
      JSON.stringify({
        syntheticUnits: 500,
        receiveMs: Math.round(receiveMs),
        queryMs: Math.round(queryMs),
        noPerformanceSlaClaim: true,
      }),
    );
  });
});
