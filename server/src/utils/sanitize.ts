// Governed by .rules v1.0
export const sanitizeString = (value: string): string => value.trim().replace(/[<>]/g, '');

export const normalizeEmail = (value: string): string => sanitizeString(value).toLowerCase();
