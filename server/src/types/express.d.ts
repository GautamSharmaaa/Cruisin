// Governed by .rules v1.0
import type { UserRole } from './auth.types.js';

declare global {
  namespace Express {
    interface AuthUser {
      userId: string;
      email: string;
      role: UserRole;
    }

    interface Request {
      user?: AuthUser;
      sessionId?: string;
    }
  }
}

export {};
