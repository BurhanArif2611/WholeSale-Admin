import { getDatabase } from '@/lib/core/database';
import type { DashboardStats, Order } from '@/lib/domain/models';

function rowToOrder(row: Record<string, unknown>): Order {
  return {
    id: row.id as string,
    client_id: row.client_id as string,
    client_name: row.client_name as string,
    status: row.status as Order['status'],
    payment_status: row.payment_status as Order['payment_status'],
    payment_mode: (row.payment_mode as string) ?? null,
    subtotal: Number(row.subtotal ?? 0),
    tax_total: Number(row.tax_total ?? 0),
    discount_total: Number(row.discount_total ?? 0),
    order_discount_type: (row.order_discount_type as Order['order_discount_type']) ?? null,
    order_discount_value: Number(row.order_discount_value ?? 0),
    order_discount_amount: Number(row.order_discount_amount ?? 0),
    grand_total: Number(row.grand_total ?? 0),
    paid_amount: Number(row.paid_amount ?? 0),
    remaining_amount: Number(row.remaining_amount ?? 0),
    delivery_date: (row.delivery_date as string) ?? null,
    delivery_address: (row.delivery_address as string) ?? null,
    notes: (row.notes as string) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

export const dashboardRepository = {
  async getStats(): Promise<DashboardStats> {
    const db = await getDatabase();
    const today = new Date().toISOString().slice(0, 10);

    const [clients, products, categories, orders, todaySales, pending, lowStock, recent] = await Promise.all([
      db.getFirstAsync<{ c: number }>(`SELECT COUNT(*) as c FROM clients`),
      db.getFirstAsync<{ c: number }>(`SELECT COUNT(*) as c FROM products`),
      db.getFirstAsync<{ c: number }>(`SELECT COUNT(*) as c FROM categories`),
      db.getFirstAsync<{ c: number }>(`SELECT COUNT(*) as c FROM orders WHERE status != 'cancelled'`),
      db.getFirstAsync<{ t: number }>(
        `SELECT COALESCE(SUM(grand_total), 0) as t FROM orders WHERE date(created_at) = date(?) AND status != 'cancelled'`,
        [today],
      ),
      db.getFirstAsync<{ t: number }>(`SELECT COALESCE(SUM(pending_amount), 0) as t FROM clients`),
      db.getFirstAsync<{ c: number }>(
        `SELECT COUNT(*) as c FROM products WHERE stock_quantity <= min_stock_alert`,
      ),
      db.getAllAsync<Record<string, unknown>>(
        `SELECT * FROM orders WHERE status != 'cancelled' ORDER BY created_at DESC LIMIT 5`,
      ),
    ]);

    return {
      totalClients: clients?.c ?? 0,
      totalProducts: products?.c ?? 0,
      totalCategories: categories?.c ?? 0,
      totalOrders: orders?.c ?? 0,
      todaySales: todaySales?.t ?? 0,
      pendingAmount: pending?.t ?? 0,
      lowStockCount: lowStock?.c ?? 0,
      recentOrders: recent.map(rowToOrder),
    };
  },
};
