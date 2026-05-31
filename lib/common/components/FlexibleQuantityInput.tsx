import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Pressable, Modal, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, Typography, formatCurrency, Fonts } from '@/constants/theme';
import { getCompatibleOrderUnits } from '@/lib/common/utils/pricing';
import { formatQuantityDisplay, parseDecimalQuantity, quantityStepForUnit, unitLabel } from '@/lib/common/utils/quantity';
import type { UnitType } from '@/lib/domain/models';

interface FlexibleQuantityInputProps {
  quantity: number;
  orderUnit: UnitType;
  priceUnit: UnitType;
  unitPrice: number;
  lineTotal?: number;
  onQuantityChange: (qty: number) => void;
  onOrderUnitChange: (unit: UnitType) => void;
  onRemove?: () => void;
  compact?: boolean;
  autoFocusQty?: boolean;
}

export function FlexibleQuantityInput({
  quantity,
  orderUnit,
  priceUnit,
  unitPrice,
  lineTotal,
  onQuantityChange,
  onOrderUnitChange,
  onRemove,
  compact = false,
  autoFocusQty = false,
}: FlexibleQuantityInputProps) {
  const [qtyText, setQtyText] = useState(formatQuantityDisplay(quantity));
  const [unitPickerOpen, setUnitPickerOpen] = useState(false);
  const compatibleUnits = getCompatibleOrderUnits(priceUnit);
  const step = quantityStepForUnit(orderUnit);

  useEffect(() => {
    setQtyText(formatQuantityDisplay(quantity));
  }, [quantity]);

  const applyQtyText = (text: string) => {
    setQtyText(text);
    const parsed = parseDecimalQuantity(text);
    if (parsed != null) onQuantityChange(parsed);
  };

  const adjust = (delta: number) => {
    const next = Math.max(0, quantity + delta);
    if (next <= 0 && onRemove) {
      onRemove();
      return;
    }
    if (next > 0) onQuantityChange(next);
  };

  return (
    <View style={[styles.wrap, compact && styles.wrapCompact]}>
      <TouchableOpacity
        style={[styles.btn, compact && styles.btnCompact]}
        onPress={() => adjust(-step)}
        accessibilityLabel="Decrease quantity"
      >
        <Ionicons name="remove" size={compact ? 16 : 18} color={Colors.textPrimary} />
      </TouchableOpacity>

      <TextInput
        style={[styles.qtyInput, compact && styles.qtyInputCompact]}
        value={qtyText}
        onChangeText={applyQtyText}
        onBlur={() => {
          const parsed = parseDecimalQuantity(qtyText);
          if (parsed == null) setQtyText(formatQuantityDisplay(quantity));
        }}
        keyboardType="decimal-pad"
        selectTextOnFocus
        autoFocus={autoFocusQty}
        accessibilityLabel="Quantity"
      />

      <Pressable style={[styles.unitChip, compact && styles.unitChipCompact]} onPress={() => setUnitPickerOpen(true)}>
        <Text style={styles.unitChipText}>{unitLabel(orderUnit)}</Text>
        {compatibleUnits.length > 1 ? (
          <Ionicons name="chevron-down" size={12} color={Colors.textSecondary} />
        ) : null}
      </Pressable>

      <TouchableOpacity
        style={[styles.btn, compact && styles.btnCompact]}
        onPress={() => adjust(step)}
        accessibilityLabel="Increase quantity"
      >
        <Ionicons name="add" size={compact ? 16 : 18} color={Colors.textPrimary} />
      </TouchableOpacity>

      {!compact && lineTotal != null ? (
        <Text style={styles.lineTotal}>{formatCurrency(lineTotal)}</Text>
      ) : null}

      {onRemove && !compact ? (
        <TouchableOpacity style={styles.removeBtn} onPress={onRemove}>
          <Ionicons name="trash-outline" size={18} color={Colors.danger} />
        </TouchableOpacity>
      ) : null}

      <Modal visible={unitPickerOpen} transparent animationType="fade" onRequestClose={() => setUnitPickerOpen(false)}>
        <Pressable style={styles.unitOverlay} onPress={() => setUnitPickerOpen(false)}>
          <View style={styles.unitList}>
            <FlatList
              data={compatibleUnits}
              keyExtractor={(u) => u}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.unitRow, item === orderUnit && styles.unitRowActive]}
                  onPress={() => {
                    onOrderUnitChange(item);
                    setUnitPickerOpen(false);
                  }}
                >
                  <Text style={styles.unitRowText}>{unitLabel(item)}</Text>
                  {item === orderUnit ? <Ionicons name="checkmark" size={18} color={Colors.amber} /> : null}
                </TouchableOpacity>
              )}
            />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, flexWrap: 'wrap' },
  wrapCompact: { gap: 4 },
  btn: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface2,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnCompact: { width: 30, height: 30 },
  qtyInput: {
    minWidth: 56,
    maxWidth: 72,
    height: 36,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    textAlign: 'center',
    fontSize: Typography.sm,
    fontFamily: Fonts.bold,
    color: Colors.textPrimary,
    backgroundColor: Colors.white,
    paddingHorizontal: 4,
  },
  qtyInputCompact: { minWidth: 48, height: 30, fontSize: Typography.xs },
  unitChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: Radius.md,
    backgroundColor: Colors.amberBg,
    borderWidth: 1,
    borderColor: Colors.amber + '44',
  },
  unitChipCompact: { paddingHorizontal: 6, paddingVertical: 4 },
  unitChipText: { fontSize: Typography.xs, fontFamily: Fonts.bold, color: Colors.amberDim },
  lineTotal: {
    fontSize: Typography.sm,
    fontFamily: Fonts.bold,
    color: Colors.amber,
    marginLeft: Spacing.xs,
  },
  removeBtn: { padding: Spacing.xs, marginLeft: Spacing.xs },
  unitOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  unitList: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    maxHeight: 280,
    overflow: 'hidden',
  },
  unitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  unitRowActive: { backgroundColor: Colors.amberBg },
  unitRowText: { fontSize: Typography.sm, color: Colors.textPrimary, fontFamily: Fonts.semibold },
});
