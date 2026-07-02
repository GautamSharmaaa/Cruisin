// Governed by .rules v1.0
import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';
import { ApiResponse } from '../utils/api-response.js';

const relaxedLimit = (limit: number): number => env.APP_ENV === 'development' ? limit * 10 : limit;

export const authLimiter = rateLimit({ windowMs: 60_000, limit: relaxedLimit(5), standardHeaders: true, legacyHeaders: false, handler: (_req, res) => { res.status(429).json(new ApiResponse(null, 'Too many authentication attempts', ['RATE_LIMITED'])); } });
export const otpRequestLimiter = rateLimit({ windowMs: 60_000, limit: relaxedLimit(5), standardHeaders: true, legacyHeaders: false, handler: (_req, res) => { res.status(429).json(new ApiResponse(null, 'Too many OTP requests', ['RATE_LIMITED'])); } });
export const otpVerifyLimiter = rateLimit({ windowMs: 60_000, limit: relaxedLimit(5), standardHeaders: true, legacyHeaders: false, handler: (_req, res) => { res.status(429).json(new ApiResponse(null, 'Too many OTP verification attempts', ['RATE_LIMITED'])); } });
export const uploadLimiter = rateLimit({ windowMs: 60_000, limit: relaxedLimit(10), standardHeaders: true, legacyHeaders: false, handler: (_req, res) => { res.status(429).json(new ApiResponse(null, 'Too many upload requests', ['RATE_LIMITED'])); } });
export const generalLimiter = rateLimit({ windowMs: 60_000, limit: relaxedLimit(100), standardHeaders: true, legacyHeaders: false, handler: (_req, res) => { res.status(429).json(new ApiResponse(null, 'Too many requests', ['RATE_LIMITED'])); } });
