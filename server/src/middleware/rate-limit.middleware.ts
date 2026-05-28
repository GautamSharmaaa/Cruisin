// Governed by .rules v1.0
import rateLimit from 'express-rate-limit';
import { ApiResponse } from '../utils/api-response.js';

export const authLimiter = rateLimit({ windowMs: 60_000, limit: 5, standardHeaders: true, legacyHeaders: false, handler: (_req, res) => { res.status(429).json(new ApiResponse(null, 'Too many authentication attempts', ['RATE_LIMITED'])); } });
export const uploadLimiter = rateLimit({ windowMs: 60_000, limit: 10, standardHeaders: true, legacyHeaders: false, handler: (_req, res) => { res.status(429).json(new ApiResponse(null, 'Too many upload requests', ['RATE_LIMITED'])); } });
export const generalLimiter = rateLimit({ windowMs: 60_000, limit: 100, standardHeaders: true, legacyHeaders: false, handler: (_req, res) => { res.status(429).json(new ApiResponse(null, 'Too many requests', ['RATE_LIMITED'])); } });
