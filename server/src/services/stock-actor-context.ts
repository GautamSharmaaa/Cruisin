import { AsyncLocalStorage } from "node:async_hooks";
import type { Request } from "express";
export const stockActorContext = new AsyncLocalStorage<{ request: Request }>();
export const stockActor = (): string => {
  const req = stockActorContext.getStore()?.request;
  return req?.operationsPrincipal?.id ?? req?.user?.userId ?? "system";
};
