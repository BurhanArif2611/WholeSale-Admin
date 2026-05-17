// lib/api/orders.ts
import { supabase } from '../supabase';
import { throwOnError } from './helpers';
import type { Order, OrderStatus, CreateOrderPayload, UpdateOrderPayload } from '@/types';

/**
 * Fetch all orders for a specific owner, with optional store and status filtering.
 */
export async function fetchOrders(ownerId: string, params: { storeId?: string; status?: string } = {}): Promise<Order[]> {
  let query = supabase
    .from('orders')
    .select(`id, store_id, date, grand_total, status, notes, created_at,
      stores(id, name, area, phone),
      order_items(id, material_name, quantity, price_at_time_of_sale, subtotal)`)
    .eq('owner_id', ownerId)
    .order('date', { ascending: false })
    .limit(100);

  if (params.storeId) query = query.eq('store_id', params.storeId);
  if (params.status && params.status !== 'All') query = query.eq('status', params.status);

  const { data, error } = await query;
  return throwOnError(data, error) as unknown as Order[];
}

/**
 * Fetch a single order by ID.
 */
export async function fetchOrder(id: string, ownerId: string): Promise<Order> {
  const { data, error } = await supabase
    .from('orders')
    .select(`id, store_id, date, grand_total, status, notes, created_at,
      stores(id, name, area, phone),
      order_items(id, material_name, quantity, price_at_time_of_sale, subtotal)`)
    .eq('id', id)
    .eq('owner_id', ownerId)
    .single();
  return throwOnError(data, error) as unknown as Order;
}

/**
 * Create a new order, including material discovery/upsert and transaction handling.
 */
export async function createOrder(
  payload: CreateOrderPayload,
  prices: Array<{ unit_price: number; subtotal: number }>,
  extra_charges: number = 0
): Promise<Order> {
  // 0. Pre-flight checks and session refresh
  if (!payload.owner_id) {
    throw new Error('Owner ID is missing. Please sign out and sign in again.');
  }

  const { data: { session }, error: authError } = await supabase.auth.getSession();
  if (authError || !session) {
    console.error('[api] Auth check failed:', authError);
    throw new Error('Authentication session expired. Please sign out and sign in again.');
  }

  // 1. Bulk Resolving Materials
  const itemNames = Array.from(new Set(payload.items.map(i => i.name.trim()).filter(Boolean)));
  if (itemNames.length === 0) {
    throw new Error('No items to order. Please add at least one item with a name.');
  }

  const { data: existingMaterials, error: fetchError } = await supabase
    .from('materials')
    .select('id, name')
    .eq('owner_id', payload.owner_id)
    .in('name', itemNames);

  if (fetchError) {
    console.error('[api] fetchMaterials (in createOrder) failed:', fetchError);
    throw new Error(`Material Discovery Error: ${fetchError.message}`);
  }

  const existingMap = new Map((existingMaterials || []).map(m => [m.name.toLowerCase(), m]));

  const upsertMap = new Map<string, any>();
  payload.items.forEach(item => {
    const key = item.name.trim().toLowerCase();
    if (!upsertMap.has(key)) {
      const existing = existingMap.get(key);
      upsertMap.set(key, {
        ...(existing?.id ? { id: existing.id } : {}),
        name: item.name.trim(),
        base_price: isNaN(Number(item.base_price)) ? 0 : Number(item.base_price),
        unit: item.unit || 'kg',
        owner_id: payload.owner_id
      });
    }
  });

  const materialsToUpsert = Array.from(upsertMap.values());

  const { data: resolvedMaterials, error: upsertError } = await supabase
    .from('materials')
    .upsert(materialsToUpsert)
    .select();

  if (upsertError) {
    console.error('[api] materials.upsert failed:', upsertError, 'Payload:', JSON.stringify(materialsToUpsert));
    throw new Error(`Material Optimization Error: ${upsertError.message}`);
  }

  const materialMap = new Map((resolvedMaterials || []).map(m => [m.name.toLowerCase(), m]));

  const resolvedItems = payload.items.map((item, i) => {
    const mat = materialMap.get(item.name.trim().toLowerCase());
    return {
      material_id: mat?.id,
      material_name: mat?.name || item.name.trim(),
      quantity: isNaN(Number(item.quantity)) ? 0 : Number(item.quantity),
      price_at_time_of_sale: isNaN(Number(prices[i].unit_price)) ? 0 : Number(prices[i].unit_price),
      subtotal: isNaN(Number(prices[i].subtotal)) ? 0 : Number(prices[i].subtotal),
    };
  });

  const grand_total = prices.reduce((s, p) => s + p.subtotal, 0) + extra_charges;

  // 2. Insert Order Header
  const { data: order, error: oe } = await supabase
    .from('orders')
    .insert({
      store_id: payload.store_id,
      owner_id: payload.owner_id,
      date: payload.date ?? new Date().toISOString().split('T')[0],
      grand_total,
      status: 'New',
      notes: payload.notes ?? null
    })
    .select().single();
  throwOnError(order, oe);

  // 3. Bulk Insert Items
  const finalItems = resolvedItems.map((item) => ({
    ...item,
    order_id: (order as Order).id,
  }));

  const { error: itemsError } = await supabase.from('order_items').insert(finalItems);
  if (itemsError) console.error('[api] order_items.insert failed:', itemsError);

  // 4. Update Store Debt (Atomic Update)
  try {
    const { error: updateError } = await supabase.rpc('increment_store_debt', {
      row_id: payload.store_id,
      amount: grand_total
    });
    
    if (updateError) {
      const { data: store } = await supabase.from('stores').select('total_debt').eq('id', payload.store_id).single();
      if (store) {
        await supabase.from('stores').update({ total_debt: (store.total_debt || 0) + grand_total }).eq('id', payload.store_id);
      }
    }
  } catch (e) {
    console.warn('[api] Failed to update store debt:', e);
  }

  return order as Order;
}

/**
 * Update the status of an order.
 */
export async function updateOrderStatus(orderId: string, status: OrderStatus): Promise<Order> {
  const { data, error } = await supabase.from('orders').update({ status }).eq('id', orderId).select().single();
  return throwOnError(data, error) as Order;
}

/**
 * Update an existing order and its items.
 */
export async function updateOrder(
  orderId: string,
  payload: UpdateOrderPayload
): Promise<Order> {
  if (!payload.owner_id) throw new Error('Owner ID is missing.');

  const itemNames = Array.from(new Set(payload.items.map(i => i.name.trim()).filter(Boolean)));
  const { data: existingMaterials } = await supabase
    .from('materials')
    .select('id, name')
    .eq('owner_id', payload.owner_id)
    .in('name', itemNames);

  const existingMap = new Map((existingMaterials || []).map((m) => [m.name.toLowerCase(), m]));
  const upsertMap = new Map<string, any>();
  payload.items.forEach((item) => {
    const key = item.name.trim().toLowerCase();
    if (!upsertMap.has(key)) {
      const existing = existingMap.get(key);
      upsertMap.set(key, {
        ...(existing?.id ? { id: existing.id } : {}),
        name: item.name.trim(),
        base_price: isNaN(Number(item.base_price)) ? 0 : Number(item.base_price),
        unit: item.unit || 'kg',
        owner_id: payload.owner_id
      });
    }
  });

  const { data: resolvedMaterials } = await supabase
    .from('materials')
    .upsert(Array.from(upsertMap.values()))
    .select();

  const materialMap = new Map((resolvedMaterials || []).map((m) => [m.name.toLowerCase(), m]));

  const resolvedItems = payload.items.map((item) => {
    const mat = materialMap.get(item.name.trim().toLowerCase());
    const unitPrice = item.fixed_unit_price ?? 0; 
    return {
      order_id: orderId,
      material_id: mat?.id,
      material_name: mat?.name || item.name.trim(),
      quantity: Number(item.quantity) || 0,
      price_at_time_of_sale: unitPrice,
      subtotal: unitPrice * (Number(item.quantity) || 0),
    };
  });

  const newGrandTotal = resolvedItems.reduce((sum: number, item) => sum + item.subtotal, 0) + (payload.adjustment || 0);
  const { data: oldOrder } = await supabase.from('orders').select('grand_total, store_id').eq('id', orderId).single();
  const oldTotal = Number(oldOrder?.grand_total) || 0;
  const oldStoreId = oldOrder?.store_id;
  const newStoreId = payload.store_id || oldStoreId || '';

  const { data: order, error: oe } = await supabase
    .from('orders')
    .update({
      store_id: newStoreId,
      grand_total: newGrandTotal,
      notes: payload.notes ?? null,
      date: payload.date
    })
    .eq('id', orderId)
    .select()
    .single();
  throwOnError(order, oe);

  await supabase.from('order_items').delete().eq('order_id', orderId);
  await supabase.from('order_items').insert(resolvedItems);

  if (oldStoreId === newStoreId) {
    const debtDiff = newGrandTotal - oldTotal;
    if (debtDiff !== 0 && oldStoreId) {
      await supabase.rpc('increment_store_debt', { row_id: oldStoreId, amount: debtDiff });
    }
  } else if (oldStoreId && newStoreId) {
    await supabase.rpc('increment_store_debt', { row_id: oldStoreId, amount: -oldTotal });
    await supabase.rpc('increment_store_debt', { row_id: newStoreId, amount: newGrandTotal });
  }

  return order as Order;
}

/**
 * Delete a single order by ID.
 */
export async function deleteOrder(id: string): Promise<void> {
  const { error } = await supabase.from('orders').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

/**
 * Bulk delete all orders for a specific owner.
 */
export async function deleteAllOrders(ownerId: string): Promise<void> {
  const { error } = await supabase.from('orders').delete().eq('owner_id', ownerId);
  if (error) throw new Error(error.message);
}
