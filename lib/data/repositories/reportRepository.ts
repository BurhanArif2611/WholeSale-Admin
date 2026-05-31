import { getDatabase } from '@/lib/core/database';
import type { Order, OrderStatus, PaymentStatus } from '@/lib/domain/models';

export interface ReportFilters {
  dateFrom?: string;
  dateTo?: string;
  categoryId?: string;
  productId?: string;
  clientId?: string;
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
}

export interface ReportSummary {
  orderCount: number;
  totalSales: number;
  totalPaid: number;
  totalPending: number;
  avgOrderValue: number;
  cancelledCount: number;
}

function buildWhereClause(filters?: ReportFilters): { sql: string; params: (string | number)[] } {
  let sql = ` FROM orders o WHERE o.status != 'returned' `;
  const params: (string | number)[] = [];

  if (filters?.dateFrom) {
    sql += ` AND date(o.created_at) >= date(?) `;
    params.push(filters.dateFrom);
  }
  if (filters?.dateTo) {
    sql += ` AND date(o.created_at) <= date(?) `;
    params.push(filters.dateTo);
  }
  if (filters?.clientId) {
    sql += ` AND o.client_id = ? `;
    params.push(filters.clientId);
  }
  if (filters?.status) {
    sql += ` AND o.status = ? `;
    params.push(filters.status);
  }
  if (filters?.paymentStatus) {
    sql += ` AND o.payment_status = ? `;
    params.push(filters.paymentStatus);
  }
  if (filters?.productId || filters?.categoryId) {
    sql += ` AND EXISTS (
      SELECT 1 FROM order_items oi
      LEFT JOIN products p ON p.id = oi.product_id
      WHERE oi.order_id = o.id
    `;
    if (filters.productId) {
      sql += ` AND oi.product_id = ? `;
      params.push(filters.productId);
    }
    if (filters.categoryId) {
      sql += ` AND p.category_id = ? `;
      params.push(filters.categoryId);
    }
    sql += `) `;
  }

  return { sql, params };
}

function rowToOrder(row: Record<string, unknown>): Order {
  return {
    id: row.id as string,
    client_id: row.client_id as string,
    client_name: row.client_name as string,
    status: row.status as OrderStatus,
    payment_status: row.payment_status as PaymentStatus,
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
    discount_approval_status: (row.discount_approval_status as Order['discount_approval_status']) ?? 'none',
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

export const reportRepository = {
  async getSummary(filters?: ReportFilters): Promise<ReportSummary> {
    const db = await getDatabase();
    const { sql, params } = buildWhereClause(filters);

    const row = await db.getFirstAsync<Record<string, unknown>>(
      `SELECT
        COUNT(*) as order_count,
        COALESCE(SUM(CASE WHEN o.status != 'cancelled' THEN o.grand_total ELSE 0 END), 0) as total_sales,
        COALESCE(SUM(CASE WHEN o.status != 'cancelled' THEN o.paid_amount ELSE 0 END), 0) as total_paid,
        COALESCE(SUM(CASE WHEN o.status != 'cancelled' THEN o.remaining_amount ELSE 0 END), 0) as total_pending,
        COALESCE(SUM(CASE WHEN o.status = 'cancelled' THEN 1 ELSE 0 END), 0) as cancelled_count
      ${sql}`,
      params,
    );

    const orderCount = Number(row?.order_count ?? 0);
    const totalSales = Number(row?.total_sales ?? 0);

    return {
      orderCount,
      totalSales,
      totalPaid: Number(row?.total_paid ?? 0),
      totalPending: Number(row?.total_pending ?? 0),
      avgOrderValue: orderCount > 0 ? totalSales / orderCount : 0,
      cancelledCount: Number(row?.cancelled_count ?? 0),
    };
  },

  async getOrders(filters?: ReportFilters, limit = 200): Promise<Order[]> {
    const db = await getDatabase();
    const { sql, params } = buildWhereClause(filters);
    const rows = await db.getAllAsync<Record<string, unknown>>(
      `SELECT o.* ${sql} ORDER BY o.created_at DESC LIMIT ?`,
      [...params, limit],
    );
    return rows.map(rowToOrder);
  },

  buildCsv(orders: Order[]): string {
    const header = 'Order ID,Date,Client,Status,Payment,Grand Total,Paid,Remaining';
    const lines = orders.map((o) =>
      [
        o.id,
        o.created_at.slice(0, 10),
        `"${o.client_name.replace(/"/g, '""')}"`,
        o.status,
        o.payment_status,
        o.grand_total.toFixed(2),
        o.paid_amount.toFixed(2),
        o.remaining_amount.toFixed(2),
      ].join(','),
    );
    return [header, ...lines].join('\n');
  },
};
