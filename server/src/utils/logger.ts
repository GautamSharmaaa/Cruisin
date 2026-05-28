// Governed by .rules v1.0
import winston from 'winston';
import { env } from '../config/env.js';

const redact = winston.format((info) => {
  const blocked = ['password', 'passwordHash', 'token', 'authorization', 'card', 'cookie'];
  for (const key of blocked) {
    if (Object.prototype.hasOwnProperty.call(info, key)) {
      info[key] = '[REDACTED]';
    }
  }
  return info;
});

export const logger = winston.createLogger({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(redact(), winston.format.timestamp(), winston.format.errors({ stack: true }), winston.format.json()),
  transports: [new winston.transports.Console(), new winston.transports.File({ filename: 'server-error.log', level: 'error' })]
});
