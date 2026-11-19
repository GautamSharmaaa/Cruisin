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

export const adminBrowserOrigins = Array.from(new Set(expandLoopbackOrigin(env.ADMIN_URL)));

export const employeeBrowserOrigins = expandLoopbackOrigin(env.EMPLOYEE_URL);

export const storefrontBrowserOrigins = expandLoopbackOrigin(new URL(env.CLIENT_URL).origin);

export const allowedBrowserOrigins = Array.from(new Set([
  ...expandLoopbackOrigin(env.CLIENT_URL),
  ...adminBrowserOrigins,
  ...employeeBrowserOrigins,
  ...(env.STOREFRONT_ORIGIN_ALIAS ? [env.STOREFRONT_ORIGIN_ALIAS] : [])
]));
