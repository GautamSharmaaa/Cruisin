// Governed by .rules v1.0
import type { NextFunction, Request, Response } from 'express';
import type { ZodSchema } from 'zod';
import { ApiError } from '../utils/api-error.js';

export interface RequestSchemas {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}

export const validate = (schemas: RequestSchemas) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const bodyResult = schemas.body?.safeParse(req.body);
    if (bodyResult && !bodyResult.success) {
      next(new ApiError(400, 'Invalid request body', bodyResult.error.issues.map((issue) => issue.message)));
      return;
    }
    if (bodyResult?.success) {
      req.body = bodyResult.data as object;
    }
    const queryResult = schemas.query?.safeParse(req.query);
    if (queryResult && !queryResult.success) {
      next(new ApiError(400, 'Invalid request query', queryResult.error.issues.map((issue) => issue.message)));
      return;
    }
    if (queryResult?.success) {
      Object.defineProperty(req, 'query', {
        value: queryResult.data as Request['query'],
        configurable: true,
        enumerable: true,
        writable: true
      });
    }
    const paramsResult = schemas.params?.safeParse(req.params);
    if (paramsResult && !paramsResult.success) {
      next(new ApiError(400, 'Invalid request params', paramsResult.error.issues.map((issue) => issue.message)));
      return;
    }
    if (paramsResult?.success) {
      const data = paramsResult.data as Record<string, unknown>;
      for (const key in req.params) {
        if (Object.prototype.hasOwnProperty.call(req.params, key)) {
          delete req.params[key];
        }
      }
      Object.assign(req.params, data);
    }
    next();
  };
};
