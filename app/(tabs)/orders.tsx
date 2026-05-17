// app/(tabs)/orders.tsx
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl, Alert, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useRefreshOnFocus } from '@/hooks/useRefreshOnFocus';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius, Shadow, Gradients, STATUS_CONFIG, formatCurrency, formatDate } from '@/constants/theme';

import { updateOrderStatus, deleteOrder, deleteAllOrders } from '@/lib/api';
import { useDataStore } from '@/hooks/useDataStore';
import { useAuth } from '@/hooks/useAuth';
import { StatusBadge, SearchBar, EmptyState, ListSkeleton } from '@/components/ui';
import OrderDetailsSheet from '@/components/OrderDetailsSheet';
import { useLanguage } from '@/hooks/useLanguage';
import { printToFileAsync } from 'expo-print';
import * as Sharing from 'expo-sharing';
import { generateInvoiceHtml } from '@/lib/invoiceTemplate';
import type { Order, OrderStatus } from '@/types';

const FILTERS: Array<OrderStatus | 'All'> = ['All', 'New', 'Unpaid', 'Paid'];
const QUICK_STATUSES: OrderStatus[] = ['New', 'Unpaid', 'Paid'];

/**
 * OrderItem - Memoized list component for performance.
 * Prevents re-rendering of the entire list when search text or filters change.
 */
const OrderItem = React.memo(({ item, onPress, onStatusChange, onPrint, t, tData }: { 
    item: Order; 
    onPress: (o: Order) => void; 
    onStatusChange: (id: string, s: OrderStatus) => void;
    onPrint: (o: Order) => void;
    t: any;
    tData: any;
}) => {
    return (
        <TouchableOpacity onPress={() => onPress(item)} activeOpacity={0.8} style={styles.card}>
          <LinearGradient colors={Gradients.card} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={[StyleSheet.absoluteFill, { borderRadius: Radius.lg }]} />
    
          <View style={styles.cardTop}>
            <View style={styles.storeAvatar}>
              <Text style={styles.storeAvatarText}>{tData(item.stores?.name ?? '?').charAt(0)}</Text>
            </View>
            <View style={{ flex: 1, paddingRight: Spacing.sm }}>
              <Text style={styles.storeName}>{tData(item.stores?.name ?? '—')}</Text>
              <View style={styles.metaRow}>
                <Ionicons name="location-outline" size={13} color={Colors.textMuted} />
                <Text style={styles.metaText} numberOfLines={1}>{item.stores?.area ?? '—'}</Text>
                <Ionicons name="calendar-outline" size={13} color={Colors.textMuted} style={{ marginLeft: 6 }} />
                <Text style={styles.metaText}>{formatDate(item.date)}</Text>
              </View>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 4, minWidth: 80 }}>
              <StatusBadge status={item.status} />
              <Text style={styles.total}>{formatCurrency(item.grand_total)}</Text>
            </View>
          </View>
    
          <View style={styles.statusRow}>
            {QUICK_STATUSES.map((s) => {
              const active = item.status === s;
              const cfg = STATUS_CONFIG[s];
              return (
                <TouchableOpacity 
                  key={s} 
                  onPress={() => onStatusChange(item.id, s)} 
                  activeOpacity={0.7}
                  disabled={active}
                  style={[
                    styles.statusChip, 
                    active ? { backgroundColor: cfg.color, borderColor: cfg.color } : { borderColor: Colors.border }
                  ]}>
                  <Ionicons name={cfg.icon as any} size={14} color={active ? Colors.white : Colors.textMuted} />
                  <Text style={[styles.statusChipText, { color: active ? Colors.white : Colors.textMuted }]}>
                    {t(s.toLowerCase() + '_status').toUpperCase()}
                  </Text>
                </TouchableOpacity>
              );
            })}
            {/* Print / Invoice Button */}
            <TouchableOpacity
              onPress={(e) => { e.stopPropagation?.(); onPrint(item); }}
              activeOpacity={0.7}
              style={styles.printBtn}
            >
              <Ionicons name="print-outline" size={18} color={Colors.info} />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
    );
});

export default function OrdersScreen() {
  const { t, tData } = useLanguage();
  const router = useRouter();
  const { profile } = useAuth();
  
  const ownerId = profile?.role === 'owner' ? profile?.id : profile?.owner_id;
  const { orders: allOrders, loading, refresh } = useDataStore(ownerId);
  
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch]     = useState('');
  const [filter, setFilter]     = useState<OrderStatus | 'All'>('All');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useRefreshOnFocus(() => {
    void refresh();
  });

  const onManualRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh(true);
    setRefreshing(false);
  }, [refresh]);

  const filtered = useMemo(() => {
    return allOrders.filter((o) => {
        const storeName = tData(o.stores?.name ?? '').toLowerCase();
        const matchesSearch = !search || storeName.includes(search.toLowerCase());
        const matchesFilter = filter === 'All' || o.status === filter;
        return matchesSearch && matchesFilter;
    });
  }, [allOrders, search, filter, tData]);

  const handleStatus = useCallback(async (orderId: string, status: OrderStatus) => {
    try {
      // Optimistic update for UI feel
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(prev => prev ? { ...prev, status } : null);
      }
      
      await updateOrderStatus(orderId, status); 
      void refresh(); // Background sync
    } catch (e) {
      Alert.alert(t('error'), (e as Error).message);
    }
  }, [refresh, selectedOrder, t]);

  const handleDelete = useCallback(async (orderId: string) => {
    Alert.alert(t('delete_order_title'), t('delete_order_msg'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('delete'), style: 'destructive', onPress: async () => {
        try { 
          await deleteOrder(orderId); 
          setSelectedOrder(null);
          void refresh(); 
        }
        catch (e) { Alert.alert(t('error'), (e as Error).message); }
      }},
    ]);
  }, [refresh, t]);

  const handleDeleteAll = useCallback(async () => {
    Alert.alert(
      "Delete All Orders", 
      "Are you sure you want to delete ALL orders? This action cannot be undone and will give you a clean start.", 
      [
        { text: t('cancel'), style: 'cancel' },
        { 
          text: t('delete'), 
          style: 'destructive', 
          onPress: async () => {
             if (!ownerId) return;
             try { 
               await deleteAllOrders(ownerId); 
               setSelectedOrder(null);
               void refresh(); 
             }
             catch (e) { Alert.alert(t('error'), (e as Error).message); }
          }
        },
      ]
    );
  }, [refresh, ownerId, t]);

  const handlePrint = useCallback(async (order: Order) => {
    try {
      const html = generateInvoiceHtml(order, profile?.full_name ?? undefined);
      // Step 1: Generate the PDF file silently
      const { uri } = await printToFileAsync({ html, base64: false });
      // Step 2: Open Android's share/open drawer - user can view, share, or save
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Invoice PDF',
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert(t('error'), 'Sharing is not available on this device.');
      }
    } catch (e) {
      Alert.alert(t('error'), (e as Error).message);
    }
  }, [profile, t]);

  const renderItem = useCallback(({ item }: { item: Order }) => (
      <OrderItem 
        item={item} 
        onPress={setSelectedOrder} 
        onStatusChange={handleStatus} 
        onPrint={handlePrint}
        t={t} 
        tData={tData} 
      />
  ), [handleStatus, handlePrint, t, tData]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <SearchBar value={search} onChangeText={setSearch} placeholder={t('search_orders_placeholder')} />
        <View style={styles.filterRow}>
          {FILTERS.map((f) => {
            const active = filter === f;
            return (
              <TouchableOpacity key={f} onPress={() => setFilter(f)} activeOpacity={0.7}
                style={[styles.filterChip, { flex: 1 }, active && styles.filterChipActive]}>
                {active && <LinearGradient colors={Gradients.amber} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={[StyleSheet.absoluteFill, { borderRadius: Radius.full }]} />}
                <Text style={[styles.filterText, active && styles.filterTextActive]} numberOfLines={1} adjustsFontSizeToFit>{t(f.toLowerCase() + '_filter')}</Text>
              </TouchableOpacity>
            );
          })}
          
          <TouchableOpacity onPress={handleDeleteAll} activeOpacity={0.7} 
            style={[styles.filterChip, { width: 44, borderColor: Colors.danger + '40', backgroundColor: Colors.white, paddingHorizontal: 0 }]}>
            <Ionicons name="trash-outline" size={16} color={Colors.danger} />
          </TouchableOpacity>
        </View>
      </View>

      {loading && allOrders.length === 0 ? <ListSkeleton /> : (
        <FlatList
          data={filtered}
          keyExtractor={(i) => i.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onManualRefresh} tintColor={Colors.amber} />}
          ListEmptyComponent={<EmptyState icon="receipt-outline" message={t('no_orders')} />}
          showsVerticalScrollIndicator={false}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={5}
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={() => router.push('/orders/new')} activeOpacity={0.85}>
        <LinearGradient colors={Gradients.amber} style={styles.fabGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <Ionicons name="add" size={36} color={Colors.black} />
        </LinearGradient>
      </TouchableOpacity>

      <OrderDetailsSheet 
        visible={!!selectedOrder}
        order={selectedOrder}
        onClose={() => setSelectedOrder(null)}
        onUpdateStatus={async (status: OrderStatus) => {
            if (selectedOrder) handleStatus(selectedOrder.id, status);
        }}
        onDelete={() => {
            if (selectedOrder) handleDelete(selectedOrder.id);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header:    { paddingHorizontal: Spacing.xl, paddingTop: Spacing.lg },

  filterRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.lg, gap: 6 },
  filterChip: {
    paddingHorizontal: 4, paddingVertical: 10,
    borderRadius: Radius.full, overflow: 'hidden',
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    justifyContent: 'center', alignItems: 'center',
    ...Shadow.sm,
  },
  filterChipActive: { borderColor: Colors.amber + '40' },
  filterText:       { fontSize: 10, color: Colors.textSecondary, fontWeight: Typography.semibold },
  filterTextActive: { color: Colors.white, fontWeight: Typography.bold },

  list: { paddingHorizontal: Spacing.xl, paddingBottom: 100 },

  card: {
    borderRadius: Radius.xl, padding: Spacing.lg,
    marginBottom: Spacing.md, overflow: 'hidden',
    backgroundColor: Colors.surface,
    ...Shadow.clay,
  },

  cardTop:     { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md, marginBottom: Spacing.lg },
  storeAvatar: {
    width: 48, height: 48, borderRadius: Radius.lg,
    backgroundColor: Colors.amberBg, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.amber + '40',
  },
  storeAvatarText: { fontSize: Typography.base, fontWeight: Typography.bold, color: Colors.amber },
  storeName:  { fontSize: Typography.base, fontWeight: Typography.bold, color: Colors.textPrimary, marginBottom: 4 },
  metaRow:    { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText:   { fontSize: 12, color: Colors.textSecondary },
  total:      { fontSize: 19, fontWeight: '900', color: Colors.amber, marginTop: 2, letterSpacing: -0.5 },

  statusRow: { flexDirection: 'row', gap: 6, marginTop: Spacing.md },
  statusChip: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 4, paddingVertical: 12, paddingHorizontal: 4, borderRadius: Radius.full,
    borderWidth: 1.5, backgroundColor: Colors.surface,
    ...Shadow.sm,
  },
  statusChipText: { fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },

  fab: { position: 'absolute', bottom: 24, right: 24 },
  fabGrad: {
    width: 72, height: 72, borderRadius: 36,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.amber, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2, shadowRadius: 16, elevation: 6,
  },
  printBtn: {
    width: 46,
    alignSelf: 'stretch',   // match chip height automatically
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.info + '50',
    backgroundColor: Colors.infoBg,
    ...Shadow.sm,
  },
});
