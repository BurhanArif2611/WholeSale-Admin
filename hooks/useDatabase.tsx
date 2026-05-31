import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { getDatabase, repairDatabase } from '@/lib/core/database';
import { subscribeDatabaseReset } from '@/lib/core/databaseReset';

interface DatabaseContextValue {
  isReady: boolean;
  error: string | null;
  refresh: () => void;
  refreshKey: number;
}

const DatabaseContext = createContext<DatabaseContextValue | undefined>(undefined);

export function DatabaseProvider({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    return subscribeDatabaseReset(() => {
      setRefreshKey((k) => k + 1);
    });
  }, []);

  useEffect(() => {
    let mounted = true;
    setIsReady(false);
    getDatabase()
      .then(() => {
        if (mounted) {
          setIsReady(true);
          setError(null);
        }
      })
      .catch((e) => {
        if (mounted) setError((e as Error).message);
      });
    return () => {
      mounted = false;
    };
  }, [refreshKey]);

  const refresh = () => {
    void repairDatabase().finally(() => setRefreshKey((k) => k + 1));
  };

  return (
    <DatabaseContext.Provider value={{ isReady, error, refresh, refreshKey }}>
      {children}
    </DatabaseContext.Provider>
  );
}

export function useDatabase() {
  const ctx = useContext(DatabaseContext);
  if (!ctx) throw new Error('useDatabase must be used within DatabaseProvider');
  return ctx;
}
