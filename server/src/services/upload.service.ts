// Governed by .rules v1.0
import { cloudinary } from '../config/cloudinary.js';

export const UploadService = {
  signature(folder: string): { timestamp: number; signature: string; folder: string } { const timestamp = Math.round(Date.now() / 1000); const signature = cloudinary.utils.api_sign_request({ timestamp, folder }, cloudinary.config().api_secret ?? ''); return { timestamp, signature, folder }; }
};
