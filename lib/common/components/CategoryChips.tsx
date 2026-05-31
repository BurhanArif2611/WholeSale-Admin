import React from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { Colors, Spacing, Radius, Typography, Fonts } from '@/constants/theme';
import type { Category } from '@/lib/domain/models';

interface CategoryChipsProps {
  categories: Category[];
  selectedId: string | null;
  onSelect: (categoryId: string | null) => void;
  showAll?: boolean;
  allLabel?: string;
}

export function CategoryChips({
  categories,
  selectedId,
  onSelect,
  showAll = true,
  allLabel = 'All',
}: CategoryChipsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {showAll && (
        <TouchableOpacity
          style={[styles.chip, !selectedId && styles.chipActive]}
          onPress={() => onSelect(null)}
        >
          <Text style={[styles.chipText, !selectedId && styles.chipTextActive]}>{allLabel}</Text>
        </TouchableOpacity>
      )}
      {categories.map((cat) => {
        const active = selectedId === cat.id;
        return (
          <TouchableOpacity
            key={cat.id}
            style={[styles.chip, active && styles.chipActive]}
            onPress={() => onSelect(active ? null : cat.id)}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]} numberOfLines={1}>
              {cat.name}
              {cat.product_count !== undefined ? ` (${cat.product_count})` : ''}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: Spacing.sm, paddingVertical: Spacing.xs },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    maxWidth: 160,
  },
  chipActive: { backgroundColor: Colors.amber, borderColor: Colors.amber },
  chipText: {
    fontSize: Typography.xs,
    fontFamily: Fonts.semibold,
    color: Colors.textSecondary,
  },
  chipTextActive: { color: Colors.white },
});
