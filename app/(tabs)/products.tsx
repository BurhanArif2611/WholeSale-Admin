// app/(tabs)/products.tsx
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl, Platform, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useRefreshOnFocus } from '@/hooks/useRefreshOnFocus';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius, Shadow, Gradients, formatCurrency } from '@/constants/theme';

import { useDataStore, addMaterialOptimistic } from '@/hooks/useDataStore';
import { useAuth } from '@/hooks/useAuth';
import { createMaterial, deleteAllMaterials } from '@/lib/api';
import { SearchBar, EmptyState, ListSkeleton, QuickCreateCard } from '@/components/ui';
import { useLanguage } from '@/hooks/useLanguage';
import type { Material } from '@/types';

/**
 * ProductListItem - Memoized list component for the product catalog.
 * Optimized for high-frequency scrolling and search filtering.
 */
const ProductListItem = React.memo(({ item, onPress, t, tData }: {
  item: Material;
  onPress: () => void;
  t: (k: string) => string;
  tData: (v: string | null) => string;
}) => (
  <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={styles.card}>
    <LinearGradient colors={Gradients.card} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      style={[StyleSheet.absoluteFill, { borderRadius: Radius.lg }]} />

    <View style={styles.cardTop}>
      <LinearGradient colors={Gradients.purple} style={styles.productIcon} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <Ionicons name="cube" size={22} color={Colors.white} />
      </LinearGradient>
      <View style={{ flex: 1 }}>
        <Text style={styles.productName}>{tData(item.name)}</Text>
        <View style={styles.metaRow}>
          <Ionicons name="pricetag-outline" size={11} color={Colors.textMuted} />
          <Text style={styles.metaText}>{t('base_price_label')} {formatCurrency(item.base_price)} / {item.unit}</Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
    </View>
  </TouchableOpacity>
));

/**
 * ProductsScreen - Product Catalog.
 * Lists all available materials and products with pricing information.
 */
export default function ProductsScreen() {
  const { t, tData } = useLanguage();
  const router = useRouter();
  const { profile } = useAuth();

  const ownerId = profile?.role === 'owner' ? profile?.id : profile?.owner_id;
  const { materials: products, loading, refresh } = useDataStore(ownerId);

  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [sortOrder, setSortOrder] = useState<'latest' | 'name'>('latest');

  useRefreshOnFocus(() => {
    void refresh();
  });

  const onManualRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh(true);
    setRefreshing(false);
  }, [refresh]);

  const handleDeleteAll = useCallback(async () => {
    Alert.alert(
      "Delete All Products", 
      "Are you sure you want to delete ALL products? This gives you a clean slate.", 
      [
        { text: t('cancel'), style: 'cancel' },
        { 
          text: t('delete'), 
          style: 'destructive', 
          onPress: async () => {
             if (!ownerId) return;
             try { 
               await deleteAllMaterials(ownerId); 
               void refresh(); 
             }
             catch (e) { Alert.alert(t('error'), (e as Error).message); }
          }
        },
      ]
    );
  }, [refresh, ownerId, t]);

  const handleQuickAdd = async () => {
    if (!ownerId || !search.trim()) return;
    
    // Silent creation: No loading state, just clear the search and sync in background
    const term = search.trim();
    setSearch('');
    
    try {
        const newMat = await createMaterial({
            name: term,
            base_price: 0,
            unit: 'kg',
            owner_id: ownerId
        });
        addMaterialOptimistic(newMat);
    } catch (e) {
        console.error('[QuickAdd] SILENT FAIL:', e);
    }
  };

  const sortedAndFiltered = useMemo(() => {
    let result = [...products];
    if (search) {
      result = result.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));
    }

    if (sortOrder === 'name') {
      result.sort((a, b) => a.name.localeCompare(b.name));
    } else {
      result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    return result;
  }, [products, search, sortOrder]);

  const renderProduct = useCallback(({ item }: { item: Material }) => (
    <ProductListItem
      item={item}
      t={t}
      tData={tData}
      onPress={() => router.push(`/products/${item.id}`)}
    />
  ), [router, t, tData]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.searchRow}>
          <View style={{ flex: 1 }}>
            <SearchBar value={search} onChangeText={setSearch} placeholder={t('search_products')} />
          </View>
          <TouchableOpacity
            onPress={() => setSortOrder(sortOrder === 'latest' ? 'name' : 'latest')}
            style={styles.sortBtn}
            activeOpacity={0.7}
          >
            <Ionicons name={sortOrder === 'latest' ? "time-outline" : "text-outline"} size={20} color={Colors.white} />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={handleDeleteAll} 
            activeOpacity={0.7} 
            style={[styles.sortBtn, { backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.danger + '40', marginLeft: 8 }]}
          >
            <Ionicons name="trash-outline" size={20} color={Colors.danger} />
          </TouchableOpacity>
        </View>
        <Text style={styles.count}>{t('total')}: {sortedAndFiltered.length} • {sortOrder === 'latest' ? 'Recent' : 'A-Z'}</Text>
      </View>

      {loading && products.length === 0 ? <ListSkeleton /> : (
        <FlatList
          data={sortedAndFiltered}
          keyExtractor={(i) => i.id}
          renderItem={renderProduct}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onManualRefresh} tintColor={Colors.amber} />}
          ListEmptyComponent={<EmptyState icon="cube-outline" message={t('no_products')} />}
          ListFooterComponent={search.trim() && !sortedAndFiltered.some(p => p.name.toLowerCase() === search.toLowerCase().trim()) ? (
            <QuickCreateCard
              title={t('add_product')}
              searchTerm={search.trim()}
              onPress={handleQuickAdd}
            />
          ) : null}
          showsVerticalScrollIndicator={false}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews={Platform.OS === 'android'}
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={() => router.push('/products/new')} activeOpacity={0.85}>
        <LinearGradient colors={Gradients.purple} style={styles.fabGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <Ionicons name="add" size={28} color={Colors.white} />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.lg },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  count: { fontSize: Typography.xs, color: Colors.textMuted, marginBottom: Spacing.lg, fontWeight: Typography.semibold, textTransform: 'uppercase', letterSpacing: 0.5 },
  list: { paddingHorizontal: Spacing.xl, paddingBottom: 100 },

  card: {
    borderRadius: Radius.xl, padding: Spacing.lg,
    marginBottom: Spacing.md, overflow: 'hidden',
    backgroundColor: Colors.surface,
    ...Shadow.clay,
  },

  cardTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  sortBtn: {
    width: 44, height: 44, borderRadius: Radius.md,
    backgroundColor: Colors.purple, alignItems: 'center', justifyContent: 'center',
    ...Shadow.sm, marginBottom: 12,
  },
  productIcon: { width: 46, height: 46, borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center' },
  productName: { fontSize: Typography.base, fontWeight: Typography.bold, color: Colors.textPrimary, marginBottom: 3 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: Typography.xs, color: Colors.textSecondary },

  fab: { position: 'absolute', bottom: 24, right: 24 },
  fabGrad: {
    width: 58, height: 58, borderRadius: 29,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.purple, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2, shadowRadius: 16, elevation: 6,
  },
});
