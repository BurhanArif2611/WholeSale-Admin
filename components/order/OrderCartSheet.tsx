import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BottomSheet } from '@/lib/common/components/BottomSheet';
import { Colors, Spacing, Radius, formatCurrency, Typography } from '@/constants/theme';
import { formatQuantityDisplay, unitLabel } from '@/lib/common/utils/quantity';
import type { CartLineInput } from '@/lib/common/utils/cart';

interface OrderCartSheetProps {
  visible: boolean;
  cart: CartLineInput[];
  itemsTotal: number;
  onClose: () => void;
  onEditLine: (line: CartLineInput) => void;
  onRemoveLine: (lineId: string) => void;
  onCheckout: () => void;
  t: (key: string) => string;
}

export function OrderCartSheet({
  visible,
  cart,
  itemsTotal,
  onClose,
  onEditLine,
  onRemoveLine,
  onCheckout,
  t,
}: OrderCartSheetProps) {
  return (
    <BottomSheet
      visible={visible}
      title={`${t('cart_title') || 'Cart'} (${cart.length})`}
      onClose={onClose}
      footer={
        <TouchableOpacity style={styles.checkoutBtn} onPress={onCheckout} disabled={cart.length === 0}>
          <Text style={styles.checkoutText}>
            {t('checkout') || 'Checkout'} · {formatCurrency(itemsTotal)}
          </Text>
          <Ionicons name="arrow-forward" size={20} color={Colors.white} />
        </TouchableOpacity>
      }
    >
      {cart.length === 0 ? (
        <Text style={styles.empty}>{t('cart_empty') || 'No items yet'}</Text>
      ) : (
        <FlatList
          data={cart}
          keyExtractor={(item) => item.line_id}
          scrollEnabled={false}
          renderItem={({ item }) => (
            <View style={styles.line}>
              <TouchableOpacity style={styles.lineBody} onPress={() => onEditLine(item)}>
                <Text style={styles.lineName} numberOfLines={1}>
                  {item.product_name}
                  {item.is_temporary ? <Text style={styles.temp}> Temp</Text> : null}
                </Text>
                <Text style={styles.lineMeta}>
                  {formatQuantityDisplay(item.quantity)} {unitLabel(item.order_unit)} ×{' '}
                  {formatCurrency(item.unit_price)}
                </Text>
              </TouchableOpacity>
              <Text style={styles.lineTotal}>{formatCurrency(item.line_total)}</Text>
              <TouchableOpacity onPress={() => onRemoveLine(item.line_id)} hitSlop={8}>
                <Ionicons name="trash-outline" size={18} color={Colors.danger} />
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  empty: { textAlign: 'center', color: Colors.textMuted, padding: Spacing.xl },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.borderLight,
    gap: Spacing.sm,
  },
  lineBody: { flex: 1 },
  lineName: { fontSize: Typography.sm, fontWeight: Typography.bold, color: Colors.textPrimary },
  temp: { color: Colors.info, fontSize: Typography.xs },
  lineMeta: { fontSize: Typography.xs, color: Colors.textMuted, marginTop: 2 },
  lineTotal: { fontSize: Typography.sm, fontWeight: Typography.bold, color: Colors.amber },
  checkoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.amber,
    paddingVertical: 14,
    borderRadius: Radius.full,
  },
  checkoutText: { color: Colors.white, fontSize: Typography.sm, fontWeight: Typography.black },
});
