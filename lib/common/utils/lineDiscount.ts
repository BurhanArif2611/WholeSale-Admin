import { calculateLineTotal, round2, toBaseQuantity } from '@/lib/common/utils/pricing';
import type { UnitType } from '@/lib/domain/models';

export type LineDiscountErrorKey =
  | 'err_free_sale'
  | 'err_discount_not_allowed'
  | 'err_max_discount'
  | 'err_qty_zero'
  | 'err_insufficient_stock';

export interface LineDiscountValidation {
  valid: boolean;
  error: LineDiscountErrorKey | null;
  needsApproval: boolean;
  finalUnitPrice: number;
  discountAmountPerUnit: number;
  lineTotal: number;
  originalLineTotal: number;
  discountAmount: number;
}

export const DEFAULT_DISCOUNT_CHIPS = [0, 5, 10, 15];

export function discountChipsForProduct(maxDiscountPercent: number): number[] {
  const base = DEFAULT_DISCOUNT_CHIPS.filter((d) => d <= maxDiscountPercent);
  if (maxDiscountPercent > 0 && !base.includes(maxDiscountPercent)) {
    base.push(maxDiscountPercent);
  }
  return [...new Set(base)].sort((a, b) => a - b);
}

export function finalUnitPrice(unitPrice: number, discountPercent: number): number {
  return round2(unitPrice * (1 - discountPercent / 100));
}

export function validateLineDiscount(params: {
  unitPrice: number;
  purchasePrice: number;
  discountPercent: number;
  allowDiscount: boolean;
  maxDiscountPercent: number;
  quantity: number;
  orderUnit: UnitType;
  priceUnit: UnitType;
  stockQuantity?: number;
  taxPercent?: number;
}): LineDiscountValidation {
  const {
    unitPrice,
    purchasePrice,
    discountPercent,
    allowDiscount,
    maxDiscountPercent,
    quantity,
    orderUnit,
    priceUnit,
    stockQuantity = 0,
    taxPercent = 0,
  } = params;

  const originalCalc = calculateLineTotal(unitPrice, priceUnit, quantity, orderUnit, 0, taxPercent);
  const calc = calculateLineTotal(unitPrice, priceUnit, quantity, orderUnit, discountPercent, taxPercent);
  const unitFinal = finalUnitPrice(unitPrice, discountPercent);
  const discountPerUnit = round2(unitPrice - unitFinal);

  const base: LineDiscountValidation = {
    valid: true,
    error: null,
    needsApproval: false,
    finalUnitPrice: unitFinal,
    discountAmountPerUnit: discountPerUnit,
    lineTotal: calc.total,
    originalLineTotal: originalCalc.total,
    discountAmount: round2(originalCalc.subtotal - calc.subtotal + (originalCalc.discountAmount)),
  };

  if (quantity <= 0) {
    return { ...base, valid: false, error: 'err_qty_zero' };
  }

  if (discountPercent > 0 && !allowDiscount) {
    return { ...base, valid: false, error: 'err_discount_not_allowed' };
  }

  if (allowDiscount && discountPercent > maxDiscountPercent) {
    return { ...base, valid: false, error: 'err_max_discount' };
  }

  if (unitFinal <= 0 || calc.total <= 0) {
    return { ...base, valid: false, error: 'err_free_sale' };
  }

  if (purchasePrice > 0 && unitFinal <= purchasePrice) {
    return { ...base, valid: true, needsApproval: true };
  }

  if (stockQuantity > 0) {
    const orderedBase = toBaseQuantity(quantity, orderUnit);
    if (orderedBase > stockQuantity) {
      return { ...base, valid: false, error: 'err_insufficient_stock' };
    }
  }

  return base;
}
