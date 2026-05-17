// hooks/useDashboardStats.ts
import { useMemo } from 'react';
import { useDataStore } from './useDataStore';
import type { Order, Store } from '@/types';

export function useDashboardStats(ownerId?: string | null) {
  const { stores, orders, materials, loading, refresh } = useDataStore(ownerId);

  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    
    return {
      orders:     orders.length,
      clients:    stores.length,
      products:   materials.length,
      debt:       stores.reduce((sum: number, st: Store) => sum + Number(st.total_debt ?? 0), 0),
      today:      orders.filter((o: Order) => o.date === today).length,
    };
  }, [stores, orders, materials]);

  return { 
    stats, 
    loading, 
    refreshing: loading, // Simplify by mapping loading to refreshing for UI compatibility
    loadStats: refresh, 
    onManualRefresh: () => refresh(true) 
  };
}
