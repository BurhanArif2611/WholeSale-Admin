import type { Ionicons } from '@expo/vector-icons';

/** Icon per category slug for onboarding grid and settings */
export const CATEGORY_SLUG_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  grocery: 'basket-outline',
  'rice-grains': 'nutrition-outline',
  vegetables: 'leaf-outline',
  'fruits-vegetables': 'nutrition-outline',
  bakery: 'cafe-outline',
  dairy: 'water-outline',
  snacks: 'fast-food-outline',
  beverages: 'wine-outline',
  electronics: 'hardware-chip-outline',
  hardware: 'hammer-outline',
  fashion: 'shirt-outline',
  medicine: 'medkit-outline',
  pharmacy: 'medical-outline',
  restaurant: 'restaurant-outline',
  stationery: 'book-outline',
  'personal-care': 'sparkles-outline',
  household: 'home-outline',
  'mobile-accessories': 'phone-portrait-outline',
  other: 'ellipsis-horizontal-outline',
};

export function iconForCategorySlug(slug: string | null | undefined): keyof typeof Ionicons.glyphMap {
  if (!slug) return 'pricetag-outline';
  return CATEGORY_SLUG_ICONS[slug] ?? 'pricetag-outline';
}
