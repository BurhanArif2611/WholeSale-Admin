import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenLayout } from '@/lib/common/components/ScreenLayout';
import { SearchBar, EmptyState } from '@/components/ui';
import { FormField } from '@/lib/common/components/FormField';
import { Colors, Spacing, Radius, Shadow, formatCurrency, Typography } from '@/constants/theme';
import { useLanguage } from '@/hooks/useLanguage';
import { useDatabase } from '@/hooks/useDatabase';
import { orderRepository, type OrderListFilters, type OrderSortField } from '@/lib/data/repositories/orderRepository';
import type { Order } from '@/lib/domain/models';

type ListPreset = 'all' | 'pending' | 'completed' | 'cancelled';

const PRESETS: { key: ListPreset; labelKey: string }[] = [
  { key: 'all', labelKey: 'all' },
  { key: 'pending', labelKey: 'settings_orders_pending' },
  { key: 'completed', labelKey: 'settings_orders_completed' },
  { key: 'cancelled', labelKey: 'settings_orders_cancelled' },
];

const SORT_OPTS: { field: OrderSortField; label: string }[] = [
  { field: 'date', label: 'Date' },
  { field: 'amount', label: 'Amount' },
  { field: 'client', label: 'Client' },
];

export default function SettingsOrdersScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const { isReady, refreshKey } = useDatabase();

  const [search, setSearch] = useState('');
  const [preset, setPreset] = useState<ListPreset>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortBy, setSortBy] = useState<OrderSortField>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [showDates, setShowDates] = useState(false);

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!isReady) return;
    setLoading(true);
    const filters: OrderListFilters = {
      search,
      sortBy,
      sortDir,
    };
    if (preset !== 'all') filters.listPreset = preset;
    if (dateFrom) filters.dateFrom = dateFrom;
    if (dateTo) filters.dateTo = dateTo;

    const data = await orderRepository.findAll(filters);
    setOrders(data);
    setLoading(false);
  }, [isReady, search, preset, dateFrom, dateTo, sortBy, sortDir, refreshKey]);

  useEffect(() => {
    void load();
  }, [load]);

  const cycleSort = (field: OrderSortField) => {
    if (sortBy === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortDir('desc');
    }
  };

  return (
    <ScreenLayout title={t('settings_order_list')} scroll={false} padded={false} contentStyle={styles.flexCol}>
      <View style={styles.toolbar}>
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder={t('search_orders')}
          hint={t('settings_order_search_hint')}
        />
      </View>

      <View style={styles.filters}>
        {PRESETS.map((p) => (
          <TouchableOpacity
            key={p.key}
            style={[styles.chip, preset === p.key && styles.chipActive]}
            onPress={() => setPreset(p.key)}
          >
            <Text style={[styles.chipText, preset === p.key && styles.chipTextActive]}>
              {p.key === 'all' ? t('all') : t(p.labelKey)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.dateToggle} onPress={() => setShowDates(!showDates)}>
        <Text style={styles.dateToggleText}>{t('settings_date_range')}</Text>
        <Text style={styles.dateToggleHint}>{showDates ? '▲' : '▼'}</Text>
      </TouchableOpacity>

      {showDates && (
        <View style={styles.dateFields}>
          <FormField
            label={t('settings_date_from')}
            value={dateFrom}
            onChangeText={setDateFrom}
            placeholder="YYYY-MM-DD"
          />
          <FormField
            label={t('settings_date_to')}
            value={dateTo}
            onChangeText={setDateTo}
            placeholder="YYYY-MM-DD"
          />
        </View>
      )}

      <View style={styles.sortRow}>
        <Text style={styles.sortLabel}>{t('settings_sort_by')}:</Text>
        {SORT_OPTS.map((o) => (
          <TouchableOpacity
            key={o.field}
            style={[styles.sortChip, sortBy === o.field && styles.sortChipActive]}
            onPress={() => cycleSort(o.field)}
          >
            <Text style={[styles.sortChipText, sortBy === o.field && styles.sortChipTextActive]}>
              {o.label}
              {sortBy === o.field ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        style={styles.flexList}
        data={orders}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshing={loading}
        onRefresh={load}
        ListEmptyComponent={
          <EmptyState icon="receipt-outline" message={t('no_orders')} />
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => router.push(`/orders/${item.id}`)}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.client_name}</Text>
              <Text style={styles.meta}>
                #{item.id.slice(0, 8)} · {new Date(item.created_at).toLocaleDateString()}
              </Text>
              <Text style={styles.statusLine}>{item.status} · {item.payment_status}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.total}>{formatCurrency(item.grand_total)}</Text>
              {item.status !== 'cancelled' && (
                <TouchableOpacity
                  onPress={() =>
                    Alert.alert(t('settings_cancel_order'), t('settings_cancel_order_msg'), [
                      { text: t('cancel'), style: 'cancel' },
                      {
                        text: t('confirm'),
                        style: 'destructive',
                        onPress: async () => {
                          await orderRepository.cancel(item.id);
                          await load();
                        },
                      },
                    ])
                  }
                >
                  <Text style={styles.cancel}>{t('settings_cancel_order')}</Text>
                </TouchableOpacity>
              )}
            </View>
          </TouchableOpacity>
        )}
      />
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  flexCol: { flex: 1 },
  flexList: { flex: 1 },
  toolbar: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.sm },
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.lg,
    gap: 8,
    marginBottom: Spacing.sm,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipActive: { backgroundColor: Colors.amber, borderColor: Colors.amber },
  chipText: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
  chipTextActive: { color: Colors.white },
  dateToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  dateToggleText: { fontSize: Typography.sm, fontWeight: '700', color: Colors.textSecondary },
  dateToggleHint: { color: Colors.textMuted },
  dateFields: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.sm },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  sortLabel: { fontSize: 11, color: Colors.textMuted, fontWeight: '700' },
  sortChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface2,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sortChipActive: { borderColor: Colors.amber, backgroundColor: Colors.amberBg },
  sortChipText: { fontSize: 11, fontWeight: '600', color: Colors.textSecondary },
  sortChipTextActive: { color: Colors.amberDim },
  list: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl },
  card: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    ...Shadow.sm,
  },
  name: { fontWeight: '800', color: Colors.textPrimary },
  meta: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  statusLine: { fontSize: 10, color: Colors.textSecondary, marginTop: 4, textTransform: 'uppercase', fontWeight: '600' },
  total: { fontWeight: '800', color: Colors.textPrimary },
  cancel: { fontSize: 11, color: Colors.danger, marginTop: 6, fontWeight: '600' },
});
