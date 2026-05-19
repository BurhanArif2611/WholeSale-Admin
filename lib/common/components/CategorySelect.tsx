import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SearchBar } from '@/components/ui';
import { Colors, Spacing, Radius, Shadow, Typography } from '@/constants/theme';
import { useLanguage } from '@/hooks/useLanguage';
import type { Category } from '@/lib/domain/models';

interface CategorySelectProps {
  label?: string;
  categories: Category[];
  selectedId: string | null;
  onSelect: (categoryId: string) => void;
  loading?: boolean;
  error?: string | null;
  touched?: boolean;
  placeholder?: string;
  onManagePress?: () => void;
  onOpen?: () => void;
}

export function CategorySelect({
  label = 'Category *',
  categories,
  selectedId,
  onSelect,
  loading,
  error,
  touched,
  placeholder,
  onManagePress,
  onOpen,
}: CategorySelectProps) {
  const { t } = useLanguage();
  const resolvedPlaceholder = placeholder ?? t('select_category_placeholder');
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selected = categories.find((c) => c.id === selectedId);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter(
      (c) => c.name.toLowerCase().includes(q) || (c.slug && c.slug.toLowerCase().includes(q)),
    );
  }, [categories, query]);

  const showError = touched && !!error;

  const handleOpen = () => {
    setQuery('');
    setOpen(true);
    onOpen?.();
  };

  const handleSelect = (id: string) => {
    onSelect(id);
    setOpen(false);
    setQuery('');
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {onManagePress && (
          <TouchableOpacity onPress={onManagePress} style={styles.manageBtn}>
            <Ionicons name="pricetags-outline" size={14} color={Colors.amber} />
            <Text style={styles.manageText}>Manage</Text>
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity
        style={[styles.field, showError && styles.fieldError, selected && styles.fieldSelected]}
        onPress={handleOpen}
        disabled={loading}
        activeOpacity={0.85}
      >
        {loading ? (
          <Text style={styles.placeholder}>Loading categories...</Text>
        ) : selected ? (
          <View style={styles.selectedRow}>
            <View style={styles.catDot} />
            <Text style={styles.selectedText} numberOfLines={1}>{selected.name}</Text>
            {selected.is_preset && <Text style={styles.presetTag}>Default</Text>}
          </View>
        ) : (
          <Text style={styles.placeholder}>{resolvedPlaceholder}</Text>
        )}
        <Ionicons name="chevron-down" size={18} color={Colors.textMuted} />
      </TouchableOpacity>

      {showError ? <Text style={styles.errorText}>{error}</Text> : null}
      {!showError && !selected && !loading ? (
        <Text style={styles.hint}>{t('hint_category_required')}</Text>
      ) : null}

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{t('select_category_title')}</Text>
              <TouchableOpacity onPress={() => setOpen(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={24} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <View style={styles.searchWrap}>
              <SearchBar
                value={query}
                onChangeText={setQuery}
                placeholder={t('search_categories')}
                accessibilityLabel={t('search_categories')}
              />
            </View>
            <FlatList
              data={filtered}
              keyExtractor={(item) => item.id}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                <Text style={styles.empty}>{t('no_categories_match')}</Text>
              }
              renderItem={({ item }) => {
                const active = item.id === selectedId;
                return (
                  <TouchableOpacity
                    style={[styles.option, active && styles.optionActive]}
                    onPress={() => handleSelect(item.id)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.optionText, active && styles.optionTextActive]}>{item.name}</Text>
                      {item.product_count !== undefined && (
                        <Text style={styles.optionMeta}>{item.product_count} products</Text>
                      )}
                    </View>
                    {active && <Ionicons name="checkmark-circle" size={22} color={Colors.amber} />}
                  </TouchableOpacity>
                );
              }}
            />
            {onManagePress && (
              <TouchableOpacity style={styles.addNew} onPress={() => { setOpen(false); onManagePress(); }}>
                <Ionicons name="add-circle-outline" size={20} color={Colors.amber} />
                <Text style={styles.addNewText}>Add or manage categories</Text>
              </TouchableOpacity>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: Spacing.md },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  label: { fontSize: Typography.xs, fontWeight: Typography.bold, color: Colors.textSecondary },
  manageBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  manageText: { fontSize: Typography.xs, color: Colors.amber, fontWeight: Typography.semibold },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    minHeight: 52,
    ...Shadow.sm,
  },
  fieldError: { borderColor: Colors.danger, borderWidth: 1.5 },
  fieldSelected: { borderColor: Colors.amber + '66' },
  selectedRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingRight: Spacing.sm },
  catDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.amber },
  selectedText: { flex: 1, fontSize: Typography.sm, fontWeight: Typography.semibold, color: Colors.textPrimary },
  presetTag: {
    fontSize: 9,
    fontWeight: Typography.bold,
    color: Colors.textMuted,
    backgroundColor: Colors.surface2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.sm,
    textTransform: 'uppercase',
  },
  placeholder: { flex: 1, fontSize: Typography.sm, color: Colors.textMuted },
  errorText: { color: Colors.danger, fontSize: Typography.xs, marginTop: Spacing.xs, fontWeight: Typography.semibold },
  hint: { fontSize: Typography.xs, color: Colors.textMuted, marginTop: Spacing.xs, fontStyle: 'italic' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    maxHeight: '75%',
    paddingBottom: Spacing.xl,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  sheetTitle: { fontSize: Typography.base, fontWeight: Typography.bold, color: Colors.textPrimary },
  searchWrap: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  optionActive: { backgroundColor: Colors.amberBg },
  optionText: { fontSize: Typography.sm, fontWeight: Typography.semibold, color: Colors.textPrimary },
  optionTextActive: { color: Colors.amberDim },
  optionMeta: { fontSize: Typography.xs, color: Colors.textMuted, marginTop: 2 },
  empty: { textAlign: 'center', color: Colors.textMuted, padding: Spacing.xl },
  addNew: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  addNewText: { fontSize: Typography.sm, color: Colors.amber, fontWeight: Typography.bold },
});
