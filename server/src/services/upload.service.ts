// Governed by .rules v1.0
import crypto from 'node:crypto';
import {MediaService,returnEvidenceMediaUrl} from './media/media.service.js';
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

const uploadBuffer = async (buffer: Buffer, customerId: string, file: Express.Multer.File): Promise<{publicId:string;version:number;format:string}> => {const asset=await MediaService.uploadCustomerEvidence({...file,buffer},customerId);return {publicId:`cruisin/returns/${customerId}/media_${asset.id}`,version:1,format:file.mimetype.split('/')[1]??'jpg'};};

export const UploadService = {
  signature(_folder: string): {timestamp:number;signature:string;folder:string} {throw new ApiError(410,'Cloudinary uploads are read-only in V2; use the media API'); },

  async uploadReturnEvidence(file: Express.Multer.File | undefined, customerId: string): Promise<ReturnEvidenceInput & { url: string }> {
    if (!file) throw new ApiError(400, 'Select a return photo to upload');
    if (!customerId) throw new ApiError(401, 'Sign in is required');
    const asset = env.NODE_ENV === 'test' && env.CLOUDINARY_CLOUD_NAME === 'logistics-e2e'
      ? { publicId: `cruisin/returns/${customerId}/${crypto.randomUUID()}`, version: 1, format: file.mimetype === 'image/png' ? 'png' : file.mimetype === 'image/webp' ? 'webp' : 'jpg' }
      : await uploadBuffer(file.buffer, customerId, file);
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
    const match = input.publicId.match(/\/media_([a-f0-9]{24})$/);
    if (match) return returnEvidenceMediaUrl(match[1]);
    return cloudinary.url(input.publicId, { type: 'authenticated', sign_url: true, secure: true, version: input.version, format: input.format });
  }
};
