// lib/api/helpers.ts

/**
 * Shared error handling for Supabase responses.
 */
export function throwOnError<T>(data: T | null, error: { message: string, code?: string } | null): T {
  if (error) {
    // Preserve the original error metadata for downstream handling
    const err = new Error(error.message);
    (err as any).code = error.code;
    throw err;
  }
  if (data === null) throw new Error('No data returned');
  return data;
}

/**
 * Common price resolving function.
 */
export function resolvePrice(basePrice: number, quantity: number, marginPercentage: number = 0) {
  const base = Number(basePrice);
  const margin = base * (Number(marginPercentage) / 100);
  const unit_price = base + margin;
  return { unit_price, subtotal: unit_price * quantity };
}
