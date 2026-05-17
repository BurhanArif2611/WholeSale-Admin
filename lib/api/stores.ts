// lib/api/stores.ts
import { supabase } from '../supabase';
import { throwOnError } from './helpers';
import type { Store, StoreWithLatestOrder, StoreHistory, CreateStorePayload, Order } from '@/types';

/**
 * Fetch all stores for a specific owner, with optional search and latest order data.
 */
export async function fetchStores(ownerId: string, search = ''): Promise<StoreWithLatestOrder[]> {
  let query = supabase
    .from('stores')
    .select('id, name, phone, area, total_debt, margin_percentage, extra_charges, created_at')
    .eq('owner_id', ownerId)
    .order('name', { ascending: true });

  if (search) query = query.or(`name.ilike.%${search}%,area.ilike.%${search}%`);

  const { data: stores, error } = await query;
  throwOnError(stores, error);

  const storeIds = (stores as Store[]).map((s) => s.id);
  if (!storeIds.length) return [];

  const { data: latestOrders } = await supabase
    .from('orders')
    .select('id, store_id, date, grand_total, status')
    .in('store_id', storeIds)
    .order('date', { ascending: false });

  const latestMap: Record<string, StoreWithLatestOrder['latest_order']> = {};
  for (const o of (latestOrders ?? []) as Order[]) {
    if (!latestMap[o.store_id]) latestMap[o.store_id] = o as StoreWithLatestOrder['latest_order'];
  }

  return (stores as Store[]).map((s) => ({ ...s, latest_order: latestMap[s.id] ?? null }));
}

/**
 * Fetch a single store by ID.
 */
export async function fetchStore(id: string, ownerId: string): Promise<Store> {
  const { data, error } = await supabase
    .from('stores')
    .select('*')
    .eq('id', id)
    .eq('owner_id', ownerId)
    .single();
  return throwOnError(data, error) as Store;
}

/**
 * Fetch store details, order history, and aggregated stats.
 */
export async function fetchStoreHistory(storeId: string, ownerId: string): Promise<StoreHistory> {
  const { data: store, error: se } = await supabase
    .from('stores')
    .select('id, name, area, phone')
    .eq('id', storeId)
    .eq('owner_id', ownerId)
    .single();
  throwOnError(store, se);

  const { data: orders, error: oe } = await supabase
    .from('orders')
    .select(`id, date, grand_total, status, notes, created_at,
      order_items(id, material_name, quantity, price_at_time_of_sale, subtotal)`)
    .eq('store_id', storeId)
    .order('date', { ascending: false });
  throwOnError(orders, oe);

  const typedOrders = (orders ?? []) as Order[];
  return {
    store: store as Store,
    orders: typedOrders,
    total_orders: typedOrders.length,
    total_revenue: typedOrders.reduce((s, o) => s + Number(o.grand_total), 0),
  };
}

/**
 * Create a new store record.
 */
export async function createStore(payload: CreateStorePayload): Promise<Store> {
  const { data, error } = await supabase
    .from('stores')
    .insert({
      name: payload.name,
      phone: payload.phone ?? null,
      area: payload.area ?? null,
      extra_charges: payload.extra_charges ?? 0,
      margin_percentage: payload.margin_percentage ?? 0,
      total_debt: 0,
      owner_id: payload.owner_id,
    })
    .select().single();
  return throwOnError(data, error) as Store;
}

/**
 * Update an existing store record.
 */
export async function updateStore(id: string, payload: Partial<CreateStorePayload>): Promise<Store> {
  const { data, error } = await supabase
    .from('stores').update(payload).eq('id', id).select().single();
  return throwOnError(data, error) as Store;
}

/**
 * Delete a store by ID.
 */
export async function deleteStore(id: string): Promise<void> {
  const { error } = await supabase.from('stores').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

/**
 * Bulk delete all stores for a specific owner.
 */
export async function deleteAllStores(ownerId: string): Promise<void> {
  const { error } = await supabase.from('stores').delete().eq('owner_id', ownerId);
  if (error) throw new Error(error.message);
}
