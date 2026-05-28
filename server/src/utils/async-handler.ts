// Governed by .rules v1.0
import type { NextFunction, Request, RequestHandler, Response } from 'express';

export const asyncHandler = <TRequest extends Request = Request>(
  fn: (req: TRequest, res: Response, next: NextFunction) => Promise<void>
): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction): void => {
    void fn(req as TRequest, res, next).catch(next);
  };
};
