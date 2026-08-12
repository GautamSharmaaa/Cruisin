import { describe, expect, it } from 'vitest';
import { API_CONFIG, SHIPROCKET_BULK_SYNC_TIMEOUT_MS } from './config';

describe('Shiprocket bulk synchronization timeout', () => {
  it('allows bounded provider reconciliation to outlive ordinary API requests', () => {
    expect(SHIPROCKET_BULK_SYNC_TIMEOUT_MS).toBe(120_000);
    expect(SHIPROCKET_BULK_SYNC_TIMEOUT_MS).toBeGreaterThan(API_CONFIG.timeout);
  });
});
