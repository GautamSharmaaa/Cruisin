// Governed by .rules v1.0
import winston from 'winston';
import { env } from '../config/env.js';

const sensitiveKey = /(authorization|card|cookie|credential|password|secret|signature|token)/i;
const redactString = (value: string): string => value
  .replace(/(mongodb(?:\+srv)?:\/\/)([^:\s/@]+):([^@\s/]+)@/gi, '$1[REDACTED]:[REDACTED]@')
  .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]+/gi, 'Bearer [REDACTED]');

const sanitize = (value: unknown, key: string, seen: WeakSet<object>): unknown => {
  if (sensitiveKey.test(key)) return '[REDACTED]';
  if (typeof value === 'string') return redactString(value);
  if (Array.isArray(value)) return value.map((item) => sanitize(item, '', seen));
  if (!value || typeof value !== 'object') return value;
  if (seen.has(value)) return '[CIRCULAR]';
  seen.add(value);
  if (value instanceof Error) {
    return {
      name: value.name,
      message: redactString(value.message),
      stack: value.stack ? redactString(value.stack) : undefined
    };
  }
  return Object.fromEntries(Object.entries(value).map(([nestedKey, nestedValue]) => [
    nestedKey,
    sanitize(nestedValue, nestedKey, seen)
  ]));
};

const redact = winston.format((info) => {
  for (const [key, value] of Object.entries(info)) {
    info[key] = sanitize(value, key, new WeakSet<object>());
  }
  return info;
});

export const logger = winston.createLogger({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(winston.format.timestamp(), winston.format.errors({ stack: true }), redact(), winston.format.json()),
  transports: [new winston.transports.Console()]
});
