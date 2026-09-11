// Governed by .rules v1.0
import jwt from 'jsonwebtoken';
import type { RequestHandler } from 'express';
import { env } from '../config/env.js';
import { ApiError } from '../utils/api-error.js';
import type { AccessTokenPayload } from '../types/auth.types.js';
import { recordPerformanceStage } from '../utils/request-performance.js';

const parseBearer = (header: string | undefined): string => {
  if (!header?.startsWith('Bearer ')) {
    throw new ApiError(401, 'Please sign in to continue.');
  }
  return header.slice(7);
};

export const requireAuth: RequestHandler = (req, _res, next): void => {
  try {
    recordPerformanceStage('auth', () => {
      const token = parseBearer(req.headers.authorization);
      const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
      req.user = payload;
    });
    next();
  } catch (error: unknown) {
    next(error instanceof ApiError ? error : new ApiError(401, 'Please sign in to continue.'));
  }
};

export const optionalSession: RequestHandler = (req, _res, next): void => {
  const authorization = req.headers.authorization;
  if (authorization?.startsWith('Bearer ')) {
    try {
      recordPerformanceStage('auth', () => {
        req.user = jwt.verify(authorization.slice(7), env.JWT_ACCESS_SECRET) as AccessTokenPayload;
      });
    } catch {
      // Carts remain available to guests. Protected checkout routes still enforce auth separately.
    }
  }
  const headerSession = req.headers['x-session-id'] ?? req.headers['x-device-fingerprint'];
  if (typeof headerSession === 'string' && headerSession.length > 8) {
    req.sessionId = headerSession;
  }
  next();
};
