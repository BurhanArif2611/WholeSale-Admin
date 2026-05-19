import { getDatabase, runInTransaction } from '@/lib/core/database';
import { generateId } from '@/lib/core/id';
import { calculateLineTotal } from '@/lib/common/utils/pricing';
import type { Order, OrderItem, OrderDiscountType, OrderStatus, PaymentStatus, UnitType } from '@/lib/domain/models';
import { round2 } from '@/lib/common/utils/pricing';
import { clientRepository } from './clientRepository';
import { ledgerRepository } from './ledgerRepository';
import { inventoryRepository } from './inventoryRepository';
import { productRepository } from './productRepository';

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
    order_discount_type: (row.order_discount_type as OrderDiscountType) ?? null,
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

function rowToItem(row: Record<string, unknown>): OrderItem {
  return {
    id: row.id as string,
    order_id: row.order_id as string,
    product_id: (row.product_id as string) ?? null,
    product_name: row.product_name as string,
    unit_type: row.unit_type as UnitType,
    quantity: Number(row.quantity),
    unit_price: Number(row.unit_price),
    discount_percent: Number(row.discount_percent ?? 0),
    tax_percent: Number(row.tax_percent ?? 0),
    line_total: Number(row.line_total),
    notes: (row.notes as string) ?? null,
  };
}

export interface CreateOrderItemInput {
  product_id: string | null;
  product_name: string;
  unit_type: UnitType;
  quantity: number;
  unit_price: number;
  discount_percent?: number;
  tax_percent?: number;
  notes?: string | null;
}

export interface CreateOrderInput {
  client_id: string;
  items: CreateOrderItemInput[];
  paid_amount?: number;
  payment_mode?: string;
  delivery_date?: string | null;
  delivery_address?: string | null;
  notes?: string | null;
  order_discount_type?: OrderDiscountType | null;
  order_discount_value?: number;
  order_discount_amount?: number;
  /** Persist discount on client profile for future orders */
  save_client_discount?: boolean;
}

export type OrderSortField = 'date' | 'amount' | 'client';

export interface OrderListFilters {
  search?: string;
  clientId?: string;
  paymentStatus?: PaymentStatus;
  status?: OrderStatus;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: OrderSortField;
  sortDir?: 'asc' | 'desc';
  /** pending = unpaid/partial; completed = paid; cancelled = cancelled */
  listPreset?: 'pending' | 'completed' | 'cancelled';
}

export const orderRepository = {
  async findAll(filters?: OrderListFilters): Promise<Order[]> {
    const db = await getDatabase();
    let sql = `SELECT * FROM orders WHERE 1=1`;
    const params: (string | number)[] = [];

    if (filters?.search?.trim()) {
      sql += ` AND (client_name LIKE ? OR id LIKE ? OR notes LIKE ?)`;
      const q = `%${filters.search.trim()}%`;
      params.push(q, q, q);
    }
    if (filters?.clientId) {
      sql += ` AND client_id = ?`;
      params.push(filters.clientId);
    }
    if (filters?.paymentStatus) {
      sql += ` AND payment_status = ?`;
      params.push(filters.paymentStatus);
    }
    if (filters?.status) {
      sql += ` AND status = ?`;
      params.push(filters.status);
    }
    if (filters?.listPreset === 'cancelled') {
      sql += ` AND status = 'cancelled'`;
    } else if (filters?.listPreset === 'completed') {
      sql += ` AND status != 'cancelled' AND payment_status = 'paid'`;
    } else if (filters?.listPreset === 'pending') {
      sql += ` AND status != 'cancelled' AND payment_status IN ('pending', 'partial')`;
    }
    if (filters?.dateFrom) {
      sql += ` AND date(created_at) >= date(?)`;
      params.push(filters.dateFrom);
    }
    if (filters?.dateTo) {
      sql += ` AND date(created_at) <= date(?)`;
      params.push(filters.dateTo);
    }

    const sortCol =
      filters?.sortBy === 'amount'
        ? 'grand_total'
        : filters?.sortBy === 'client'
          ? 'client_name'
          : 'created_at';
    const sortDir = filters?.sortDir === 'asc' ? 'ASC' : 'DESC';
    sql += ` ORDER BY ${sortCol} ${sortDir}`;

    const rows = await db.getAllAsync<Record<string, unknown>>(sql, params);
    return rows.map(rowToOrder);
  },

  async findById(id: string): Promise<Order | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<Record<string, unknown>>(`SELECT * FROM orders WHERE id = ?`, [id]);
    return row ? rowToOrder(row) : null;
  },

  async getItems(orderId: string): Promise<OrderItem[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<Record<string, unknown>>(
      `SELECT * FROM order_items WHERE order_id = ?`,
      [orderId],
    );
    return rows.map(rowToItem);
  },

  async create(input: CreateOrderInput): Promise<Order> {
    const client = await clientRepository.findById(input.client_id);
    if (!client) throw new Error('Client not found');

    const orderId = generateId();
    const now = new Date().toISOString();

    let subtotal = 0;
    let discountTotal = 0;
    let taxTotal = 0;

    const lineItems = input.items.map((item) => {
      const calc = calculateLineTotal(
        item.unit_price,
        item.unit_type,
        item.quantity,
        item.unit_type,
        item.discount_percent ?? 0,
        item.tax_percent ?? 0,
      );
      subtotal += calc.subtotal;
      discountTotal += calc.discountAmount;
      taxTotal += calc.taxAmount;
      return {
        ...item,
        line_total: calc.total,
        id: generateId(),
      };
    });

    const orderDiscountAmount = round2(Math.max(0, input.order_discount_amount ?? 0));
    const itemsGrand = round2(subtotal - discountTotal + taxTotal);
    if (orderDiscountAmount > itemsGrand) {
      throw new Error('Order discount cannot exceed order total');
    }
    const grandTotal = round2(itemsGrand - orderDiscountAmount);
    const paidAmount = input.paid_amount ?? 0;
    const remaining = Math.max(0, grandTotal - paidAmount);
    const paymentStatus: PaymentStatus =
      paidAmount >= grandTotal ? 'paid' : paidAmount > 0 ? 'partial' : 'pending';

    await runInTransaction(async (db) => {
      await db.runAsync(
        `INSERT INTO orders (id, client_id, client_name, status, payment_status, payment_mode, subtotal, tax_total, discount_total, order_discount_type, order_discount_value, order_discount_amount, grand_total, paid_amount, remaining_amount, delivery_date, delivery_address, notes, created_at, updated_at)
         VALUES (?, ?, ?, 'confirmed', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          orderId,
          client.id,
          client.name,
          paymentStatus,
          input.payment_mode ?? null,
          subtotal,
          taxTotal,
          discountTotal,
          input.order_discount_type ?? null,
          input.order_discount_value ?? 0,
          orderDiscountAmount,
          grandTotal,
          paidAmount,
          remaining,
          input.delivery_date ?? null,
          input.delivery_address ?? client.address,
          input.notes ?? null,
          now,
          now,
        ],
      );

      for (const item of lineItems) {
        await db.runAsync(
          `INSERT INTO order_items (id, order_id, product_id, product_name, unit_type, quantity, unit_price, discount_percent, tax_percent, line_total, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            item.id,
            orderId,
            item.product_id,
            item.product_name,
            item.unit_type,
            item.quantity,
            item.unit_price,
            item.discount_percent ?? 0,
            item.tax_percent ?? 0,
            item.line_total,
            item.notes ?? null,
          ],
        );

        if (item.product_id) {
          await productRepository.adjustStock(item.product_id, -item.quantity);
          await inventoryRepository.addTransaction({
            product_id: item.product_id,
            product_name: item.product_name,
            type: 'sale',
            quantity: -item.quantity,
            reference_id: orderId,
            notes: 'Auto deduction on order',
          });
        }
      }
    });

    if (remaining > 0) {
      await ledgerRepository.addCreditFromOrder(client.id, client.name, orderId, remaining);
      await clientRepository.updatePendingAmount(client.id, client.pending_amount + remaining);
    }

    if (input.save_client_discount !== false) {
      const discType = input.order_discount_type ?? null;
      const discValue =
        discType && (input.order_discount_value ?? 0) > 0 ? (input.order_discount_value ?? 0) : 0;
      await clientRepository.updateDefaultDiscount(
        client.id,
        discValue > 0 ? discType : null,
        discValue,
      );
    }

    const order = await this.findById(orderId);
    if (!order) throw new Error('Failed to create order');
    return order;
  },

  async cancel(id: string): Promise<void> {
    const order = await this.findById(id);
    if (!order || order.status === 'cancelled') return;

    const items = await this.getItems(id);

    await runInTransaction(async (db) => {
      await db.runAsync(`UPDATE orders SET status = 'cancelled', updated_at = ? WHERE id = ?`, [
        new Date().toISOString(),
        id,
      ]);

      for (const item of items) {
        if (item.product_id) {
          await productRepository.adjustStock(item.product_id, item.quantity);
          await inventoryRepository.addTransaction({
            product_id: item.product_id,
            product_name: item.product_name,
            type: 'return',
            quantity: item.quantity,
            reference_id: id,
            notes: 'Stock restored on cancellation',
          });
        }
      }
    });

    if (order.remaining_amount > 0) {
      const client = await clientRepository.findById(order.client_id);
      if (client) {
        await clientRepository.updatePendingAmount(
          client.id,
          Math.max(0, client.pending_amount - order.remaining_amount),
        );
      }
    }
  },
};
