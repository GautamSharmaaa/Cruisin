import { describe, expect, it } from 'vitest';
import { cmsPreviewQuerySchema } from './cms.validator.js';
import { productQuerySchema } from './product.validator.js';

describe('query boolean validation', () => {
  it('parses explicit true and false strings without truthy string coercion', () => {
    expect(productQuerySchema.parse({ sale: 'false' }).sale).toBe(false);
    expect(productQuerySchema.parse({ featured: 'true' }).featured).toBe(true);
    expect(cmsPreviewQuerySchema.parse({ includeInactive: 'false' }).includeInactive).toBe(false);
  });

  it('rejects ambiguous boolean query values', () => {
    expect(productQuerySchema.safeParse({ sale: 'yes' }).success).toBe(false);
    expect(cmsPreviewQuerySchema.safeParse({ includeInactive: '1' }).success).toBe(false);
  });
});
