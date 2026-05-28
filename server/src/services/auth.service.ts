// Governed by .rules v1.0
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { redis } from '../config/redis.js';
import { env } from '../config/env.js';
import { UserModel } from '../models/user.model.js';
import { ApiError } from '../utils/api-error.js';
import { generateAccessToken, generateRefreshToken, randomToken, sha256 } from '../utils/generate-token.js';
import { normalizeEmail, sanitizeString } from '../utils/sanitize.js';
import { sendEmail } from '../utils/send-email.js';
import type { AccessTokenPayload } from '../types/auth.types.js';

export interface AuthTokens { accessToken: string; refreshToken: string; }
export interface AuthUserDto { id: string; name: string; email: string; role: string; isVerified: boolean; avatar?: string; }

const toUserDto = (user: { _id: unknown; name: string; email: string; role: string; isVerified: boolean; avatar?: string | null }): AuthUserDto => ({ id: String(user._id), name: user.name, email: user.email, role: user.role, isVerified: user.isVerified, avatar: user.avatar ?? undefined });

const refreshKey = (userId: string, token: string): string => 'refresh:' + userId + ':' + sha256(token);

const issueTokens = async (payload: AccessTokenPayload): Promise<AuthTokens> => {
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);
  await redis.set(refreshKey(payload.userId, refreshToken), 'active', 'EX', 7 * 24 * 60 * 60);
  return { accessToken, refreshToken };
};

export const AuthService = {
  async register(input: { name: string; email: string; password: string }): Promise<AuthUserDto> {
    const email = normalizeEmail(input.email);
    const existing = await UserModel.exists({ email });
    if (existing) throw new ApiError(409, 'Email already registered');
    const passwordHash = await bcrypt.hash(input.password, 12);
    const user = await UserModel.create({ name: sanitizeString(input.name), email, passwordHash });
    const token = randomToken();
    await redis.set('verify:' + token, String(user._id), 'EX', 24 * 60 * 60);
    await sendEmail({ to: email, subject: 'Verify your Cruisin account', text: 'Use this verification token: ' + token, html: '<p>Use this verification token: <strong>' + token + '</strong></p>' });
    return toUserDto(user);
  },
  async login(input: { email: string; password: string }): Promise<{ user: AuthUserDto; tokens: AuthTokens }> {
    const email = normalizeEmail(input.email);
    const user = await UserModel.findOne({ email, isActive: true }).select('+passwordHash');
    if (!user) throw new ApiError(401, 'Invalid credentials');
    const valid = await bcrypt.compare(input.password, user.passwordHash);
    if (!valid) throw new ApiError(401, 'Invalid credentials');
    const payload: AccessTokenPayload = { userId: String(user._id), email: user.email, role: user.role };
    const tokens = await issueTokens(payload);
    await UserModel.findByIdAndUpdate(user._id, { refreshTokenHash: sha256(tokens.refreshToken) });
    return { user: toUserDto(user), tokens };
  },
  async refresh(refreshToken: string): Promise<{ accessToken: string }> {
    const decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as AccessTokenPayload;
    const stored = await redis.get(refreshKey(decoded.userId, refreshToken));
    if (stored !== 'active') throw new ApiError(401, 'Refresh token revoked');
    return { accessToken: generateAccessToken(decoded) };
  },
  async logout(userId: string, refreshToken: string): Promise<void> {
    await redis.del(refreshKey(userId, refreshToken));
    await UserModel.findByIdAndUpdate(userId, { $unset: { refreshTokenHash: 1 } });
  },
  async verifyEmail(token: string): Promise<void> {
    const userId = await redis.get('verify:' + token);
    if (!userId) throw new ApiError(400, 'Verification token expired');
    await UserModel.findByIdAndUpdate(userId, { isVerified: true });
    await redis.del('verify:' + token);
  },
  async forgotPassword(emailInput: string): Promise<void> {
    const email = normalizeEmail(emailInput);
    const user = await UserModel.findOne({ email });
    if (!user) return;
    const token = randomToken();
    await redis.set('reset:' + token, String(user._id), 'EX', 30 * 60);
    await sendEmail({ to: email, subject: 'Reset your Cruisin password', text: 'Use this reset token: ' + token, html: '<p>Use this reset token: <strong>' + token + '</strong></p>' });
  },
  async resetPassword(token: string, password: string): Promise<void> {
    const userId = await redis.get('reset:' + token);
    if (!userId) throw new ApiError(400, 'Reset token expired');
    const passwordHash = await bcrypt.hash(password, 12);
    await UserModel.findByIdAndUpdate(userId, { passwordHash, $unset: { refreshTokenHash: 1 } });
    const keys = await redis.keys('refresh:' + userId + ':*');
    if (keys.length > 0) await redis.del(keys);
    await redis.del('reset:' + token);
  },
  async me(userId: string): Promise<AuthUserDto> {
    const user = await UserModel.findById(userId);
    if (!user) throw new ApiError(404, 'User not found');
    return toUserDto(user);
  },
  async updateMe(userId: string, input: { name?: string; email?: string; phone?: string; avatar?: string }): Promise<AuthUserDto> {
    const payload = { ...input, email: input.email ? normalizeEmail(input.email) : undefined };
    const user = await UserModel.findByIdAndUpdate(userId, payload, { new: true, runValidators: true });
    if (!user) throw new ApiError(404, 'User not found');
    return toUserDto(user);
  },
  async changePassword(userId: string, input: { currentPassword: string; password: string }): Promise<void> {
    const user = await UserModel.findById(userId).select('+passwordHash');
    if (!user) throw new ApiError(404, 'User not found');
    const valid = await bcrypt.compare(input.currentPassword, user.passwordHash);
    if (!valid) throw new ApiError(401, 'Current password is incorrect');
    user.passwordHash = await bcrypt.hash(input.password, 12);
    await user.save();
    const keys = await redis.keys('refresh:' + userId + ':*');
    if (keys.length > 0) await redis.del(keys);
  },
  async addAddress(userId: string, input: Record<string, unknown>): Promise<unknown> {
    if (input.isDefault) await UserModel.findByIdAndUpdate(userId, { $set: { 'addresses.$[].isDefault': false } });
    const user = await UserModel.findByIdAndUpdate(userId, { $push: { addresses: input } }, { new: true, runValidators: true });
    if (!user) throw new ApiError(404, 'User not found');
    return user.addresses;
  },
  async removeAddress(userId: string, addressId: string): Promise<unknown> {
    const user = await UserModel.findByIdAndUpdate(userId, { $pull: { addresses: { _id: addressId } } }, { new: true });
    if (!user) throw new ApiError(404, 'User not found');
    return user.addresses;
  },
  async deleteMe(userId: string): Promise<void> {
    await UserModel.findByIdAndUpdate(userId, { isActive: false, email: 'deleted-' + userId + '@cruisin.local', $unset: { refreshTokenHash: 1 } });
    const keys = await redis.keys('refresh:' + userId + ':*');
    if (keys.length > 0) await redis.del(keys);
  }
};
