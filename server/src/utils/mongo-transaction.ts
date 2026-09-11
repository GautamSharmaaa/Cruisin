// Governed by .rules v1.0
import mongoose, { type ClientSession } from 'mongoose';
import { env } from '../config/env.js';
import { ApiError } from './api-error.js';

const retryable = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') return false;
  if ('hasErrorLabel' in error && typeof error.hasErrorLabel === 'function') {
    const hasErrorLabel = error.hasErrorLabel as (label: string) => boolean;
    if (hasErrorLabel('TransientTransactionError') || hasErrorLabel('UnknownTransactionCommitResult')) return true;
  }
  return false;
};

export const withMongoTransaction = async <T>(work: (session?: ClientSession) => Promise<T>): Promise<T> => {
  // Pure unit tests mock model methods without a MongoDB session. Integration
  // tests and every deployed environment still exercise the transaction path.
  if (env.NODE_ENV === 'test' && mongoose.connection.readyState !== 1) return await work(undefined);
  const session = await mongoose.startSession();
  try {
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      let result: T | undefined;
      try {
        await session.withTransaction(async () => {
          result = await work(session);
        }, { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } });
        if (result === undefined) throw new ApiError(500, 'Checkout transaction did not return a result');
        return result;
      } catch (error) {
        if (attempt === 3 || !retryable(error)) throw error;
      }
    }
    throw new ApiError(409, 'Checkout transaction could not be completed');
  } finally {
    await session.endSession();
  }
};
