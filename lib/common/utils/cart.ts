import { calculateLineTotal } from '@/lib/common/utils/pricing';
import type { UnitType } from '@/lib/domain/models';

export interface CartLineInput {
  product_id: string;
  product_name: string;
  unit_type: UnitType;
  quantity: number;
  unit_price: number;
  discount_percent: number;
  tax_percent: number;
  line_total: number;
}

export function recalcLine(item: Omit<CartLineInput, 'line_total'>): CartLineInput {
  const { total } = calculateLineTotal(
    item.unit_price,
    item.unit_type,
    item.quantity,
    item.unit_type,
    item.discount_percent,
    item.tax_percent,
  );
  return { ...item, line_total: total };
}

export function updateCartQuantity(
  cart: CartLineInput[],
  productId: string,
  delta: number,
): CartLineInput[] {
  const idx = cart.findIndex((x) => x.product_id === productId);
  if (idx < 0) return cart;

  const item = cart[idx];
  const newQty = item.quantity + delta;

  if (newQty <= 0) {
    return cart.filter((x) => x.product_id !== productId);
  }

  return cart.map((x) =>
    x.product_id === productId ? recalcLine({ ...x, quantity: newQty }) : x,
  );
}

export function removeFromCart(cart: CartLineInput[], productId: string): CartLineInput[] {
  return cart.filter((x) => x.product_id !== productId);
}

export function cartGrandTotal(cart: CartLineInput[]): number {
  return cart.reduce((s, i) => s + i.line_total, 0);
}

export function cartItemCount(cart: CartLineInput[]): number {
  return cart.reduce((s, i) => s + i.quantity, 0);
}
