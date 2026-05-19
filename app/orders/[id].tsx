import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { ScreenLayout } from '@/lib/common/components/ScreenLayout';
import { Colors, Spacing, Radius, formatCurrency, Typography } from '@/constants/theme';
import { useLanguage } from '@/hooks/useLanguage';
import { orderRepository } from '@/lib/data/repositories/orderRepository';
import type { Order, OrderItem } from '@/lib/domain/models';

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useLanguage();
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const o = await orderRepository.findById(id);
    setOrder(o);
    if (o) setItems(await orderRepository.getItems(id));
    setLoading(false);
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <ScreenLayout
      title={t('order_details_title')}
      scroll
      loading={loading && !order}
      onRefresh={load}
    >
      {order && (
        <>
          <Text style={styles.client}>{order.client_name}</Text>
          <Text style={styles.meta}>{new Date(order.created_at).toLocaleString()}</Text>
          <View style={styles.badgeRow}>
            <Badge label={order.status} />
            <Badge label={order.payment_status} color={order.payment_status === 'paid' ? Colors.success : Colors.amber} />
          </View>

          <Text style={styles.section}>{t('items_label')}</Text>
          {items.map((item) => (
            <View key={item.id} style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>{item.product_name}</Text>
                <Text style={styles.muted}>{item.quantity} {item.unit_type} × {formatCurrency(item.unit_price)}</Text>
              </View>
              <Text style={styles.amt}>{formatCurrency(item.line_total)}</Text>
            </View>
          ))}

          <View style={styles.summary}>
            <Line label={t('subtotal_label')} value={formatCurrency(order.subtotal)} />
            {order.discount_total > 0 ? (
              <Line label={t('order_product_discount')} value={`−${formatCurrency(order.discount_total)}`} />
            ) : null}
            <Line label="Tax" value={formatCurrency(order.tax_total)} />
            {order.order_discount_amount > 0 ? (
              <Line
                label={t('order_client_discount')}
                value={`−${formatCurrency(order.order_discount_amount)}`}
              />
            ) : null}
            <Line label={t('grand_total_label')} value={formatCurrency(order.grand_total)} bold />
            <Line label="Paid" value={formatCurrency(order.paid_amount)} />
            <Line label="Remaining" value={formatCurrency(order.remaining_amount)} color={Colors.danger} />
          </View>
          {order.notes ? <Text style={styles.notes}>Notes: {order.notes}</Text> : null}
        </>
      )}
    </ScreenLayout>
  );
}

function Badge({ label, color }: { label: string; color?: string }) {
  return (
    <View style={[styles.badge, color ? { backgroundColor: color + '22' } : null]}>
      <Text style={[styles.badgeText, color ? { color } : null]}>{label}</Text>
    </View>
  );
}

function Line({ label, value, bold, color }: { label: string; value: string; bold?: boolean; color?: string }) {
  return (
    <View style={styles.line}>
      <Text style={styles.lineLabel}>{label}</Text>
      <Text style={[styles.lineValue, bold && { fontWeight: Typography.black }, color ? { color } : null]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  client: { fontSize: Typography.lg, fontWeight: Typography.black, color: Colors.textPrimary },
  meta: { fontSize: Typography.sm, color: Colors.textMuted, marginTop: 4, marginBottom: Spacing.md },
  badgeRow: { flexDirection: 'row', gap: 8, marginBottom: Spacing.lg },
  badge: { backgroundColor: Colors.surface2, paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.full },
  badgeText: { fontSize: Typography.xs, fontWeight: Typography.bold, color: Colors.textSecondary, textTransform: 'capitalize' },
  section: {
    fontSize: Typography.sm,
    fontWeight: Typography.bold,
    marginBottom: Spacing.sm,
    color: Colors.textPrimary,
  },
  row: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: Radius.md,
    marginBottom: Spacing.sm,
    alignItems: 'center',
  },
  itemName: { fontWeight: Typography.bold, color: Colors.textPrimary },
  muted: { fontSize: Typography.xs, color: Colors.textMuted, marginTop: 2 },
  amt: { fontWeight: Typography.bold, color: Colors.amber },
  summary: {
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    marginTop: Spacing.md,
  },
  line: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  lineLabel: { color: Colors.textSecondary, fontSize: Typography.sm },
  lineValue: { fontWeight: Typography.semibold, color: Colors.textPrimary },
  notes: { marginTop: Spacing.md, color: Colors.textMuted, fontStyle: 'italic', fontSize: Typography.sm },
});
