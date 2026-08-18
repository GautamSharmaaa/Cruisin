// Governed by .rules v1.0
import { describe, expect, it } from 'vitest';
import { API_CONFIG } from '../constants/config';

describe('admin API timeouts', () => {
  it('keeps long-running uploads separate from normal API requests', () => {
    expect(API_CONFIG.timeout).toBe(12_000);
    expect(API_CONFIG.uploadTimeout).toBe(120_000);
    expect(API_CONFIG.uploadTimeout).toBeGreaterThan(API_CONFIG.timeout);
  });
});
