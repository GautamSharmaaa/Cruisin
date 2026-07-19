// Governed by .rules v1.0
import crypto from 'node:crypto';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../config/env.js';
import type { AccessTokenPayload } from '../types/auth.types.js';
import { ApiError } from './api-error.js';

export const sha256 = (value: string): string => crypto.createHash('sha256').update(value).digest('hex');

export const randomToken = (): string => crypto.randomBytes(48).toString('hex');

export const generateAccessToken = (payload: AccessTokenPayload): string => {
  const options: SignOptions = { expiresIn: env.JWT_ACCESS_EXPIRES as SignOptions['expiresIn'] };
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, options);
};

export const generateRefreshToken = (payload: AccessTokenPayload): string => {
  const options: SignOptions = { expiresIn: env.JWT_REFRESH_EXPIRES as SignOptions['expiresIn'], jwtid: crypto.randomUUID() };
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, options);
};

export const verifyRefreshToken = (token: string): AccessTokenPayload => {
  try {
    const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET);
    if (
      typeof decoded !== 'object'
      || typeof decoded.userId !== 'string'
      || typeof decoded.email !== 'string'
      || typeof decoded.role !== 'string'
    ) {
      throw new Error('Malformed refresh token payload');
    }
    return { userId: decoded.userId, email: decoded.email, role: decoded.role as AccessTokenPayload['role'] };
  } catch {
    throw new ApiError(401, 'Refresh token invalid or expired');
  }
};
