// Governed by .rules v1.0
export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly errors: string[];
  public readonly isOperational: boolean;
  public readonly data?: unknown;

  public constructor(statusCode: number, message: string, errors: string[] = [], isOperational = true, data?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.isOperational = isOperational;
    this.data = data;
    Error.captureStackTrace(this, this.constructor);
  }
}
