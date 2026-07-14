// Governed by .rules v1.0
import * as Sentry from '@sentry/node';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import mongoose from 'mongoose';
import { env } from './config/env.js';
import { allowedBrowserOrigins } from './config/origins.js';
import { redis } from './config/redis.js';
import { errorHandler } from './middleware/error.middleware.js';
import { mongoSanitizeMiddleware } from './middleware/mongo-sanitize.middleware.js';
import { generalLimiter } from './middleware/rate-limit.middleware.js';
import { v1Router } from './routes/v1/index.js';
import { ApiError } from './utils/api-error.js';
import { ApiResponse } from './utils/api-response.js';


export const createApp = (): Express => {
  const app = express();
  app.set('trust proxy', env.TRUST_PROXY);
  if (env.SENTRY_DSN) Sentry.init({ dsn: env.SENTRY_DSN, environment: env.NODE_ENV });
  app.use(helmet({ contentSecurityPolicy: env.NODE_ENV === 'production' ? { directives: { defaultSrc: ["'self'"], imgSrc: ["'self'", 'data:', 'https://res.cloudinary.com'], scriptSrc: ["'self'"], styleSrc: ["'self'", "'unsafe-inline'"], connectSrc: ["'self'", env.CLIENT_URL, env.ADMIN_URL] } } : false }));
  app.use(cors({ origin: allowedBrowserOrigins, credentials: true }));
  app.use('/api/v1/payments/webhooks/stripe', express.raw({ type: 'application/json' }));
  app.use('/api/v1/payments/webhooks/razorpay', express.raw({ type: 'application/json' }));
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  app.use(mongoSanitizeMiddleware);
  app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
  app.get('/health', (_req, res) => { res.json(new ApiResponse({ status: 'ok' }, 'API healthy')); });
  app.get('/ready', async (_req, res) => {
    try {
      if (mongoose.connection.readyState !== 1) throw new Error('MongoDB is not ready');
      await redis.ping();
      res.json(new ApiResponse({ status: 'ready' }, 'API ready'));
    } catch {
      res.status(503).json(new ApiResponse({ status: 'not_ready' }, 'API dependencies unavailable', ['Dependency health check failed']));
    }
  });
  app.use('/api/v1', generalLimiter, v1Router);
  app.use((_req, _res, next) => { next(new ApiError(404, 'Route not found')); });
  app.use(errorHandler);
  return app;
};
