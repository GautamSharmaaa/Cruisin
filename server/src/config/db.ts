// Governed by .rules v1.0
import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

export const connectDb = async (): Promise<void> => {
  mongoose.set('strictQuery', true);
  await mongoose.connect(env.MONGODB_URI, { autoIndex: env.NODE_ENV !== 'production' });
  logger.info('MongoDB connected');
};

export const disconnectDb = async (): Promise<void> => {
  await mongoose.disconnect();
};
