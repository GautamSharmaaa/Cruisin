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
      req.query = queryResult.data as Request['query'];
    }
    const paramsResult = schemas.params?.safeParse(req.params);
    if (paramsResult && !paramsResult.success) {
      next(new ApiError(400, 'Invalid request params', paramsResult.error.issues.map((issue) => issue.message)));
      return;
    }
    if (paramsResult?.success) {
      req.params = paramsResult.data as Request['params'];
    }
    next();
  };
};
