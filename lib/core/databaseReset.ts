type DatabaseResetListener = () => void;

const listeners = new Set<DatabaseResetListener>();

export function subscribeDatabaseReset(listener: DatabaseResetListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function emitDatabaseReset(): void {
  listeners.forEach((l) => {
    try {
      l();
    } catch (e) {
      console.warn('[databaseReset] listener error:', e);
    }
  });
}
