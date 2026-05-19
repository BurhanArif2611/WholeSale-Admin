import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, Typography, Layout } from '@/constants/theme';

interface QuantitySelectorProps {
  value: number;
  onChange: (delta: number) => void;
  onRemove?: () => void;
  min?: number;
  compact?: boolean;
}

export function QuantitySelector({
  value,
  onChange,
  onRemove,
  min = 1,
  compact = false,
}: QuantitySelectorProps) {
  const handleDecrement = () => {
    if (value <= min && onRemove) {
      Alert.alert('Remove item', 'Remove this product from the order?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: onRemove },
      ]);
      return;
    }
    if (value > min) onChange(-1);
    else if (onRemove) onRemove();
  };

  return (
    <View style={[styles.wrap, compact && styles.wrapCompact]}>
      <TouchableOpacity
        style={[styles.btn, compact && styles.btnCompact]}
        onPress={handleDecrement}
        accessibilityLabel="Decrease quantity"
      >
        <Ionicons name="remove" size={compact ? 16 : 18} color={Colors.textPrimary} />
      </TouchableOpacity>
      <Text style={[styles.qty, compact && styles.qtyCompact]}>{value}</Text>
      <TouchableOpacity
        style={[styles.btn, compact && styles.btnCompact]}
        onPress={() => onChange(1)}
        accessibilityLabel="Increase quantity"
      >
        <Ionicons name="add" size={compact ? 16 : 18} color={Colors.textPrimary} />
      </TouchableOpacity>
      {onRemove && !compact && (
        <TouchableOpacity style={styles.removeBtn} onPress={onRemove} accessibilityLabel="Remove item">
          <Ionicons name="trash-outline" size={Layout.iconSize.sm} color={Colors.danger} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
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
  qty: {
    minWidth: 28,
    textAlign: 'center',
    fontSize: Typography.sm,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
  },
  qtyCompact: { minWidth: 22, fontSize: Typography.xs },
  removeBtn: { marginLeft: Spacing.xs, padding: Spacing.xs },
});
