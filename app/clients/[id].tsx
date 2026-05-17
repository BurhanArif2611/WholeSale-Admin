// app/clients/[id].tsx
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert, RefreshControl, TextInput, ActivityIndicator } from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius, Gradients, Shadow, formatCurrency, formatDate } from '@/constants/theme';
import { fetchStore, fetchStoreHistory, updateStore, deleteStore } from '@/lib/api';
import { useDataStore } from '@/hooks/useDataStore';
import { StatusBadge, Button, RowItem } from '@/components/ui';
import type { Store, StoreHistory, Order } from '@/types';

/**
 * OrderSummaryItem - Memoized component for transaction history.
 */
const OrderSummaryItem = React.memo(({ order, onPress }: { order: Order; onPress: (id: string) => void }) => (
  <TouchableOpacity 
    onPress={() => onPress(order.id)}
    activeOpacity={0.8} 
    style={[styles.orderCard, Shadow.sm]}
  >
    <View style={styles.orderTop}>
      <View>
        <Text style={styles.orderId}>#{order.id.slice(0, 8).toUpperCase()}</Text>
        <View style={styles.orderMetaRow}>
          <Ionicons name="calendar-outline" size={10} color={Colors.textMuted} />
          <Text style={styles.orderDate}>{formatDate(order.date)}</Text>
        </View>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 5 }}>
        <StatusBadge status={order.status} />
        <Text style={styles.orderTotal}>{formatCurrency(order.grand_total)}</Text>
      </View>
    </View>
    {(order.order_items ?? []).slice(0, 2).map((item) => (
      <Text key={item.id} style={styles.orderItem}>• {item.material_name || item.name} × {item.quantity}</Text>
    ))}
    {(order.order_items ?? []).length > 2 && (
      <Text style={styles.orderMore}>+{(order.order_items ?? []).length - 2} more items</Text>
    )}
  </TouchableOpacity>
));

/**
 * ClientDetailScreen - Comprehensive Customer Management.
 * Displays financial summaries, transaction history, and allows profile management.
 * Leverages cached data for instant loading followed by background synchronization.
 */
export default function ClientDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useAuth();
  const router = useRouter();
  
  const ownerId = profile?.role === 'owner' ? profile?.id : profile?.owner_id;
  const { stores } = useDataStore(ownerId);
  
  const cachedStore = useMemo(() => stores.find(s => s.id === id), [stores, id]);

  const [store, setStore] = useState<Store | null>(cachedStore || null);
  const [history, setHistory] = useState<StoreHistory | null>(null);
  const [loading, setLoading] = useState(!cachedStore);
  const [refreshing, setRefreshing] = useState(false);
  const [editing, setEditing] = useState(false);
  
  const [editName, setEditName] = useState(cachedStore?.name || '');
  const [editArea, setEditArea] = useState(cachedStore?.area || '');
  const [editPhone, setEditPhone] = useState(cachedStore?.phone || '');
  const [editMargin, setEditMargin] = useState(String(cachedStore?.margin_percentage ?? 0));
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!ownerId || !id) return;
    if (!silent) setLoading(true);
    try {
      const [s, h] = await Promise.all([fetchStore(id, ownerId), fetchStoreHistory(id, ownerId)]);
      setStore(s); 
      setHistory(h);
      setEditName(s.name);
      setEditArea(s.area || '');
      setEditPhone(s.phone || '');
      setEditMargin(String(s.margin_percentage ?? 0));
    } catch (e) { 
      console.error('[ClientDetail] Fetch failed:', e); 
    } finally { 
      setLoading(false); 
      setRefreshing(false); 
    }
  }, [id, ownerId]);

  useEffect(() => { 
    void load(!!cachedStore); 
  }, [id, load, cachedStore]);

  const handleSave = async () => {
    if (!editName.trim()) return Alert.alert('Required', 'Business name cannot be empty');

    const oldStore = store;
    const newStore = {
      ...store!,
      name: editName.trim(),
      area: editArea.trim() || null,
      phone: editPhone.trim() || null,
      margin_percentage: Number(editMargin) || 0
    };

    setStore(newStore); // Optimistic UI
    setEditing(false);
    setSaving(true);

    try {
      await updateStore(id, {
        name: editName.trim(),
        area: editArea.trim() || undefined,
        phone: editPhone.trim() || undefined,
        margin_percentage: Number(editMargin) || 0,
      });
      void load(true);
    } catch (e) {
      setStore(oldStore); // Rollback
      Alert.alert('Update Failed', (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () =>
    Alert.alert('Delete Client', `Are you sure you want to remove ${store?.name}? All associated order history will be preserved but the client record will be gone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete Permanent', style: 'destructive', onPress: async () => {
          try { await deleteStore(id); router.back(); }
          catch (e) { Alert.alert('Error', (e as Error).message); }
        }
      },
    ]);

  const handleOrderPress = useCallback((orderId: string) => {
    router.push(`/orders/${orderId}`);
  }, [router]);

  if (loading || !store) return (
    <View style={[styles.container, styles.center]}>
      <ActivityIndicator color={Colors.amber} size="large" />
    </View>
  );

  const hasDebt = Number(store.total_debt) > 0;

  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(true); }} tintColor={Colors.amber} />}
      showsVerticalScrollIndicator={false}
    >
      {/* Header Profile Card */}
      <View style={[styles.headerCard, Shadow.clay]}>
        <TouchableOpacity
          onPress={() => setEditing(!editing)}
          style={[styles.headerEditBtn, editing && { borderColor: Colors.danger }]}
          activeOpacity={0.7}
        >
          <Ionicons name={editing ? "close" : "pencil"} size={14} color={editing ? Colors.danger : Colors.amber} />
          <Text style={[styles.headerEditBtnText, { color: editing ? Colors.danger : Colors.amber }]}>
            {editing ? 'Cancel' : 'Edit Profile'}
          </Text>
        </TouchableOpacity>

        <LinearGradient 
            colors={hasDebt ? Gradients.danger : Gradients.amber}
            style={styles.avatarLg} 
            start={{ x: 0, y: 0 }} 
            end={{ x: 1, y: 1 }}
        >
          <Text style={styles.avatarText}>{editName ? editName.charAt(0).toUpperCase() : '?'}</Text>
        </LinearGradient>

        {editing ? (
          <View style={styles.editForm}>
            <Text style={styles.editInputLabel}>Business Name</Text>
            <TextInput
              value={editName}
              onChangeText={setEditName}
              placeholder="Store Name"
              style={styles.editHeaderInput}
            />
            <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.editInputLabel}>Location / Area</Text>
                <TextInput
                  value={editArea}
                  onChangeText={setEditArea}
                  placeholder="Area"
                  style={styles.editHeaderInputSmall}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.editInputLabel}>Contact No</Text>
                <TextInput
                  value={editPhone}
                  onChangeText={setEditPhone}
                  placeholder="Phone"
                  keyboardType="phone-pad"
                  style={styles.editHeaderInputSmall}
                />
              </View>
            </View>
          </View>
        ) : (
          <View style={{ alignItems: 'center' }}>
            <Text style={styles.clientName}>{store.name}</Text>
            <View style={styles.clientMetaRow}>
              {store.area && <View style={styles.metaChip}><Ionicons name="location-outline" size={13} color={Colors.textSecondary} /><Text style={styles.metaChipText}>{store.area}</Text></View>}
              {store.phone && <View style={styles.metaChip}><Ionicons name="call-outline" size={13} color={Colors.textSecondary} /><Text style={styles.metaChipText}>{store.phone}</Text></View>}
            </View>
          </View>
        )}
      </View>

      {/* Financial Pulse */}
      <View style={styles.statsRow}>
        {[
          { label: 'OUTSTANDING', val: formatCurrency(store.total_debt), color: hasDebt ? Colors.danger : Colors.textPrimary, icon: 'wallet-outline' as const, gradient: hasDebt ? [Colors.danger + '20', Colors.danger + '05'] : Gradients.card },
          { label: 'TOTAL ORDERS', val: history?.total_orders ?? 0, color: Colors.info, icon: 'receipt-outline' as const, gradient: [Colors.info + '20', Colors.info + '05'] },
          { label: 'TOTAL SALES', val: formatCurrency(history?.total_revenue ?? 0), color: Colors.amber, icon: 'trending-up-outline' as const, gradient: [Colors.amber + '20', Colors.amber + '05'] },
        ].map((s) => (
          <View key={s.label} style={[styles.statCard, Shadow.sm]}>
            <View style={[styles.statIconBg, { backgroundColor: Colors.white }]}>
              <Ionicons name={s.icon} size={14} color={s.color} />
            </View>
            <Text style={[styles.statVal, { color: s.color }]} numberOfLines={1} adjustsFontSizeToFit>{s.val}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* Profile Section */}
      <View style={[styles.section, Shadow.clay]}>
        <View style={styles.sectionTitleRow}>
          <Ionicons name="options-outline" size={16} color={Colors.amber} />
          <Text style={styles.sectionTitle}>Business Settings</Text>
        </View>

        {editing ? (
          <View>
            <Text style={styles.inputLabel}>Markup Margin (%)</Text>
            <View style={styles.chargeInputRow}>
              <Text style={styles.currencySign}>%</Text>
              <TextInput 
                value={editMargin} 
                onChangeText={setEditMargin}
                keyboardType="decimal-pad" 
                placeholder="0.0"
                placeholderTextColor={Colors.textMuted} 
                style={styles.chargeInput} 
              />
            </View>
            <Button 
                label={saving ? 'Updating...' : 'Save Configuration'} 
                onPress={handleSave} 
                loading={saving} 
                style={{ marginTop: Spacing.lg }} 
                icon="checkmark-circle-outline" 
            />
          </View>
        ) : (
          <RowItem 
            label="Profit Margin Markup" 
            value={`${store.margin_percentage ?? 0}%`}
            valueColor={Number(store.margin_percentage) > 0 ? Colors.purple : undefined}
            icon="trending-up-outline" 
          />
        )}
      </View>

      {/* Transaction Records */}
      <View style={[styles.section, Shadow.clay]}>
        <View style={styles.sectionTitleRow}>
          <Ionicons name="time-outline" size={16} color={Colors.amber} />
          <Text style={styles.sectionTitle}>Recent Transactions</Text>
        </View>

        {(history?.orders ?? []).length === 0 ? (
          <View style={styles.emptyOrders}>
            <Ionicons name="receipt-outline" size={32} color={Colors.textMuted} />
            <Text style={styles.emptyText}>No transactions recorded</Text>
          </View>
        ) : (
          (history?.orders ?? []).slice(0, 10).map((order) => (
            <OrderSummaryItem key={order.id} order={order} onPress={handleOrderPress} />
          ))
        )}
      </View>

      <Button 
        label="Create New Order" 
        onPress={() => router.push({ pathname: '/orders/new', params: { store_id: id } })}
        icon="add-circle-outline" 
        style={{ marginBottom: Spacing.lg }} 
      />
      <Button 
        label="Archive Client" 
        onPress={handleDelete} 
        variant="danger" 
        icon="trash-outline" 
        outline 
      />

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: Spacing.xl },
  center: { alignItems: 'center', justifyContent: 'center' },

  headerCard: {
    borderRadius: Radius.xl, padding: Spacing.xl,
    alignItems: 'center', marginBottom: Spacing.xl,
    backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.borderLight,
  },
  avatarLg: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md },
  avatarText: { fontSize: 32, fontWeight: Typography.black, color: Colors.white },
  headerEditBtn: {
    position: 'absolute', top: 12, right: 12, flexDirection: 'row', alignItems: 'center',
    gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: Radius.full,
    backgroundColor: Colors.bg, borderWidth: 1, borderColor: Colors.borderLight, zIndex: 10,
  },
  headerEditBtnText: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
  clientName: { fontSize: Typography.xl, fontWeight: Typography.black, color: Colors.textPrimary, textAlign: 'center' },
  clientMetaRow: { flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap', justifyContent: 'center' },
  metaChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.bg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.borderLight },
  metaChipText: { fontSize: 11, color: Colors.textSecondary, fontWeight: '500' },

  statsRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.xl },
  statCard: { flex: 1, borderRadius: Radius.lg, padding: 10, alignItems: 'center', gap: 2, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.borderLight },
  statIconBg: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 4, ...Shadow.sm },
  statVal: { fontSize: 13, fontWeight: Typography.black, width: '100%', textAlign: 'center' },
  statLabel: { fontSize: 8, color: Colors.textMuted, letterSpacing: 0.5, textTransform: 'uppercase', textAlign: 'center', fontWeight: '800' },

  section: { borderRadius: Radius.xl, padding: Spacing.xl, marginBottom: Spacing.xl, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.borderLight },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.lg },
  sectionTitle: { fontSize: 14, fontWeight: '900', color: Colors.textPrimary, textTransform: 'uppercase', letterSpacing: 0.5 },
  
  editForm: { width: '100%', gap: 8, marginTop: 8 },
  editInputLabel: { fontSize: 9, color: Colors.textMuted, fontWeight: '900', textTransform: 'uppercase', marginBottom: 2 },
  editHeaderInput: { backgroundColor: Colors.bg, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, color: Colors.textPrimary, fontWeight: '700', width: '100%' },
  editHeaderInputSmall: { backgroundColor: Colors.bg, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13, color: Colors.textPrimary, fontWeight: '600', width: '100%' },

  chargeInputRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  currencySign: { fontSize: 24, fontWeight: Typography.black, color: Colors.amber, width: 24, textAlign: 'center' },
  chargeInput: { flex: 1, backgroundColor: Colors.bg, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, paddingHorizontal: 16, paddingVertical: 12, fontSize: 20, color: Colors.textPrimary, fontWeight: '900' },
  inputLabel: { fontSize: 10, color: Colors.textMuted, marginBottom: 4, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 },

  emptyOrders: { alignItems: 'center', paddingVertical: Spacing.xxl, gap: Spacing.sm },
  emptyText: { fontSize: Typography.sm, color: Colors.textMuted, fontWeight: '500' },

  orderCard: { borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.md, backgroundColor: Colors.bg, borderWidth: 1, borderColor: Colors.borderLight },
  orderTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.sm },
  orderId: { fontSize: 11, color: Colors.textMuted, fontWeight: '800', letterSpacing: 0.5 },
  orderMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  orderDate: { fontSize: 10, color: Colors.textMuted },
  orderTotal: { fontSize: 14, fontWeight: '900', color: Colors.textPrimary },
  orderItem: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
  orderMore: { fontSize: 10, color: Colors.textMuted, marginTop: 4, fontStyle: 'italic' },
});
