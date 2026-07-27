import { describe, expect, it } from 'vitest';
import { stockBoundQuantity } from './cart-quantity';

describe('stock-bound cart quantity', () => {
  it('never lets the requested quantity exceed available stock', () => {
    expect(stockBoundQuantity(21, 20)).toBe(20);
    expect(stockBoundQuantity(100, 4)).toBe(4);
  });

  it('keeps a positive quantity for available products and returns zero when sold out', () => {
    expect(stockBoundQuantity(-2, 5)).toBe(1);
    expect(stockBoundQuantity(1, 0)).toBe(0);
  });
});
