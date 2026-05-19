import { getDatabase } from '@/lib/core/database';
import { generateId } from '@/lib/core/id';

export type SyncAction = 'create' | 'update' | 'delete';

/** Queue a record change for future remote database sync. */
export async function enqueueSync(
  tableName: string,
  recordId: string,
  action: SyncAction,
  payload?: Record<string, unknown>,
): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO sync_queue (id, table_name, record_id, action, payload, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
    [
      generateId(),
      tableName,
      recordId,
      action,
      payload ? JSON.stringify(payload) : null,
      new Date().toISOString(),
    ],
  );
}
