import { useCallback, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CartLineInput } from '@/lib/common/utils/cart';

const DRAFT_PREFIX = 'order_draft_';

export interface OrderDraft {
  clientId: string | null;
  cart: CartLineInput[];
  paidAmount: string;
  paymentMode: string;
  notes: string;
  discountType: string;
  discountValue: string;
  step: number;
  updatedAt: string;
}

export function useOrderDraft(storageKey: string, draft: OrderDraft | null, enabled: boolean) {
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const key = DRAFT_PREFIX + storageKey;

  const clearDraft = useCallback(async () => {
    await AsyncStorage.removeItem(key);
  }, [key]);

  useEffect(() => {
    if (!enabled || !draft || draft.cart.length === 0) return;

    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void AsyncStorage.setItem(key, JSON.stringify(draft));
    }, 800);

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [draft, enabled, key]);

  const loadDraft = useCallback(async (): Promise<OrderDraft | null> => {
    try {
      const raw = await AsyncStorage.getItem(key);
      if (!raw) return null;
      return JSON.parse(raw) as OrderDraft;
    } catch {
      return null;
    }
  }, [key]);

  return { loadDraft, clearDraft };
}
