import type { Category } from '@/lib/domain/models';

/** Sort preferred categories first (by saved order), then the rest by sort_order */
export function sortCategoriesByPreference(
  categories: Category[],
  preferredIds: string[],
): Category[] {
  if (!preferredIds.length) return [...categories].sort((a, b) => a.sort_order - b.sort_order);

  const orderMap = new Map(preferredIds.map((id, i) => [id, i]));
  return [...categories].sort((a, b) => {
    const aPref = orderMap.has(a.id) ? orderMap.get(a.id)! : 9999;
    const bPref = orderMap.has(b.id) ? orderMap.get(b.id)! : 9999;
    if (aPref !== bPref) return aPref - bPref;
    return a.sort_order - b.sort_order;
  });
}

/** Chips/list for filters — preferred only unless showAll */
export function filterCategoriesForDisplay(
  categories: Category[],
  preferredIds: string[],
  showAll: boolean,
): Category[] {
  const sorted = sortCategoriesByPreference(categories, preferredIds);
  if (!preferredIds.length || showAll) return sorted;
  const preferredSet = new Set(preferredIds);
  const preferred = sorted.filter((c) => preferredSet.has(c.id));
  const other = sorted.filter((c) => !preferredSet.has(c.id) && c.slug !== 'other');
  return [...preferred, ...other];
}

export function buildPreferredOrderSql(preferredIds: string[]): string {
  if (!preferredIds.length) return '';
  const cases = preferredIds
    .map((id, i) => `WHEN category_id = '${id.replace(/'/g, "''")}' THEN ${i}`)
    .join(' ');
  return `CASE ${cases} ELSE ${preferredIds.length} END`;
}
