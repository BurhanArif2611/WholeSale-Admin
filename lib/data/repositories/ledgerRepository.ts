import { getDatabase } from '@/lib/core/database';
import { generateId } from '@/lib/core/id';
import type { LedgerEntry, LedgerType } from '@/lib/domain/models';
import { clientRepository } from './clientRepository';

function rowToLedger(row: Record<string, unknown>): LedgerEntry {
  return {
    id: row.id as string,
    client_id: row.client_id as string,
    client_name: row.client_name as string,
    order_id: (row.order_id as string) ?? null,
    type: row.type as LedgerType,
    amount: Number(row.amount),
    balance_after: Number(row.balance_after),
    payment_mode: (row.payment_mode as string) ?? null,
    notes: (row.notes as string) ?? null,
    due_date: (row.due_date as string) ?? null,
    created_at: row.created_at as string,
  };
}

export const ledgerRepository = {
  async findAll(clientId?: string): Promise<LedgerEntry[]> {
    const db = await getDatabase();
    const rows = clientId
      ? await db.getAllAsync<Record<string, unknown>>(
          `SELECT * FROM ledger_entries WHERE client_id = ? ORDER BY created_at DESC`,
          [clientId],
        )
      : await db.getAllAsync<Record<string, unknown>>(`SELECT * FROM ledger_entries ORDER BY created_at DESC`);
    return rows.map(rowToLedger);
  },

  async getClientBalance(clientId: string): Promise<number> {
    const client = await clientRepository.findById(clientId);
    return client?.pending_amount ?? 0;
  },

  async addEntry(input: {
    client_id: string;
    type: LedgerType;
    amount: number;
    order_id?: string | null;
    payment_mode?: string;
    notes?: string;
    due_date?: string;
  }): Promise<LedgerEntry> {
    const client = await clientRepository.findById(input.client_id);
    if (!client) throw new Error('Client not found');

    const db = await getDatabase();
    const id = generateId();
    const now = new Date().toISOString();

    let newBalance = client.pending_amount;
    if (input.type === 'credit') {
      newBalance += input.amount;
    } else {
      newBalance = Math.max(0, newBalance - input.amount);
    }

    await db.runAsync(
      `INSERT INTO ledger_entries (id, client_id, client_name, order_id, type, amount, balance_after, payment_mode, notes, due_date, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        client.id,
        client.name,
        input.order_id ?? null,
        input.type,
        input.amount,
        newBalance,
        input.payment_mode ?? null,
        input.notes ?? null,
        input.due_date ?? null,
        now,
      ],
    );

    await clientRepository.updatePendingAmount(client.id, newBalance);

    const row = await db.getFirstAsync<Record<string, unknown>>(`SELECT * FROM ledger_entries WHERE id = ?`, [id]);
    if (!row) throw new Error('Failed to create ledger entry');
    return rowToLedger(row);
  },

  async addCreditFromOrder(clientId: string, clientName: string, orderId: string, amount: number): Promise<void> {
    const client = await clientRepository.findById(clientId);
    if (!client) return;

    const db = await getDatabase();
    const id = generateId();
    const now = new Date().toISOString();
    const newBalance = client.pending_amount + amount;

    await db.runAsync(
      `INSERT INTO ledger_entries (id, client_id, client_name, order_id, type, amount, balance_after, payment_mode, notes, due_date, created_at)
       VALUES (?, ?, ?, ?, 'credit', ?, ?, NULL, 'Auto entry from order', NULL, ?)`,
      [id, clientId, clientName, orderId, amount, newBalance, now],
    );
  },

  async recordPayment(clientId: string, amount: number, paymentMode: string, notes?: string): Promise<LedgerEntry> {
    return this.addEntry({
      client_id: clientId,
      type: 'debit',
      amount,
      payment_mode: paymentMode,
      notes: notes ?? 'Payment received',
    });
  },

  async getOutstandingSummary(): Promise<{ totalOutstanding: number; clientCount: number }> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<{ total: number; count: number }>(
      `SELECT COALESCE(SUM(pending_amount), 0) as total, COUNT(*) as count FROM clients WHERE pending_amount > 0`,
    );
    return { totalOutstanding: row?.total ?? 0, clientCount: row?.count ?? 0 };
  },
};
