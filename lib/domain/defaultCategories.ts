/** Pre-defined market categories — seeded into local SQLite on first launch; user may edit names. */
export const DEFAULT_CATEGORIES: { slug: string; name: string; sort_order: number }[] = [
  { slug: 'grocery', name: 'Grocery', sort_order: 1 },
  { slug: 'electronics', name: 'Electronics', sort_order: 2 },
  { slug: 'fashion', name: 'Fashion', sort_order: 3 },
  { slug: 'beverages', name: 'Beverages', sort_order: 4 },
  { slug: 'snacks', name: 'Snacks', sort_order: 5 },
  { slug: 'dairy', name: 'Dairy Products', sort_order: 6 },
  { slug: 'household', name: 'Household Items', sort_order: 7 },
  { slug: 'personal-care', name: 'Personal Care', sort_order: 8 },
  { slug: 'stationery', name: 'Stationery', sort_order: 9 },
  { slug: 'medicine', name: 'Medicine', sort_order: 10 },
  { slug: 'fruits-vegetables', name: 'Fruits & Vegetables', sort_order: 11 },
  { slug: 'bakery', name: 'Bakery', sort_order: 12 },
  { slug: 'hardware', name: 'Hardware', sort_order: 13 },
  { slug: 'mobile-accessories', name: 'Mobile Accessories', sort_order: 14 },
  { slug: 'other', name: 'Other', sort_order: 99 },
];

export const FALLBACK_CATEGORY_SLUG = 'other';
