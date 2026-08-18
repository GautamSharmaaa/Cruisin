import { describe, expect, it } from 'vitest';
import { adaptiveImageQuality } from './adaptive-image-quality';

describe('adaptive image quality', () => {
  it('uses a sharp default when network information is unavailable', () => {
    expect(adaptiveImageQuality()).toBe(85);
  });

  it('reduces transfer size for constrained or data-saving connections', () => {
    expect(adaptiveImageQuality({ effectiveType: '2g' })).toBe(60);
    expect(adaptiveImageQuality({ effectiveType: '4g', saveData: true })).toBe(60);
    expect(adaptiveImageQuality({ effectiveType: '3g' })).toBe(75);
  });

  it('increases quality on a strong connection', () => {
    expect(adaptiveImageQuality({ effectiveType: '4g' })).toBe(92);
    expect(adaptiveImageQuality({ downlink: 10 })).toBe(92);
  });
});
