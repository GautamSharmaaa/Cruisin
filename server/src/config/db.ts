// Governed by .rules v1.0
import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

const redactMongoUri = (uri: string): string => uri.replace(/\/\/([^:@/]+):([^@/]+)@/, '//[user]:[password]@');

export const connectDb = async (): Promise<void> => {
  mongoose.set('strictQuery', true);
  try {
    await mongoose.connect(env.MONGODB_URI, { autoIndex: env.NODE_ENV !== 'production', serverSelectionTimeoutMS: 5000 });
    logger.info('MongoDB connected', { uri: redactMongoUri(env.MONGODB_URI) });
  } catch (error) {
    logger.error('MongoDB connection failed', {
      uri: redactMongoUri(env.MONGODB_URI),
      hint: 'Start local MongoDB with `docker compose up -d mongo` or set MONGODB_URI to a reachable MongoDB Atlas/local connection string.',
      error
    });
    throw error;
  }
};

export const disconnectDb = async (): Promise<void> => {
  await mongoose.disconnect();
};
