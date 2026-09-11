// Governed by .rules v1.0
import crypto from 'node:crypto';
import { AsyncLocalStorage } from 'node:async_hooks';
import type { NextFunction, Request, Response } from 'express';
import { logger } from './logger.js';

interface PerformanceStage {
  name: string;
  durationMs: number;
}

interface RequestPerformanceContext {
  requestId: string;
  requestStartedAt: number;
  stages: PerformanceStage[];
  flow?: 'cart' | 'coupon' | 'checkout';
  finished: boolean;
}

const storage = new AsyncLocalStorage<RequestPerformanceContext>();
const safeRequestId = /^[a-zA-Z0-9:_-]{8,120}$/;

const requestPrefix = (path: string): string => {
  if (path.includes('/cart/coupon')) return 'coupon';
  if (path.includes('/orders/') || path.includes('/payments/razorpay/create-order')) return 'checkout';
  return 'request';
};

const requestFlow = (path: string): RequestPerformanceContext['flow'] => {
  if (path.includes('/cart/coupon')) return 'coupon';
  if (path.includes('/cart')) return 'cart';
  if (path.includes('/orders/') || path.includes('/payments/razorpay/create-order')) return 'checkout';
  return undefined;
};

const createRequestId = (req: Request): string => {
  const supplied = req.headers['x-correlation-id'] ?? req.headers['x-request-id'];
  if (typeof supplied === 'string' && safeRequestId.test(supplied)) return supplied;
  return `${requestPrefix(req.path)}-${crypto.randomUUID().slice(0, 8)}`;
};

export const requestPerformanceMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const requestId = createRequestId(req);
  res.setHeader('x-request-id', requestId);
  storage.run({ requestId, requestStartedAt: performance.now(), stages: [], flow: requestFlow(req.path), finished: false }, () => {
    res.once('finish', () => finishPerformanceFlow());
    next();
  });
};

export const requestId = (): string => storage.getStore()?.requestId ?? 'request-unscoped';

export const recordPerformanceStage = <T>(name: string, work: () => T): T => {
  const startedAt = performance.now();
  try {
    const result = work();
    if (result && typeof result === 'object' && 'then' in result && typeof result.then === 'function') {
      return (Promise.resolve(result as unknown).finally(() => {
        storage.getStore()?.stages.push({ name, durationMs: performance.now() - startedAt });
      }) as unknown) as T;
    }
    storage.getStore()?.stages.push({ name, durationMs: performance.now() - startedAt });
    return result;
  } catch (error) {
    storage.getStore()?.stages.push({ name, durationMs: performance.now() - startedAt });
    throw error;
  }
};

const rounded = (value: number): number => Math.round(value * 10) / 10;

export const finishPerformanceFlow = (flow?: 'cart' | 'coupon' | 'checkout', res?: Response): void => {
  const context = storage.getStore();
  if (!context || context.finished || !(flow ?? context.flow)) return;
  context.finished = true;
  const totalMs = performance.now() - context.requestStartedAt;
  const stages = Object.fromEntries(context.stages.map((stage) => [stage.name, rounded(stage.durationMs)]));
  if (res && !res.headersSent && context.stages.length > 0) {
    const serverTiming = context.stages
      .map((stage) => `${stage.name.replace(/[^a-zA-Z0-9_-]/g, '_')};dur=${rounded(stage.durationMs)}`)
      .join(', ');
    res.setHeader('Server-Timing', `${serverTiming}, total;dur=${rounded(totalMs)}`);
  }
  logger.info('Commerce performance', {
    requestId: context.requestId,
    flow: flow ?? context.flow,
    totalMs: rounded(totalMs),
    stages
  });
};
