import { beforeAll, afterAll, it, expect } from "vitest";
import mongoose from "mongoose";
import { permissions } from "@cruisin/contracts";
import { randomUUID } from "node:crypto";
import { SopService } from "./sop.service.js";
import { ApprovalService } from "./approval.service.js";
import {
  SopDocumentModel,
  SopVersionModel,
} from "../models/sop-document.model.js";
import type { OperationsContext } from "./operations-context.js";
const author: OperationsContext = {
  actor: {
    id: new mongoose.Types.ObjectId().toString(),
    kind: "admin",
    name: "Author",
    permissions: [...permissions],
  },
  correlationId: randomUUID(),
};
const reviewer: OperationsContext = {
  ...author,
  actor: {
    ...author.actor,
    id: new mongoose.Types.ObjectId().toString(),
    name: "Reviewer",
  },
};
beforeAll(async () => {
  const u = new URL(process.env.MONGODB_URI!);
  if (
    !["127.0.0.1", "localhost"].includes(u.hostname) ||
    u.pathname !== "/cruisin-sync-order-analytics-tests"
  )
    throw new Error("Unsafe DB");
  await mongoose.connect(u.href);
});
afterAll(async () => {
  await mongoose.disconnect();
});
it("requires independent version-bound approval before publishing product and packaging SOPs", async () => {
  for (const kind of ["PRODUCT", "PACKAGING"] as const) {
    const draft = (await SopService.create(author, {
      kind,
      title: `${kind} review fixture`,
      category: kind,
      body: "Configured administrator instructions",
    })) as { id: string; version: number };
    await expect(
      SopService.publish(author, draft.id, draft.version),
    ).rejects.toThrow();
    const request = (await SopService.requestPublication(
      author,
      draft.id,
      draft.version,
    )) as { id: string; version: number };
    await expect(
      ApprovalService.review(author, request.id, {
        version: request.version,
        status: "APPROVED",
        notes: "Self review denied",
      }),
    ).rejects.toThrow();
    await ApprovalService.review(reviewer, request.id, {
      version: request.version,
      status: "APPROVED",
      notes: "Independent published specification review",
    });
    const published = await SopDocumentModel.findById(draft.id);
    expect(published?.status).toBe("PUBLISHED");
    expect(await SopVersionModel.countDocuments({ document: draft.id })).toBe(
      1,
    );
    await expect(
      ApprovalService.review(reviewer, request.id, {
        version: request.version,
        status: "APPROVED",
        notes: "Duplicate review rejected",
      }),
    ).rejects.toThrow();
  }
});
