import type { UnitType } from '@/lib/domain/models';

/** Convert any supported unit to base quantity (kg, liter, or piece). */
export function toBaseQuantity(quantity: number, unit: UnitType): number {
  switch (unit) {
    case 'gram':
      return quantity / 1000;
    case 'kg':
      return quantity;
    case 'ml':
      return quantity / 1000;
    case 'liter':
      return quantity;
    case 'piece':
    case 'box':
    case 'packet':
    case 'meter':
      return quantity;
    default:
      return quantity;
  }
}

export function getBaseUnit(unit: UnitType): UnitType {
  if (unit === 'gram') return 'kg';
  if (unit === 'ml') return 'liter';
  if (unit === 'box' || unit === 'packet') return 'piece';
  return unit;
}

export interface LineCalculation {
  baseQuantity: number;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
}

/** Price is per base unit (per kg, per liter, or per piece). */
export function calculateLineTotal(
  unitPrice: number,
  priceUnit: UnitType,
  quantity: number,
  quantityUnit: UnitType,
  discountPercent = 0,
  taxPercent = 0,
): LineCalculation {
  const baseQty = toBaseQuantity(quantity, quantityUnit);
  const subtotal = unitPrice * baseQty;
  const discountAmount = (subtotal * discountPercent) / 100;
  const afterDiscount = subtotal - discountAmount;
  const taxAmount = (afterDiscount * taxPercent) / 100;
  const total = afterDiscount + taxAmount;

  return {
    baseQuantity: baseQty,
    subtotal: round2(subtotal),
    discountAmount: round2(discountAmount),
    taxAmount: round2(taxAmount),
    total: round2(total),
  };
}

export function calculateOrderTotals(
  items: Array<{ line_total: number; discount_percent: number; tax_percent: number; unit_price: number; quantity: number; unit_type: UnitType }>,
): { subtotal: number; discountTotal: number; taxTotal: number; grandTotal: number } {
  let subtotal = 0;
  let discountTotal = 0;
  let taxTotal = 0;

  for (const item of items) {
    const calc = calculateLineTotal(
      item.unit_price,
      item.unit_type,
      item.quantity,
      item.unit_type,
      item.discount_percent,
      item.tax_percent,
    );
    subtotal += calc.subtotal;
    discountTotal += calc.discountAmount;
    taxTotal += calc.taxAmount;
  }

  const grandTotal = subtotal - discountTotal + taxTotal;
  return {
    subtotal: round2(subtotal),
    discountTotal: round2(discountTotal),
    taxTotal: round2(taxTotal),
    grandTotal: round2(grandTotal),
  };
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export const UNIT_OPTIONS: { label: string; value: UnitType }[] = [
  { label: 'KG', value: 'kg' },
  { label: 'Gram', value: 'gram' },
  { label: 'Liter', value: 'liter' },
  { label: 'ML', value: 'ml' },
  { label: 'Piece', value: 'piece' },
  { label: 'Box', value: 'box' },
  { label: 'Packet', value: 'packet' },
  { label: 'Meter', value: 'meter' },
];

/** Units the user may enter quantity in for a product priced in `priceUnit`. */
export function getCompatibleOrderUnits(priceUnit: UnitType): UnitType[] {
  if (priceUnit === 'kg' || priceUnit === 'gram') return ['kg', 'gram'];
  if (priceUnit === 'liter' || priceUnit === 'ml') return ['liter', 'ml'];
  return [priceUnit];
}
