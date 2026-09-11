// Governed by .rules v1.0
import crypto from 'node:crypto';
import { env } from '../config/env.js';
import { ApiError } from '../utils/api-error.js';

const key = (dedicated: boolean): Buffer => crypto.createHash('sha256')
  .update(dedicated && env.REFUND_DESTINATION_ENCRYPTION_KEY ? env.REFUND_DESTINATION_ENCRYPTION_KEY : `${env.JWT_ACCESS_SECRET}:cruisin-refund-destination:v1`)
  .digest();

export const RefundDestinationVault = {
  encrypt(value: string): string {
    const version = env.REFUND_DESTINATION_ENCRYPTION_KEY ? 'v1e' : 'v1j';
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key(version === 'v1e'), iv);
    cipher.setAAD(Buffer.from('cruisin:return-destination:v1'));
    const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    return [version, iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), encrypted.toString('base64url')].join('.');
  },

  decrypt(value: string): string {
    const [version, ivValue, tagValue, encryptedValue] = value.split('.');
    if (!['v1', 'v1e', 'v1j'].includes(version ?? '') || !ivValue || !tagValue || !encryptedValue) throw new ApiError(500, 'Refund destination could not be read securely');
    if (version === 'v1e' && !env.REFUND_DESTINATION_ENCRYPTION_KEY) throw new ApiError(500, 'Refund destination encryption key is unavailable');
    try {
      const decipher = crypto.createDecipheriv('aes-256-gcm', key(version === 'v1e'), Buffer.from(ivValue, 'base64url'));
      decipher.setAAD(Buffer.from('cruisin:return-destination:v1'));
      decipher.setAuthTag(Buffer.from(tagValue, 'base64url'));
      return Buffer.concat([decipher.update(Buffer.from(encryptedValue, 'base64url')), decipher.final()]).toString('utf8');
    } catch {
      throw new ApiError(500, 'Refund destination could not be read securely');
    }
  }
};
