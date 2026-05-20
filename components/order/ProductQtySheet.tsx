import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { BottomSheet } from '@/lib/common/components/BottomSheet';
import { FlexibleQuantityInput } from '@/lib/common/components/FlexibleQuantityInput';
import { Button } from '@/components/ui';
import { Colors, Spacing, Radius, formatCurrency, Typography } from '@/constants/theme';
import { calculateLineTotal } from '@/lib/common/utils/pricing';
import type { CartLineInput } from '@/lib/common/utils/cart';
import type { Product } from '@/lib/domain/models';

const QUICK_WEIGHT = [0.25, 0.5, 1];

interface ProductQtySheetProps {
  visible: boolean;
  product: Product | null;
  line: CartLineInput | null;
  onClose: () => void;
  onApply: (lineId: string, quantity: number, orderUnit: CartLineInput['order_unit']) => void;
  onRemove: (lineId: string) => void;
  t: (key: string) => string;
}

export function ProductQtySheet({
  visible,
  product,
  line,
  onClose,
  onApply,
  onRemove,
  t,
}: ProductQtySheetProps) {
  const [qty, setQty] = useState(1);
  const [orderUnit, setOrderUnit] = useState<CartLineInput['order_unit']>('piece');

  useEffect(() => {
    if (line) {
      setQty(line.quantity);
      setOrderUnit(line.order_unit);
    } else if (product) {
      setQty(1);
      setOrderUnit(product.unit_type);
    }
  }, [line, product, visible]);

  if (!product || !line) return null;

  const priceUnit = product.unit_type;
  const showQuick = priceUnit === 'kg' || priceUnit === 'gram' || priceUnit === 'liter' || priceUnit === 'ml';
  const lineTotal = calculateLineTotal(
    line.unit_price,
    priceUnit,
    qty,
    orderUnit,
    line.discount_percent,
    line.tax_percent,
  ).total;

  return (
    <BottomSheet visible={visible} title={product.name} onClose={onClose}>
      <Text style={styles.price}>
        {formatCurrency(product.selling_price)} / {priceUnit}
      </Text>

      {showQuick ? (
        <View style={styles.quickRow}>
          {QUICK_WEIGHT.map((q) => (
            <Pressable
              key={q}
              style={[styles.quickChip, qty === q && orderUnit === priceUnit && styles.quickChipActive]}
              onPress={() => {
                setQty(q);
                setOrderUnit(priceUnit);
              }}
            >
              <Text style={[styles.quickText, qty === q && orderUnit === priceUnit && styles.quickTextActive]}>
                {q} {priceUnit}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <FlexibleQuantityInput
        quantity={qty}
        orderUnit={orderUnit}
        priceUnit={priceUnit}
        unitPrice={line.unit_price}
        lineTotal={lineTotal}
        onQuantityChange={setQty}
        onOrderUnitChange={setOrderUnit}
        autoFocusQty
      />

      <View style={styles.actions}>
        <Button
          label={t('apply') || 'Done'}
          onPress={() => {
            onApply(line.line_id, qty, orderUnit);
            onClose();
          }}
        />
        <Button
          label={t('remove') || 'Remove'}
          variant="ghost"
          onPress={() => {
            onRemove(line.line_id);
            onClose();
          }}
        />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  price: {
    fontSize: Typography.sm,
    fontWeight: Typography.bold,
    color: Colors.amber,
    marginBottom: Spacing.md,
  },
  quickRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md, flexWrap: 'wrap' },
  quickChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface2,
  },
  quickChipActive: { borderColor: Colors.amber, backgroundColor: Colors.amberBg },
  quickText: { fontSize: Typography.xs, fontWeight: Typography.semibold, color: Colors.textSecondary },
  quickTextActive: { color: Colors.amberDim },
  actions: { marginTop: Spacing.lg, gap: Spacing.sm },
});
