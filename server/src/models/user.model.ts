// Governed by .rules v1.0
import { Schema, model, type InferSchemaType } from 'mongoose';
import { userRoles } from '../types/auth.types.js';

const addressSchema = new Schema(
  {
    label: { type: String, required: true, trim: true },
    fullName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    line1: { type: String, required: true, trim: true },
    line2: { type: String, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    postalCode: { type: String, required: true, trim: true },
    country: { type: String, required: true, trim: true, default: 'India' },
    isDefault: { type: Boolean, default: false }
  },
  { _id: true }
);

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: userRoles, default: 'customer', index: true },
    status: { type: String, enum: ['active', 'suspended', 'pending_verification', 'deleted'], default: 'active', index: true },
    avatar: { type: String },
    phone: { type: String, trim: true },
    whatsappNumber: { type: String, trim: true },
    gender: { type: String, enum: ['male', 'female', 'non_binary', 'prefer_not_to_say'] },
    dateOfBirth: { type: Date },
    addresses: { type: [addressSchema], default: [] },
    isVerified: { type: Boolean, default: false, index: true },
    emailVerifiedAt: { type: Date },
    phoneVerifiedAt: { type: Date },
    whatsappVerifiedAt: { type: Date },
    isActive: { type: Boolean, default: true, index: true },
    refreshTokenHash: { type: String, select: false },
    lastLogin: { type: Date },
    deletedAt: { type: Date, index: true }
  },
  { timestamps: true }
);

userSchema.index({ email: 1, isActive: 1 });
userSchema.index({ phone: 1 }, { unique: true, sparse: true });
userSchema.index({ whatsappNumber: 1 }, { unique: true, sparse: true });

export type UserDocument = InferSchemaType<typeof userSchema>;
export const UserModel = model('User', userSchema);
