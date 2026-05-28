// Governed by .rules v1.0
import jwt from 'jsonwebtoken';
import type { RequestHandler } from 'express';
import { env } from '../config/env.js';
import { ApiError } from '../utils/api-error.js';
import type { AccessTokenPayload } from '../types/auth.types.js';

const parseBearer = (header: string | undefined): string => {
  if (!header?.startsWith('Bearer ')) {
    throw new ApiError(401, 'Authentication required');
  }
  return header.slice(7);
};

export const requireAuth: RequestHandler = (req, _res, next): void => {
  try {
    const token = parseBearer(req.headers.authorization);
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
    req.user = payload;
    next();
  } catch (error: unknown) {
    next(error instanceof ApiError ? error : new ApiError(401, 'Session expired'));
  }
};

export const optionalSession: RequestHandler = (req, _res, next): void => {
  const headerSession = req.headers['x-session-id'];
  if (typeof headerSession === 'string' && headerSession.length > 8) {
    req.sessionId = headerSession;
  }
  next();
};
