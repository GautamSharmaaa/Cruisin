// Governed by .rules v1.0
import jwt from 'jsonwebtoken';
import type { Request, RequestHandler } from 'express';
import { env } from '../config/env.js';
import { ApiError } from '../utils/api-error.js';
import type { AccessTokenPayload } from '../types/auth.types.js';
import { recordPerformanceStage } from '../utils/request-performance.js';

import { CustomerAccessService } from '../services/customer-access.service.js';

const assistedRoutes = new Set([
  'GET /auth/me', 'GET /auth/addresses',
  'GET /cart/', 'PUT /cart/sync', 'POST /cart/items', 'PUT /cart/items',
  'POST /cart/coupon', 'DELETE /cart/coupon',
  'POST /logistics/quotes', 'POST /orders/cod', 'GET /orders/mine',
  'POST /customer-access/end'
]);

const checkAssistedAccess = async (req: Request, payload: AccessTokenPayload): Promise<void> => {
  if (!payload.assisted) return;
  const path = (req.baseUrl + req.path).slice('/api/v1'.length);
  const route = req.method + ' ' + path;
  const orderDetail = req.method === 'GET' && /^\/orders\/[a-f0-9]{24}$/i.test(path);
  const cartRemoval = req.method === 'DELETE' && /^\/cart\/items\/[^/]+\/[^/]+$/.test(path);
  if (!assistedRoutes.has(route) && !orderDetail && !cartRemoval) {
    throw new ApiError(403, 'This action is unavailable in assisted access.');
  }
  await CustomerAccessService.assertActive(payload);
};

const parseBearer = (header: string | undefined): string => {
  if (!header?.startsWith('Bearer ')) {
    throw new ApiError(401, 'Please sign in to continue.');
  }
  return header.slice(7);
};

export const requireAuth: RequestHandler = async (req, _res, next): Promise<void> => {
  try {
    const payload = recordPerformanceStage('auth', () =>
      jwt.verify(parseBearer(req.headers.authorization), env.JWT_ACCESS_SECRET) as AccessTokenPayload
    );
    await checkAssistedAccess(req, payload);
    req.user = payload;
    next();
  } catch (error: unknown) {
    next(error instanceof ApiError ? error : new ApiError(401, 'Please sign in to continue.'));
  }
};

export const optionalSession: RequestHandler = async (req, _res, next): Promise<void> => {
  const authorization = req.headers.authorization;
  if (authorization?.startsWith('Bearer ')) {
    let payload: AccessTokenPayload | undefined;
    try {
      payload = recordPerformanceStage('auth', () =>
        jwt.verify(authorization.slice(7), env.JWT_ACCESS_SECRET) as AccessTokenPayload
      );
    } catch {
      // Carts remain available to guests. Protected checkout routes enforce auth separately.
    }
    if (payload) {
      try {
        await checkAssistedAccess(req, payload);
        req.user = payload;
      } catch (error) {
        next(error);
        return;
      }
    }
  }
  const headerSession = req.headers['x-session-id'] ?? req.headers['x-device-fingerprint'];
  if (typeof headerSession === 'string' && headerSession.length > 8) {
    req.sessionId = headerSession;
  }
  next();
};
