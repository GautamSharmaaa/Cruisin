// Governed by .rules v1.0
import crypto from 'node:crypto';
import type { ClientSession } from 'mongoose';
import { env } from '../../config/env.js';
import { redis } from '../../config/redis.js';
import { LogisticsJobModel, logisticsJobTypes } from '../../models/logistics-job.model.js';
import { LogisticsProviderError } from '../../types/logistics.types.js';
import { ApiError } from '../../utils/api-error.js';
import { logger } from '../../utils/logger.js';
import { LogisticsService } from './logistics.service.js';

export type LogisticsJobType = (typeof logisticsJobTypes)[number];

const payloadString = (payload: Record<string, unknown>, key: string): string => {
  const value = payload[key];
  if (typeof value !== 'string' || value.length === 0) throw new ApiError(400, `Logistics job is missing ${key}`);
  return value;
};

const payloadNumber = (payload: Record<string, unknown>, key: string): number | undefined => {
  const value = payload[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
};

const execute = async (type: LogisticsJobType, payload: Record<string, unknown>): Promise<void> => {
  switch (type) {
    case 'create_order':
      await LogisticsService.createProviderOrderForOrder(payloadString(payload, 'orderId'));
      return;
    case 'assign_awb':
      await LogisticsService.assignAwb(payloadString(payload, 'shipmentId'), payloadNumber(payload, 'courierId'));
      return;
    case 'schedule_pickup':
      await LogisticsService.schedulePickup(payloadString(payload, 'shipmentId'));
      return;
    case 'generate_label':
      await LogisticsService.generateDocument(payloadString(payload, 'shipmentId'), 'label');
      return;
    case 'generate_invoice':
      await LogisticsService.generateDocument(payloadString(payload, 'shipmentId'), 'invoice');
      return;
    case 'generate_manifest':
      await LogisticsService.generateDocument(payloadString(payload, 'shipmentId'), 'manifest');
      return;
    case 'refresh_tracking':
    case 'reconcile_tracking':
      await LogisticsService.refreshTracking(payloadString(payload, 'shipmentId'));
      return;
    case 'cancel_shipment':
      await LogisticsService.cancel(payloadString(payload, 'shipmentId'), payloadString(payload, 'adminId'));
      return;
    case 'create_return':
    case 'create_exchange':
      throw new LogisticsProviderError('configuration', `${type} requires an approved request workflow`, false, 409);
    case 'order_created': {
      const { OrderService } = await import('../order.service.js');
      await OrderService.processOrderCreatedOutbox(payloadString(payload, 'orderId'));
      return;
    }
    case 'release_payment_reservation': {
      const { OrderService } = await import('../order.service.js');
      await OrderService.releaseExpiredReservation(payloadString(payload, 'orderId'));
      return;
    }
  }
};

const retryDelayMs = (attempt: number): number => {
  if (env.NODE_ENV === 'test') return 250;
  const base = Math.min(30_000 * (2 ** Math.max(0, attempt - 1)), 30 * 60_000);
  return base + Math.floor(Math.random() * 5_000);
};

export const LogisticsJobService = {
  async enqueue(type: LogisticsJobType, payload: Record<string, unknown>, dedupeKey: string, maxAttempts = 5, writeOptions?: { session?: ClientSession; runAt?: Date }): Promise<unknown> {
    try {
      const data = { type, payload, dedupeKey, maxAttempts, runAt: writeOptions?.runAt };
      return writeOptions?.session
        ? (await LogisticsJobModel.create([data], { session: writeOptions.session }))[0]
        : await LogisticsJobModel.create(data);
    } catch (error) {
      if (typeof error === 'object' && error !== null && 'code' in error && (error as { code?: number }).code === 11000) {
        const existing = await LogisticsJobModel.findOne({ dedupeKey });
        if (existing) return existing;
      }
      throw error;
    }
  },

  async processNext(): Promise<boolean> {
    const claimId = crypto.randomUUID();
    if (!await redis.setIfAbsent('logistics:worker:claim', claimId, 5)) return false;
    let job;
    try {
      const now = new Date();
      job = await LogisticsJobModel.findOneAndUpdate(
        {
          runAt: { $lte: now },
          $or: [
            { status: 'queued' },
            { status: 'running', leaseExpiresAt: { $lte: now } }
          ]
        },
        {
          $set: { status: 'running', leaseId: claimId, leaseExpiresAt: new Date(Date.now() + 60_000) },
          $inc: { attempts: 1 }
        },
        { sort: { runAt: 1, createdAt: 1 }, new: true }
      );
    } finally {
      await redis.del('logistics:worker:claim').catch(() => undefined);
    }
    if (!job) return false;
    try {
      await execute(job.type, job.payload as Record<string, unknown>);
      await LogisticsJobModel.updateOne({ _id: job._id, leaseId: claimId }, {
        $set: { status: 'succeeded', completedAt: new Date() },
        $unset: { leaseId: 1, leaseExpiresAt: 1, lastError: 1 }
      });
    } catch (error) {
      const providerError = error instanceof LogisticsProviderError ? error : undefined;
      const retryable = providerError?.retryable ?? ['order_created', 'release_payment_reservation'].includes(job.type);
      const dead = !retryable || job.attempts >= job.maxAttempts;
      await LogisticsJobModel.updateOne({ _id: job._id, leaseId: claimId }, {
        $set: {
          status: dead ? 'dead' : 'queued',
          runAt: dead ? job.runAt : new Date(Date.now() + retryDelayMs(job.attempts)),
          lastError: {
            code: providerError?.code ?? 'unknown',
            message: error instanceof Error ? error.message : 'Logistics job failed',
            retryable,
            occurredAt: new Date()
          }
        },
        $unset: { leaseId: 1, leaseExpiresAt: 1 }
      });
      logger.error('Logistics job failed', { jobId: job._id, type: job.type, attempt: job.attempts, retryable });
    }
    return true;
  },

  async list(input: { page: number; limit: number; status?: string }): Promise<unknown> {
    const filter = input.status ? { status: input.status } : {};
    const [items, total] = await Promise.all([
      LogisticsJobModel.find(filter).sort({ createdAt: -1 }).skip((input.page - 1) * input.limit).limit(input.limit).lean(),
      LogisticsJobModel.countDocuments(filter)
    ]);
    return { items, total, page: input.page, limit: input.limit, pages: Math.ceil(total / input.limit) };
  }
};
