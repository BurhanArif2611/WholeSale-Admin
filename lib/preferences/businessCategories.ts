import AsyncStorage from '@react-native-async-storage/async-storage';

const dataKey = (userId: string) => `wholesale_business_categories_${userId}`;
const doneKey = (userId: string) => `wholesale_category_setup_done_${userId}`;
const showAllKey = (userId: string) => `wholesale_show_all_categories_${userId}`;

export interface BusinessCategoryPreferences {
  userId: string;
  /** Ordered list — first = highest priority */
  categoryIds: string[];
  completedAt: string | null;
}

export async function loadBusinessCategories(userId: string): Promise<BusinessCategoryPreferences | null> {
  const raw = await AsyncStorage.getItem(dataKey(userId));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as BusinessCategoryPreferences;
  } catch {
    return null;
  }
}

export async function saveBusinessCategories(
  userId: string,
  categoryIds: string[],
  markComplete = true,
): Promise<void> {
  const payload: BusinessCategoryPreferences = {
    userId,
    categoryIds,
    completedAt: markComplete ? new Date().toISOString() : null,
  };
  await AsyncStorage.setItem(dataKey(userId), JSON.stringify(payload));
  if (markComplete) {
    await AsyncStorage.setItem(doneKey(userId), 'true');
  }
}

export async function isCategorySetupComplete(userId: string): Promise<boolean> {
  const flag = await AsyncStorage.getItem(doneKey(userId));
  if (flag === 'true') return true;
  const data = await loadBusinessCategories(userId);
  return !!(data?.completedAt && data.categoryIds.length > 0);
}

export async function loadShowAllCategories(userId: string): Promise<boolean> {
  const v = await AsyncStorage.getItem(showAllKey(userId));
  return v === 'true';
}

export async function saveShowAllCategories(userId: string, showAll: boolean): Promise<void> {
  await AsyncStorage.setItem(showAllKey(userId), String(showAll));
}

export async function clearBusinessCategoryStorage(userId: string): Promise<void> {
  await AsyncStorage.multiRemove([dataKey(userId), doneKey(userId), showAllKey(userId)]);
}
