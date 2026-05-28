// Governed by .rules v1.0
import type { RequestHandler } from 'express';
import { ApiError } from '../utils/api-error.js';
import type { AdminRole } from '../types/auth.types.js';

const adminRoles: AdminRole[] = ['admin', 'superadmin', 'manager', 'viewer'];

export const requireAdmin: RequestHandler = (req, _res, next): void => {
  if (!req.user || !adminRoles.includes(req.user.role as AdminRole)) {
    next(new ApiError(403, 'Admin permission required'));
    return;
  }
  next();
};

export const requireRole = (roles: AdminRole[]): RequestHandler => {
  return (req, _res, next): void => {
    if (!req.user || !roles.includes(req.user.role as AdminRole)) {
      next(new ApiError(403, 'Insufficient role permission'));
      return;
    }
    next();
  };
};
