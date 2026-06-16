// Governed by .rules v1.0
import type { Request, Response, NextFunction } from 'express';

const hasToSanitize = (key: string): boolean => {
  return key.startsWith('$') || key.includes('.');
};

const isRecord = (target: unknown): target is Record<string, unknown> => {
  return typeof target === 'object' && target !== null;
};

const sanitize = (target: unknown): void => {
  if (isRecord(target)) {
    for (const key in target) {
      if (Object.prototype.hasOwnProperty.call(target, key)) {
        if (hasToSanitize(key)) {
          delete target[key];
        } else if (isRecord(target[key])) {
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
