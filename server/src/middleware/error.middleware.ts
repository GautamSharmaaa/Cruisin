// Governed by .rules v1.0
import * as Sentry from '@sentry/node';
import type { ErrorRequestHandler } from 'express';
import { env } from '../config/env.js';
import { ApiError } from '../utils/api-error.js';
import { ApiResponse } from '../utils/api-response.js';
import { logger } from '../utils/logger.js';

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next): void => {
  const isApiError = error instanceof ApiError;
  const apiError = isApiError ? error : new ApiError(500, 'Internal server error', [], false);
  if (!apiError.isOperational && env.NODE_ENV === 'production') {
    Sentry.captureException(error);
  }
  logger.error(isApiError ? apiError.message : error?.message || 'Internal server error', {
    statusCode: apiError.statusCode,
    errors: apiError.errors,
    stack: env.NODE_ENV === 'production' ? undefined : (isApiError ? apiError.stack : error?.stack || new Error().stack)
  });
  const visibleMessage = env.NODE_ENV === 'production' && !apiError.isOperational ? 'Internal server error' : apiError.message;
  res.status(apiError.statusCode).json(new ApiResponse(null, visibleMessage, apiError.errors.length > 0 ? apiError.errors : [visibleMessage]));
};

