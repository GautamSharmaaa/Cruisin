// Governed by .rules v1.0
import { createHmac, randomBytes } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { redis } from '../config/redis.js';
import { SecurityEventModel } from '../models/security-event.model.js';
import { UserModel } from '../models/user.model.js';
import { ApiError } from '../utils/api-error.js';
import { normalizePhone } from '../utils/phone.js';
import type { AccessTokenPayload } from '../types/auth.types.js';

const grantSeconds = 30 * 60;
const sessionSeconds = 15 * 60;
const customerFilter = { role: 'customer', isActive: true, status: 'active' };
const adminFilter = { role: { $in: ['admin', 'superadmin'] }, isActive: true, status: 'active' };
const sessionKey = (id: string) => 'customer-access:session:' + id;
const digest = (actorId: string, phone: string, code: string) =>
  createHmac('sha256', env.JWT_ACCESS_SECRET).update(JSON.stringify([actorId, phone, code])).digest('hex');

export const CustomerAccessService = {
  async generate(actorId: string, customerId: string) {
    const [admin, customer] = await Promise.all([
      UserModel.exists({ _id: actorId, ...adminFilter }),
      UserModel.findOne({ _id: customerId, ...customerFilter }).select('phone').lean()
    ]);
    if (!admin) throw new ApiError(403, 'Active administrator required.');
    if (!customer?.phone) throw new ApiError(400, 'An active customer with a registered phone is required.');
    const phone = normalizePhone(customer.phone);
    const code = randomBytes(10).toString('hex').toUpperCase();
    await SecurityEventModel.create({ user: customerId, type: 'assisted_access_generated', metadata: { actorId } });
    await redis.set('customer-access:grant:' + digest(actorId, phone, code), customerId, 'EX', grantSeconds);
    return { code, phone, expiresAt: new Date(Date.now() + grantSeconds * 1000).toISOString() };
  },

  async redeem(actorId: string, input: { phone: string; code: string }) {
    const phone = normalizePhone(input.phone);
    const admin = await UserModel.exists({ _id: actorId, ...adminFilter });
    if (!admin) throw new ApiError(403, 'Active administrator required.');
    const key = 'customer-access:grant:' + digest(actorId, phone, input.code.toUpperCase());
    const customerId = await redis.get(key);
    // Each code has a unique, immutable key. Only the request that deletes it can proceed.
    if (!customerId || await redis.del(key) !== 1) throw new ApiError(400, 'That access code is invalid, expired or already used.');
    const customer = await UserModel.findOne({ _id: customerId, ...customerFilter }).select('email phone').lean();
    if (!customer?.phone || normalizePhone(customer.phone) !== phone) {
      throw new ApiError(400, 'That access code is invalid, expired or already used.');
    }
    const id = randomBytes(16).toString('hex');
    const token: AccessTokenPayload = { userId: customerId, email: customer.email, role: 'customer', assisted: { actorId, id } };
    await SecurityEventModel.create({ user: customerId, type: 'assisted_access_started', metadata: { actorId, sessionId: id } });
    await redis.set(sessionKey(id), 'active', 'EX', sessionSeconds);
    return { accessToken: jwt.sign(token, env.JWT_ACCESS_SECRET, { expiresIn: sessionSeconds }), expiresAt: Date.now() + sessionSeconds * 1000 };
  },

  async assertActive(payload: AccessTokenPayload) {
    if (!payload.assisted) return;
    const [session, admin, customer] = await Promise.all([
      redis.get(sessionKey(payload.assisted.id)),
      UserModel.exists({ _id: payload.assisted.actorId, ...adminFilter }),
      UserModel.exists({ _id: payload.userId, ...customerFilter })
    ]);
    if (session !== 'active' || !admin || !customer) throw new ApiError(401, 'Assisted access has ended.');
  },

  async end(payload: AccessTokenPayload) {
    if (!payload.assisted) throw new ApiError(403, 'Assisted session required.');
    await redis.del(sessionKey(payload.assisted.id));
    await SecurityEventModel.create({ user: payload.userId, type: 'assisted_access_ended', metadata: { actorId: payload.assisted.actorId, sessionId: payload.assisted.id } });
  }
};
