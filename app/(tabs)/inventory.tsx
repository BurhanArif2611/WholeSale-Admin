import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PromptModal } from '@/lib/common/components/PromptModal';
import { ScreenLayout } from '@/lib/common/components/ScreenLayout';
import { Colors, Spacing, Radius, Shadow, Typography, Layout } from '@/constants/theme';
import { EmptyState, SectionHeader } from '@/components/ui';
import { useLanguage } from '@/hooks/useLanguage';
import { useDatabase } from '@/hooks/useDatabase';
import { useBusinessCategories } from '@/hooks/useBusinessCategories';
import { CategoryChips } from '@/lib/common/components/CategoryChips';
import { productRepository } from '@/lib/data/repositories/productRepository';
import { categoryRepository } from '@/lib/data/repositories/categoryRepository';
import { inventoryRepository } from '@/lib/data/repositories/inventoryRepository';
import type { Category, Product, InventoryTransaction } from '@/lib/domain/models';

type InventoryTab = 'alerts' | 'history';

export default function InventoryScreen() {
  const { t } = useLanguage();
  const { isReady, refreshKey } = useDatabase();
  const { filterCategoryList, preferredIds, showAllCategories, hasPreferences } = useBusinessCategories();
  const [lowStock, setLowStock] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [history, setHistory] = useState<InventoryTransaction[]>([]);
  const [tab, setTab] = useState<InventoryTab>('alerts');
  const [loading, setLoading] = useState(true);
  const [stockPrompt, setStockPrompt] = useState<{ product: Product; type: 'in' | 'out' } | null>(null);

  const load = useCallback(async () => {
    if (!isReady) return;
    setLoading(true);
    const [low, hist, cats] = await Promise.all([
      productRepository.findLowStock(categoryId || ''),
      inventoryRepository.getHistory(undefined, 50),
      categoryRepository.findAll(),
    ]);
    let filteredLow = low;
    if (hasPreferences && !showAllCategories && !categoryId) {
      const pref = new Set(preferredIds);
      filteredLow = low.filter((p) => pref.has(p.category_id));
    }
    setLowStock(filteredLow);
    setHistory(hist);
    setCategories(filterCategoryList(cats));
    setLoading(false);
  }, [isReady, refreshKey, categoryId, filterCategoryList, preferredIds, showAllCategories, hasPreferences]);

  useEffect(() => {
    void load();
  }, [load]);

  const stockAction = (product: Product, type: 'in' | 'out') => setStockPrompt({ product, type });

  return (
    <ScreenLayout title={t('inventory_tab')} padded={false} loading={loading && lowStock.length === 0 && history.length === 0}>
      <PromptModal
        visible={!!stockPrompt}
        title={stockPrompt?.type === 'in' ? t('stock_in_title') : t('stock_out_title')}
        message={stockPrompt?.product.name}
        placeholder={t('ph_stock_in')}
        hint={t('ph_quantity')}
        keyboardType="numeric"
        onCancel={() => setStockPrompt(null)}
        onSubmit={async (qtyStr) => {
          const ctx = stockPrompt;
          setStockPrompt(null);
          if (!ctx) return;
          const qty = parseFloat(qtyStr || '0');
          if (qty <= 0) return;
          if (ctx.type === 'in') await inventoryRepository.stockIn(ctx.product.id, qty);
          else await inventoryRepository.stockOut(ctx.product.id, qty);
          await load();
        }}
      />

      {tab === 'alerts' && categories.length > 0 && (
        <View style={styles.chipWrap}>
          <CategoryChips
            categories={categories}
            selectedId={categoryId}
            onSelect={setCategoryId}
            allLabel={t('all_categories')}
          />
        </View>
      )}

      <View style={styles.segmentWrap}>
        <View style={styles.segment}>
          <TouchableOpacity
            style={[styles.segmentBtn, tab === 'alerts' && styles.segmentBtnActive]}
            onPress={() => setTab('alerts')}
          >
            <Text style={[styles.segmentText, tab === 'alerts' && styles.segmentTextActive]}>
              {t('low_stock_tab')} ({lowStock.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segmentBtn, tab === 'history' && styles.segmentBtnActive]}
            onPress={() => setTab('history')}
          >
            <Text style={[styles.segmentText, tab === 'history' && styles.segmentTextActive]}>
              {t('history_tab')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {tab === 'alerts' ? (
        <FlatList
          data={lowStock}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshing={loading}
          onRefresh={load}
          ListHeaderComponent={
            lowStock.length > 0 ? (
              <SectionHeader title={t('low_stock_tab')} icon="warning-outline" />
            ) : null
          }
          ListEmptyComponent={
            !loading ? (
              <EmptyState icon="checkmark-circle-outline" message={t('stock_healthy_message')} />
            ) : null
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardIcon}>
                <Ionicons name="cube-outline" size={Layout.iconSize.md} color={Colors.danger} />
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.meta}>
                  Stock: {item.stock_quantity} · Min: {item.min_stock_alert}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.inBtn}
                onPress={() => stockAction(item, 'in')}
                accessibilityLabel={t('stock_in_title')}
              >
                <Ionicons name="add" size={Layout.iconSize.sm} color={Colors.white} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.outBtn}
                onPress={() => stockAction(item, 'out')}
                accessibilityLabel={t('stock_out_title')}
              >
                <Ionicons name="remove" size={Layout.iconSize.sm} color={Colors.danger} />
              </TouchableOpacity>
            </View>
          )}
        />
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshing={loading}
          onRefresh={load}
          ListHeaderComponent={<SectionHeader title={t('history_tab')} icon="time-outline" />}
          ListEmptyComponent={
            !loading ? <EmptyState icon="layers-outline" message={t('no_stock_movements')} /> : null
          }
          renderItem={({ item }) => (
            <View style={styles.historyRow}>
              <View style={[styles.historyDot, { backgroundColor: item.type === 'stock_in' ? Colors.success : Colors.danger }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.product_name}</Text>
                <Text style={styles.meta}>
                  {item.type === 'stock_in' ? t('stock_in_title') : t('stock_out_title')} ·{' '}
                  {item.quantity > 0 ? '+' : ''}
                  {item.quantity}
                </Text>
                <Text style={styles.date}>{new Date(item.created_at).toLocaleString()}</Text>
              </View>
            </View>
          )}
        />
      )}
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  chipWrap: {
    paddingHorizontal: Layout.screenPaddingH,
    paddingBottom: Spacing.sm,
  },
  segmentWrap: {
    paddingHorizontal: Layout.screenPaddingH,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  segment: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: 4,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.sm,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    borderRadius: Radius.md,
  },
  segmentBtnActive: { backgroundColor: Colors.amber },
  segmentText: {
    fontSize: Typography.xs,
    fontWeight: Typography.semibold,
    color: Colors.textMuted,
  },
  segmentTextActive: { color: Colors.white },
  list: {
    paddingHorizontal: Layout.screenPaddingH,
    paddingBottom: Layout.screenPaddingBottom,
    flexGrow: 1,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadow.sm,
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    backgroundColor: Colors.dangerBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { flex: 1 },
  name: {
    fontSize: Typography.sm,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
  },
  meta: {
    fontSize: Typography.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  inBtn: {
    backgroundColor: Colors.success,
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outBtn: {
    backgroundColor: Colors.dangerBg,
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadow.sm,
  },
  historyDot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
  date: { fontSize: Typography.xs, color: Colors.textMuted, marginTop: 4 },
});
