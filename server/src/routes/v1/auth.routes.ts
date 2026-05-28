// Governed by .rules v1.0
import { Router } from 'express';
import { AuthController } from '../../controllers/auth.controller.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { authLimiter } from '../../middleware/rate-limit.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { forgotPasswordSchema, loginSchema, refreshSchema, registerSchema, resetPasswordSchema, verifyEmailSchema } from '../../validators/auth.validator.js';

export const authRouter = Router();
authRouter.post('/register', authLimiter, validate({ body: registerSchema }), AuthController.register);
authRouter.post('/login', authLimiter, validate({ body: loginSchema }), AuthController.login);
authRouter.post('/refresh', authLimiter, validate({ body: refreshSchema }), AuthController.refresh);
authRouter.post('/logout', requireAuth, AuthController.logout);
authRouter.post('/verify-email', authLimiter, validate({ body: verifyEmailSchema }), AuthController.verifyEmail);
authRouter.post('/forgot-pw', authLimiter, validate({ body: forgotPasswordSchema }), AuthController.forgotPassword);
authRouter.post('/reset-pw', authLimiter, validate({ body: resetPasswordSchema }), AuthController.resetPassword);
authRouter.get('/me', requireAuth, AuthController.me);
