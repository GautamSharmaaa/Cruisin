// Governed by .rules v1.0
import crypto from 'node:crypto';
import { cloudinary } from '../config/cloudinary.js';
import { env } from '../config/env.js';
import { ApiError } from '../utils/api-error.js';

export interface ReturnEvidenceInput {
  publicId: string;
  version: number;
  format: string;
  token: string;
}

const evidenceToken = (customerId: string, publicId: string, version: number): string =>
  crypto.createHmac('sha256', env.JWT_ACCESS_SECRET).update(`${customerId}:${publicId}:${version}`).digest('hex');

const safeEqual = (left: string, right: string): boolean => {
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(Buffer.from(left), Buffer.from(right));
};

const uploadBuffer = async (buffer: Buffer, customerId: string): Promise<{ publicId: string; version: number; format: string }> =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({
      folder: `cruisin/returns/${customerId}`,
      resource_type: 'image',
      type: 'authenticated',
      overwrite: false,
      unique_filename: true,
      use_filename: false
    }, (error, result) => {
      if (error || !result?.public_id || !result.version || !result.format) {
        reject(new ApiError(502, 'Return photo upload failed'));
        return;
      }
      resolve({ publicId: result.public_id, version: result.version, format: result.format });
    });
    stream.end(buffer);
  });

export const UploadService = {
  signature(folder: string): { timestamp: number; signature: string; folder: string } { const timestamp = Math.round(Date.now() / 1000); const signature = cloudinary.utils.api_sign_request({ timestamp, folder }, cloudinary.config().api_secret ?? ''); return { timestamp, signature, folder }; },

  async uploadReturnEvidence(file: Express.Multer.File | undefined, customerId: string): Promise<ReturnEvidenceInput & { url: string }> {
    if (!file) throw new ApiError(400, 'Select a return photo to upload');
    if (!customerId) throw new ApiError(401, 'Sign in is required');
    const asset = env.NODE_ENV === 'test' && env.CLOUDINARY_CLOUD_NAME === 'logistics-e2e'
      ? { publicId: `cruisin/returns/${customerId}/${crypto.randomUUID()}`, version: 1, format: file.mimetype === 'image/png' ? 'png' : file.mimetype === 'image/webp' ? 'webp' : 'jpg' }
      : await uploadBuffer(file.buffer, customerId);
    return {
      ...asset,
      token: evidenceToken(customerId, asset.publicId, asset.version),
      url: env.NODE_ENV === 'test' && env.CLOUDINARY_CLOUD_NAME === 'logistics-e2e'
        ? `data:${file.mimetype};base64,${file.buffer.toString('base64')}`
        : this.returnEvidenceUrl(asset)
    };
  },

  validateReturnEvidence(input: ReturnEvidenceInput, customerId: string): { publicId: string; version: number; format: string } {
    if (!input.publicId.startsWith(`cruisin/returns/${customerId}/`)) throw new ApiError(400, 'Invalid return photo');
    if (!safeEqual(evidenceToken(customerId, input.publicId, input.version), input.token)) throw new ApiError(400, 'Invalid return photo token');
    return { publicId: input.publicId, version: input.version, format: input.format };
  },

  returnEvidenceUrl(input: { publicId: string; version: number; format: string }): string {
    return cloudinary.url(input.publicId, { type: 'authenticated', sign_url: true, secure: true, version: input.version, format: input.format });
  }
};
