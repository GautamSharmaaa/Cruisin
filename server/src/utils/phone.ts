import { ApiError } from './api-error.js';

export const E164_PHONE_PATTERN = /^\+[1-9]\d{7,14}$/;

export const normalizePhone = (value: string): string => {
  const phone = value.replace(/[\s()-]/g, '');
  if (!E164_PHONE_PATTERN.test(phone)) {
    throw new ApiError(400, 'Phone number must use E.164 format, for example +919876543210');
  }
  return phone;
};
