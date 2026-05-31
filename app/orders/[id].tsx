import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ScreenLayout } from '@/lib/common/components/ScreenLayout';
import { ReceiptPreviewCard } from '@/components/receipt/ReceiptPreviewCard';
import { ShareReceiptSheet } from '@/components/receipt/ShareReceiptSheet';
import { Colors, Spacing, Radius, Shadow, Gradients, formatCurrency, Typography, Layout, Fonts } from '@/constants/theme';
import { useLanguage } from '@/hooks/useLanguage';
import { useShopProfile } from '@/hooks/useShopProfile';
import { orderRepository } from '@/lib/data/repositories/orderRepository';
import { clientRepository } from '@/lib/data/repositories/clientRepository';
import { buildReceiptData, type ReceiptData } from '@/lib/receipt/receiptTypes';
import { getLastSharedAt, formatLastShared } from '@/lib/receipt/receiptService';
import type { Order, OrderItem } from '@/lib/domain/models';

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useLanguage();
  const { shop } = useShopProfile();
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [loading, setLoading] = useState(true);
  const [shareOpen, setShareOpen] = useState(false);
  const [lastShared, setLastShared] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const o = await orderRepository.findById(id);
    setOrder(o);
    if (o) {
      const orderItems = await orderRepository.getItems(id);
      setItems(orderItems);
      const client = await clientRepository.findById(o.client_id);
      setReceipt(buildReceiptData(o, orderItems, client, shop));
      setLastShared(formatLastShared(await getLastSharedAt(id)));
    }
    setLoading(false);
  }, [id, shop]);

  useEffect(() => {
    void load();
  }, [load]);

  const headerActions = receipt ? (
    <View style={styles.headerActions}>
      <IconBtn icon="share-social-outline" onPress={() => setShareOpen(true)} />
      <IconBtn icon="document-outline" onPress={() => setShareOpen(true)} />
    </View>
  ) : null;

  return (
    <ScreenLayout
      title={t('order_details_title')}
      scroll
      loading={loading && !order}
      onRefresh={load}
      rightElement={headerActions}
      footer={
        receipt ? (
          <View style={styles.footer}>
            <Pressable onPress={() => setShareOpen(true)} style={styles.shareBtn}>
              <LinearGradient colors={Gradients.amber} style={styles.shareGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <Ionicons name="share-social" size={20} color={Colors.white} />
                <Text style={styles.shareText}>{t('share_receipt') || 'Share Receipt'}</Text>
              </LinearGradient>
            </Pressable>
          </View>
        ) : undefined
      }
    >
      {order && receipt && (
        <>
          <View style={styles.topCard}>
            <Text style={styles.client}>{order.client_name}</Text>
            <Text style={styles.meta}>{new Date(order.created_at).toLocaleString()}</Text>
            <Text style={styles.invoiceId}>#{receipt.invoiceNo}</Text>
            <View style={styles.badgeRow}>
              <Badge label={order.status} />
              <Badge
                label={order.payment_status}
                color={order.payment_status === 'paid' ? Colors.success : Colors.amber}
              />
            </View>
            {lastShared ? <Text style={styles.lastShared}>Last shared: {lastShared}</Text> : null}
          </View>

          <Text style={styles.section}>{t('receipt_preview') || 'Receipt'}</Text>
          <ReceiptPreviewCard data={receipt} />

          <Text style={[styles.section, { marginTop: Spacing.lg }]}>{t('items_label')}</Text>
          {items.map((item) => (
            <View key={item.id} style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>
                  {item.product_name}
                  {!item.product_id ? <Text style={styles.temp}> (Temp)</Text> : null}
                </Text>
                <Text style={styles.muted}>
                  {item.quantity} {item.unit_type} × {formatCurrency(item.unit_price)}
                </Text>
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
              <Line label={t('order_client_discount')} value={`−${formatCurrency(order.order_discount_amount)}`} />
            ) : null}
            <Line label={t('grand_total_label')} value={formatCurrency(order.grand_total)} bold />
            <Line label="Paid" value={formatCurrency(order.paid_amount)} />
            <Line label="Remaining" value={formatCurrency(order.remaining_amount)} color={Colors.danger} />
          </View>
          {order.notes ? <Text style={styles.notes}>Notes: {order.notes}</Text> : null}
        </>
      )}

      <ShareReceiptSheet
        visible={shareOpen}
        data={receipt}
        onClose={() => {
          setShareOpen(false);
          void load();
        }}
        t={t}
      />
    </ScreenLayout>
  );
}

function IconBtn({ icon, onPress }: { icon: keyof typeof Ionicons.glyphMap; onPress: () => void }) {
  return (
    <Pressable style={styles.iconBtn} onPress={onPress} hitSlop={8}>
      <Ionicons name={icon} size={22} color={Colors.amber} />
    </Pressable>
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
      <Text style={[styles.lineValue, bold && { fontFamily: Fonts.bold }, color ? { color } : null]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  headerActions: { flexDirection: 'row', gap: Spacing.sm },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.amberBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topCard: {
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
    borderRadius: Radius.xl,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadow.sm,
  },
  client: { fontSize: Typography.lg, fontFamily: Fonts.bold, color: Colors.textPrimary },
  meta: { fontSize: Typography.sm, color: Colors.textMuted, marginTop: 4 },
  invoiceId: { fontSize: Typography.xs, color: Colors.amber, fontFamily: Fonts.bold, marginTop: 4 },
  badgeRow: { flexDirection: 'row', gap: 8, marginTop: Spacing.md },
  badge: { backgroundColor: Colors.surface2, paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.full },
  badgeText: { fontSize: Typography.xs, fontFamily: Fonts.bold, color: Colors.textSecondary, textTransform: 'capitalize' },
  lastShared: { fontSize: Typography.xs, color: Colors.textMuted, marginTop: Spacing.sm },
  section: {
    fontSize: Typography.sm,
    fontFamily: Fonts.bold,
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
  itemName: { fontFamily: Fonts.bold, color: Colors.textPrimary },
  temp: { color: Colors.info, fontSize: Typography.xs },
  muted: { fontSize: Typography.xs, color: Colors.textMuted, marginTop: 2 },
  amt: { fontFamily: Fonts.bold, color: Colors.amber },
  summary: {
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    marginTop: Spacing.md,
  },
  line: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  lineLabel: { color: Colors.textSecondary, fontSize: Typography.sm },
  lineValue: { fontFamily: Fonts.semibold, color: Colors.textPrimary },
  notes: { marginTop: Spacing.md, color: Colors.textMuted, fontStyle: 'italic', fontSize: Typography.sm },
  footer: {
    padding: Layout.screenPaddingH,
    paddingVertical: Spacing.lg,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  shareBtn: { borderRadius: Radius.full, overflow: 'hidden', ...Shadow.amber },
  shareGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: 14,
  },
  shareText: { color: Colors.white, fontFamily: Fonts.bold, fontSize: Typography.sm },
});
