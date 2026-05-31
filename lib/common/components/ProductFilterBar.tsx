import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SearchBar } from '@/components/ui';
import { CategoryChips } from '@/lib/common/components/CategoryChips';
import { Colors, Spacing, Radius, Typography, Fonts } from '@/constants/theme';
import type { Category, ProductSortField, SortDirection } from '@/lib/domain/models';

const SORT_OPTIONS: { field: ProductSortField; label: string }[] = [
  { field: 'name', label: 'Name' },
  { field: 'price', label: 'Price' },
  { field: 'stock', label: 'Stock' },
];

interface ProductFilterBarProps {
  search: string;
  onSearchChange: (v: string) => void;
  searchPlaceholder?: string;
  categories: Category[];
  selectedCategoryId: string | null;
  onCategorySelect: (id: string | null) => void;
  sortBy: ProductSortField;
  sortDir: SortDirection;
  onSortChange: (field: ProductSortField, dir: SortDirection) => void;
}

export function ProductFilterBar({
  search,
  onSearchChange,
  searchPlaceholder = 'Search by name, SKU, barcode, or category',
  categories,
  selectedCategoryId,
  onCategorySelect,
  sortBy,
  sortDir,
  onSortChange,
}: ProductFilterBarProps) {
  const cycleSort = (field: ProductSortField) => {
    if (sortBy === field) {
      onSortChange(field, sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      onSortChange(field, 'asc');
    }
  };

  return (
    <View style={styles.wrap}>
      <SearchBar value={search} onChangeText={onSearchChange} placeholder={searchPlaceholder} />
      {categories.length > 0 && (
        <CategoryChips
          categories={categories}
          selectedId={selectedCategoryId}
          onSelect={onCategorySelect}
        />
      )}
      <View style={styles.sortRow}>
        <Ionicons name="funnel-outline" size={16} color={Colors.textMuted} />
        <Text style={styles.sortLabel}>Sort:</Text>
        {SORT_OPTIONS.map((opt) => {
          const active = sortBy === opt.field;
          return (
            <TouchableOpacity
              key={opt.field}
              style={[styles.sortChip, active && styles.sortChipActive]}
              onPress={() => cycleSort(opt.field)}
            >
              <Text style={[styles.sortChipText, active && styles.sortChipTextActive]}>
                {opt.label}
                {active ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.sm },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    paddingBottom: Spacing.xs,
  },
  sortLabel: { fontSize: Typography.xs, color: Colors.textMuted, fontFamily: Fonts.semibold },
  sortChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface2,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sortChipActive: { borderColor: Colors.amber, backgroundColor: Colors.amberBg },
  sortChipText: { fontSize: Typography.xs, color: Colors.textSecondary, fontFamily: Fonts.semibold },
  sortChipTextActive: { color: Colors.amberDim },
});
