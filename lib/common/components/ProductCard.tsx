import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, Spacing, Radius, Shadow, formatCurrency, Typography } from '@/constants/theme';
import { QuantitySelector } from '@/lib/common/components/QuantitySelector';
import { CategoryBadge } from '@/lib/common/components/CategoryBadge';
import type { Product } from '@/lib/domain/models';

interface ProductCardProps {
  product: Product;
  onPress?: () => void;
  lowStock?: boolean;
  cartQty?: number;
  onAdd?: () => void;
  onQtyChange?: (delta: number) => void;
  onRemove?: () => void;
  rightElement?: React.ReactNode;
}

export function ProductCard({
  product,
  onPress,
  lowStock,
  cartQty = 0,
  onAdd,
  onQtyChange,
  onRemove,
  rightElement,
}: ProductCardProps) {
  const inCart = cartQty > 0;

  return (
    <TouchableOpacity
      style={[styles.card, lowStock && styles.cardLow, inCart && styles.cardInCart]}
      onPress={onPress}
      activeOpacity={onPress ? 0.85 : 1}
      disabled={!onPress}
    >
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={2}>{product.name}</Text>
        <View style={styles.badgeRow}>
          <CategoryBadge name={product.category} compact />
        </View>
        {product.sku ? <Text style={styles.meta}>SKU: {product.sku}</Text> : null}
        <Text style={styles.price}>
          {formatCurrency(product.selling_price)} / {product.unit_type}
        </Text>
        <Text style={[styles.stock, lowStock && { color: Colors.danger }]}>
          Stock: {product.stock_quantity}
        </Text>
      </View>
      <View style={styles.actions}>
        {rightElement}
        {inCart && onQtyChange ? (
          <QuantitySelector
            value={cartQty}
            onChange={onQtyChange}
            onRemove={onRemove}
            compact
          />
        ) : onAdd ? (
          <TouchableOpacity style={styles.addBtn} onPress={onAdd}>
            <Text style={styles.addText}>Add</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadow.sm,
  },
  cardLow: { borderColor: Colors.danger + '44' },
  cardInCart: { borderColor: Colors.amber, borderWidth: 2 },
  body: { flex: 1, paddingRight: Spacing.sm },
  name: { fontSize: Typography.sm, fontWeight: Typography.bold, color: Colors.textPrimary },
  badgeRow: { marginTop: 4, marginBottom: 2 },
  meta: { fontSize: Typography.xs, color: Colors.textMuted, marginTop: 2 },
  price: { fontSize: Typography.xs, color: Colors.amber, fontWeight: Typography.bold, marginTop: 4 },
  stock: { fontSize: Typography.xs, fontWeight: Typography.semibold, color: Colors.textSecondary, marginTop: 2 },
  actions: { justifyContent: 'center', alignItems: 'flex-end', gap: Spacing.xs },
  addBtn: {
    backgroundColor: Colors.amber,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
  },
  addText: { color: Colors.white, fontWeight: Typography.bold, fontSize: Typography.xs },
});
