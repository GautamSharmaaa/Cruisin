// Governed by .rules v1.0
import type { Request, Response } from 'express';
import { env } from '../config/env.js';
import { AuthService } from '../services/auth.service.js';
import { ApiResponse } from '../utils/api-response.js';
import { asyncHandler } from '../utils/async-handler.js';
import { ApiError } from '../utils/api-error.js';

const cookieOptions = { httpOnly: true, secure: env.NODE_ENV === 'production', sameSite: 'strict' as const, maxAge: 7 * 24 * 60 * 60 * 1000 };

export const AuthController = {
  register: asyncHandler(async (req: Request, res: Response): Promise<void> => { const user = await AuthService.register(req.body as { name: string; email: string; password: string }); res.status(201).json(new ApiResponse(user, 'Registration successful. Verify your email.')); }),
  login: asyncHandler(async (req: Request, res: Response): Promise<void> => { const result = await AuthService.login(req.body as { email: string; password: string }); res.cookie('refreshToken', result.tokens.refreshToken, cookieOptions); res.json(new ApiResponse({ user: result.user, accessToken: result.tokens.accessToken }, 'Login successful')); }),
  refresh: asyncHandler(async (req: Request, res: Response): Promise<void> => { const refreshToken = typeof req.cookies.refreshToken === 'string' ? req.cookies.refreshToken : ''; if (!refreshToken) throw new ApiError(401, 'Refresh token missing'); const token = await AuthService.refresh(refreshToken); res.json(new ApiResponse(token, 'Access token refreshed')); }),
  logout: asyncHandler(async (req: Request, res: Response): Promise<void> => { const refreshToken = typeof req.cookies.refreshToken === 'string' ? req.cookies.refreshToken : ''; if (req.user && refreshToken) await AuthService.logout(req.user.userId, refreshToken); res.clearCookie('refreshToken', cookieOptions); res.json(new ApiResponse(null, 'Logged out')); }),
  verifyEmail: asyncHandler(async (req: Request, res: Response): Promise<void> => { await AuthService.verifyEmail((req.body as { token: string }).token); res.json(new ApiResponse(null, 'Email verified')); }),
  forgotPassword: asyncHandler(async (req: Request, res: Response): Promise<void> => { await AuthService.forgotPassword((req.body as { email: string }).email); res.json(new ApiResponse(null, 'Password reset email sent when account exists')); }),
  resetPassword: asyncHandler(async (req: Request, res: Response): Promise<void> => { const body = req.body as { token: string; password: string }; await AuthService.resetPassword(body.token, body.password); res.json(new ApiResponse(null, 'Password reset successful')); }),
  me: asyncHandler(async (req: Request, res: Response): Promise<void> => { if (!req.user) throw new ApiError(401, 'Authentication required'); const user = await AuthService.me(req.user.userId); res.json(new ApiResponse(user, 'Current user')); })
};
