import React, { useCallback, useEffect, useState } from 'react';
import { View, FlatList, StyleSheet, TouchableOpacity, Alert, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, Shadow, Typography, Layout } from '@/constants/theme';
import { EmptyState } from '@/components/ui';
import { FAB } from '@/lib/common/components/FAB';
import { ProductFilterBar } from '@/lib/common/components/ProductFilterBar';
import { ProductCard } from '@/lib/common/components/ProductCard';
import { useLanguage } from '@/hooks/useLanguage';
import { useDatabase } from '@/hooks/useDatabase';
import { useBusinessCategories } from '@/hooks/useBusinessCategories';
import { productRepository } from '@/lib/data/repositories/productRepository';
import { categoryRepository } from '@/lib/data/repositories/categoryRepository';
import type { Category, Product, ProductSortField, SortDirection } from '@/lib/domain/models';

export default function ProductsScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const { isReady, refreshKey } = useDatabase();
  const { filterCategoryList, productQueryOptions } = useBusinessCategories();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<ProductSortField>('name');
  const [sortDir, setSortDir] = useState<SortDirection>('asc');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!isReady) return;
    setLoading(true);
    const [data, cats] = await Promise.all([
      productRepository.findAll(search, categoryId || '', {
        sortBy,
        sortDir,
        ...productQueryOptions(categoryId, search),
      }),
      categoryRepository.findAll(),
    ]);
    setProducts(data);
    setCategories(filterCategoryList(cats));
    setLoading(false);
  }, [isReady, search, categoryId, sortBy, sortDir, refreshKey, productQueryOptions, filterCategoryList]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleDelete = (product: Product) => {
    Alert.alert(product.name, t('delete_product_msg'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('delete'),
        style: 'destructive',
        onPress: async () => {
          await productRepository.delete(product.id);
          await load();
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.toolbar}>
        <ProductFilterBar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder={t('search_products')}
          categories={categories}
          selectedCategoryId={categoryId}
          onCategorySelect={setCategoryId}
          sortBy={sortBy}
          sortDir={sortDir}
          onSortChange={(f, d) => {
            setSortBy(f);
            setSortDir(d);
          }}
        />
        <TouchableOpacity style={styles.manageLink} onPress={() => router.push('/categories')}>
          <Ionicons name="pricetags-outline" size={16} color={Colors.amber} />
          <Text style={styles.manageText}>{t('manage_categories')}</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshing={loading}
        onRefresh={load}
        ListEmptyComponent={
          <EmptyState
            icon="cube-outline"
            message={
              categoryId
                ? 'No products in this category.'
                : 'No products yet. Tap + to add your first product.'
            }
          />
        }
        renderItem={({ item }) => (
          <ProductCard
            product={item}
            lowStock={item.stock_quantity <= item.min_stock_alert}
            onPress={() => router.push(`/products/${item.id}`)}
            rightElement={
              <TouchableOpacity onPress={() => handleDelete(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="ellipsis-vertical" size={18} color={Colors.textMuted} />
              </TouchableOpacity>
            }
          />
        )}
      />
      <FAB onPress={() => router.push('/products/new')} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  toolbar: { paddingHorizontal: Layout.screenPaddingH, paddingTop: Spacing.md, paddingBottom: Spacing.sm },
  manageLink: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-end', paddingBottom: Spacing.xs },
  manageText: { fontSize: Typography.xs, color: Colors.amber, fontWeight: Typography.semibold },
  list: { paddingHorizontal: Layout.screenPaddingH, paddingBottom: Layout.screenPaddingBottom },
});
