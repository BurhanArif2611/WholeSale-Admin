import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Pressable, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, formatCurrency, Layout, Fonts } from '@/constants/theme';
import { SearchBar, EmptyState } from '@/components/ui';
import { FAB } from '@/lib/common/components/FAB';
import { ListCard } from '@/lib/common/components/ListCard';
import { ShareReceiptSheet } from '@/components/receipt/ShareReceiptSheet';
import { useLanguage } from '@/hooks/useLanguage';
import { useDatabase } from '@/hooks/useDatabase';
import { useShopProfile } from '@/hooks/useShopProfile';
import { orderRepository } from '@/lib/data/repositories/orderRepository';
import { clientRepository } from '@/lib/data/repositories/clientRepository';
import { buildReceiptData, type ReceiptData } from '@/lib/receipt/receiptTypes';
import { appConfirm } from '@/lib/common/utils/appAlert';
import type { Order, PaymentStatus } from '@/lib/domain/models';

export default function OrdersScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const { isReady, refreshKey } = useDatabase();
  const { shop } = useShopProfile();
  const [orders, setOrders] = useState<Order[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<PaymentStatus | undefined>();
  const [loading, setLoading] = useState(true);
  const [shareReceipt, setShareReceipt] = useState<ReceiptData | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareBusy, setShareBusy] = useState(false);

  const filters: { label: string; value?: PaymentStatus }[] = [
    { label: t('all') },
    { label: t('pending'), value: 'pending' },
    { label: t('paid'), value: 'paid' },
    { label: t('partial'), value: 'partial' },
  ];

  const load = useCallback(async () => {
    if (!isReady) return;
    setLoading(true);
    const data = await orderRepository.findAll({ search, paymentStatus: filter });
    setOrders(data);
    setLoading(false);
  }, [isReady, search, filter, refreshKey]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleQuickShare = async (item: Order) => {
    setShareBusy(true);
    try {
      const orderItems = await orderRepository.getItems(item.id);
      const client = await clientRepository.findById(item.client_id);
      setShareReceipt(buildReceiptData(item, orderItems, client, shop));
      setShareOpen(true);
    } catch (e) {
      Alert.alert(t('error'), (e as Error).message);
    } finally {
      setShareBusy(false);
    }
  };

  const handleCancel = async (item: Order) => {
    const yes = await appConfirm(t('settings_cancel_order'), t('settings_cancel_order_msg'));
    if (!yes) return;
    await orderRepository.cancel(item.id);
    await load();
  };

  return (
    <View style={styles.container}>
      <View style={styles.toolbar}>
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder={t('search_orders')}
          accessibilityLabel={t('search_orders')}
        />
      </View>
      <View style={styles.filters}>
        {filters.map((f) => (
          <TouchableOpacity
            key={f.label}
            style={[styles.chip, filter === f.value && styles.chipActive]}
            onPress={() => setFilter(f.value)}
          >
            <Text style={[styles.chipText, filter === f.value && styles.chipTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshing={loading}
        onRefresh={load}
        ListEmptyComponent={<EmptyState icon="receipt-outline" message={t('no_orders')} />}
        renderItem={({ item }) => (
          <View>
            <ListCard
              title={item.client_name}
              meta={`${new Date(item.created_at).toLocaleDateString()} · ${item.status}`}
              rightText={formatCurrency(item.grand_total)}
              rightSubtext={item.payment_status}
              icon="receipt-outline"
              iconColor={item.payment_status === 'paid' ? Colors.success : Colors.amber}
              iconBg={item.payment_status === 'paid' ? Colors.successBg : Colors.amberBg}
              accentColor={item.payment_status === 'paid' ? Colors.success : Colors.amber}
              onPress={() => router.push(`/orders/${item.id}`)}
              trailing={
                <View style={styles.quickActions}>
                  <Pressable
                    style={styles.quickBtn}
                    onPress={() => void handleQuickShare(item)}
                    disabled={shareBusy}
                    hitSlop={8}
                  >
                    <Ionicons name="share-social-outline" size={18} color={Colors.amber} />
                  </Pressable>
                  <Pressable
                    style={styles.quickBtn}
                    onPress={() => router.push(`/orders/${item.id}`)}
                    hitSlop={8}
                  >
                    <Ionicons name="document-text-outline" size={18} color={Colors.info} />
                  </Pressable>
                </View>
              }
            />
            {item.status !== 'cancelled' && (
              <Pressable style={styles.cancelLink} onPress={() => void handleCancel(item)}>
                <Text style={styles.cancel}>{t('settings_cancel_order')}</Text>
              </Pressable>
            )}
          </View>
        )}
      />
      <ShareReceiptSheet
        visible={shareOpen}
        data={shareReceipt}
        onClose={() => {
          setShareOpen(false);
          setShareReceipt(null);
        }}
        t={t}
      />
      <FAB onPress={() => router.push('/orders/new')} icon="cart" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  toolbar: { paddingHorizontal: Layout.screenPaddingH, paddingTop: Spacing.md, paddingBottom: Spacing.sm },
  filters: { flexDirection: 'row', paddingHorizontal: Layout.screenPaddingH, gap: 8, marginBottom: Spacing.sm },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.full, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  chipActive: { backgroundColor: Colors.amber, borderColor: Colors.amber },
  chipText: { fontSize: 12, fontFamily: Fonts.semibold, color: Colors.textSecondary },
  chipTextActive: { color: Colors.white },
  list: { paddingHorizontal: Layout.screenPaddingH, paddingBottom: Layout.screenPaddingBottom },
  cancelLink: { marginTop: -6, marginBottom: Spacing.sm, alignSelf: 'flex-end', paddingRight: Spacing.sm },
  cancel: { fontSize: 11, color: Colors.danger, fontFamily: Fonts.bold },
  quickActions: { flexDirection: 'row', gap: 4, marginLeft: Spacing.xs },
  quickBtn: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
});
