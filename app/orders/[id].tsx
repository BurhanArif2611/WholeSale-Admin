// app/orders/[id].tsx
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView,
  StyleSheet, Alert, RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius, Shadow, Gradients, STATUS_CONFIG, formatCurrency, formatDate } from '@/constants/theme';

import { useLanguage } from '@/hooks/useLanguage';
import { fetchOrder, updateOrderStatus, deleteOrder, updateOrder } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useDataStore, addOrderOptimistic } from '@/hooks/useDataStore';
import { StatusBadge, Input } from '@/components/ui';
import { OrderItemRow, OrderRow } from '@/components/OrderItemRow';
import type { Order, OrderStatus, Material } from '@/types';

export default function OrderDetailScreen() {
  const { t } = useLanguage();
  const { profile } = useAuth();
  const { id, edit } = useLocalSearchParams<{ id: string; edit?: string }>();
  const router  = useRouter();
  
  const ownerId = profile?.owner_id || profile?.id;
  const { orders } = useDataStore(ownerId);
  
  // NANO-LATENCY: Try to find order in global cache first
  const cachedOrder = orders.find(o => o.id === id);
  
  const [order, setOrder]   = useState<Order | null>(cachedOrder || null);
  const [loading, setLoading] = useState(!cachedOrder);
  const [refreshing, setRefreshing] = useState(false);

  // Edit States
  const [isEditing, setIsEditing] = useState(false);
  const [localRows, setLocalRows] = useState<OrderRow[]>([]);
  const [localNotes, setLocalNotes] = useState('');
  const [localDate, setLocalDate] = useState('');
  const [saving, setSaving] = useState(false);

  const { materials, refresh: globalRefresh } = useDataStore(ownerId);

  const load = useCallback(async (silent = false) => {
    if (!ownerId) return;
    if (!silent) setLoading(true);
    try {
      const found = await fetchOrder(id, ownerId);
      if (found) setOrder(found);
    } catch (e) { 
      console.error('[OrderDetail] Fetch failed:', e); 
    }
    finally { setLoading(false); setRefreshing(false); }
  }, [id, ownerId]);

  useEffect(() => { 
    // Always sync in background, but only "load" visually if we don't have cache
    void load(!!cachedOrder); 
  }, [id]);

  useEffect(() => {
    if (edit === 'true' && order && !isEditing) {
        enterEditMode();
    }
  }, [edit, order, isEditing]);

  const handleStatus = async (status: OrderStatus) => {
    if (!order) return;
    
    // Optimistic Update
    const oldOrder = order;
    setOrder({ ...order, status });

    try { 
      await updateOrderStatus(order.id, status); 
      // Silent background refresh
      void load(); 
    } catch (e) { 
      setOrder(oldOrder); // Rollback
      Alert.alert('Error', (e as Error).message); 
    }
  };

  const handleDelete = () =>
    Alert.alert('Delete Order', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await deleteOrder(id); router.back(); }
        catch (e) { Alert.alert('Error', (e as Error).message); }
      }},
    ]);

  const enterEditMode = () => {
    if (!order) return;
    setIsEditing(true);
    setLocalNotes(order.notes || '');
    setLocalDate(order.date);
    
    // Convert order_items to OrderRows
    const rows: OrderRow[] = (order.order_items || []).map(item => ({
      id: item.id,
      name: item.material_name || '',
      material_id: item.material_id || undefined,
      quantity: String(item.quantity),
      unit: 'pcs', // fallback, will be overwritten by material info if available
      base_price: String(item.price_at_time_of_sale / (1 + (order.stores?.margin_percentage || 0) / 100)),
      is_new: false
    }));
    
    // Enrich with material unit if we have the material in cache
    rows.forEach(r => {
        const m = materials.find(mat => mat.id === r.material_id);
        if (m) {
            r.unit = m.unit;
            r.base_price = String(m.base_price);
        }
    });

    setLocalRows(rows.length > 0 ? rows : [{ id: Math.random().toString(), name: '', base_price: '', unit: 'kg', quantity: '' }]);
  };

  const handleUpdateRow = useCallback((id: string, updates: Partial<OrderRow>) => {
    setLocalRows(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
  }, []);

  const handleRemoveRow = useCallback((id: string) => {
    setLocalRows(prev => prev.length > 1 ? prev.filter(r => r.id !== id) : prev);
  }, []);

  const handleSelectMaterial = useCallback((id: string, mat: Material) => {
    setLocalRows(prev => prev.map(r => r.id === id ? {
        ...r,
        name: mat.name,
        base_price: String(mat.base_price),
        unit: mat.unit,
        material_id: mat.id,
        is_new: false
    } : r));
  }, []);

  const addRow = () => {
    setLocalRows(prev => [...prev, { id: Math.random().toString(), name: '', base_price: '', unit: 'kg', quantity: '' }]);
  };

  const marginMultiplier = useMemo(() => {
    const margin = order?.stores?.margin_percentage ? Number(order.stores.margin_percentage) : 0;
    return 1 + (margin / 100);
  }, [order]);

  const localGrandTotal = useMemo(() => {
    return localRows.reduce((acc, row) => {
      const price = Number(row.base_price) || 0;
      const qty = Number(row.quantity) || 0;
      return acc + (Math.round(price * marginMultiplier) * qty);
    }, 0);
  }, [localRows, marginMultiplier]);

  const handleSave = async () => {
    if (!order || !ownerId) return;
    const validRows = localRows.filter(r => r.name.trim() && Number(r.quantity) > 0);
    if (!validRows.length) return Alert.alert('Required', 'Please add at least one product.');

    setSaving(true);
    try {
      const items = validRows.map(r => ({
        material_id: r.material_id,
        name: r.name,
        base_price: Number(r.base_price),
        unit: r.unit,
        quantity: Number(r.quantity),
        fixed_unit_price: Math.round(Number(r.base_price) * marginMultiplier)
      }));

      const res = await updateOrder(order.id, {
        owner_id: ownerId,
        notes: localNotes.trim() || null,
        date: localDate,
        items
      });

      setOrder({ ...order, ...res, order_items: res.order_items || [] }); // Update local state
      setIsEditing(false);
      globalRefresh(true); // Trigger background sync
      Alert.alert('Success', 'Order updated successfully.');
    } catch (e) {
      Alert.alert('Error', (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (loading || !order) return (
    <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
      <Text style={{ color: Colors.textMuted }}>Loading...</Text>
    </View>
  );

  const subtotalItems = (order.order_items ?? []).reduce((s, i) => s + Number(i.subtotal), 0);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} tintColor={Colors.amber}
        onRefresh={() => { setRefreshing(true); void load(); }} />}
      showsVerticalScrollIndicator={false}>

      {/* Header */}
      <View style={[styles.header, Shadow.clay]}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.orderId}>#{order.id.slice(0, 8).toUpperCase()}</Text>
            {isEditing ? (
                 <View style={{ marginTop: 10 }}>
                    <Input 
                        label="Order Date (YYYY-MM-DD)"
                        value={localDate}
                        onChangeText={setLocalDate}
                        placeholder="2024-03-31"
                    />
                 </View>
            ) : (
                <View style={styles.metaRow}>
                    <Ionicons name="calendar-outline" size={12} color={Colors.textSecondary} />
                    <Text style={styles.metaText}>{formatDate(order.date)}</Text>
                </View>
            )}
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {!isEditing && (
                 <TouchableOpacity onPress={enterEditMode} style={styles.editCircle}>
                    <Ionicons name="create-outline" size={24} color={Colors.amber} />
                </TouchableOpacity>
            )}
            <StatusBadge status={order.status} />
          </View>
        </View>
        <View style={styles.headerClient}>
          <LinearGradient colors={Gradients.amber} style={styles.clientAvatar}>
            <Text style={styles.clientAvatarText}>
              {(order.stores?.name ?? '?').charAt(0).toUpperCase()}
            </Text>
          </LinearGradient>
          <View>
            <Text style={styles.clientName}>{order.stores?.name ?? '—'}</Text>
            {order.stores?.area && (
              <View style={styles.metaRow}>
                <Ionicons name="location-outline" size={12} color={Colors.textSecondary} />
                <Text style={styles.metaText}>{order.stores.area}</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    
      {isEditing ? (
          <View style={[styles.section, Shadow.sm]}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="list-outline" size={16} color={Colors.amber} />
              <Text style={styles.sectionTitle}>Modify Items</Text>
            </View>
            
            <View style={styles.editHeader}>
                <Text style={[styles.headerCell, { flex: 1 }]}>Product</Text>
                <Text style={[styles.headerCell, { width: 45, textAlign: 'center' }]}>Unit</Text>
                <Text style={[styles.headerCell, { width: 40, textAlign: 'center' }]}>Qty</Text>
                <Text style={[styles.headerCell, { width: 70, textAlign: 'center' }]}>Price</Text>
                <Text style={[styles.headerCell, { minWidth: 60, textAlign: 'right' }]}></Text>
            </View>

            {localRows.map((row, index) => (
                <OrderItemRow 
                    key={row.id}
                    row={row}
                    index={index}
                    isLast={localRows.length === 1}
                    materials={materials}
                    multiplier={marginMultiplier}
                    onUpdate={handleUpdateRow}
                    onRemove={handleRemoveRow}
                    onSelectMaterial={handleSelectMaterial}
                    tData={(v) => v || ''}
                />
            ))}
            
            <TouchableOpacity onPress={addRow} style={styles.addRowBtn}>
                <Ionicons name="add-circle-outline" size={20} color={Colors.amber} />
                <Text style={styles.addRowText}>Add Item</Text>
            </TouchableOpacity>

            <View style={{ marginTop: 20 }}>
                <Input 
                    label="Internal Notes"
                    value={localNotes}
                    onChangeText={setLocalNotes}
                    multiline
                    numberOfLines={3}
                />
            </View>

            <View style={styles.editActions}>
                <TouchableOpacity onPress={() => setIsEditing(false)} style={styles.cancelBtn}>
                    <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSave} disabled={saving} style={styles.saveBtn}>
                    <LinearGradient colors={Gradients.amber} style={styles.saveGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                        <Text style={styles.saveText}>{saving ? 'Saving...' : 'Save Changes'}</Text>
                    </LinearGradient>
                </TouchableOpacity>
            </View>
          </View>
      ) : (
          <>
      {/* Status update */}
      <View style={[styles.section, Shadow.sm]}>
        <View style={styles.sectionTitleRow}>
          <Ionicons name="swap-horizontal-outline" size={16} color={Colors.amber} />
          <Text style={styles.sectionTitle}>{t('status_label') || 'Update Status'}</Text>
        </View>
        <View style={styles.statusActionRow}>
          <TouchableOpacity 
            onPress={() => void handleStatus(order.status === 'Paid' ? 'New' : 'Paid')}
            activeOpacity={0.8} 
            style={[styles.statusToggleBtn, { backgroundColor: order.status === 'Paid' ? Colors.successBg : Colors.soft.amber }]}
          >
            <Ionicons 
              name={order.status === 'Paid' ? 'checkmark-circle' : 'time-outline'} 
              size={20} 
              color={order.status === 'Paid' ? Colors.success : Colors.amber} 
            />
            <Text style={[styles.statusToggleText, { color: order.status === 'Paid' ? Colors.success : Colors.amber }]}>
              {order.status === 'Paid' ? t('mark_as_unpaid') : t('pay_full')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>



      {/* Items */}
      <View style={[styles.section, Shadow.sm]}>
        <View style={styles.sectionTitleRow}>
          <Ionicons name="list-outline" size={16} color={Colors.amber} />
          <Text style={styles.sectionTitle}>Items ({(order.order_items ?? []).length})</Text>
        </View>
        {(order.order_items ?? []).map((item) => (
          <View key={item.id} style={styles.itemRow}>
            <LinearGradient colors={Gradients.purple} style={styles.itemIcon}>
              <Ionicons name="cube" size={14} color={Colors.white} />
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemName}>{item.material_name}</Text>
              <Text style={styles.itemMeta}>
                {item.quantity} units × {formatCurrency(item.price_at_time_of_sale)}
              </Text>
            </View>
            <Text style={styles.itemSubtotal}>{formatCurrency(item.subtotal)}</Text>
          </View>
        ))}
      </View>

      {/* Totals */}
      <View style={[styles.section, Shadow.clay]}>
        <View style={styles.sectionTitleRow}>
          <Ionicons name="calculator-outline" size={16} color={Colors.amber} />
          <Text style={styles.sectionTitle}>Summary</Text>
        </View>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Items Subtotal</Text>
          <Text style={styles.totalValue}>{formatCurrency(subtotalItems)}</Text>
        </View>
        {Number(order.grand_total) !== subtotalItems && (
          <View style={styles.totalRow}>
            <View style={styles.metaRow}>
              <Ionicons name="pricetag-outline" size={13} color={Colors.amber} />
              <Text style={[styles.totalLabel, { color: Colors.amber }]}>Client Charge</Text>
            </View>
            <Text style={[styles.totalValue, { color: Colors.amber }]}>
              +{formatCurrency(Number(order.grand_total) - subtotalItems)}
            </Text>
          </View>
        )}
        <View style={[styles.totalRow, styles.grandTotalRow]}>
          <Text style={styles.grandTotalLabel}>Grand Total</Text>
          <Text style={styles.grandTotalValue}>{formatCurrency(order.grand_total)}</Text>
        </View>
      </View>


      {order.notes && (
        <View style={[styles.section, Shadow.sm]}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="document-text-outline" size={16} color={Colors.amber} />
            <Text style={styles.sectionTitle}>Notes</Text>
          </View>
          <Text style={styles.notes}>{order.notes}</Text>
        </View>
      )}

      {/* Delete */}
      {!isEditing && (
        <TouchableOpacity onPress={handleDelete} activeOpacity={0.8}>
            <LinearGradient colors={Gradients.danger} style={[styles.deleteBtn, Shadow.md]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            <Ionicons name="trash-outline" size={18} color={Colors.white} />
            <Text style={styles.deleteBtnText}>Delete Order</Text>
            </LinearGradient>
        </TouchableOpacity>
      )}
      </>)}


      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  content:   { padding: Spacing.xl },

  header: {
    borderRadius: Radius.xl, padding: Spacing.xl,
    marginBottom: Spacing.xl, borderWidth: 1, borderColor: 'rgba(255,255,255,0.7)',
    backgroundColor: Colors.surface,
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.xl },
  orderId:   { fontSize: Typography.lg, fontWeight: Typography.black, color: Colors.textPrimary, letterSpacing: 1 },
  metaRow:   { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  metaText:  { fontSize: Typography.xs, color: Colors.textSecondary },
  headerClient: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  clientAvatar: { width: 44, height: 44, borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center' },
  clientAvatarText: { fontSize: Typography.lg, fontWeight: Typography.black, color: Colors.white },
  clientName: { fontSize: Typography.md, fontWeight: Typography.bold, color: Colors.textPrimary },

  section: { borderRadius: Radius.xl, padding: Spacing.xl, marginBottom: Spacing.md, borderWidth: 1, borderColor: 'rgba(255,255,255,0.7)', backgroundColor: Colors.surface },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.lg },
  sectionTitle: { fontSize: Typography.base, fontWeight: Typography.bold, color: Colors.textPrimary },

  statusActionRow: { marginTop: Spacing.sm },
  statusToggleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.md,
    paddingVertical: Spacing.lg, borderRadius: Radius.xl, borderWidth: 1, borderColor: 'rgba(255,255,255,0.7)',
  },
  statusToggleText: { fontSize: Typography.base, fontWeight: Typography.bold },

  itemRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  itemIcon: { width: 32, height: 32, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  itemName:     { fontSize: Typography.sm, fontWeight: Typography.semibold, color: Colors.textPrimary },
  itemMeta:     { fontSize: Typography.xs, color: Colors.textSecondary, marginTop: 2 },
  itemSubtotal: { fontSize: Typography.base, fontWeight: Typography.bold, color: Colors.textPrimary },

  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.sm },
  totalLabel: { fontSize: Typography.sm, color: Colors.textSecondary },
  totalValue: { fontSize: Typography.sm, fontWeight: Typography.semibold, color: Colors.textPrimary },
  grandTotalRow: { borderTopWidth: 1, borderTopColor: Colors.borderLight, marginTop: Spacing.sm, paddingTop: Spacing.md },
  grandTotalLabel: { fontSize: Typography.base, fontWeight: Typography.bold, color: Colors.textSecondary },
  grandTotalValue: { fontSize: Typography.xxl, fontWeight: Typography.black, color: Colors.amber },

  notes: { fontSize: Typography.sm, color: Colors.textSecondary, lineHeight: 22 },

  deleteBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
    borderRadius: Radius.lg, paddingVertical: Spacing.lg,
  },
  deleteBtnText: { fontSize: Typography.base, fontWeight: Typography.bold, color: Colors.white },

  editCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.white, alignItems: 'center', justifyContent: 'center', ...Shadow.sm },
  editHeader: { flexDirection: 'row', gap: 4, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.border, marginBottom: 8 },
  headerCell: { fontSize: 10, fontWeight: '900', color: Colors.textMuted, textTransform: 'uppercase' },
  addRowBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, borderStyle: 'dashed', borderWidth: 1, borderColor: Colors.amber, borderRadius: Radius.md, justifyContent: 'center', marginTop: 12 },
  addRowText: { color: Colors.amber, fontWeight: 'bold' },
  editActions: { flexDirection: 'row', gap: 12, marginTop: 24 },
  cancelBtn: { flex: 1, height: 50, borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.bg, borderWidth: 1, borderColor: Colors.border },
  cancelText: { fontWeight: 'bold', color: Colors.textSecondary },
  saveBtn: { flex: 2, height: 50, borderRadius: Radius.lg, overflow: 'hidden' },
  saveGrad: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  saveText: { color: Colors.white, fontWeight: '900' },
});