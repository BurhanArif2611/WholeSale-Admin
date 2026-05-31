import { generateId } from '@/lib/core/id';
import { calculateLineTotal } from '@/lib/common/utils/pricing';
import type { UnitType } from '@/lib/domain/models';

export interface CartLineInput {
  line_id: string;
  product_id: string | null;
  product_name: string;
  /** Price is per this unit (product selling unit). */
  unit_type: UnitType;
  /** Quantity entered in this unit. */
  order_unit: UnitType;
  quantity: number;
  unit_price: number;
  purchase_price: number;
  allow_discount: boolean;
  max_discount_percent: number;
  stock_quantity: number;
  discount_percent: number;
  tax_percent: number;
  line_total: number;
  needs_discount_approval?: boolean;
  is_temporary?: boolean;
  notes?: string | null;
}

export function cartLineKey(item: CartLineInput): string {
  return item.line_id;
}

export function recalcLine(item: Omit<CartLineInput, 'line_total'>): CartLineInput {
  const { total } = calculateLineTotal(
    item.unit_price,
    item.unit_type,
    item.quantity,
    item.order_unit,
    item.discount_percent,
    item.tax_percent,
  );
  return { ...item, line_total: total };
}

export function findCartLineByProductId(cart: CartLineInput[], productId: string): CartLineInput | undefined {
  return cart.find((x) => x.product_id === productId && !x.is_temporary);
}

export function updateCartQuantity(
  cart: CartLineInput[],
  lineId: string,
  delta: number,
): CartLineInput[] {
  const idx = cart.findIndex((x) => x.line_id === lineId);
  if (idx < 0) return cart;

  const item = cart[idx];
  const newQty = Math.max(0, roundQty(item.quantity + delta, item.order_unit));

  if (newQty <= 0) {
    return cart.filter((x) => x.line_id !== lineId);
  }

  return cart.map((x) =>
    x.line_id === lineId ? recalcLine({ ...x, quantity: newQty }) : x,
  );
}

export function setCartLineQuantity(cart: CartLineInput[], lineId: string, quantity: number): CartLineInput[] {
  if (quantity <= 0) return cart.filter((x) => x.line_id !== lineId);
  return cart.map((x) =>
    x.line_id === lineId ? recalcLine({ ...x, quantity: roundQty(quantity, x.order_unit) }) : x,
  );
}

export function setCartLineOrderUnit(cart: CartLineInput[], lineId: string, orderUnit: UnitType): CartLineInput[] {
  return cart.map((x) =>
    x.line_id === lineId ? recalcLine({ ...x, order_unit: orderUnit }) : x,
  );
}

export function setCartLineDiscount(
  cart: CartLineInput[],
  lineId: string,
  discountPercent: number,
  needsApproval = false,
): CartLineInput[] {
  return cart.map((x) =>
    x.line_id === lineId
      ? recalcLine({ ...x, discount_percent: discountPercent, needs_discount_approval: needsApproval })
      : x,
  );
}

export function applyCartLineUpdate(
  cart: CartLineInput[],
  lineId: string,
  quantity: number,
  orderUnit: UnitType,
  discountPercent: number,
  needsApproval = false,
): CartLineInput[] {
  if (quantity <= 0) return cart.filter((x) => x.line_id !== lineId);
  return cart.map((x) => {
    if (x.line_id !== lineId) return x;
    return recalcLine({
      ...x,
      quantity: roundQty(quantity, orderUnit),
      order_unit: orderUnit,
      discount_percent: discountPercent,
      needs_discount_approval: needsApproval,
    });
  });
}

export function removeFromCart(cart: CartLineInput[], lineId: string): CartLineInput[] {
  return cart.filter((x) => x.line_id !== lineId);
}

export function cartGrandTotal(cart: CartLineInput[]): number {
  return cart.reduce((s, i) => s + i.line_total, 0);
}

export function cartItemCount(cart: CartLineInput[]): number {
  return cart.reduce((s, i) => s + i.quantity, 0);
}

export function cartDistinctCount(cart: CartLineInput[]): number {
  return cart.length;
}

function roundQty(qty: number, unit: UnitType): number {
  const decimals = unit === 'gram' || unit === 'ml' ? 0 : 3;
  const factor = Math.pow(10, decimals);
  return Math.round(qty * factor) / factor;
}

export function buildCatalogCartLine(params: {
  product_id: string;
  product_name: string;
  unit_type: UnitType;
  unit_price: number;
  purchase_price?: number;
  allow_discount?: boolean;
  max_discount_percent?: number;
  stock_quantity?: number;
  discount_percent?: number;
  tax_percent?: number;
  quantity?: number;
  order_unit?: UnitType;
}): CartLineInput {
  const unit = params.unit_type;
  return recalcLine({
    line_id: params.product_id,
    product_id: params.product_id,
    product_name: params.product_name,
    unit_type: unit,
    order_unit: params.order_unit ?? unit,
    quantity: params.quantity ?? 1,
    unit_price: params.unit_price,
    purchase_price: params.purchase_price ?? 0,
    allow_discount: params.allow_discount ?? false,
    max_discount_percent: params.max_discount_percent ?? 0,
    stock_quantity: params.stock_quantity ?? 0,
    discount_percent: params.discount_percent ?? 0,
    tax_percent: params.tax_percent ?? 0,
    needs_discount_approval: false,
    is_temporary: false,
  });
}

export function buildTempCartLine(params: {
  product_name: string;
  quantity: number;
  unit_price: number;
  unit_type?: UnitType;
  notes?: string | null;
}): CartLineInput {
  const unit = params.unit_type ?? 'piece';
  return recalcLine({
    line_id: generateId(),
    product_id: null,
    product_name: params.product_name.trim(),
    unit_type: unit,
    order_unit: unit,
    quantity: params.quantity,
    unit_price: params.unit_price,
    purchase_price: 0,
    allow_discount: false,
    max_discount_percent: 0,
    stock_quantity: 0,
    discount_percent: 0,
    tax_percent: 0,
    is_temporary: true,
    notes: params.notes ?? null,
  });
}
