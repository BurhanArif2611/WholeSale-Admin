import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';
import { ScreenLayout } from '@/lib/common/components/ScreenLayout';
import { SearchBar } from '@/components/ui';
import { CategoryChips } from '@/lib/common/components/CategoryChips';
import { FormField } from '@/lib/common/components/FormField';
import { Colors, Spacing, Radius, Shadow, formatCurrency, Typography } from '@/constants/theme';
import { useLanguage } from '@/hooks/useLanguage';
import { useDatabase } from '@/hooks/useDatabase';
import { reportRepository, type ReportFilters, type ReportSummary } from '@/lib/data/repositories/reportRepository';
import { categoryRepository } from '@/lib/data/repositories/categoryRepository';
import { productRepository } from '@/lib/data/repositories/productRepository';
import { clientRepository } from '@/lib/data/repositories/clientRepository';
import type { Category, Product, Client, Order, OrderStatus, PaymentStatus } from '@/lib/domain/models';
import { daysAgo, startOfToday, startOfMonth } from '@/lib/common/utils/dates';

type DatePreset = 'today' | 'week' | 'month' | 'all' | 'custom';

const STATUS_OPTS: { label: string; value?: OrderStatus }[] = [
  { label: 'All Status' },
  { label: 'Confirmed', value: 'confirmed' },
  { label: 'Delivered', value: 'delivered' },
  { label: 'Cancelled', value: 'cancelled' },
];

const PAYMENT_OPTS: { label: string; value?: PaymentStatus }[] = [
  { label: 'All Payments' },
  { label: 'Pending', value: 'pending' },
  { label: 'Partial', value: 'partial' },
  { label: 'Paid', value: 'paid' },
];

export default function ReportsScreen() {
  const { t } = useLanguage();
  const { isReady, refreshKey } = useDatabase();

  const [datePreset, setDatePreset] = useState<DatePreset>('month');
  const [dateFrom, setDateFrom] = useState(startOfMonth());
  const [dateTo, setDateTo] = useState(startOfToday());
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [productId, setProductId] = useState<string | null>(null);
  const [clientId, setClientId] = useState<string | null>(null);
  const [orderStatus, setOrderStatus] = useState<OrderStatus | undefined>();
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | undefined>();

  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [showClientPicker, setShowClientPicker] = useState(false);

  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (datePreset === 'today') {
      setDateFrom(startOfToday());
      setDateTo(startOfToday());
    } else if (datePreset === 'week') {
      setDateFrom(daysAgo(7));
      setDateTo(startOfToday());
    } else if (datePreset === 'month') {
      setDateFrom(startOfMonth());
      setDateTo(startOfToday());
    } else if (datePreset === 'all') {
      setDateFrom('');
      setDateTo('');
    }
  }, [datePreset]);

  useEffect(() => {
    if (!isReady) return;
    void (async () => {
      const [cats, prods, cls] = await Promise.all([
        categoryRepository.findAll(),
        productRepository.findAll(),
        clientRepository.findAll(),
      ]);
      setCategories(cats);
      setProducts(prods);
      setClients(cls);
    })();
  }, [isReady, refreshKey]);

  const buildFilters = useCallback((): ReportFilters => {
    const f: ReportFilters = {
      categoryId: categoryId ?? undefined,
      productId: productId ?? undefined,
      clientId: clientId ?? undefined,
      status: orderStatus,
      paymentStatus,
    };
    if (datePreset !== 'all') {
      if (dateFrom) f.dateFrom = dateFrom;
      if (dateTo) f.dateTo = dateTo;
    }
    return f;
  }, [datePreset, dateFrom, dateTo, categoryId, productId, clientId, orderStatus, paymentStatus]);

  const runReport = useCallback(async () => {
    if (!isReady) return;
    setLoading(true);
    try {
      const filters = buildFilters();
      const [sum, list] = await Promise.all([
        reportRepository.getSummary(filters),
        reportRepository.getOrders(filters),
      ]);
      setSummary(sum);
      setOrders(list);
    } catch (e) {
      Alert.alert(t('error'), (e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [isReady, buildFilters, t]);

  useEffect(() => {
    void runReport();
  }, [runReport]);

  const selectedProduct = products.find((p) => p.id === productId);
  const selectedClient = clients.find((c) => c.id === clientId);

  const filteredProducts = products.filter((p) =>
    !productSearch.trim() || p.name.toLowerCase().includes(productSearch.toLowerCase()),
  );
  const filteredClients = clients.filter((c) =>
    !clientSearch.trim() || c.name.toLowerCase().includes(clientSearch.toLowerCase()),
  );

  const handleExport = async () => {
    if (orders.length === 0) {
      Alert.alert(t('settings_export'), t('settings_export_empty'));
      return;
    }
    setExporting(true);
    try {
      const csv = reportRepository.buildCsv(orders);
      const path = `${FileSystem.cacheDirectory}report-${Date.now()}.csv`;
      await FileSystem.writeAsStringAsync(path, csv, { encoding: FileSystem.EncodingType.UTF8 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(path, { mimeType: 'text/csv', dialogTitle: t('settings_export') });
      } else {
        Alert.alert(t('settings_export'), t('settings_export_unavailable'));
      }
    } catch (e) {
      Alert.alert(t('error'), (e as Error).message);
    } finally {
      setExporting(false);
    }
  };

  return (
    <ScreenLayout title={t('settings_reports')} scroll>
      <Text style={styles.sectionLabel}>{t('settings_date_range')}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
        {(['today', 'week', 'month', 'all', 'custom'] as DatePreset[]).map((p) => (
          <TouchableOpacity
            key={p}
            style={[styles.chip, datePreset === p && styles.chipActive]}
            onPress={() => setDatePreset(p)}
          >
            <Text style={[styles.chipText, datePreset === p && styles.chipTextActive]}>
              {t(`settings_date_${p}`)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {datePreset === 'custom' && (
        <View style={styles.dateRow}>
          <View style={{ flex: 1 }}>
            <FormField label={t('settings_date_from')} value={dateFrom} onChangeText={setDateFrom} placeholder="YYYY-MM-DD" />
          </View>
          <View style={{ flex: 1 }}>
            <FormField label={t('settings_date_to')} value={dateTo} onChangeText={setDateTo} placeholder="YYYY-MM-DD" />
          </View>
        </View>
      )}

      {categories.length > 0 && (
        <>
          <Text style={styles.sectionLabel}>{t('settings_filter_category')}</Text>
          <CategoryChips categories={categories} selectedId={categoryId} onSelect={setCategoryId} />
        </>
      )}

      <Text style={styles.sectionLabel}>{t('settings_filter_product')}</Text>
      <TouchableOpacity style={styles.pickerBtn} onPress={() => setShowProductPicker(!showProductPicker)}>
        <Text style={styles.pickerText}>{selectedProduct?.name ?? t('settings_all_products')}</Text>
        <Ionicons name={showProductPicker ? 'chevron-up' : 'chevron-down'} size={18} color={Colors.textMuted} />
      </TouchableOpacity>
      {showProductPicker && (
        <View style={styles.pickerPanel}>
          <SearchBar value={productSearch} onChangeText={setProductSearch} placeholder={t('search_products')} />
          <ScrollView style={{ maxHeight: 160 }} nestedScrollEnabled>
            <TouchableOpacity style={styles.pickerItem} onPress={() => { setProductId(null); setShowProductPicker(false); }}>
              <Text style={styles.pickerItemText}>{t('settings_all_products')}</Text>
            </TouchableOpacity>
            {filteredProducts.slice(0, 30).map((p) => (
              <TouchableOpacity
                key={p.id}
                style={[styles.pickerItem, productId === p.id && styles.pickerItemActive]}
                onPress={() => { setProductId(p.id); setShowProductPicker(false); }}
              >
                <Text style={styles.pickerItemText}>{p.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      <Text style={styles.sectionLabel}>{t('settings_filter_customer')}</Text>
      <TouchableOpacity style={styles.pickerBtn} onPress={() => setShowClientPicker(!showClientPicker)}>
        <Text style={styles.pickerText}>{selectedClient?.name ?? t('settings_all_customers')}</Text>
        <Ionicons name={showClientPicker ? 'chevron-up' : 'chevron-down'} size={18} color={Colors.textMuted} />
      </TouchableOpacity>
      {showClientPicker && (
        <View style={styles.pickerPanel}>
          <SearchBar value={clientSearch} onChangeText={setClientSearch} placeholder={t('search_clients')} />
          <ScrollView style={{ maxHeight: 160 }} nestedScrollEnabled>
            <TouchableOpacity style={styles.pickerItem} onPress={() => { setClientId(null); setShowClientPicker(false); }}>
              <Text style={styles.pickerItemText}>{t('settings_all_customers')}</Text>
            </TouchableOpacity>
            {filteredClients.slice(0, 30).map((c) => (
              <TouchableOpacity
                key={c.id}
                style={[styles.pickerItem, clientId === c.id && styles.pickerItemActive]}
                onPress={() => { setClientId(c.id); setShowClientPicker(false); }}
              >
                <Text style={styles.pickerItemText}>{c.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      <Text style={styles.sectionLabel}>{t('settings_filter_status')}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
        {STATUS_OPTS.map((o) => (
          <TouchableOpacity
            key={o.label}
            style={[styles.chip, orderStatus === o.value && styles.chipActive]}
            onPress={() => setOrderStatus(o.value)}
          >
            <Text style={[styles.chipText, orderStatus === o.value && styles.chipTextActive]}>{o.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text style={styles.sectionLabel}>{t('settings_filter_payment')}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
        {PAYMENT_OPTS.map((o) => (
          <TouchableOpacity
            key={o.label}
            style={[styles.chip, paymentStatus === o.value && styles.chipActive]}
            onPress={() => setPaymentStatus(o.value)}
          >
            <Text style={[styles.chipText, paymentStatus === o.value && styles.chipTextActive]}>{o.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <TouchableOpacity style={styles.applyBtn} onPress={runReport} disabled={loading}>
        {loading ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.applyText}>{t('settings_apply_filters')}</Text>}
      </TouchableOpacity>

      {summary && (
        <>
          <Text style={[styles.sectionLabel, { marginTop: Spacing.lg }]}>{t('settings_analytics')}</Text>
          <View style={styles.summaryGrid}>
            <SummaryCard label={t('settings_total_sales')} value={formatCurrency(summary.totalSales)} color={Colors.amber} />
            <SummaryCard label={t('settings_order_count')} value={String(summary.orderCount)} color={Colors.info} />
            <SummaryCard label={t('settings_avg_order')} value={formatCurrency(summary.avgOrderValue)} color={Colors.purple} />
            <SummaryCard label={t('settings_pending')} value={formatCurrency(summary.totalPending)} color={Colors.danger} />
          </View>
        </>
      )}

      <View style={styles.listHeader}>
        <Text style={styles.sectionLabel}>{t('settings_report_orders')} ({orders.length})</Text>
        <TouchableOpacity style={styles.exportBtn} onPress={handleExport} disabled={exporting}>
          {exporting ? (
            <ActivityIndicator size="small" color={Colors.amber} />
          ) : (
            <>
              <Ionicons name="share-outline" size={16} color={Colors.amber} />
              <Text style={styles.exportText}>{t('settings_export')}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {orders.length === 0 && !loading ? (
        <Text style={styles.empty}>{t('no_orders')}</Text>
      ) : (
        orders.slice(0, 50).map((o) => (
          <View key={o.id} style={styles.orderRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.orderClient}>{o.client_name}</Text>
              <Text style={styles.orderMeta}>{o.created_at.slice(0, 10)} · {o.status}</Text>
            </View>
            <Text style={styles.orderTotal}>{formatCurrency(o.grand_total)}</Text>
          </View>
        ))
      )}
    </ScreenLayout>
  );
}

function SummaryCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={[styles.summaryCard, { borderLeftColor: color }]}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
  },
  chipScroll: { marginBottom: Spacing.sm },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    marginRight: 8,
  },
  chipActive: { backgroundColor: Colors.amber, borderColor: Colors.amber },
  chipText: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
  chipTextActive: { color: Colors.white },
  dateRow: { flexDirection: 'row', gap: Spacing.sm },
  pickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  pickerText: { fontSize: Typography.sm, fontWeight: '600', color: Colors.textPrimary, flex: 1 },
  pickerPanel: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
  },
  pickerItem: { paddingVertical: 10, paddingHorizontal: Spacing.sm, borderRadius: Radius.md },
  pickerItemActive: { backgroundColor: Colors.amber + '15' },
  pickerItemText: { fontSize: Typography.sm, color: Colors.textPrimary },
  applyBtn: {
    backgroundColor: Colors.amber,
    borderRadius: Radius.lg,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: Spacing.md,
    ...Shadow.sm,
  },
  applyText: { color: Colors.white, fontWeight: '800', fontSize: Typography.sm },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  summaryCard: {
    width: '47%',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderLeftWidth: 4,
    ...Shadow.sm,
  },
  summaryLabel: { fontSize: 10, color: Colors.textMuted, fontWeight: '700' },
  summaryValue: { fontSize: Typography.md, fontWeight: '900', color: Colors.textPrimary, marginTop: 4 },
  listHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing.lg },
  exportBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 8 },
  exportText: { fontSize: 12, fontWeight: '700', color: Colors.amber },
  empty: { textAlign: 'center', color: Colors.textMuted, padding: Spacing.xl },
  orderRow: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    ...Shadow.sm,
  },
  orderClient: { fontWeight: '700', color: Colors.textPrimary },
  orderMeta: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  orderTotal: { fontWeight: '800', color: Colors.textPrimary },
});
