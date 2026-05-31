import type { UnitType } from '@/lib/domain/models';
import { round2 } from '@/lib/common/utils/pricing';

/** Parse decimal quantity from user input; returns null if invalid. */
export function parseDecimalQuantity(raw: string): number | null {
  const trimmed = raw.trim().replace(/,/g, '.');
  if (!trimmed) return null;
  const n = parseFloat(trimmed);
  if (!Number.isFinite(n) || n <= 0) return null;
  return round2(n);
}

export function formatQuantityDisplay(qty: number, maxDecimals = 3): string {
  const rounded = round2(qty);
  if (Number.isInteger(rounded)) return String(rounded);
  return rounded.toFixed(maxDecimals).replace(/\.?0+$/, '');
}

/** Step size for +/- buttons by order unit. */
export function quantityStepForUnit(unit: UnitType): number {
  switch (unit) {
    case 'gram':
    case 'ml':
      return 50;
    case 'kg':
    case 'liter':
      return 0.1;
    case 'meter':
      return 0.5;
    default:
      return 1;
  }
}

export function unitLabel(unit: UnitType): string {
  const labels: Record<UnitType, string> = {
    kg: 'Kg',
    gram: 'Gram',
    liter: 'Litre',
    ml: 'ML',
    piece: 'Piece',
    box: 'Box',
    packet: 'Packet',
    carton: 'Carton',
    meter: 'Meter',
  };
  return labels[unit] ?? unit;
}
