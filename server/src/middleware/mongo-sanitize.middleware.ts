// Governed by .rules v1.0
import type { Request, Response, NextFunction } from 'express';

const hasToSanitize = (key: string): boolean => {
  return key.startsWith('$') || key.includes('.');
};

const sanitize = (target: any): void => {
  if (target && typeof target === 'object') {
    for (const key in target) {
      if (Object.prototype.hasOwnProperty.call(target, key)) {
        if (hasToSanitize(key)) {
          delete target[key];
        } else if (typeof target[key] === 'object') {
          sanitize(target[key]);
        }
      }
    }
  }
};

export const mongoSanitizeMiddleware = (req: Request, _res: Response, next: NextFunction): void => {
  if (req.body) sanitize(req.body);
  if (req.query) sanitize(req.query);
  if (req.params) sanitize(req.params);
  next();
};
