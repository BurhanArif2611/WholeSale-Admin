import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, Shadow, Gradients, Typography, Fonts } from '@/constants/theme';
import { iconForCategorySlug } from '@/lib/domain/categoryIcons';
import type { Category } from '@/lib/domain/models';

interface BusinessCategoryGridProps {
  categories: Category[];
  selectedIds: string[];
  onToggle: (categoryId: string) => void;
  searchPlaceholder?: string;
  minRequired?: number;
  /** Extra padding at list bottom so content clears a sticky footer */
  listBottomInset?: number;
}

export function BusinessCategoryGrid({
  categories,
  selectedIds,
  onToggle,
  searchPlaceholder = 'Search categories...',
  minRequired = 1,
  listBottomInset = 0,
}: BusinessCategoryGridProps) {
  const [search, setSearch] = useState('');
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const presetCategories = useMemo(
    () =>
      categories
        .filter((c) => c.slug !== 'other')
        .sort((a, b) => a.sort_order - b.sort_order),
    [categories],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return presetCategories;
    return presetCategories.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.slug?.toLowerCase().includes(q) ?? false),
    );
  }, [presetCategories, search]);

  const renderItem = ({ item }: { item: Category }) => {
    const selected = selectedSet.has(item.id);
    const icon = iconForCategorySlug(item.slug);

    return (
      <Pressable
        style={[styles.card, selected && styles.cardSelected]}
        onPress={() => onToggle(item.id)}
      >
        {selected ? (
          <LinearGradient colors={Gradients.amber} style={styles.cardInner}>
            <View style={styles.checkBadge}>
              <Ionicons name="checkmark" size={12} color={Colors.white} />
            </View>
            <Ionicons name={icon} size={26} color={Colors.white} />
            <Text style={styles.cardLabelSelected} numberOfLines={2}>
              {item.name}
            </Text>
          </LinearGradient>
        ) : (
          <View style={styles.cardInner}>
            <Ionicons name={icon} size={24} color={Colors.textMuted} />
            <Text style={styles.cardLabel} numberOfLines={2}>
              {item.name}
            </Text>
          </View>
        )}
      </Pressable>
    );
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color={Colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder={searchPlaceholder}
          placeholderTextColor={Colors.textMuted}
        />
        {search.length > 0 ? (
          <Pressable onPress={() => setSearch('')} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
          </Pressable>
        ) : null}
      </View>

      <Text style={styles.hint}>
        {selectedIds.length < minRequired
          ? `Select at least ${minRequired} category`
          : `${selectedIds.length} selected`}
      </Text>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        numColumns={3}
        columnWrapperStyle={styles.row}
        contentContainerStyle={[styles.list, { paddingBottom: listBottomInset }]}
        showsVerticalScrollIndicator={false}
        renderItem={renderItem}
        ListEmptyComponent={
          <Text style={styles.empty}>No categories match your search.</Text>
        }
      />
    </View>
  );
}

const CARD_GAP = Spacing.sm;
const styles = StyleSheet.create({
  wrap: { flex: 1, minHeight: 0 },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: Typography.sm,
    color: Colors.textPrimary,
    paddingVertical: 4,
  },
  hint: {
    fontSize: Typography.xs,
    color: Colors.textMuted,
    fontFamily: Fonts.semibold,
    marginBottom: Spacing.sm,
  },
  list: { paddingBottom: Spacing.xl },
  row: { gap: CARD_GAP, marginBottom: CARD_GAP },
  card: {
    flex: 1,
    minHeight: 96,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    overflow: 'hidden',
    ...Shadow.sm,
  },
  cardSelected: {
    borderColor: Colors.amber,
    ...Shadow.md,
  },
  cardInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.sm,
    gap: 6,
  },
  checkBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardLabel: {
    fontSize: 10,
    fontFamily: Fonts.semibold,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  cardLabelSelected: {
    fontSize: 10,
    fontFamily: Fonts.bold,
    color: Colors.white,
    textAlign: 'center',
  },
  empty: {
    textAlign: 'center',
    color: Colors.textMuted,
    padding: Spacing.xl,
    fontSize: Typography.sm,
  },
});
