import { getDatabase } from '@/lib/core/database';
import { generateId } from '@/lib/core/id';
import type { InventoryTransaction, InventoryTxnType } from '@/lib/domain/models';
import { productRepository } from './productRepository';

function rowToTxn(row: Record<string, unknown>): InventoryTransaction {
  return {
    id: row.id as string,
    product_id: row.product_id as string,
    product_name: row.product_name as string,
    type: row.type as InventoryTxnType,
    quantity: Number(row.quantity),
    reference_id: (row.reference_id as string) ?? null,
    notes: (row.notes as string) ?? null,
    created_at: row.created_at as string,
  };
}

export const inventoryRepository = {
  async getHistory(productId?: string, limit = 100): Promise<InventoryTransaction[]> {
    const db = await getDatabase();
    const rows = productId
      ? await db.getAllAsync<Record<string, unknown>>(
          `SELECT * FROM inventory_transactions WHERE product_id = ? ORDER BY created_at DESC LIMIT ?`,
          [productId, limit],
        )
      : await db.getAllAsync<Record<string, unknown>>(
          `SELECT * FROM inventory_transactions ORDER BY created_at DESC LIMIT ?`,
          [limit],
        );
    return rows.map(rowToTxn);
  },

  async addTransaction(input: {
    product_id: string;
    product_name: string;
    type: InventoryTxnType;
    quantity: number;
    reference_id?: string | null;
    notes?: string | null;
  }): Promise<InventoryTransaction> {
    const db = await getDatabase();
    const id = generateId();
    const now = new Date().toISOString();

    await db.runAsync(
      `INSERT INTO inventory_transactions (id, product_id, product_name, type, quantity, reference_id, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.product_id,
        input.product_name,
        input.type,
        input.quantity,
        input.reference_id ?? null,
        input.notes ?? null,
        now,
      ],
    );

    const row = await db.getFirstAsync<Record<string, unknown>>(
      `SELECT * FROM inventory_transactions WHERE id = ?`,
      [id],
    );
    if (!row) throw new Error('Failed to record inventory transaction');
    return rowToTxn(row);
  },

  async stockIn(productId: string, quantity: number, notes?: string): Promise<void> {
    const product = await productRepository.findById(productId);
    if (!product) throw new Error('Product not found');

    await productRepository.adjustStock(productId, quantity);
    await this.addTransaction({
      product_id: productId,
      product_name: product.name,
      type: 'stock_in',
      quantity,
      notes: notes ?? 'Stock in',
    });
  },

  async stockOut(productId: string, quantity: number, notes?: string): Promise<void> {
    const product = await productRepository.findById(productId);
    if (!product) throw new Error('Product not found');

    await productRepository.adjustStock(productId, -quantity);
    await this.addTransaction({
      product_id: productId,
      product_name: product.name,
      type: 'stock_out',
      quantity: -quantity,
      notes: notes ?? 'Stock out',
    });
  },

  async adjustStock(productId: string, newQuantity: number, notes?: string): Promise<void> {
    const product = await productRepository.findById(productId);
    if (!product) throw new Error('Product not found');

    const delta = newQuantity - product.stock_quantity;
    await productRepository.adjustStock(productId, delta);
    await this.addTransaction({
      product_id: productId,
      product_name: product.name,
      type: 'adjustment',
      quantity: delta,
      notes: notes ?? 'Stock adjustment',
    });
  },
};
