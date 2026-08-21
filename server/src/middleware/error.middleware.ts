// Governed by .rules v1.0
import * as Sentry from '@sentry/node';
import type { ErrorRequestHandler } from 'express';
import { env } from '../config/env.js';
import { ApiError } from '../utils/api-error.js';
import { ApiResponse } from '../utils/api-response.js';
import { logger } from '../utils/logger.js';
import { finishPerformanceFlow } from '../utils/request-performance.js';

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next): void => {
  const isBodyParserError = error instanceof SyntaxError && typeof (error as { status?: unknown }).status === 'number' && (error as { body?: unknown }).body !== undefined;
  const isApiError = error instanceof ApiError;
  const apiError = isApiError ? error : isBodyParserError ? new ApiError(400, 'Bad Request', ['Malformed JSON request body']) : new ApiError(500, 'Internal server error', [], false);
  if (!apiError.isOperational && env.NODE_ENV === 'production') {
    Sentry.captureException(error);
  }
  logger.error(isApiError ? apiError.message : error?.message || 'Internal server error', {
    statusCode: apiError.statusCode,
    errors: apiError.errors,
    stack: env.NODE_ENV === 'production' ? undefined : (isApiError ? apiError.stack : error?.stack || new Error().stack)
  });
  const visibleMessage = env.NODE_ENV === 'production' && !apiError.isOperational ? 'Internal server error' : apiError.message;
  finishPerformanceFlow(undefined, res);
  res.status(apiError.statusCode).json(new ApiResponse(apiError.data ?? null, visibleMessage, apiError.errors.length > 0 ? apiError.errors : [visibleMessage]));
};
