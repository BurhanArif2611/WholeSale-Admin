import { round2 } from '@/lib/common/utils/pricing';
import type { CartLineInput } from '@/lib/common/utils/cart';
import { calculateLineTotal } from '@/lib/common/utils/pricing';

export type OrderDiscountType = 'percent' | 'fixed';

export interface CartBreakdown {
  subtotal: number;
  lineDiscount: number;
  taxTotal: number;
  itemsTotal: number;
}

export function computeCartBreakdown(cart: CartLineInput[]): CartBreakdown {
  let subtotal = 0;
  let lineDiscount = 0;
  let taxTotal = 0;
  let itemsTotal = 0;

  for (const item of cart) {
    const c = calculateLineTotal(
      item.unit_price,
      item.unit_type,
      item.quantity,
      item.order_unit ?? item.unit_type,
      item.discount_percent,
      item.tax_percent,
    );
    subtotal += c.subtotal;
    lineDiscount += c.discountAmount;
    taxTotal += c.taxAmount;
    itemsTotal += c.total;
  }

  return {
    subtotal: round2(subtotal),
    lineDiscount: round2(lineDiscount),
    taxTotal: round2(taxTotal),
    itemsTotal: round2(itemsTotal),
  };
}

export function parseDiscountInput(raw: string): number {
  const n = parseFloat(raw.replace(/,/g, '').trim());
  return Number.isFinite(n) ? n : 0;
}

export function validateOrderDiscount(
  itemsTotal: number,
  type: OrderDiscountType | null,
  rawValue: string,
): { amount: number; value: number; error: string | null } {
  if (!type || !rawValue.trim()) {
    return { amount: 0, value: 0, error: null };
  }

  const value = parseDiscountInput(rawValue);
  if (value < 0) {
    return { amount: 0, value, error: 'err_discount_negative' };
  }
  if (value === 0) {
    return { amount: 0, value: 0, error: null };
  }

  if (type === 'percent') {
    if (value > 100) {
      return { amount: 0, value, error: 'err_discount_percent_max' };
    }
    return { amount: round2((itemsTotal * value) / 100), value, error: null };
  }

  if (value > itemsTotal) {
    return { amount: 0, value, error: 'err_discount_exceeds_total' };
  }

  return { amount: round2(value), value, error: null };
}
