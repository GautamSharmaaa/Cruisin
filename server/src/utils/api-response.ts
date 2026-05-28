// Governed by .rules v1.0
import type { ApiEnvelope } from '../types/api.types.js';

export class ApiResponse<TData> implements ApiEnvelope<TData> {
  public readonly success: boolean;
  public readonly data: TData;
  public readonly message: string;
  public readonly error?: string[];

  public constructor(data: TData, message: string, error?: string[]) {
    this.success = error === undefined;
    this.data = data;
    this.message = message;
    if (error !== undefined) {
      this.error = error;
    }
  }
}
