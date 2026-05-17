jest.mock('../lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

import { resolvePrice } from '../lib/api';

describe('resolvePrice', () => {
  it('calculates price correctly with 0% margin', () => {
    const result = resolvePrice(100, 10, 0);
    expect(result.unit_price).toBe(100);
    expect(result.subtotal).toBe(1000);
  });

  it('calculates price correctly with 10% margin', () => {
    const result = resolvePrice(100, 5, 10);
    expect(result.unit_price).toBe(110);
    expect(result.subtotal).toBe(550);
  });

  it('handles decimal quantities and margins', () => {
    const result = resolvePrice(50, 2.5, 5);
    expect(result.unit_price).toBe(52.5);
    expect(result.subtotal).toBe(131.25);
  });

  it('defaults margin to 0 if not provided', () => {
    const result = resolvePrice(200, 1);
    expect(result.unit_price).toBe(200);
  });
});
