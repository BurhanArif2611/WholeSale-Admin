import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  loadBusinessCategories,
  saveBusinessCategories,
  isCategorySetupComplete,
  loadShowAllCategories,
  saveShowAllCategories,
  clearBusinessCategoryStorage,
} from '@/lib/preferences/businessCategories';
import { filterCategoriesForDisplay } from '@/lib/common/utils/categoryPreferences';
import type { Category } from '@/lib/domain/models';
import type { ProductQueryOptions } from '@/lib/data/repositories/productRepository';

interface BusinessCategoriesContextValue {
  preferredIds: string[];
  hasPreferences: boolean;
  hasCompletedSetup: boolean;
  loading: boolean;
  showAllCategories: boolean;
  setShowAllCategories: (value: boolean) => Promise<void>;
  savePreferences: (categoryIds: string[], markComplete?: boolean) => Promise<void>;
  refresh: () => Promise<void>;
  filterCategoryList: (categories: Category[]) => Category[];
  productQueryOptions: (categoryId: string | null, search: string) => ProductQueryOptions;
}

const BusinessCategoriesContext = createContext<BusinessCategoriesContextValue | undefined>(
  undefined,
);

export function BusinessCategoriesProvider({
  children,
  userId,
}: {
  children: ReactNode;
  userId: string | null | undefined;
}) {
  const [preferredIds, setPreferredIds] = useState<string[]>([]);
  const [hasCompletedSetup, setHasCompletedSetup] = useState(false);
  const [showAllCategories, setShowAllState] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) {
      setPreferredIds([]);
      setHasCompletedSetup(false);
      setShowAllState(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [prefs, done, showAll] = await Promise.all([
        loadBusinessCategories(userId),
        isCategorySetupComplete(userId),
        loadShowAllCategories(userId),
      ]);
      setPreferredIds(prefs?.categoryIds ?? []);
      setHasCompletedSetup(done);
      setShowAllState(showAll);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const savePreferences = useCallback(
    async (categoryIds: string[], markComplete = true) => {
      if (!userId) throw new Error('Not signed in');
      await saveBusinessCategories(userId, categoryIds, markComplete);
      setPreferredIds(categoryIds);
      if (markComplete) setHasCompletedSetup(true);
    },
    [userId],
  );

  const setShowAllCategories = useCallback(
    async (value: boolean) => {
      if (!userId) return;
      await saveShowAllCategories(userId, value);
      setShowAllState(value);
    },
    [userId],
  );

  const filterCategoryList = useCallback(
    (categories: Category[]) =>
      filterCategoriesForDisplay(categories, preferredIds, showAllCategories),
    [preferredIds, showAllCategories],
  );

  const productQueryOptions = useCallback(
    (categoryId: string | null, search: string): ProductQueryOptions => {
      if (!preferredIds.length) return {};
      const hasFilter = !!(categoryId || search.trim());
      return {
        preferredCategoryIds: preferredIds,
        preferPreferredCategories: !hasFilter,
        onlyPreferredCategories: !hasFilter && !showAllCategories,
      };
    },
    [preferredIds, showAllCategories],
  );

  const value = useMemo(
    () => ({
      preferredIds,
      hasPreferences: preferredIds.length > 0,
      hasCompletedSetup,
      loading,
      showAllCategories,
      setShowAllCategories,
      savePreferences,
      refresh,
      filterCategoryList,
      productQueryOptions,
    }),
    [
      preferredIds,
      hasCompletedSetup,
      loading,
      showAllCategories,
      setShowAllCategories,
      savePreferences,
      refresh,
      filterCategoryList,
      productQueryOptions,
    ],
  );

  return (
    <BusinessCategoriesContext.Provider value={value}>
      {children}
    </BusinessCategoriesContext.Provider>
  );
}

export function useBusinessCategories(): BusinessCategoriesContextValue {
  const ctx = useContext(BusinessCategoriesContext);
  if (!ctx) {
    return {
      preferredIds: [],
      hasPreferences: false,
      hasCompletedSetup: true,
      loading: false,
      showAllCategories: true,
      setShowAllCategories: async () => {},
      savePreferences: async () => {},
      refresh: async () => {},
      filterCategoryList: (cats) => cats,
      productQueryOptions: () => ({}),
    };
  }
  return ctx;
}

export async function clearBusinessCategoriesForUser(userId: string): Promise<void> {
  await clearBusinessCategoryStorage(userId);
}
