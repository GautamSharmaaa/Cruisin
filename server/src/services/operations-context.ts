import { randomUUID } from "node:crypto";
import type { ClientSession } from "mongoose";
import type { Request } from "express";
import type { Principal, Permission } from "@cruisin/contracts";
import {
  OperationsAuditModel,
  OperationsNotificationModel,
} from "../models/operations-event.model.js";
import { ApiError } from "../utils/api-error.js";
export interface OperationsContext {
  actor: Principal;
  correlationId: string;
}
export const contextFrom = (req: Request): OperationsContext => {
  if (!req.operationsPrincipal)
    throw new ApiError(401, "Authentication required");
  return {
    actor: req.operationsPrincipal,
    correlationId:
      typeof req.headers["x-request-id"] === "string" &&
      /^[a-zA-Z0-9-]{8,80}$/.test(req.headers["x-request-id"])
        ? req.headers["x-request-id"]
        : randomUUID(),
  };
};
export const permit = (
  ctx: OperationsContext,
  permission: Permission,
): void => {
  if (!ctx.actor.permissions.includes(permission))
    throw new ApiError(403, "Insufficient operational permission");
};
export const audit = async (
  ctx: OperationsContext,
  action: string,
  entity: string,
  summary: string,
  session?: ClientSession,
  result: "success" | "failure" | "denied" = "success",
): Promise<void> => {
  await OperationsAuditModel.create(
    [
      {
        actor: ctx.actor.id,
        actorKind: ctx.actor.kind,
        action,
        entity,
        result,
        summary: summary.slice(0, 1000),
        correlationId: ctx.correlationId,
      },
    ],
    { session },
  );
};
export const notify = async (
  recipients: string[],
  event: string,
  entity: string,
  version: number,
  message: string,
  session?: ClientSession,
): Promise<void> => {
  for (const recipient of new Set(recipients))
    await OperationsNotificationModel.updateOne(
      { dedupeKey: `${event}:${entity}:${version}:${recipient}` },
      { $setOnInsert: { recipient, event, entity, message } },
      { upsert: true, session },
    );
};
