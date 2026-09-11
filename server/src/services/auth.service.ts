// Governed by .rules v1.0
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { Types } from 'mongoose';
import { redis } from '../config/redis.js';
import { env } from '../config/env.js';
import { AddressModel } from '../models/address.model.js';
import { AuthProviderModel } from '../models/auth-provider.model.js';
import { OtpModel } from '../models/otp.model.js';
import { OrderModel } from '../models/order.model.js';
import { SecurityEventModel } from '../models/security-event.model.js';
import { UserModel } from '../models/user.model.js';
import { UserPreferenceModel } from '../models/user-preference.model.js';
import { UserSessionModel } from '../models/user-session.model.js';
import { WishlistModel } from '../models/wishlist.model.js';
import { ApiError } from '../utils/api-error.js';
import { generateAccessToken, generateRefreshToken, randomToken, sha256, verifyRefreshToken } from '../utils/generate-token.js';
import { normalizePhone } from '../utils/phone.js';
import { normalizeEmail, sanitizeString } from '../utils/sanitize.js';
import { sendEmail } from '../utils/send-email.js';
import type { AccessTokenPayload, AdminRole, UserRole } from '../types/auth.types.js';
import { IdentityProviderService, type GoogleIdentity } from './identity-provider.service.js';
import { AddressBookService } from './address-book.service.js';

export interface AuthTokens { accessToken: string; refreshToken: string; }
export interface AuthUserDto { id: string; name: string; email: string; role: string; isVerified: boolean; avatar?: string; phone?: string; whatsappNumber?: string; profileIncomplete?: boolean; }
export interface RequestContext { ipAddress?: string; userAgent?: string; deviceFingerprint?: string; }
export interface OtpRequestResult { requestId: string; channel: 'whatsapp'; cooldownSeconds: number; expiresAt: string; developmentCode?: string; }

interface UserLike { _id: unknown; name: string; email: string; role: UserRole; isVerified: boolean; avatar?: string | null; phone?: string | null; whatsappNumber?: string | null; }
interface OtpRequestInput { phone: string; channel: 'whatsapp'; purpose: 'login' | 'link_account' | 'verify_phone'; deviceFingerprint?: string; }
interface OtpVerifyInput { requestId: string; otp: string; deviceFingerprint?: string; }
interface AddressBookInput { type: 'home' | 'office' | 'other'; fullName: string; phone: string; country: string; state: string; city: string; pincode: string; street: string; landmark?: string; latitude?: number; longitude?: number; isDefault: boolean; }
interface PreferenceInput { language?: string; currency?: string; theme?: 'dark'; marketingEmails?: boolean; orderEmails?: boolean; pushNotifications?: boolean; smsNotifications?: boolean; whatsappNotifications?: boolean; }

const isPlaceholderEmail = (email: string): boolean => email.endsWith('@phone.cruisin.local');
const isPlaceholderName = (name: string): boolean => name === 'Cruisin Member';
const adminRoles: AdminRole[] = ['admin', 'superadmin', 'manager', 'viewer'];
const toUserDto = (user: UserLike): AuthUserDto => {
  const profileIncomplete = isPlaceholderEmail(user.email) || isPlaceholderName(user.name);
  return {
    id: String(user._id),
    name: isPlaceholderName(user.name) ? '' : user.name,
    email: isPlaceholderEmail(user.email) ? '' : user.email,
    role: user.role,
    isVerified: user.isVerified,
    avatar: user.avatar ?? undefined,
    phone: user.phone ?? undefined,
    whatsappNumber: user.whatsappNumber ?? undefined,
    profileIncomplete
  };
};
const refreshKey = (userId: string, token: string): string => 'refresh:' + userId + ':' + sha256(token);
const refreshKeyFromHash = (userId: string, tokenHash: string): string => 'refresh:' + userId + ':' + tokenHash;
const refreshExpiresAt = (): Date => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
const createOtp = (): string => String(crypto.randomInt(100000, 1000000));
const phoneEmail = (phone: string): string => 'phone-' + sha256(phone).slice(0, 24) + '@phone.cruisin.local';
const verificationUrl = (token: string): string => `${env.CLIENT_URL}/verify-email?token=${encodeURIComponent(token)}`;

const logSecurityEvent = async (userId: string, type: string, context: RequestContext, riskScore = 0): Promise<void> => {
  await SecurityEventModel.create({ user: userId, type, ipAddress: context.ipAddress, deviceName: context.deviceFingerprint, userAgent: context.userAgent, riskScore });
};

const ensureEmailProvider = async (userId: string, email: string, isVerified: boolean): Promise<void> => {
  await AuthProviderModel.findOneAndUpdate({ provider: 'email', providerEmail: normalizeEmail(email) }, { user: userId, provider: 'email', providerEmail: normalizeEmail(email), isVerified, linkedAt: new Date() }, { upsert: true, new: true, setDefaultsOnInsert: true });
};

const issueTokens = async (payload: AccessTokenPayload, context: RequestContext): Promise<AuthTokens> => {
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);
  const sessionFamilyId = randomToken();
  const expiresAt = refreshExpiresAt();
  const tokenHash = sha256(refreshToken);
  await Promise.all([
    redis.set(refreshKey(payload.userId, refreshToken), 'active', 'EX', 7 * 24 * 60 * 60),
    UserSessionModel.create({ user: payload.userId, sessionFamilyId, deviceName: context.deviceFingerprint ?? 'Web session', userAgent: context.userAgent, ipAddress: context.ipAddress, refreshTokenHash: tokenHash, expiresAt })
  ]);
  return { accessToken, refreshToken };
};

const rotateRefresh = async (refreshToken: string, context: RequestContext): Promise<AuthTokens> => {
  const decoded = verifyRefreshToken(refreshToken);
  const payload: AccessTokenPayload = { userId: decoded.userId, email: decoded.email, role: decoded.role };
  const tokenHash = sha256(refreshToken);
  const redisStored = await redis.get(refreshKey(decoded.userId, refreshToken));
  const session = redisStored === 'active'
    ? await UserSessionModel.findOneAndUpdate(
        { user: decoded.userId, refreshTokenHash: tokenHash, revokedAt: { $exists: false }, expiresAt: { $gt: new Date() } },
        { revokedAt: new Date(), lastActive: new Date() },
        { new: true }
      ).select('+refreshTokenHash')
    : null;
  if (!session) {
    const reusedSession = await UserSessionModel.findOne({ user: decoded.userId, refreshTokenHash: tokenHash }).select('+refreshTokenHash');
    if (reusedSession) {
      const familySessions = await UserSessionModel.find({ user: decoded.userId, sessionFamilyId: reusedSession.sessionFamilyId, revokedAt: { $exists: false } }).select('+refreshTokenHash').lean();
      await UserSessionModel.updateMany({ user: decoded.userId, sessionFamilyId: reusedSession.sessionFamilyId, revokedAt: { $exists: false } }, { revokedAt: new Date() });
      const familyKeys = familySessions.map((item) => refreshKeyFromHash(decoded.userId, item.refreshTokenHash));
      if (familyKeys.length > 0) await redis.del(familyKeys);
    }
    throw new ApiError(401, 'Refresh token revoked');
  }
  const nextRefreshToken = generateRefreshToken(payload);
  const nextAccessToken = generateAccessToken(payload);
  await Promise.all([
    redis.del(refreshKey(decoded.userId, refreshToken)),
    redis.set(refreshKey(decoded.userId, nextRefreshToken), 'active', 'EX', 7 * 24 * 60 * 60),
    UserSessionModel.create({ user: decoded.userId, sessionFamilyId: session.sessionFamilyId, deviceName: session.deviceName, userAgent: context.userAgent ?? session.userAgent, ipAddress: context.ipAddress ?? session.ipAddress, refreshTokenHash: sha256(nextRefreshToken), expiresAt: refreshExpiresAt() })
  ]);
  return { accessToken: nextAccessToken, refreshToken: nextRefreshToken };
};

export const AuthService = {
  async register(input: { name: string; email: string; password: string }): Promise<AuthUserDto> {
    const email = normalizeEmail(input.email);
    const existing = await UserModel.exists({ email });
    if (existing) throw new ApiError(409, 'Email already registered');
    const passwordHash = await bcrypt.hash(input.password, 12);
    const user = await UserModel.create({ name: sanitizeString(input.name), email, passwordHash, status: 'pending_verification' });
    await ensureEmailProvider(String(user._id), email, false);
    await UserPreferenceModel.findOneAndUpdate({ user: user._id }, { user: user._id }, { upsert: true, setDefaultsOnInsert: true });
    const token = randomToken();
    await redis.set('verify:' + token, String(user._id), 'EX', 24 * 60 * 60);
    const url = verificationUrl(token);
    try {
      await sendEmail({ to: email, subject: 'Verify your Cruisin account', text: 'Verify your account: ' + url, html: '<p><a href="' + url + '">Verify your Cruisin account</a></p>' });
    } catch (error) {
      await Promise.allSettled([
        redis.del('verify:' + token),
        AuthProviderModel.deleteMany({ user: user._id }),
        UserPreferenceModel.deleteMany({ user: user._id }),
        UserModel.deleteOne({ _id: user._id })
      ]);
      throw error;
    }
    return toUserDto(user);
  },
  async login(input: { email: string; password: string }, context: RequestContext = {}): Promise<{ user: AuthUserDto; tokens: AuthTokens }> {
    const email = normalizeEmail(input.email);
    const user = await UserModel.findOne({ email, isActive: true, status: { $ne: 'deleted' } }).select('+passwordHash');
    if (!user) throw new ApiError(401, 'Invalid credentials');
    const valid = await bcrypt.compare(input.password, user.passwordHash);
    if (!valid) throw new ApiError(401, 'Invalid credentials');
    if (!user.emailVerifiedAt && !user.isVerified) throw new ApiError(403, 'Verify your email before signing in');
    const payload: AccessTokenPayload = { userId: String(user._id), email: user.email, role: user.role };
    const tokens = await issueTokens(payload, context);
    await Promise.all([
      UserModel.findByIdAndUpdate(user._id, { refreshTokenHash: sha256(tokens.refreshToken), lastLogin: new Date(), status: 'active' }),
      ensureEmailProvider(String(user._id), user.email, Boolean(user.emailVerifiedAt || user.isVerified)),
      logSecurityEvent(String(user._id), 'email_login', context)
    ]);
    return { user: toUserDto(user), tokens };
  },
  async googleLogin(input: GoogleIdentity, context: RequestContext = {}): Promise<{ user: AuthUserDto; tokens: AuthTokens }> {
    const email = normalizeEmail(input.email);
    const existingProvider = await AuthProviderModel.findOne({ provider: 'google', providerUserId: input.providerUserId });
    const existingUser = existingProvider ? await UserModel.findById(existingProvider.user) : await UserModel.findOne({ email });
    const user = existingUser ?? await UserModel.create({ name: sanitizeString(input.name), email, avatar: input.avatar, passwordHash: await bcrypt.hash(randomToken(), 12), isVerified: true, emailVerifiedAt: new Date(), status: 'active' });
    await AuthProviderModel.findOneAndUpdate({ provider: 'google', providerUserId: input.providerUserId }, { user: user._id, provider: 'google', providerUserId: input.providerUserId, providerEmail: email, isVerified: true, linkedAt: new Date() }, { upsert: true, new: true, setDefaultsOnInsert: true });
    await ensureEmailProvider(String(user._id), user.email, true);
    const payload: AccessTokenPayload = { userId: String(user._id), email: user.email, role: user.role };
    const tokens = await issueTokens(payload, context);
    await Promise.all([UserModel.findByIdAndUpdate(user._id, { lastLogin: new Date(), isVerified: true, status: 'active' }), logSecurityEvent(String(user._id), 'google_login', context)]);
    return { user: toUserDto(user), tokens };
  },
  async adminGoogleLogin(input: GoogleIdentity, context: RequestContext = {}): Promise<{ user: AuthUserDto; tokens: AuthTokens }> {
    const email = normalizeEmail(input.email);
    const existingProvider = await AuthProviderModel.findOne({ provider: 'google', providerUserId: input.providerUserId });
    const user = existingProvider
      ? await UserModel.findById(existingProvider.user)
      : await UserModel.findOne({ email, isActive: true, status: { $ne: 'deleted' } });
    if (!user || !adminRoles.includes(user.role as AdminRole) || !user.isActive || user.status === 'deleted') throw new ApiError(403, 'Admin access is not assigned to this Google account');
    await AuthProviderModel.findOneAndUpdate({ provider: 'google', providerUserId: input.providerUserId }, { user: user._id, provider: 'google', providerUserId: input.providerUserId, providerEmail: email, isVerified: true, linkedAt: new Date() }, { upsert: true, new: true, setDefaultsOnInsert: true });
    await ensureEmailProvider(String(user._id), user.email, true);
    const payload: AccessTokenPayload = { userId: String(user._id), email: user.email, role: user.role };
    const tokens = await issueTokens(payload, context);
    await Promise.all([UserModel.findByIdAndUpdate(user._id, { lastLogin: new Date(), isVerified: true, status: 'active' }), logSecurityEvent(String(user._id), 'admin_google_login', context)]);
    return { user: toUserDto(user), tokens };
  },
  async refresh(refreshToken: string, context: RequestContext = {}): Promise<AuthTokens> {
    return rotateRefresh(refreshToken, context);
  },
  async logout(refreshToken: string): Promise<void> {
    let userId = '';
    try {
      const decoded = verifyRefreshToken(refreshToken);
      userId = decoded.userId;
    } catch {
      return;
    }
    await Promise.all([
      redis.del(refreshKey(userId, refreshToken)),
      UserSessionModel.findOneAndUpdate({ user: userId, refreshTokenHash: sha256(refreshToken) }, { revokedAt: new Date() }),
      UserModel.findByIdAndUpdate(userId, { $unset: { refreshTokenHash: 1 } })
    ]);
  },
  async verifyEmail(token: string): Promise<void> {
    const userId = await redis.get('verify:' + token);
    if (!userId) throw new ApiError(400, 'Verification token expired');
    const user = await UserModel.findByIdAndUpdate(userId, { isVerified: true, emailVerifiedAt: new Date(), status: 'active' }, { new: true });
    if (user) await ensureEmailProvider(String(user._id), user.email, true);
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
    const sessions = await UserSessionModel.find({ user: userId, revokedAt: { $exists: false } }).select('+refreshTokenHash').lean();
    await Promise.all([
      UserModel.findByIdAndUpdate(userId, { passwordHash, $unset: { refreshTokenHash: 1 } }),
      UserSessionModel.updateMany({ user: userId, revokedAt: { $exists: false } }, { revokedAt: new Date() })
    ]);
    const keys = sessions.map((session) => refreshKeyFromHash(userId, session.refreshTokenHash));
    if (keys.length > 0) await redis.del(keys);
    await redis.del('reset:' + token);
  },
  async requestOtp(input: OtpRequestInput, context: RequestContext = {}): Promise<OtpRequestResult> {
    const phone = normalizePhone(input.phone);
    const recent = await OtpModel.countDocuments({ phone, purpose: input.purpose, createdAt: { $gt: new Date(Date.now() - 60_000) } });
    if (recent > 0) throw new ApiError(429, 'OTP cooldown active');
    const otp = createOtp();
    const expiresAt = new Date(Date.now() + 5 * 60_000);
    const request = await OtpModel.create({ phone, channel: input.channel, purpose: input.purpose, otpHash: await bcrypt.hash(otp, 12), expiresAt, ipAddress: context.ipAddress, deviceFingerprint: input.deviceFingerprint ?? context.deviceFingerprint });
    try {
      await IdentityProviderService.sendOtp(phone, input.channel, otp);
    } catch (error) {
      await OtpModel.deleteOne({ _id: request._id });
      throw error;
    }
    return { requestId: String(request._id), channel: input.channel, cooldownSeconds: 60, expiresAt: expiresAt.toISOString(), developmentCode: env.NODE_ENV === 'development' ? otp : undefined };
  },
  async verifyOtp(input: OtpVerifyInput, context: RequestContext = {}): Promise<{ user: AuthUserDto; tokens: AuthTokens }> {
    const request = await OtpModel.findById(input.requestId).select('+otpHash');
    if (!request || request.verifiedAt || request.expiresAt <= new Date()) throw new ApiError(400, 'OTP expired');
    if (request.attempts >= request.maxAttempts) throw new ApiError(429, 'OTP attempts exceeded');
    const valid = await bcrypt.compare(input.otp, request.otpHash);
    request.attempts += 1;
    if (!valid) {
      await request.save();
      throw new ApiError(400, 'Invalid OTP');
    }
    request.verifiedAt = new Date();
    await request.save();
    const phone = normalizePhone(request.phone);
    const provider = 'whatsapp';
    const providerQuery = { provider, providerPhone: phone };
    const existingProvider = await AuthProviderModel.findOne(providerQuery);
    const existingUser = existingProvider ? await UserModel.findById(existingProvider.user) : await UserModel.findOne({ $or: [{ phone }, { whatsappNumber: phone }] });
    const user = existingUser ?? await UserModel.create({ name: 'Cruisin Member', email: phoneEmail(phone), phone, whatsappNumber: phone, passwordHash: await bcrypt.hash(randomToken(), 12), isVerified: true, phoneVerifiedAt: new Date(), whatsappVerifiedAt: new Date(), status: 'active' });
    await AuthProviderModel.findOneAndUpdate(providerQuery, { user: user._id, provider, providerPhone: phone, isVerified: true, linkedAt: new Date() }, { upsert: true, new: true, setDefaultsOnInsert: true });
    const payload: AccessTokenPayload = { userId: String(user._id), email: user.email, role: user.role };
    const tokens = await issueTokens(payload, context);
    const identityUpdate = { phone, whatsappNumber: phone, phoneVerifiedAt: new Date(), whatsappVerifiedAt: new Date() };
    const updatedUser = await UserModel.findByIdAndUpdate(user._id, { ...identityUpdate, lastLogin: new Date(), isVerified: true, status: 'active' }, { new: true });
    await logSecurityEvent(String(user._id), provider + '_otp_login', context);
    return { user: toUserDto(updatedUser ?? user), tokens };
  },
  async me(userId: string): Promise<AuthUserDto> {
    const user = await UserModel.findById(userId);
    if (!user) throw new ApiError(404, 'User not found');
    return toUserDto(user);
  },
  async updateMe(userId: string, input: { name?: string; email?: string; phone?: string; avatar?: string; whatsappNumber?: string; gender?: string; dateOfBirth?: Date }): Promise<AuthUserDto> {
    const currentUser = await UserModel.findById(userId);
    if (!currentUser) throw new ApiError(404, 'User not found');
    const nextEmail = input.email ? normalizeEmail(input.email) : currentUser.email;
    const isClaimingEmail = nextEmail !== currentUser.email && currentUser.email.endsWith('@phone.cruisin.local');
    if (nextEmail !== currentUser.email && !isClaimingEmail) throw new ApiError(400, 'Verify a new email before adding it to your profile');
    if (isClaimingEmail && await UserModel.exists({ _id: { $ne: userId }, email: nextEmail })) throw new ApiError(409, 'Email already registered');
    if (input.phone && normalizePhone(input.phone) !== currentUser.phone) throw new ApiError(400, 'Verify a new phone number before adding it to your profile');
    if (input.whatsappNumber && normalizePhone(input.whatsappNumber) !== currentUser.whatsappNumber) throw new ApiError(400, 'Verify a new WhatsApp number before adding it to your profile');
    const { email: _email, phone: _phone, whatsappNumber: _whatsappNumber, ...profileInput } = input;
    const user = await UserModel.findByIdAndUpdate(
      userId,
      isClaimingEmail ? { ...profileInput, email: nextEmail, $unset: { emailVerifiedAt: 1 } } : profileInput,
      { new: true, runValidators: true }
    );
    if (!user) throw new ApiError(404, 'User not found');
    if (isClaimingEmail) {
      await AuthProviderModel.deleteOne({ user: userId, provider: 'email' });
      await ensureEmailProvider(userId, nextEmail, false);
      const token = randomToken();
      await redis.set('verify:' + token, userId, 'EX', 24 * 60 * 60);
      const url = verificationUrl(token);
      await sendEmail({ to: nextEmail, subject: 'Verify your Cruisin email', text: 'Verify your email: ' + url, html: '<p><a href="' + url + '">Verify your Cruisin email</a></p>' });
    }
    return toUserDto(user);
  },
  async changePassword(userId: string, input: { currentPassword: string; password: string }): Promise<void> {
    const user = await UserModel.findById(userId).select('+passwordHash');
    if (!user) throw new ApiError(404, 'User not found');
    const valid = await bcrypt.compare(input.currentPassword, user.passwordHash);
    if (!valid) throw new ApiError(401, 'Current password is incorrect');
    user.passwordHash = await bcrypt.hash(input.password, 12);
    await user.save();
    const sessions = await UserSessionModel.find({ user: userId, revokedAt: { $exists: false } }).select('+refreshTokenHash').lean();
    const keys = sessions.map((session) => refreshKeyFromHash(userId, session.refreshTokenHash));
    await Promise.all([UserSessionModel.updateMany({ user: userId, revokedAt: { $exists: false } }, { revokedAt: new Date() }), keys.length > 0 ? redis.del(keys) : Promise.resolve(0)]);
  },
  async providers(userId: string): Promise<unknown[]> {
    return AuthProviderModel.find({ user: userId }).sort({ createdAt: 1 }).lean();
  },
  async linkGoogleProvider(userId: string, input: GoogleIdentity, context: RequestContext = {}): Promise<unknown> {
    const query = { provider: 'google' as const, providerUserId: input.providerUserId };
    const existing = await AuthProviderModel.findOne(query);
    if (existing && String(existing.user) !== userId) throw new ApiError(409, 'Provider already linked to another account');
    const provider = await AuthProviderModel.findOneAndUpdate(query, { user: userId, provider: 'google', providerUserId: input.providerUserId, providerEmail: normalizeEmail(input.email), isVerified: true, linkedAt: new Date() }, { upsert: true, new: true, setDefaultsOnInsert: true });
    await logSecurityEvent(userId, 'google_provider_linked', context);
    return provider;
  },
  async linkOtpProvider(userId: string, input: OtpVerifyInput, context: RequestContext = {}): Promise<unknown> {
    const request = await OtpModel.findOne({ _id: input.requestId, purpose: { $in: ['link_account', 'verify_phone'] } }).select('+otpHash');
    if (!request || request.verifiedAt || request.expiresAt <= new Date()) throw new ApiError(400, 'OTP expired');
    if (request.attempts >= request.maxAttempts) throw new ApiError(429, 'OTP attempts exceeded');
    const valid = await bcrypt.compare(input.otp, request.otpHash);
    request.attempts += 1;
    if (!valid) {
      await request.save();
      throw new ApiError(400, 'Invalid OTP');
    }
    const phone = normalizePhone(request.phone);
    const providerName = 'whatsapp';
    const query = { provider: providerName, providerPhone: phone };
    const existing = await AuthProviderModel.findOne(query);
    if (existing && String(existing.user) !== userId) throw new ApiError(409, 'Provider already linked to another account');
    request.verifiedAt = new Date();
    request.user = new Types.ObjectId(userId);
    await request.save();
    const provider = await AuthProviderModel.findOneAndUpdate(query, { user: userId, provider: providerName, providerPhone: phone, isVerified: true, linkedAt: new Date() }, { upsert: true, new: true, setDefaultsOnInsert: true });
    const userUpdate = { phone, whatsappNumber: phone, phoneVerifiedAt: new Date(), whatsappVerifiedAt: new Date() };
    await Promise.all([UserModel.findByIdAndUpdate(userId, userUpdate), logSecurityEvent(userId, providerName + '_provider_linked', context)]);
    return provider;
  },
  async unlinkProvider(userId: string, providerId: string): Promise<void> {
    const count = await AuthProviderModel.countDocuments({ user: userId });
    if (count <= 1) throw new ApiError(400, 'At least one login provider is required');
    const result = await AuthProviderModel.deleteOne({ _id: providerId, user: userId });
    if (result.deletedCount === 0) throw new ApiError(404, 'Provider not found');
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
  async listAddressBook(userId: string): Promise<unknown[]> {
    await AddressBookService.backfillCheckoutAddresses(userId);
    return AddressModel.find({ user: userId }).sort({ isDefault: -1, lastUsedAt: -1, updatedAt: -1 }).lean();
  },
  async createAddressBook(userId: string, input: AddressBookInput): Promise<unknown> {
    if (input.isDefault) await AddressModel.updateMany({ user: userId }, { isDefault: false });
    return AddressModel.create({ ...input, user: new Types.ObjectId(userId) });
  },
  async updateAddressBook(userId: string, addressId: string, input: Partial<AddressBookInput>): Promise<unknown> {
    if (input.isDefault) await AddressModel.updateMany({ user: userId }, { isDefault: false });
    const address = await AddressModel.findOneAndUpdate({ _id: addressId, user: userId }, input, { new: true, runValidators: true });
    if (!address) throw new ApiError(404, 'Address not found');
    return address;
  },
  async deleteAddressBook(userId: string, addressId: string): Promise<void> {
    const result = await AddressModel.deleteOne({ _id: addressId, user: userId });
    if (result.deletedCount === 0) throw new ApiError(404, 'Address not found');
  },
  async preferences(userId: string): Promise<unknown> {
    return UserPreferenceModel.findOneAndUpdate({ user: userId }, { user: userId }, { upsert: true, new: true, setDefaultsOnInsert: true }).lean();
  },
  async updatePreferences(userId: string, input: PreferenceInput): Promise<unknown> {
    return UserPreferenceModel.findOneAndUpdate({ user: userId }, input, { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }).lean();
  },
  async sessions(userId: string): Promise<unknown[]> {
    return UserSessionModel.find({ user: userId, revokedAt: { $exists: false }, expiresAt: { $gt: new Date() } }).sort({ lastActive: -1 }).select('-refreshTokenHash').lean();
  },
  async revokeSession(userId: string, sessionId: string): Promise<void> {
    const session = await UserSessionModel.findOneAndUpdate({ _id: sessionId, user: userId }, { revokedAt: new Date() }).select('+refreshTokenHash');
    if (!session) throw new ApiError(404, 'Session not found');
    await redis.del(refreshKeyFromHash(userId, session.refreshTokenHash));
  },
  async revokeOtherSessions(userId: string, currentRefreshToken?: string): Promise<void> {
    const keepHash = currentRefreshToken ? sha256(currentRefreshToken) : '';
    const sessions = await UserSessionModel.find({ user: userId, refreshTokenHash: { $ne: keepHash }, revokedAt: { $exists: false } }).select('+refreshTokenHash').lean();
    await UserSessionModel.updateMany({ user: userId, refreshTokenHash: { $ne: keepHash }, revokedAt: { $exists: false } }, { revokedAt: new Date() });
    const keys = sessions.map((session) => refreshKeyFromHash(userId, session.refreshTokenHash));
    if (keys.length > 0) await redis.del(keys);
  },
  async securityEvents(userId: string): Promise<unknown[]> {
    return SecurityEventModel.find({ user: userId }).sort({ createdAt: -1 }).limit(50).lean();
  },
  async accountDashboard(userId: string): Promise<Record<string, unknown>> {
    const [user, recentOrders, wishlist, addressCount, unreadSecurityEvents] = await Promise.all([
      UserModel.findById(userId).lean(),
      OrderModel.find({ user: userId }).sort({ createdAt: -1 }).limit(5).lean(),
      WishlistModel.findOne({ user: userId }).lean(),
      AddressModel.countDocuments({ user: userId }),
      SecurityEventModel.countDocuments({ user: userId, type: /login/i })
    ]);
    if (!user) throw new ApiError(404, 'User not found');
    return {
      user: toUserDto(user as UserLike),
      membershipStatus: user.role === 'customer' ? 'member' : user.role,
      recentOrders,
      wishlistCount: wishlist?.products.length ?? 0,
      savedAddresses: addressCount,
      rewardPoints: 0,
      recentlyViewedProducts: [],
      securityEvents: unreadSecurityEvents
    };
  },
  async deleteMe(userId: string): Promise<void> {
    const sessions = await UserSessionModel.find({ user: userId, revokedAt: { $exists: false } }).select('+refreshTokenHash').lean();
    await Promise.all([
      UserModel.findByIdAndUpdate(userId, { isActive: false, status: 'deleted', deletedAt: new Date(), email: 'deleted-' + userId + '@cruisin.local', $unset: { refreshTokenHash: 1 } }),
      UserSessionModel.updateMany({ user: userId, revokedAt: { $exists: false } }, { revokedAt: new Date() })
    ]);
    const keys = sessions.map((session) => refreshKeyFromHash(userId, session.refreshTokenHash));
    if (keys.length > 0) await redis.del(keys);
  }
};
