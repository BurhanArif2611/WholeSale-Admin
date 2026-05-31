import React, { useCallback, useEffect, useState } from 'react';
import { View, FlatList, StyleSheet, Pressable, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenLayout } from '@/lib/common/components/ScreenLayout';
import { ProductCard } from '@/lib/common/components/ProductCard';
import { Colors, Spacing, Typography, Layout } from '@/constants/theme';
import { useLanguage } from '@/hooks/useLanguage';
import { useDatabase } from '@/hooks/useDatabase';
import { productRepository } from '@/lib/data/repositories/productRepository';
import type { Product } from '@/lib/domain/models';

export default function IncompleteProductsScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const { isReady, refreshKey } = useDatabase();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!isReady) return;
    setLoading(true);
    setProducts(await productRepository.findIncomplete());
    setLoading(false);
  }, [isReady, refreshKey]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <ScreenLayout title={t('incomplete_products_title')} scroll={false} loading={loading}>
      <Text style={styles.subtitle}>{t('incomplete_products_subtitle')}</Text>
      <FlatList
        data={products}
        keyExtractor={(p) => p.id}
        contentContainerStyle={styles.list}
        refreshing={loading}
        onRefresh={load}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Ionicons name="checkmark-circle-outline" size={48} color={Colors.success} />
              <Text style={styles.emptyText}>{t('no_incomplete_products')}</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <ProductCard
            product={item}
            onPress={() => router.push(`/products/complete/${item.id}`)}
            rightElement={
              <Pressable onPress={() => router.push(`/products/complete/${item.id}`)}>
                <Ionicons name="create-outline" size={20} color={Colors.amber} />
              </Pressable>
            }
          />
        )}
      />
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  subtitle: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    paddingHorizontal: Layout.screenPaddingH,
    paddingBottom: Spacing.sm,
    lineHeight: 20,
  },
  list: { paddingHorizontal: Layout.screenPaddingH, paddingBottom: Layout.screenPaddingBottom },
  empty: { alignItems: 'center', padding: Spacing.xxl, gap: Spacing.md },
  emptyText: { color: Colors.textMuted, textAlign: 'center' },
});
