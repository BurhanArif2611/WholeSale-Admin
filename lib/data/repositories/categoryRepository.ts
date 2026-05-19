import { getDatabase } from '@/lib/core/database';
import { generateId } from '@/lib/core/id';
import { enqueueSync } from '@/lib/core/syncQueue';
import { FALLBACK_CATEGORY_SLUG } from '@/lib/domain/defaultCategories';
import type { Category, CreateCategoryInput } from '@/lib/domain/models';

function rowToCategory(row: Record<string, unknown>): Category {
  return {
    id: row.id as string,
    name: row.name as string,
    slug: (row.slug as string) ?? null,
    description: (row.description as string) ?? null,
    sort_order: Number(row.sort_order ?? 0),
    is_preset: Boolean(row.is_preset),
    product_count: row.product_count !== undefined ? Number(row.product_count) : undefined,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);
}

export const categoryRepository = {
  async findAll(search = ''): Promise<Category[]> {
    const db = await getDatabase();
    let sql = `SELECT c.*, (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id) as product_count
       FROM categories c WHERE 1=1`;
    const params: string[] = [];
    if (search.trim()) {
      sql += ` AND (c.name LIKE ? OR c.slug LIKE ?)`;
      const q = `%${search.trim()}%`;
      params.push(q, q);
    }
    sql += ` ORDER BY c.sort_order ASC, c.name ASC`;
    const rows = await db.getAllAsync<Record<string, unknown>>(sql, params);
    return rows.map(rowToCategory);
  },

  async findById(id: string): Promise<Category | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<Record<string, unknown>>(
      `SELECT c.*, (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id) as product_count
       FROM categories c WHERE c.id = ?`,
      [id],
    );
    return row ? rowToCategory(row) : null;
  },

  async findBySlug(slug: string): Promise<Category | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<Record<string, unknown>>(`SELECT * FROM categories WHERE slug = ?`, [slug]);
    return row ? rowToCategory(row) : null;
  },

  async findByName(name: string): Promise<Category | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<Record<string, unknown>>(
      `SELECT * FROM categories WHERE LOWER(name) = LOWER(?)`,
      [name.trim()],
    );
    return row ? rowToCategory(row) : null;
  },

  async getFallback(): Promise<Category> {
    const other = await this.findBySlug(FALLBACK_CATEGORY_SLUG);
    if (other) return other;
    const db = await getDatabase();
    const now = new Date().toISOString();
    const id = generateId();
    await db.runAsync(
      `INSERT INTO categories (id, name, slug, description, sort_order, is_preset, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 1, ?, ?)`,
      [id, 'Other', FALLBACK_CATEGORY_SLUG, null, 99, now, now],
    );
    const created = await this.findById(id);
    if (!created) throw new Error('Failed to create fallback category');
    return created;
  },

  async create(input: CreateCategoryInput): Promise<Category> {
    const name = input.name.trim();
    if (!name) throw new Error('Category name is required');

    const existing = await this.findByName(name);
    if (existing) throw new Error('A category with this name already exists');

    const db = await getDatabase();
    const now = new Date().toISOString();
    const id = generateId();
    let slug = input.slug?.trim() || slugify(name);
    const slugTaken = await this.findBySlug(slug);
    if (slugTaken) slug = `${slug}-${id.slice(0, 6)}`;

    await db.runAsync(
      `INSERT INTO categories (id, name, slug, description, sort_order, is_preset, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        name,
        slug,
        input.description?.trim() || null,
        input.sort_order ?? 100,
        input.is_preset ? 1 : 0,
        now,
        now,
      ],
    );

    const created = await this.findById(id);
    if (!created) throw new Error('Failed to create category');
    try {
      await enqueueSync('categories', id, 'create', created as unknown as Record<string, unknown>);
    } catch {
      // Local save succeeded; sync queue is best-effort
    }
    return created;
  },

  async update(id: string, input: Partial<CreateCategoryInput>): Promise<Category> {
    const existing = await this.findById(id);
    if (!existing) throw new Error('Category not found');

    const name = (input.name ?? existing.name).trim();
    if (!name) throw new Error('Category name is required');

    const duplicate = await this.findByName(name);
    if (duplicate && duplicate.id !== id) throw new Error('A category with this name already exists');

    const now = new Date().toISOString();
    const db = await getDatabase();

    await db.runAsync(
      `UPDATE categories SET name = ?, description = ?, sort_order = ?, updated_at = ? WHERE id = ?`,
      [
        name,
        input.description !== undefined ? input.description?.trim() || null : existing.description,
        input.sort_order ?? existing.sort_order,
        now,
        id,
      ],
    );

    await db.runAsync(`UPDATE products SET category = ? WHERE category_id = ?`, [name, id]);

    const updated = await this.findById(id);
    if (!updated) throw new Error('Failed to update category');
    try {
      await enqueueSync('categories', id, 'update', updated as unknown as Record<string, unknown>);
    } catch {
      /* best-effort */
    }
    return updated;
  },

  async delete(id: string): Promise<void> {
    const db = await getDatabase();
    const existing = await this.findById(id);
    if (!existing) throw new Error('Category not found');

    const count = await db.getFirstAsync<{ c: number }>(
      `SELECT COUNT(*) as c FROM products WHERE category_id = ?`,
      [id],
    );
    if ((count?.c ?? 0) > 0) {
      throw new Error(`Cannot delete: ${count?.c} product(s) are assigned to this category`);
    }

    if (existing.slug === FALLBACK_CATEGORY_SLUG) {
      throw new Error('The "Other" category cannot be deleted');
    }

    await db.runAsync(`DELETE FROM categories WHERE id = ?`, [id]);
    try {
      await enqueueSync('categories', id, 'delete', { id });
    } catch {
      /* best-effort */
    }
  },

  /** Run migrations seed + return all categories (safe to call on screen focus). */
  async ensureSeeded(): Promise<Category[]> {
    await getDatabase();
    return this.findAll();
  },
};
