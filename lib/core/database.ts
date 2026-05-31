import * as SQLite from 'expo-sqlite';
import { generateId } from '@/lib/core/id';
import { DEFAULT_CATEGORIES, FALLBACK_CATEGORY_SLUG } from '@/lib/domain/defaultCategories';

const DB_NAME = 'wholesale_inventory.db';

let dbInstance: SQLite.SQLiteDatabase | null = null;
let initPromise: Promise<SQLite.SQLiteDatabase> | null = null;

const SCHEMA = `
PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  mobile TEXT NOT NULL,
  alternate_mobile TEXT,
  address TEXT,
  gst_number TEXT,
  email TEXT,
  notes TEXT,
  credit_limit REAL DEFAULT 0,
  profile_photo_uri TEXT,
  pending_amount REAL DEFAULT 0,
  default_discount_type TEXT,
  default_discount_value REAL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_clients_mobile ON clients(mobile);
CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(name);

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL UNIQUE,
  slug TEXT UNIQUE,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  is_preset INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name);
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  category TEXT DEFAULT 'Other',
  category_id TEXT,
  sku TEXT,
  barcode TEXT,
  purchase_price REAL DEFAULT 0,
  selling_price REAL DEFAULT 0,
  unit_type TEXT DEFAULT 'piece',
  stock_quantity REAL DEFAULT 0,
  min_stock_alert REAL DEFAULT 0,
  expiry_date TEXT,
  image_uri TEXT,
  tax_percent REAL DEFAULT 0,
  discount_percent REAL DEFAULT 0,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY NOT NULL,
  client_id TEXT NOT NULL,
  client_name TEXT NOT NULL,
  status TEXT DEFAULT 'new',
  payment_status TEXT DEFAULT 'pending',
  payment_mode TEXT,
  subtotal REAL DEFAULT 0,
  tax_total REAL DEFAULT 0,
  discount_total REAL DEFAULT 0,
  order_discount_type TEXT,
  order_discount_value REAL DEFAULT 0,
  order_discount_amount REAL DEFAULT 0,
  grand_total REAL DEFAULT 0,
  paid_amount REAL DEFAULT 0,
  remaining_amount REAL DEFAULT 0,
  delivery_date TEXT,
  delivery_address TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (client_id) REFERENCES clients(id)
);

CREATE INDEX IF NOT EXISTS idx_orders_client ON orders(client_id);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);

CREATE TABLE IF NOT EXISTS order_items (
  id TEXT PRIMARY KEY NOT NULL,
  order_id TEXT NOT NULL,
  product_id TEXT,
  product_name TEXT NOT NULL,
  unit_type TEXT NOT NULL,
  quantity REAL NOT NULL,
  unit_price REAL NOT NULL,
  discount_percent REAL DEFAULT 0,
  tax_percent REAL DEFAULT 0,
  line_total REAL NOT NULL,
  notes TEXT,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS ledger_entries (
  id TEXT PRIMARY KEY NOT NULL,
  client_id TEXT NOT NULL,
  client_name TEXT NOT NULL,
  order_id TEXT,
  type TEXT NOT NULL,
  amount REAL NOT NULL,
  balance_after REAL NOT NULL,
  payment_mode TEXT,
  notes TEXT,
  due_date TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (client_id) REFERENCES clients(id)
);

CREATE INDEX IF NOT EXISTS idx_ledger_client ON ledger_entries(client_id);

CREATE TABLE IF NOT EXISTS inventory_transactions (
  id TEXT PRIMARY KEY NOT NULL,
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  type TEXT NOT NULL,
  quantity REAL NOT NULL,
  reference_id TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE IF NOT EXISTS sync_queue (
  id TEXT PRIMARY KEY NOT NULL,
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  action TEXT NOT NULL,
  payload TEXT,
  created_at TEXT NOT NULL
);
`;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) return dbInstance;
  if (initPromise) return initPromise;

  initPromise = openDatabase().catch((err) => {
    initPromise = null;
    throw err;
  });

  return initPromise;
}

async function openDatabase(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync(DB_NAME);
  try {
    await db.execAsync(SCHEMA);
  } catch (e) {
    // Partial schema on upgraded installs — migrations repair the rest
    console.warn('[DB] Schema exec warning (continuing migration):', (e as Error).message);
  }
  await migrateCategories(db);
  await migrateOrderDiscounts(db);
  await migrateProductMetadata(db);
  dbInstance = db;
  return db;
}

async function migrateOrderDiscounts(db: SQLite.SQLiteDatabase): Promise<void> {
  const clientCols = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(clients)`);
  if (clientCols.length > 0) {
    if (!clientCols.some((c) => c.name === 'default_discount_type')) {
      await db.execAsync(`ALTER TABLE clients ADD COLUMN default_discount_type TEXT`);
    }
    if (!clientCols.some((c) => c.name === 'default_discount_value')) {
      await db.execAsync(`ALTER TABLE clients ADD COLUMN default_discount_value REAL DEFAULT 0`);
    }
  }

  const orderCols = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(orders)`);
  if (orderCols.length > 0) {
    if (!orderCols.some((c) => c.name === 'order_discount_type')) {
      await db.execAsync(`ALTER TABLE orders ADD COLUMN order_discount_type TEXT`);
    }
    if (!orderCols.some((c) => c.name === 'order_discount_value')) {
      await db.execAsync(`ALTER TABLE orders ADD COLUMN order_discount_value REAL DEFAULT 0`);
    }
    if (!orderCols.some((c) => c.name === 'order_discount_amount')) {
      await db.execAsync(`ALTER TABLE orders ADD COLUMN order_discount_amount REAL DEFAULT 0`);
    }
    if (!orderCols.some((c) => c.name === 'discount_approval_status')) {
      await db.execAsync(`ALTER TABLE orders ADD COLUMN discount_approval_status TEXT DEFAULT 'none'`);
    }
  }
}

async function migrateProductMetadata(db: SQLite.SQLiteDatabase): Promise<void> {
  const cols = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(products)`);
  if (cols.length === 0) return;
  if (!cols.some((c) => c.name === 'is_incomplete')) {
    await db.execAsync(`ALTER TABLE products ADD COLUMN is_incomplete INTEGER DEFAULT 0`);
  }
  if (!cols.some((c) => c.name === 'brand')) {
    await db.execAsync(`ALTER TABLE products ADD COLUMN brand TEXT`);
  }
  if (!cols.some((c) => c.name === 'allow_discount')) {
    await db.execAsync(`ALTER TABLE products ADD COLUMN allow_discount INTEGER DEFAULT 0`);
  }
  if (!cols.some((c) => c.name === 'max_discount_percent')) {
    await db.execAsync(`ALTER TABLE products ADD COLUMN max_discount_percent REAL DEFAULT 0`);
  }
}

async function migrateCategories(db: SQLite.SQLiteDatabase): Promise<void> {
  // Ensure categories table exists (older installs may have failed mid-schema)
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL UNIQUE,
      slug TEXT UNIQUE,
      description TEXT,
      sort_order INTEGER DEFAULT 0,
      is_preset INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  const productCols = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(products)`);
  const hasProducts = productCols.length > 0;
  if (hasProducts && !productCols.some((c) => c.name === 'category_id')) {
    await db.execAsync(`ALTER TABLE products ADD COLUMN category_id TEXT`);
  }

  await db.execAsync(
    `CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id)`,
  );

  const categoryColNames = async () => {
    const cols = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(categories)`);
    return cols.map((c) => c.name);
  };
  const catCols = await categoryColNames();
  if (!catCols.includes('slug')) {
    await db.execAsync(`ALTER TABLE categories ADD COLUMN slug TEXT`);
  }
  if (!(await categoryColNames()).includes('is_preset')) {
    await db.execAsync(`ALTER TABLE categories ADD COLUMN is_preset INTEGER DEFAULT 0`);
  }

  const now = new Date().toISOString();

  // Seed pre-defined market categories (idempotent by slug)
  for (const preset of DEFAULT_CATEGORIES) {
    const existing = await db.getFirstAsync<{ id: string }>(
      `SELECT id FROM categories WHERE slug = ?`,
      [preset.slug],
    );
    if (!existing) {
      const byName = await db.getFirstAsync<{ id: string }>(
        `SELECT id FROM categories WHERE LOWER(name) = LOWER(?)`,
        [preset.name],
      );
      if (byName) {
        await db.runAsync(
          `UPDATE categories SET slug = ?, is_preset = 1, sort_order = ? WHERE id = ?`,
          [preset.slug, preset.sort_order, byName.id],
        );
      } else {
        await db.runAsync(
          `INSERT INTO categories (id, name, slug, description, sort_order, is_preset, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, 1, ?, ?)`,
          [generateId(), preset.name, preset.slug, null, preset.sort_order, now, now],
        );
      }
    }
  }

  // Migrate legacy "General" category → "Other"
  const legacyGeneral = await db.getFirstAsync<{ id: string }>(
    `SELECT id FROM categories WHERE name = 'General' AND (slug IS NULL OR slug != ?)`,
    [FALLBACK_CATEGORY_SLUG],
  );
  const otherCat = await db.getFirstAsync<{ id: string }>(
    `SELECT id FROM categories WHERE slug = ?`,
    [FALLBACK_CATEGORY_SLUG],
  );
  if (legacyGeneral && otherCat) {
    await db.runAsync(`UPDATE products SET category_id = ?, category = 'Other' WHERE category_id = ?`, [
      otherCat.id,
      legacyGeneral.id,
    ]);
    await db.runAsync(`DELETE FROM categories WHERE id = ?`, [legacyGeneral.id]);
  }

  const fallback = await db.getFirstAsync<{ id: string; name: string }>(
    `SELECT id, name FROM categories WHERE slug = ?`,
    [FALLBACK_CATEGORY_SLUG],
  );

  const distinct = await db.getAllAsync<{ category: string }>(
    `SELECT DISTINCT category FROM products WHERE category IS NOT NULL AND TRIM(category) != ''`,
  );

  for (const row of distinct) {
    const name = row.category.trim();
    if (!name || name === 'General') continue;
    let cat = await db.getFirstAsync<{ id: string }>(
      `SELECT id FROM categories WHERE LOWER(name) = LOWER(?)`,
      [name],
    );
    if (!cat) {
      const id = generateId();
      await db.runAsync(
        `INSERT INTO categories (id, name, slug, description, sort_order, is_preset, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 0, ?, ?)`,
        [id, name, null, null, 100, now, now],
      );
      cat = { id };
    }
    await db.runAsync(
      `UPDATE products SET category_id = ? WHERE category = ? AND (category_id IS NULL OR category_id = '')`,
      [cat.id, row.category],
    );
  }

  if (fallback) {
    await db.runAsync(`UPDATE products SET category_id = ? WHERE category_id IS NULL OR category_id = ''`, [
      fallback.id,
    ]);
  }

  await db.runAsync(`
    UPDATE products SET category = (
      SELECT c.name FROM categories c WHERE c.id = products.category_id
    )
    WHERE category_id IS NOT NULL
  `);

  await db.execAsync('PRAGMA user_version = 2');
}

/** Re-run migrations on the open DB (e.g. after a schema fix without restarting the app). */
export async function repairDatabase(): Promise<void> {
  const db = dbInstance ?? (await getDatabase());
  await migrateCategories(db);
  await migrateOrderDiscounts(db);
  await migrateProductMetadata(db);
}

/** Remove all business data — categories are re-seeded. Used on logout / account switch. */
export async function wipeAllUserData(): Promise<void> {
  const db = dbInstance ?? (await getDatabase());
  await db.execAsync(`
    PRAGMA foreign_keys = OFF;
    DELETE FROM order_items;
    DELETE FROM orders;
    DELETE FROM ledger_entries;
    DELETE FROM inventory_transactions;
    DELETE FROM sync_queue;
    DELETE FROM products;
    DELETE FROM clients;
    DELETE FROM categories;
    PRAGMA foreign_keys = ON;
  `);
  await migrateCategories(db);
  await migrateOrderDiscounts(db);
}

export async function closeDatabase(): Promise<void> {
  if (!dbInstance) return;
  try {
    await dbInstance.closeAsync();
  } catch (e) {
    console.warn('[DB] closeAsync failed:', e);
  } finally {
    dbInstance = null;
    initPromise = null;
  }
}

export async function runInTransaction<T>(fn: (db: SQLite.SQLiteDatabase) => Promise<T>): Promise<T> {
  const db = await getDatabase();
  await db.execAsync('BEGIN IMMEDIATE');
  try {
    const result = await fn(db);
    await db.execAsync('COMMIT');
    return result;
  } catch (e) {
    await db.execAsync('ROLLBACK');
    throw e;
  }
}
