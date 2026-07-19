// Governed by .rules v1.0
import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

const wait = async (milliseconds: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, milliseconds));

export const connectDb = async (): Promise<void> => {
  if (mongoose.connection.readyState === 1) return;
  if (mongoose.connection.readyState === 2) {
    await mongoose.connection.asPromise();
    return;
  }
  mongoose.set('strictQuery', true);
  const attempts = env.NODE_ENV === 'test' ? 1 : 5;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await mongoose.connect(env.MONGODB_URI, {
        autoIndex: env.NODE_ENV !== 'production',
        maxPoolSize: 10,
        minPoolSize: 0,
        maxIdleTimeMS: 60_000,
        serverSelectionTimeoutMS: 5_000
      });
      logger.info('MongoDB connected', { database: mongoose.connection.name });
      return;
    } catch (error) {
      logger.error('MongoDB connection attempt failed', { attempt, attempts, error });
      if (attempt === attempts) throw error;
      await mongoose.disconnect().catch(() => undefined);
      await wait(Math.min(1_000 * (2 ** (attempt - 1)), 8_000));
    }
  }
};

export const disconnectDb = async (): Promise<void> => {
  await mongoose.disconnect();
};
