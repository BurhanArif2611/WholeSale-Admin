import { getDatabase } from '@/lib/core/database';
import { generateId } from '@/lib/core/id';
import type { Client, CreateClientInput, OrderDiscountType } from '@/lib/domain/models';
import { normalizeMobile } from '@/lib/common/utils/validation';

function rowToClient(row: Record<string, unknown>): Client {
  return {
    id: row.id as string,
    name: row.name as string,
    mobile: row.mobile as string,
    alternate_mobile: (row.alternate_mobile as string) ?? null,
    address: (row.address as string) ?? null,
    gst_number: (row.gst_number as string) ?? null,
    email: (row.email as string) ?? null,
    notes: (row.notes as string) ?? null,
    credit_limit: Number(row.credit_limit ?? 0),
    profile_photo_uri: (row.profile_photo_uri as string) ?? null,
    pending_amount: Number(row.pending_amount ?? 0),
    default_discount_type: (row.default_discount_type as OrderDiscountType) ?? null,
    default_discount_value: Number(row.default_discount_value ?? 0),
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

const WALK_IN_CLIENT_NAME = 'Walk-in Customer';
const WALK_IN_CLIENT_MOBILE = '9000000000';

export const clientRepository = {
  /** Default client for instant / cash sales without registering a customer. */
  async getOrCreateWalkInClient(): Promise<Client> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<Record<string, unknown>>(
      `SELECT * FROM clients WHERE name = ? LIMIT 1`,
      [WALK_IN_CLIENT_NAME],
    );
    if (row) return rowToClient(row);

    return this.create({
      name: WALK_IN_CLIENT_NAME,
      mobile: WALK_IN_CLIENT_MOBILE,
      alternate_mobile: null,
      address: null,
      gst_number: null,
      email: null,
      notes: 'Auto-created for walk-in / instant purchases',
      credit_limit: 0,
      profile_photo_uri: null,
    });
  },
  async findAll(search = ''): Promise<Client[]> {
    const db = await getDatabase();
    const q = `%${search.trim()}%`;
    const rows = search
      ? await db.getAllAsync<Record<string, unknown>>(
          `SELECT * FROM clients WHERE name LIKE ? OR mobile LIKE ? OR address LIKE ? OR email LIKE ? ORDER BY name ASC`,
          [q, q, q, q],
        )
      : await db.getAllAsync<Record<string, unknown>>(`SELECT * FROM clients ORDER BY name ASC`);
    return rows.map(rowToClient);
  },

  async findById(id: string): Promise<Client | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<Record<string, unknown>>(`SELECT * FROM clients WHERE id = ?`, [id]);
    return row ? rowToClient(row) : null;
  },

  async findByMobile(mobile: string, excludeId?: string): Promise<Client | null> {
    const db = await getDatabase();
    const normalized = normalizeMobile(mobile);
    const row = excludeId
      ? await db.getFirstAsync<Record<string, unknown>>(
          `SELECT * FROM clients WHERE mobile = ? AND id != ?`,
          [normalized, excludeId],
        )
      : await db.getFirstAsync<Record<string, unknown>>(`SELECT * FROM clients WHERE mobile = ?`, [normalized]);
    return row ? rowToClient(row) : null;
  },

  async create(input: CreateClientInput): Promise<Client> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    const id = generateId();
    const mobile = normalizeMobile(input.mobile);

    await db.runAsync(
      `INSERT INTO clients (id, name, mobile, alternate_mobile, address, gst_number, email, notes, credit_limit, profile_photo_uri, pending_amount, default_discount_type, default_discount_value, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)`,
      [
        id,
        input.name.trim(),
        mobile,
        input.alternate_mobile ? normalizeMobile(input.alternate_mobile) : null,
        input.address?.trim() || null,
        input.gst_number?.trim().toUpperCase() || null,
        input.email?.trim().toLowerCase() || null,
        input.notes?.trim() || null,
        input.credit_limit ?? 0,
        input.profile_photo_uri ?? null,
        input.default_discount_type ?? null,
        input.default_discount_value ?? 0,
        now,
        now,
      ],
    );

    const created = await this.findById(id);
    if (!created) throw new Error('Failed to create client');
    return created;
  },

  async update(id: string, input: Partial<CreateClientInput>): Promise<Client> {
    const existing = await this.findById(id);
    if (!existing) throw new Error('Client not found');

    const now = new Date().toISOString();
    const db = await getDatabase();
    const mobile = input.mobile ? normalizeMobile(input.mobile) : existing.mobile;

    await db.runAsync(
      `UPDATE clients SET
        name = ?, mobile = ?, alternate_mobile = ?, address = ?, gst_number = ?,
        email = ?, notes = ?, credit_limit = ?, profile_photo_uri = ?, updated_at = ?
       WHERE id = ?`,
      [
        (input.name ?? existing.name).trim(),
        mobile,
        input.alternate_mobile !== undefined
          ? input.alternate_mobile
            ? normalizeMobile(input.alternate_mobile)
            : null
          : existing.alternate_mobile,
        input.address !== undefined ? input.address?.trim() || null : existing.address,
        input.gst_number !== undefined ? input.gst_number?.trim().toUpperCase() || null : existing.gst_number,
        input.email !== undefined ? input.email?.trim().toLowerCase() || null : existing.email,
        input.notes !== undefined ? input.notes?.trim() || null : existing.notes,
        input.credit_limit ?? existing.credit_limit,
        input.profile_photo_uri !== undefined ? input.profile_photo_uri : existing.profile_photo_uri,
        now,
        id,
      ],
    );

    const updated = await this.findById(id);
    if (!updated) throw new Error('Failed to update client');
    return updated;
  },

  async delete(id: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(`DELETE FROM clients WHERE id = ?`, [id]);
  },

  async updateDefaultDiscount(
    clientId: string,
    type: OrderDiscountType | null,
    value: number,
  ): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      `UPDATE clients SET default_discount_type = ?, default_discount_value = ?, updated_at = ? WHERE id = ?`,
      [type, value, new Date().toISOString(), clientId],
    );
  },

  async updatePendingAmount(clientId: string, amount: number): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(`UPDATE clients SET pending_amount = ?, updated_at = ? WHERE id = ?`, [
      amount,
      new Date().toISOString(),
      clientId,
    ]);
  },
};
