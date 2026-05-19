import { useCallback, useEffect, useState } from 'react';
import { categoryRepository } from '@/lib/data/repositories/categoryRepository';
import { useDatabase } from '@/hooks/useDatabase';
import type { Category } from '@/lib/domain/models';

export function useCategories() {
  const { isReady, refreshKey, refresh } = useDatabase();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!isReady) return;
    setLoading(true);
    setError(null);
    try {
      setCategories(await categoryRepository.ensureSeeded());
    } catch (e) {
      setError((e as Error).message);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }, [isReady, refreshKey]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { categories, loading, error, reload, refresh };
}
