import type { RequestHandler } from 'express';
import { env } from '../config/env.js';
import { allowedBrowserOrigins } from '../config/origins.js';
import { ApiError } from '../utils/api-error.js';

const allowedOrigins = new Set(allowedBrowserOrigins);

export const requireBrowserOrigin: RequestHandler = (req, _res, next): void => {
  const origin = req.headers.origin;
  if (origin && !allowedOrigins.has(origin)) {
    next(new ApiError(403, 'Request origin is not allowed'));
    return;
  }

  if (env.NODE_ENV === 'production' && !origin) {
    next(new ApiError(403, 'Request origin is required'));
    return;
  }

  next();
};
