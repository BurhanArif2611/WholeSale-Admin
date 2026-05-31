import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { PromptModal } from '@/lib/common/components/PromptModal';
import { ScreenLayout } from '@/lib/common/components/ScreenLayout';
import { Button } from '@/components/ui';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, formatCurrency, Typography, Fonts } from '@/constants/theme';
import { useLanguage } from '@/hooks/useLanguage';
import { productRepository } from '@/lib/data/repositories/productRepository';
import { inventoryRepository } from '@/lib/data/repositories/inventoryRepository';
import type { Product } from '@/lib/domain/models';

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useLanguage();
  const [product, setProduct] = useState<Product | null>(null);
  const [showStockIn, setShowStockIn] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setProduct(await productRepository.findById(id));
    setLoading(false);
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <ScreenLayout
      title={product?.name ?? t('product_details_title')}
      scroll
      loading={loading && !product}
      onRefresh={load}
    >
      {product && (
        <>
          {product.is_incomplete ? (
            <Pressable
              style={styles.incompleteBanner}
              onPress={() => router.push(`/products/complete/${product.id}`)}
            >
              <Ionicons name="alert-circle" size={20} color={Colors.amber} />
              <Text style={styles.incompleteBannerText}>{t('complete_product_banner')}</Text>
              <Ionicons name="chevron-forward" size={18} color={Colors.amberDim} />
            </Pressable>
          ) : null}
          <PromptModal
            visible={showStockIn}
            title="Stock In"
            message={product.name}
            placeholder={t('ph_stock_in')}
            hint={t('hint_stock_in')}
            keyboardType="numeric"
            onCancel={() => setShowStockIn(false)}
            onSubmit={async (qty) => {
              setShowStockIn(false);
              const q = parseFloat(qty || '0');
              if (q > 0) {
                await inventoryRepository.stockIn(product.id, q);
                await load();
              }
            }}
          />
          <Text style={styles.meta}>{product.category} · {product.unit_type.toUpperCase()}</Text>
          {product.sku ? <Text style={styles.meta}>SKU: {product.sku}</Text> : null}
          {product.barcode ? <Text style={styles.meta}>Barcode: {product.barcode}</Text> : null}

          <View style={styles.grid}>
            <Stat label="Selling" value={formatCurrency(product.selling_price)} />
            <Stat label="Purchase" value={formatCurrency(product.purchase_price)} />
            <Stat label="Stock" value={String(product.stock_quantity)} highlight={product.stock_quantity <= product.min_stock_alert} />
            <Stat label="Min Alert" value={String(product.min_stock_alert)} />
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Tax</Text>
            <Text style={styles.value}>{product.tax_percent}%</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Discount</Text>
            <Text style={styles.value}>{product.discount_percent}%</Text>
          </View>
          {product.notes ? <Text style={styles.notes}>{product.notes}</Text> : null}

          <Button label="Stock In" onPress={() => setShowStockIn(true)} style={{ marginTop: Spacing.lg }} />
          <Button label={t('add_product')} onPress={() => router.push('/products/new')} variant="secondary" style={{ marginTop: Spacing.sm }} />
        </>
      )}
    </ScreenLayout>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={[styles.stat, highlight && { borderColor: Colors.danger }]}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, highlight && { color: Colors.danger }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  incompleteBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.amberBg,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.amber + '44',
  },
  incompleteBannerText: { flex: 1, fontSize: Typography.sm, fontFamily: Fonts.semibold, color: Colors.amberDim },
  meta: { fontSize: Typography.sm, color: Colors.textMuted, marginTop: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginVertical: Spacing.lg },
  stat: {
    width: '47%',
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statLabel: { fontSize: Typography.xs, color: Colors.textMuted },
  statValue: { fontSize: Typography.sm, fontFamily: Fonts.bold, marginTop: 4, color: Colors.textPrimary },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  label: { color: Colors.textSecondary, fontSize: Typography.sm },
  value: { color: Colors.textPrimary, fontFamily: Fonts.semibold },
  notes: { color: Colors.textMuted, marginTop: Spacing.md, fontStyle: 'italic', fontSize: Typography.sm },
});
