import { useState, useEffect, useCallback, useMemo } from 'react';
import { fetchStores, fetchMaterials, fetchOrders, fetchSalesmen } from '@/lib/api';
import type { StoreWithLatestOrder, Material, Order } from '@/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';

// Global singleton state to survive navigation
let globalStores: StoreWithLatestOrder[] | null = null;
let globalMaterials: Material[] | null = null;
let globalOrders: Order[] | null = null;
let globalSalesmen: any[] | null = null;
let isFetching = false;
let lastFetchTime = 0;
let salesmenSubscription: any = null;

// ─── Constants & Persistence Keys ───────────────────────────
const CACHE_TTL = 1 * 60 * 1000; 
const getKey = (key: string, ownerId: string) => `${key}_${ownerId}`;

const STORES_BASE_KEY    = 'wholesale_cache_stores';
const MATERIALS_BASE_KEY = 'wholesale_cache_materials';
const ORDERS_BASE_KEY    = 'wholesale_cache_orders';
const SALESMEN_BASE_KEY  = 'wholesale_cache_salesmen';

const listeners = {
  stores: new Set<() => void>(),
  materials: new Set<() => void>(),
  orders: new Set<() => void>(),
  salesmen: new Set<() => void>(),
  all: new Set<() => void>(),
};

let currentOwnerId: string | null = null;
let notifyTimeout: any = null;

const notify = (type?: 'stores' | 'materials' | 'orders' | 'salesmen') => {
  if (!type) {
    listeners.stores.forEach(l => l());
    listeners.materials.forEach(l => l());
    listeners.orders.forEach(l => l());
    listeners.salesmen.forEach(l => l());
    listeners.all.forEach(l => l());
    return;
  }
  listeners[type].forEach(l => l());
  listeners.all.forEach(l => l());
};

const debouncedNotifyAll = () => {
  if (notifyTimeout) clearTimeout(notifyTimeout);
  notifyTimeout = setTimeout(() => {
    notify();
    notifyTimeout = null;
  }, 10);
};

export const clearAllCaches = async (): Promise<void> => {
  globalStores = null;
  globalMaterials = null;
  globalOrders = null;
  globalSalesmen = null;
  currentOwnerId = null;
  lastFetchTime = 0;
  isFetching = false;

  if (salesmenSubscription) {
    supabase.removeChannel(salesmenSubscription);
    salesmenSubscription = null;
  }

  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter((k) => k.startsWith('wholesale_cache_'));
    if (cacheKeys.length > 0) {
      await AsyncStorage.multiRemove(cacheKeys);
    }
  } catch (e) {
    console.warn('[useDataStore] Failed to clear disk cache:', e);
  }

  notify();
};

/** @deprecated Use clearAllCaches */
export const clearCache = clearAllCaches;

export const addStoreOptimistic = (store: StoreWithLatestOrder) => {
  globalStores = [store, ...(globalStores || [])];
  notify('stores');
};

export const addOrderOptimistic = (order: Order) => {
  if (globalOrders) {
    globalOrders = [order, ...globalOrders];
    notify('orders');
  }
};

export const addMaterialOptimistic = (mat: Material) => {
  if (globalMaterials) {
    globalMaterials = [mat, ...globalMaterials];
    notify('materials');
  }
};

const setupRealtime = (ownerId: string) => {
  if (salesmenSubscription) {
    supabase.removeChannel(salesmenSubscription);
  }

  salesmenSubscription = supabase
    .channel(`public:profiles:owner_id=eq.${ownerId}`)
    .on(
      'postgres_changes',
      {
        event: '*', 
        schema: 'public',
        table: 'profiles',
        filter: `owner_id=eq.${ownerId}`,
      },
      async (payload) => {
        try {
          console.log('[useDataStore] Real-time activity detected. Syncing staff...');
          // Small delay (300ms) to ensure DB indexing is complete for the query
          await new Promise(resolve => setTimeout(resolve, 300));
          const freshSalesmen = await fetchSalesmen(ownerId);
          if (freshSalesmen && Array.isArray(freshSalesmen)) {
            globalSalesmen = freshSalesmen;
            void AsyncStorage.setItem(getKey(SALESMEN_BASE_KEY, ownerId), JSON.stringify(freshSalesmen));
            notify('salesmen');
          }
        } catch (e) {
          console.error('[useDataStore] Real-time fetch failed:', e);
        }
      }
    )
    .subscribe();
};

export const prefetchData = async (ownerId: string | null | undefined, force = false) => {
  if (!ownerId) return;
  const now = Date.now();
  
  if (currentOwnerId !== ownerId) {
    const oldOwnerId = currentOwnerId;
    currentOwnerId = ownerId;
    
    // Only wipe globals if we are actually switching users, not just re-booting same user
    if (oldOwnerId && oldOwnerId !== ownerId) {
      globalStores = null;
      globalMaterials = null;
      globalOrders = null;
      globalSalesmen = null;
      lastFetchTime = 0;
    }
    
    setupRealtime(ownerId);
    
    try {
      const sKey = getKey(STORES_BASE_KEY, ownerId);
      const mKey = getKey(MATERIALS_BASE_KEY, ownerId);
      const oKey = getKey(ORDERS_BASE_KEY, ownerId);
      const slKey = getKey(SALESMEN_BASE_KEY, ownerId);

      const [sRaw, mRaw, oRaw, slRaw] = await Promise.all([
        AsyncStorage.getItem(sKey),
        AsyncStorage.getItem(mKey),
        AsyncStorage.getItem(oKey),
        AsyncStorage.getItem(slKey)
      ]);
      
      if (sRaw) globalStores = JSON.parse(sRaw);
      if (mRaw) globalMaterials = JSON.parse(mRaw);
      if (oRaw) globalOrders = JSON.parse(oRaw);
      if (slRaw) globalSalesmen = JSON.parse(slRaw);
      
      if (globalStores || globalMaterials || globalOrders || globalSalesmen) {
        debouncedNotifyAll();
      }
    } catch (e) {
      console.warn('[useDataStore] Disk hydration failed:', e);
    }
  }

  if (!force && globalStores && globalMaterials && globalOrders && globalSalesmen && (now - lastFetchTime < CACHE_TTL)) {
    return;
  }

  if (isFetching) return;
  isFetching = true;

  try {
    const results = await Promise.allSettled([
      fetchStores(ownerId), 
      fetchMaterials(ownerId), 
      fetchOrders(ownerId),
      fetchSalesmen(ownerId)
    ]);

    // Only update globals that succeeded
    if (results[0].status === 'fulfilled') globalStores = results[0].value;
    if (results[1].status === 'fulfilled') globalMaterials = results[1].value;
    if (results[2].status === 'fulfilled') globalOrders = results[2].value;
    if (results[3].status === 'fulfilled') globalSalesmen = results[3].value;

    lastFetchTime = Date.now();
    
    // Multi-set only successes
    const storageItems: [string, string][] = [];
    if (results[0].status === 'fulfilled') storageItems.push([getKey(STORES_BASE_KEY, ownerId), JSON.stringify(results[0].value)]);
    if (results[1].status === 'fulfilled') storageItems.push([getKey(MATERIALS_BASE_KEY, ownerId), JSON.stringify(results[1].value)]);
    if (results[2].status === 'fulfilled') storageItems.push([getKey(ORDERS_BASE_KEY, ownerId), JSON.stringify(results[2].value)]);
    if (results[3].status === 'fulfilled') storageItems.push([getKey(SALESMEN_BASE_KEY, ownerId), JSON.stringify(results[3].value)]);

    if (storageItems.length) {
      void AsyncStorage.multiSet(storageItems);
    }

    debouncedNotifyAll();
  } catch (e) {
    console.error('[useDataStore] Cloud sync unexpected failure:', e);
  } finally {
    isFetching = false;
  }
};

export function useDataStore(ownerId?: string | null) {
  const [stores, setStores] = useState<StoreWithLatestOrder[] | null>(globalStores);
  const [materials, setMaterials] = useState<Material[] | null>(globalMaterials);
  const [orders, setOrders] = useState<Order[] | null>(globalOrders);
  const [salesmen, setSalesmen] = useState<any[] | null>(globalSalesmen);
  const [loading, setLoading] = useState(!globalStores && !globalMaterials && !globalOrders && !globalSalesmen);

  const refresh = useCallback(async (force = true) => {
    if (!ownerId) {
      setLoading(false);
      return;
    }
    const isDry = !globalStores || !globalMaterials || !globalOrders || !globalSalesmen;
    if (isDry) setLoading(true);
    await prefetchData(ownerId, force);
    setLoading(false);
  }, [ownerId]);

  useEffect(() => {
    const update = () => {
      setStores(globalStores ? [...globalStores] : null);
      setMaterials(globalMaterials ? [...globalMaterials] : null);
      setOrders(globalOrders ? [...globalOrders] : null);
      setSalesmen(globalSalesmen ? [...globalSalesmen] : null);
    };

    listeners.all.add(update);
    if (ownerId && (!globalStores || !globalMaterials || !globalOrders || !globalSalesmen || ownerId !== currentOwnerId)) {
      void refresh(false);
    } else {
      setLoading(false);
    }
    return () => {
      listeners.all.delete(update);
    };
  }, [refresh, ownerId]);

  return useMemo(() => ({
    stores: stores || [],
    materials: materials || [],
    orders: orders || [],
    salesmen: salesmen || [],
    loading,
    refresh
  }), [stores, materials, orders, salesmen, loading, refresh]);
}
