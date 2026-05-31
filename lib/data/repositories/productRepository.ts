import { getDatabase } from '@/lib/core/database';
import { generateId } from '@/lib/core/id';
import { categoryRepository } from '@/lib/data/repositories/categoryRepository';
import type { CreateProductInput, Product, ProductSortField, SortDirection, UnitType } from '@/lib/domain/models';

export interface ProductQueryOptions {
  search?: string;
  categoryId?: string;
  sortBy?: ProductSortField;
  sortDir?: SortDirection;
  /** Prioritize / filter by user's preferred business categories */
  preferredCategoryIds?: string[];
  /** Sort preferred category products first (when no explicit category filter) */
  preferPreferredCategories?: boolean;
  /** Hide products outside preferred categories (when no search & no category filter) */
  onlyPreferredCategories?: boolean;
}

function rowToProduct(row: Record<string, unknown>): Product {
  return {
    id: row.id as string,
    name: row.name as string,
    category_id: (row.category_id as string) || '',
    category: (row.category as string) || 'Other',
    sku: (row.sku as string) ?? null,
    barcode: (row.barcode as string) ?? null,
    purchase_price: Number(row.purchase_price ?? 0),
    selling_price: Number(row.selling_price ?? 0),
    unit_type: row.unit_type as UnitType,
    stock_quantity: Number(row.stock_quantity ?? 0),
    min_stock_alert: Number(row.min_stock_alert ?? 0),
    expiry_date: (row.expiry_date as string) ?? null,
    image_uri: (row.image_uri as string) ?? null,
    tax_percent: Number(row.tax_percent ?? 0),
    discount_percent: Number(row.discount_percent ?? 0),
    allow_discount: Number(row.allow_discount ?? 0) === 1,
    max_discount_percent: Number(row.max_discount_percent ?? 0),
    notes: (row.notes as string) ?? null,
    brand: (row.brand as string) ?? null,
    is_incomplete: Number(row.is_incomplete ?? 0) === 1,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

function sortClause(sortBy: ProductSortField, sortDir: SortDirection): string {
  const dir = sortDir === 'desc' ? 'DESC' : 'ASC';
  switch (sortBy) {
    case 'price':
      return `selling_price ${dir}, name ASC`;
    case 'stock':
      return `stock_quantity ${dir}, name ASC`;
    default:
      return `name ${dir}`;
  }
}

export const productRepository = {
  async findAll(search = '', categoryId = '', options?: ProductQueryOptions): Promise<Product[]> {
    const db = await getDatabase();
    let sql = `SELECT * FROM products WHERE 1=1`;
    const params: (string | number)[] = [];

    const q = (search || options?.search || '').trim();
    const cat = (categoryId || options?.categoryId || '').trim();

    if (q) {
      sql += ` AND (name LIKE ? OR sku LIKE ? OR barcode LIKE ? OR category LIKE ?)`;
      const like = `%${q}%`;
      params.push(like, like, like, like);
    }
    if (cat) {
      sql += ` AND category_id = ?`;
      params.push(cat);
    }

    const preferred = options?.preferredCategoryIds?.filter(Boolean) ?? [];
    const hasSearch = !!q;
    const onlyPreferred =
      !cat &&
      !hasSearch &&
      preferred.length > 0 &&
      options?.onlyPreferredCategories;

    if (onlyPreferred) {
      const placeholders = preferred.map(() => '?').join(',');
      sql += ` AND category_id IN (${placeholders})`;
      params.push(...preferred);
    }

    const sortBy = options?.sortBy ?? 'name';
    const sortDir = options?.sortDir ?? 'asc';
    const preferSort =
      !cat &&
      preferred.length > 0 &&
      options?.preferPreferredCategories;

    if (preferSort) {
      const cases = preferred.map((_, i) => `WHEN category_id = ? THEN ${i}`).join(' ');
      sql += ` ORDER BY CASE ${cases} ELSE ${preferred.length} END, ${sortClause(sortBy, sortDir)}`;
      params.push(...preferred);
    } else {
      sql += ` ORDER BY ${sortClause(sortBy, sortDir)}`;
    }

    const rows = await db.getAllAsync<Record<string, unknown>>(sql, params);
    return rows.map(rowToProduct);
  },

  async findLowStock(categoryId = ''): Promise<Product[]> {
    const db = await getDatabase();
    let sql = `SELECT * FROM products WHERE stock_quantity <= min_stock_alert`;
    const params: string[] = [];
    if (categoryId) {
      sql += ` AND category_id = ?`;
      params.push(categoryId);
    }
    sql += ` ORDER BY stock_quantity ASC`;
    const rows = await db.getAllAsync<Record<string, unknown>>(sql, params);
    return rows.map(rowToProduct);
  },

  async findById(id: string): Promise<Product | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<Record<string, unknown>>(`SELECT * FROM products WHERE id = ?`, [id]);
    return row ? rowToProduct(row) : null;
  },

  /** Products from recent order lines (for quick re-order). */
  async findRecent(limit = 8): Promise<Product[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<Record<string, unknown>>(
      `SELECT p.* FROM products p
       INNER JOIN (
         SELECT product_id, MAX(oi.id) as last_line
         FROM order_items oi
         WHERE product_id IS NOT NULL
         GROUP BY product_id
         ORDER BY last_line DESC
         LIMIT ?
       ) recent ON p.id = recent.product_id
       ORDER BY recent.last_line DESC`,
      [limit],
    );
    return rows.map(rowToProduct);
  },

  async findByBarcode(barcode: string): Promise<Product | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<Record<string, unknown>>(`SELECT * FROM products WHERE barcode = ?`, [barcode]);
    return row ? rowToProduct(row) : null;
  },

  async findIncomplete(): Promise<Product[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<Record<string, unknown>>(
      `SELECT * FROM products WHERE is_incomplete = 1 ORDER BY updated_at DESC`,
    );
    return rows.map(rowToProduct);
  },

  async countIncomplete(): Promise<number> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<{ c: number }>(
      `SELECT COUNT(*) as c FROM products WHERE is_incomplete = 1`,
    );
    return row?.c ?? 0;
  },

  /** Fast minimal create during purchase order — flagged incomplete for later completion. */
  async createQuickIncomplete(input: {
    name: string;
    unit_type: UnitType;
    purchase_price: number;
    selling_price: number;
    brand?: string | null;
    barcode?: string | null;
  }): Promise<Product> {
    const fallback = await categoryRepository.getFallback();
    const purchase = input.purchase_price ?? 0;
    const selling = input.selling_price ?? 0;
    return this.create({
      name: input.name.trim(),
      category_id: fallback.id,
      sku: null,
      barcode: input.barcode?.trim() || null,
      brand: input.brand?.trim() || null,
      purchase_price: purchase,
      selling_price: selling,
      unit_type: input.unit_type,
      stock_quantity: 0,
      min_stock_alert: 0,
      expiry_date: null,
      image_uri: null,
      tax_percent: 0,
      discount_percent: 0,
      allow_discount: false,
      max_discount_percent: 0,
      notes: null,
      is_incomplete: true,
    });
  },

  async markComplete(id: string): Promise<Product> {
    const db = await getDatabase();
    await db.runAsync(
      `UPDATE products SET is_incomplete = 0, updated_at = ? WHERE id = ?`,
      [new Date().toISOString(), id],
    );
    const updated = await this.findById(id);
    if (!updated) throw new Error('Product not found');
    return updated;
  },

  async getCategories(): Promise<string[]> {
    const cats = await categoryRepository.findAll();
    return cats.map((c) => c.name);
  },

  async create(input: CreateProductInput): Promise<Product> {
    if (!input.category_id?.trim()) throw new Error('Category is required');

    const cat = await categoryRepository.findById(input.category_id);
    if (!cat) throw new Error('Selected category not found');

    const db = await getDatabase();
    const now = new Date().toISOString();
    const id = generateId();

    await db.runAsync(
      `INSERT INTO products (id, name, category_id, category, sku, barcode, brand, purchase_price, selling_price, unit_type, stock_quantity, min_stock_alert, expiry_date, image_uri, tax_percent, discount_percent, allow_discount, max_discount_percent, notes, is_incomplete, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.name.trim(),
        cat.id,
        cat.name,
        input.sku?.trim() || null,
        input.barcode?.trim() || null,
        input.brand?.trim() || null,
        input.purchase_price ?? 0,
        input.selling_price ?? 0,
        input.unit_type,
        input.stock_quantity ?? 0,
        input.min_stock_alert ?? 0,
        input.expiry_date ?? null,
        input.image_uri ?? null,
        input.tax_percent ?? 0,
        input.discount_percent ?? 0,
        input.allow_discount ? 1 : 0,
        input.max_discount_percent ?? 0,
        input.notes?.trim() || null,
        input.is_incomplete ? 1 : 0,
        now,
        now,
      ],
    );

    const created = await this.findById(id);
    if (!created) throw new Error('Failed to create product');
    return created;
  },

  async update(id: string, input: Partial<CreateProductInput>): Promise<Product> {
    const existing = await this.findById(id);
    if (!existing) throw new Error('Product not found');

    let categoryId = existing.category_id;
    let categoryName = existing.category;

    if (input.category_id && input.category_id !== existing.category_id) {
      const cat = await categoryRepository.findById(input.category_id);
      if (!cat) throw new Error('Selected category not found');
      categoryId = cat.id;
      categoryName = cat.name;
    }

    const now = new Date().toISOString();
    const db = await getDatabase();

    await db.runAsync(
      `UPDATE products SET
        name = ?, category_id = ?, category = ?, sku = ?, barcode = ?, brand = ?,
        purchase_price = ?, selling_price = ?,
        unit_type = ?, stock_quantity = ?, min_stock_alert = ?, expiry_date = ?, image_uri = ?,
        tax_percent = ?, discount_percent = ?, allow_discount = ?, max_discount_percent = ?, notes = ?,
        is_incomplete = ?, updated_at = ?
       WHERE id = ?`,
      [
        (input.name ?? existing.name).trim(),
        categoryId,
        categoryName,
        input.sku !== undefined ? input.sku?.trim() || null : existing.sku,
        input.barcode !== undefined ? input.barcode?.trim() || null : existing.barcode,
        input.brand !== undefined ? input.brand?.trim() || null : existing.brand,
        input.purchase_price ?? existing.purchase_price,
        input.selling_price ?? existing.selling_price,
        input.unit_type ?? existing.unit_type,
        input.stock_quantity ?? existing.stock_quantity,
        input.min_stock_alert ?? existing.min_stock_alert,
        input.expiry_date !== undefined ? input.expiry_date : existing.expiry_date,
        input.image_uri !== undefined ? input.image_uri : existing.image_uri,
        input.tax_percent ?? existing.tax_percent,
        input.discount_percent ?? existing.discount_percent,
        (input.allow_discount ?? existing.allow_discount) ? 1 : 0,
        input.max_discount_percent ?? existing.max_discount_percent,
        input.notes !== undefined ? input.notes?.trim() || null : existing.notes,
        input.is_incomplete !== undefined ? (input.is_incomplete ? 1 : 0) : (existing.is_incomplete ? 1 : 0),
        now,
        id,
      ],
    );

    const updated = await this.findById(id);
    if (!updated) throw new Error('Failed to update product');
    return updated;
  },

  async adjustStock(productId: string, delta: number): Promise<void> {
    const product = await this.findById(productId);
    if (!product) return;
    const db = await getDatabase();
    const newQty = Math.max(0, product.stock_quantity + delta);
    await db.runAsync(`UPDATE products SET stock_quantity = ?, updated_at = ? WHERE id = ?`, [
      newQty,
      new Date().toISOString(),
      productId,
    ]);
  },

  async delete(id: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(`DELETE FROM products WHERE id = ?`, [id]);
  },
};
