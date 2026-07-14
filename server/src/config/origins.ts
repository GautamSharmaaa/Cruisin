// Governed by .rules v1.0
import { env } from './env.js';

const expandLoopbackOrigin = (origin: string): string[] => {
  try {
    const url = new URL(origin);
    if (url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') return [origin];
    const alternate = new URL(origin);
    alternate.hostname = url.hostname === 'localhost' ? '127.0.0.1' : 'localhost';
    return [origin, alternate.toString().replace(/\/$/, '')];
  } catch {
    return [origin];
  }
};

export const allowedBrowserOrigins = Array.from(new Set([env.CLIENT_URL, env.ADMIN_URL].flatMap(expandLoopbackOrigin)));
export const adminBrowserOrigins = Array.from(new Set(expandLoopbackOrigin(env.ADMIN_URL)));
