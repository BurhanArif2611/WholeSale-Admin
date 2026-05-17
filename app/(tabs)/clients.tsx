// app/(tabs)/clients.tsx
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl, Platform, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useRefreshOnFocus } from '@/hooks/useRefreshOnFocus';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius, Shadow, Gradients, formatCurrency } from '@/constants/theme';

import { useDataStore, addStoreOptimistic } from '@/hooks/useDataStore';
import { useAuth } from '@/hooks/useAuth';
import { createStore, deleteAllStores } from '@/lib/api';
import { SearchBar, EmptyState, ListSkeleton, QuickCreateCard } from '@/components/ui';
import { useLanguage } from '@/hooks/useLanguage';
import type { StoreWithLatestOrder } from '@/types';

/**
 * ClientListItem - Memoized list item for the clients directory.
 * Optimizes scrolling by preventing re-renders during search/sort operations.
 */
const ClientListItem = React.memo(({ item, onPress, tData }: { 
  item: StoreWithLatestOrder; 
  onPress: () => void;
  tData: (v: string | null) => string;
}) => (
  <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={styles.card}>
    <LinearGradient colors={Gradients.card} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      style={[StyleSheet.absoluteFill, { borderRadius: Radius.lg }]} />

    <View style={styles.cardTop}>
      <LinearGradient colors={Gradients.info} style={styles.clientIcon} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <Ionicons name="person" size={22} color={Colors.white} />
      </LinearGradient>
      <View style={{ flex: 1 }}>
        <Text style={styles.clientName}>{tData(item.name)}</Text>
        <View style={styles.metaRow}>
          {item.area  && <><Ionicons name="location-outline" size={12} color={Colors.textMuted} /><Text style={styles.metaText}>{tData(item.area)}</Text></>}
          {item.phone && <><Ionicons name="call-outline"     size={12} color={Colors.textMuted} style={{ marginLeft: 8 }} /><Text style={styles.metaText}>{item.phone}</Text></>}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
    </View>
  </TouchableOpacity>
));

/**
 * ClientsScreen - Client Directory.
 * Lists all stores/clients with searchable name, area, and phone fields.
 * Includes firm-wide debt summary for owners.
 */
export default function ClientsScreen() {
  const { t, tData } = useLanguage();
  const router = useRouter();
  const { profile } = useAuth();
  
  const ownerId = profile?.role === 'owner' ? profile?.id : profile?.owner_id;
  const { stores: clients, loading, refresh } = useDataStore(ownerId);
  
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch]     = useState('');
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
      "Delete All Clients", 
      "Are you sure you want to delete ALL your clients? This gives you a clean slate.", 
      [
        { text: t('cancel'), style: 'cancel' },
        { 
          text: t('delete'), 
          style: 'destructive', 
          onPress: async () => {
             if (!ownerId) return;
             try { 
               await deleteAllStores(ownerId); 
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
    
    const term = search.trim();
    // Pre-check: If they already match exactly (case-insensitive), don't even try.
    const exists = clients.some(c => c.name.toLowerCase() === term.toLowerCase());
    if (exists) {
        Alert.alert(t('error'), 'A client with this name already exists.');
        return;
    }

    setSearch('');
    
    try {
        const newStore = await createStore({
            name: term,
            owner_id: ownerId,
            margin_percentage: 0
        });
        addStoreOptimistic(newStore as StoreWithLatestOrder);
    } catch (e: any) {
        if (e.code === '23505') {
            Alert.alert(t('error'), 'A client with this name already exists.');
        } else {
            console.error('[QuickAdd] FAIL:', e);
            Alert.alert(t('error'), e.message || 'Failed to create client');
        }
    }
  };

  const sortedAndFiltered = useMemo(() => {
    let result = [...clients];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((c) => 
        c.name.toLowerCase().includes(q) || 
        (c.area ?? '').toLowerCase().includes(q) || 
            (c.phone ?? '').includes(q)
      );
    }
    
    if (sortOrder === 'name') {
      result.sort((a, b) => a.name.localeCompare(b.name));
    } else {
      result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    return result;
  }, [clients, search, sortOrder]);

  const totalDebt = useMemo(() => {
      return clients.reduce((s, c) => s + Number(c.total_debt ?? 0), 0);
  }, [clients]);

  const renderClient = useCallback(({ item }: { item: StoreWithLatestOrder }) => (
    <ClientListItem 
      item={item} 
      tData={tData}
      onPress={() => router.push(`/clients/${item.id}`)} 
    />
  ), [router, tData]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.searchRow}>
          <View style={{ flex: 1 }}>
            <SearchBar value={search} onChangeText={setSearch} placeholder={t('search_placeholder')} />
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

        <View style={styles.summaryBar}>
          <View style={styles.summaryItem}>
            <Ionicons name="people-outline" size={14} color={Colors.textMuted} />
            <Text style={styles.summaryText}>{sortedAndFiltered.length} {t('clients_label')} • {sortOrder === 'latest' ? 'Recent' : 'A-Z'}</Text>
          </View>
          {totalDebt > 0 && (
              <LinearGradient colors={[Colors.dangerBg, Colors.dangerBg]} style={styles.debtPill}>
                <Ionicons name="warning-outline" size={12} color={Colors.danger} />
                <Text style={styles.debtPillText}>{formatCurrency(totalDebt)}</Text>
              </LinearGradient>
          )}
        </View>
      </View>

      {loading && clients.length === 0 ? <ListSkeleton /> : (
        <FlatList
          data={sortedAndFiltered}
          keyExtractor={(i) => i.id}
          renderItem={renderClient}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onManualRefresh} tintColor={Colors.amber} />}
          ListEmptyComponent={<EmptyState icon="people-outline" message={t('no_clients')} />}
          ListFooterComponent={search.trim() && !sortedAndFiltered.some(s => s.name.toLowerCase() === search.toLowerCase().trim()) ? (
            <QuickCreateCard 
                title={t('create_new_client')}
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

      <TouchableOpacity style={styles.fab} onPress={() => router.push('/clients/new')} activeOpacity={0.85}>
        <LinearGradient colors={Gradients.info} style={styles.fabGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <Ionicons name="person-add" size={24} color={Colors.white} />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header:    { paddingHorizontal: Spacing.xl, paddingTop: Spacing.lg },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  summaryBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.lg, flexWrap: 'wrap', gap: Spacing.sm },
  summaryItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  summaryText: { fontSize: Typography.sm, color: Colors.textSecondary, fontWeight: Typography.bold },
  debtPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: Spacing.md, paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: Colors.dangerBg, ...Shadow.sm,
  },
  debtPillText: { fontSize: Typography.xs, color: Colors.danger, fontWeight: Typography.bold },

  list: { paddingHorizontal: Spacing.xl, paddingBottom: 100 },

  card: {
    borderRadius: Radius.xl, padding: Spacing.lg,
    marginBottom: Spacing.md, overflow: 'hidden',
    backgroundColor: Colors.surface,
    ...Shadow.clay,
  },

  cardTop:  { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  sortBtn: {
    width: 44, height: 44, borderRadius: Radius.md,
    backgroundColor: Colors.info, alignItems: 'center', justifyContent: 'center',
    ...Shadow.sm, marginBottom: 12,
  },
  clientIcon: { width: 46, height: 46, borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center' },
  clientName: { fontSize: Typography.base, fontWeight: Typography.bold, color: Colors.textPrimary, marginBottom: 3 },
  metaRow:  { flexDirection: 'row', alignItems: 'center', gap: 3, flexWrap: 'wrap' },
  metaText: { fontSize: Typography.xs, color: Colors.textSecondary },

  fab: { position: 'absolute', bottom: 24, right: 24 },
  fabGrad: {
    width: 58, height: 58, borderRadius: 29,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.info, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2, shadowRadius: 16, elevation: 6,
  },
});
