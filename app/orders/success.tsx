import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ScreenLayout } from '@/lib/common/components/ScreenLayout';
import { ReceiptPreviewCard } from '@/components/receipt/ReceiptPreviewCard';
import { ShareReceiptSheet } from '@/components/receipt/ShareReceiptSheet';
import { Colors, Spacing, Radius, Shadow, Gradients, formatCurrency, Typography } from '@/constants/theme';
import { useLanguage } from '@/hooks/useLanguage';
import { useShopProfile } from '@/hooks/useShopProfile';
import { orderRepository } from '@/lib/data/repositories/orderRepository';
import { clientRepository } from '@/lib/data/repositories/clientRepository';
import { buildReceiptData, type ReceiptData } from '@/lib/receipt/receiptTypes';
import { getLastSharedAt, formatLastShared } from '@/lib/receipt/receiptService';
import type { Order, OrderItem } from '@/lib/domain/models';

export default function OrderSuccessScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useLanguage();
  const { shop } = useShopProfile();
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [loading, setLoading] = useState(true);
  const [shareOpen, setShareOpen] = useState(false);
  const [lastShared, setLastShared] = useState<string | null>(null);
  const scaleAnim = useState(() => new Animated.Value(0))[0];

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

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 6,
      tension: 80,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  const statusColor =
    order?.payment_status === 'paid'
      ? Colors.success
      : order?.payment_status === 'partial'
        ? Colors.amber
        : Colors.danger;

  return (
    <ScreenLayout
      title={t('order_success_title') || 'Order Confirmed'}
      showBack={false}
      scroll
      loading={loading && !order}
      footer={
        receipt ? (
          <View style={styles.footer}>
            <Pressable onPress={() => setShareOpen(true)} style={styles.sharePrimary}>
              <LinearGradient colors={Gradients.amber} style={styles.shareGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <Ionicons name="share-social" size={22} color={Colors.white} />
                <Text style={styles.sharePrimaryText}>{t('share_receipt') || 'Share Receipt'}</Text>
              </LinearGradient>
            </Pressable>
            <View style={styles.footerRow}>
              <FooterBtn
                icon="document-outline"
                label={t('view_order') || 'View Order'}
                onPress={() => router.replace(`/orders/${id}`)}
              />
              <FooterBtn icon="home-outline" label={t('back_home') || 'Home'} onPress={() => router.replace('/(tabs)')} />
            </View>
          </View>
        ) : undefined
      }
    >
      {order && receipt && (
        <>
          <Animated.View style={[styles.successHero, { transform: [{ scale: scaleAnim }] }]}>
            <LinearGradient colors={Gradients.success} style={styles.successCircle}>
              <Ionicons name="checkmark" size={48} color={Colors.white} />
            </LinearGradient>
            <Text style={styles.successTitle}>{t('order_placed_msg') || 'Order placed successfully!'}</Text>
            <Text style={styles.invoiceNo}>Invoice #{receipt.invoiceNo}</Text>
          </Animated.View>

          <View style={styles.statsRow}>
            <StatChip label="Customer" value={order.client_name} icon="person" />
            <StatChip label="Total" value={formatCurrency(order.grand_total)} icon="cash" highlight />
            <StatChip label="Payment" value={order.payment_status} icon="card" color={statusColor} />
          </View>

          {lastShared ? <Text style={styles.lastShared}>Last shared: {lastShared}</Text> : null}

          <Text style={styles.previewLabel}>{t('receipt_preview') || 'Receipt Preview'}</Text>
          <ReceiptPreviewCard data={receipt} compact={receipt.items.length > 5} />

          <Pressable style={styles.previewBtn} onPress={() => setShareOpen(true)}>
            <Ionicons name="expand-outline" size={18} color={Colors.amber} />
            <Text style={styles.previewBtnText}>{t('tap_to_share') || 'Tap to share or download'}</Text>
          </Pressable>
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

function StatChip({
  label,
  value,
  icon,
  highlight,
  color,
}: {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  highlight?: boolean;
  color?: string;
}) {
  return (
    <View style={[chipStyles.chip, highlight && chipStyles.chipHighlight]}>
      <Ionicons name={icon} size={16} color={color ?? Colors.amber} />
      <Text style={chipStyles.label}>{label}</Text>
      <Text style={[chipStyles.value, color ? { color } : null]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function FooterBtn({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.footerBtn} onPress={onPress}>
      <Ionicons name={icon} size={20} color={Colors.textSecondary} />
      <Text style={styles.footerBtnText}>{label}</Text>
    </Pressable>
  );
}

const chipStyles = StyleSheet.create({
  chip: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadow.sm,
  },
  chipHighlight: { borderColor: Colors.amber + '66', backgroundColor: Colors.amberBg },
  label: { fontSize: 10, color: Colors.textMuted, marginTop: 4, fontWeight: Typography.semibold },
  value: { fontSize: Typography.xs, fontWeight: Typography.bold, color: Colors.textPrimary, marginTop: 2, textAlign: 'center' },
});

const styles = StyleSheet.create({
  successHero: { alignItems: 'center', paddingVertical: Spacing.xl },
  successCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
    ...Shadow.md,
  },
  successTitle: {
    fontSize: Typography.md,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  invoiceNo: { fontSize: Typography.sm, color: Colors.textMuted, marginTop: 4, fontWeight: Typography.semibold },
  statsRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  lastShared: { fontSize: Typography.xs, color: Colors.textMuted, textAlign: 'center', marginBottom: Spacing.sm },
  previewLabel: {
    fontSize: Typography.sm,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  previewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    padding: Spacing.md,
  },
  previewBtnText: { fontSize: Typography.sm, color: Colors.amber, fontWeight: Typography.semibold },
  footer: {
    padding: Spacing.lg,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    ...Shadow.md,
  },
  sharePrimary: { borderRadius: Radius.full, overflow: 'hidden', marginBottom: Spacing.md, ...Shadow.amber },
  shareGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: 16,
  },
  sharePrimaryText: { color: Colors.white, fontSize: Typography.md, fontWeight: Typography.black },
  footerRow: { flexDirection: 'row', justifyContent: 'space-around' },
  footerBtn: { alignItems: 'center', padding: Spacing.sm },
  footerBtnText: { fontSize: 11, color: Colors.textMuted, marginTop: 4, fontWeight: Typography.semibold },
});
