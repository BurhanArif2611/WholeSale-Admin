import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BottomSheet } from '@/lib/common/components/BottomSheet';
import { Colors, Spacing, Radius, Typography } from '@/constants/theme';

interface ProductSelectionMoreSheetProps {
  visible: boolean;
  isInstant: boolean;
  onClose: () => void;
  onAddProduct: () => void;
  onAddTemp: () => void;
  onRepeatLast: () => void;
  onToggleFilters: () => void;
  filtersVisible: boolean;
  t: (key: string) => string;
}

export function ProductSelectionMoreSheet({
  visible,
  isInstant,
  onClose,
  onAddProduct,
  onAddTemp,
  onRepeatLast,
  onToggleFilters,
  filtersVisible,
  t,
}: ProductSelectionMoreSheetProps) {
  const pick = (fn: () => void) => {
    fn();
    onClose();
  };

  return (
    <BottomSheet visible={visible} title={t('more_options') || 'More Options'} onClose={onClose}>
      <Option icon="cube-outline" label={t('create_new_product')} onPress={() => pick(onAddProduct)} />
      {isInstant ? (
        <Option icon="flash-outline" label={t('add_temp_product')} onPress={() => pick(onAddTemp)} />
      ) : null}
      <Option icon="repeat" label={t('repeat_last_item')} onPress={() => pick(onRepeatLast)} />
      <Option
        icon="options-outline"
        label={filtersVisible ? t('hide_filters') || 'Hide Filters' : t('show_filters') || 'Show Filters'}
        onPress={() => pick(onToggleFilters)}
      />
    </BottomSheet>
  );
}

function Option({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.option} onPress={onPress}>
      <Ionicons name={icon} size={22} color={Colors.amber} />
      <Text style={styles.label}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    backgroundColor: Colors.surface2,
    borderRadius: Radius.lg,
    marginBottom: Spacing.sm,
  },
  label: { flex: 1, fontSize: Typography.sm, fontWeight: Typography.semibold, color: Colors.textPrimary },
});
