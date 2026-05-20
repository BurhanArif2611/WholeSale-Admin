import React from 'react';
import { View, Text, StyleSheet, Pressable, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, formatCurrency, Typography } from '@/constants/theme';
import { formatQuantityDisplay } from '@/lib/common/utils/quantity';
import type { Product } from '@/lib/domain/models';

interface CompactProductRowProps {
  product: Product;
  cartQty: number;
  orderUnit?: string;
  onAdd: () => void;
  onIncrement: () => void;
  onDecrement: () => void;
  onOpenDetail: () => void;
}

export function CompactProductRow({
  product,
  cartQty,
  orderUnit,
  onAdd,
  onIncrement,
  onDecrement,
  onOpenDetail,
}: CompactProductRowProps) {
  const inCart = cartQty > 0;
  const lowStock = product.stock_quantity <= product.min_stock_alert;

  return (
    <Pressable
      style={[styles.row, inCart && styles.rowInCart]}
      onPress={inCart ? onOpenDetail : onAdd}
    >
      <View style={[styles.icon, lowStock && styles.iconLow]}>
        <Ionicons name="cube" size={18} color={inCart ? Colors.amber : Colors.textMuted} />
      </View>

      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {product.name}
        </Text>
        <View style={styles.metaRow}>
          <Text style={styles.price}>
            {formatCurrency(product.selling_price)}/{product.unit_type}
          </Text>
          <Text style={[styles.stock, lowStock && styles.stockLow]}>
            {product.stock_quantity} left
          </Text>
        </View>
      </View>

      {inCart ? (
        <View style={styles.qtyWrap}>
          <TouchableOpacity style={styles.qtyBtn} onPress={onDecrement} hitSlop={6}>
            <Ionicons name="remove" size={16} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Pressable style={styles.qtyVal} onPress={onOpenDetail}>
            <Text style={styles.qtyText}>
              {formatQuantityDisplay(cartQty)}
              {orderUnit ? ` ${orderUnit}` : ''}
            </Text>
          </Pressable>
          <TouchableOpacity style={styles.qtyBtn} onPress={onIncrement} hitSlop={6}>
            <Ionicons name="add" size={16} color={Colors.textPrimary} />
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={styles.addBtn} onPress={onAdd} hitSlop={4}>
          <Ionicons name="add" size={22} color={Colors.white} />
        </TouchableOpacity>
      )}
    </Pressable>
  );
}

const ROW_H = 58;

export const COMPACT_PRODUCT_ROW_HEIGHT = ROW_H;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    height: ROW_H,
    paddingHorizontal: Spacing.sm,
    backgroundColor: Colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.borderLight,
  },
  rowInCart: { backgroundColor: Colors.amberBg + '99' },
  icon: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  iconLow: { backgroundColor: Colors.dangerBg },
  info: { flex: 1, minWidth: 0, paddingRight: Spacing.xs },
  name: { fontSize: Typography.sm, fontWeight: Typography.bold, color: Colors.textPrimary },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: 2 },
  price: { fontSize: 11, fontWeight: Typography.semibold, color: Colors.amber },
  stock: { fontSize: 10, color: Colors.textMuted },
  stockLow: { color: Colors.danger, fontWeight: Typography.semibold },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.amber,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.amber + '66',
    paddingHorizontal: 2,
  },
  qtyBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyVal: { minWidth: 44, paddingHorizontal: 4, alignItems: 'center' },
  qtyText: { fontSize: 11, fontWeight: Typography.bold, color: Colors.amberDim },
});
