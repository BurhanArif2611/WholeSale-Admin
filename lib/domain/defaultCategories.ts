/** Pre-defined market categories — seeded into local SQLite on first launch; user may edit names. */
export const DEFAULT_CATEGORIES: { slug: string; name: string; sort_order: number }[] = [
  { slug: 'grocery', name: 'Grocery', sort_order: 1 },
  { slug: 'rice-grains', name: 'Rice & Grains', sort_order: 2 },
  { slug: 'vegetables', name: 'Vegetables', sort_order: 3 },
  { slug: 'fruits-vegetables', name: 'Fruits', sort_order: 4 },
  { slug: 'bakery', name: 'Bakery', sort_order: 5 },
  { slug: 'dairy', name: 'Dairy', sort_order: 6 },
  { slug: 'snacks', name: 'Snacks', sort_order: 7 },
  { slug: 'beverages', name: 'Beverages', sort_order: 8 },
  { slug: 'restaurant', name: 'Restaurant', sort_order: 9 },
  { slug: 'electronics', name: 'Electronics', sort_order: 10 },
  { slug: 'hardware', name: 'Hardware', sort_order: 11 },
  { slug: 'fashion', name: 'Fashion', sort_order: 12 },
  { slug: 'pharmacy', name: 'Pharmacy', sort_order: 13 },
  { slug: 'medicine', name: 'Medicine', sort_order: 14 },
  { slug: 'stationery', name: 'Stationery', sort_order: 15 },
  { slug: 'household', name: 'Household Items', sort_order: 16 },
  { slug: 'personal-care', name: 'Personal Care', sort_order: 17 },
  { slug: 'mobile-accessories', name: 'Mobile Accessories', sort_order: 18 },
  { slug: 'other', name: 'Other', sort_order: 99 },
];

export const FALLBACK_CATEGORY_SLUG = 'other';
