import React, { useCallback, useEffect, useState } from 'react';
import { View, FlatList, StyleSheet, TouchableOpacity, Alert, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, Shadow, Typography, Layout, Fonts } from '@/constants/theme';
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
  const [incompleteProducts, setIncompleteProducts] = useState<Product[]>([]);

  const load = useCallback(async () => {
    if (!isReady) return;
    setLoading(true);
    const [data, cats, incomplete] = await Promise.all([
      productRepository.findAll(search, categoryId || '', {
        sortBy,
        sortDir,
        ...productQueryOptions(categoryId, search),
      }),
      categoryRepository.findAll(),
      productRepository.findIncomplete(),
    ]);
    setProducts(data);
    setCategories(filterCategoryList(cats));
    setIncompleteProducts(incomplete);
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
        ListHeaderComponent={
          incompleteProducts.length > 0 && !search.trim() ? (
            <View style={styles.incompleteSection}>
              <View style={styles.incompleteHeader}>
                <Text style={styles.incompleteTitle}>
                  {t('products_needing_details_count').replace('{count}', String(incompleteProducts.length))}
                </Text>
                <Pressable onPress={() => router.push('/products/incomplete')}>
                  <Text style={styles.seeAll}>{t('see_all')}</Text>
                </Pressable>
              </View>
              {incompleteProducts.slice(0, 3).map((item) => (
                <ProductCard
                  key={item.id}
                  product={item}
                  onPress={() => router.push(`/products/complete/${item.id}`)}
                />
              ))}
            </View>
          ) : null
        }
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
            onPress={() =>
              item.is_incomplete
                ? router.push(`/products/complete/${item.id}`)
                : router.push(`/products/${item.id}`)
            }
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
  manageText: { fontSize: Typography.xs, color: Colors.amber, fontFamily: Fonts.semibold },
  list: { paddingHorizontal: Layout.screenPaddingH, paddingBottom: Layout.screenPaddingBottom },
  incompleteSection: { marginBottom: Spacing.md },
  incompleteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  incompleteTitle: {
    fontSize: Typography.xs,
    fontFamily: Fonts.bold,
    color: Colors.amberDim,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  seeAll: { fontSize: Typography.xs, fontFamily: Fonts.bold, color: Colors.amber },
});
