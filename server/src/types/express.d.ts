// Governed by .rules v1.0
import type { Principal } from '@cruisin/contracts';
import type { AccessTokenPayload } from './auth.types.js';

declare global {
  namespace Express {
    interface Request {
      user?: AccessTokenPayload;
      operationsPrincipal?: Principal;
      employeeSessionId?: string;
      sessionId?: string;
    }
  }
}

export {};
