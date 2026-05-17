// app/orders/new.tsx
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView,
  StyleSheet, Alert, KeyboardAvoidingView, Platform, FlatList, TextInput,
  ActivityIndicator, Modal, TouchableOpacity
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius, Shadow, Gradients, formatCurrency } from '@/constants/theme';
import { createOrder, createStore } from '@/lib/api';
import { useDataStore, addOrderOptimistic, addStoreOptimistic } from '@/hooks/useDataStore';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { Input, SearchBar, QuickCreateCard } from '@/components/ui';
import { OrderItemRow, OrderRow } from '@/components/OrderItemRow';
import type { StoreWithLatestOrder, Material, Order } from '@/types';

/**
 * NewOrderScreen - Manual Order Creation Module.
 * Two-step flow: 1. Client selection (searchable list) -> 2. Line item entry (with material suggestions).
 * Includes firm-based margin calculation for standardized billing.
 */
export default function NewOrderScreen() {
  const { t, tData } = useLanguage();
  const { profile } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams<{ store_id?: string }>();

  const [search, setSearch] = useState('');
  const ownerId = profile?.role === 'owner' ? profile?.id : profile?.owner_id;
  const { stores, materials, loading, refresh } = useDataStore(ownerId);
  const [selectedStore, setSelectedStore] = useState<StoreWithLatestOrder | null>(null);
  const [rows, setRows] = useState<OrderRow[]>([{ id: Math.random().toString(), name: '', base_price: '', unit: 'kg', quantity: '' }]);
  const [notes,  setNotes]  = useState('');
  const [saving, setSaving] = useState(false);
  const [step,   setStep]   = useState<'client' | 'items' | 'success'>('client');
  const [orderId, setOrderId] = useState<string | null>(null);

  // Handle store_id from navigation params (e.g. from Client Details)
  useEffect(() => {
    if (params.store_id && stores.length > 0) {
      const found = stores.find(st => st.id === params.store_id);
      if (found) { setSelectedStore(found); setStep('items'); }
    }
  }, [params.store_id, stores]);

  const handleOneTouchCreate = async (name: string) => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      if (!ownerId) throw new Error("Authentication context lost.");
      const newStore = await createStore({ 
        name: name.trim(),
        margin_percentage: 0,
        owner_id: ownerId,
      });
      addStoreOptimistic(newStore as StoreWithLatestOrder);
      setSelectedStore(newStore as StoreWithLatestOrder);
      setStep('items');
      setSearch('');
      void refresh(); // Background sync to replace optimistic entry
    } catch (e: any) {
      if (e.code === '23505') {
        Alert.alert(t('error'), 'A client with this name already exists.');
      } else {
        Alert.alert(t('error'), (e as Error).message);
      }
    } finally {
      setSaving(false);
    }
  };

  const addRow = useCallback(() => {
    setRows(prev => [...prev, { id: Math.random().toString(), name: '', base_price: '', unit: 'kg', quantity: '' }]);
  }, []);

  const updateRow = useCallback((id: string, updates: Partial<OrderRow>) => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
  }, []);

  const removeRow = useCallback((id: string) => {
    setRows(prev => prev.length > 1 ? prev.filter(r => r.id !== id) : prev);
  }, []);

  const onSelectMaterial = useCallback((id: string, mat: Material) => {
    setRows(prev => prev.map(r => r.id === id ? {
        ...r,
        name: mat.name,
        base_price: mat.base_price.toString(),
        unit: mat.unit,
        material_id: mat.id,
        is_new: false
    } : r));
  }, []);

  const marginMultiplier = useMemo(() => {
    const margin = selectedStore?.margin_percentage ? Number(selectedStore.margin_percentage) : 0;
    return 1 + (margin / 100);
  }, [selectedStore]);

  const grandTotal = useMemo(() => {
    return rows.reduce((acc, row) => {
      const price = Number(row.base_price) || 0;
      const qty = Number(row.quantity) || 0;
      return acc + (Math.round(price * marginMultiplier) * qty);
    }, 0);
  }, [rows, marginMultiplier]);

  const handleSubmit = async () => {
    if (!selectedStore) return Alert.alert(t('required'), t('err_select_client'));
    const validRows = rows.filter(r => r.name.trim() && Number(r.quantity) > 0);
    if (!validRows.length) return Alert.alert(t('required'), t('err_add_product'));

    setSaving(true);
    try {
      if (!ownerId) throw new Error("Firm owner context is missing.");

      const items = validRows.map(r => ({
        material_id: r.material_id,
        name: r.name,
        base_price: Number(r.base_price),
        unit: r.unit,
        quantity: Number(r.quantity)
      }));

      const prices = validRows.map(r => {
        const unitPrice = Math.round(Number(r.base_price) * marginMultiplier);
        return { 
          unit_price: unitPrice, 
          subtotal: unitPrice * Number(r.quantity) 
        };
      });

      const res = await createOrder(
        { 
          store_id: selectedStore.id, 
          notes: notes?.trim() || null, 
          items,
          owner_id: ownerId
        },
        prices
      );
      
      addOrderOptimistic({
          ...res,
          stores: selectedStore // linked for UI
      } as unknown as Order);

      setOrderId(res.id);
      setStep('success');
      void refresh(); // Full sync in background
    } catch (e) {
      Alert.alert(t('error'), (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const filteredStores = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return stores;
    return stores.filter((s) => {
      const nameMatch = tData(s.name).toLowerCase().includes(q);
      const areaMatch = (s.area || '').toLowerCase().includes(q);
      const phoneMatch = (s.phone || '').includes(q);
      return nameMatch || areaMatch || phoneMatch;
    });
  }, [stores, search, tData]);

  const exactMatch = useMemo(() => 
    filteredStores.some(s => tData(s.name).toLowerCase() === search.trim().toLowerCase()),
  [filteredStores, search, tData]);

  const renderClientStep = () => (
    <View style={{ flex: 1 }}>
      <Text style={styles.stepTitle}>{t('select_client_title')}</Text>
      <View style={styles.searchContainer}>
        <SearchBar value={search} onChangeText={setSearch} placeholder={t('search_placeholder')} />
      </View>

      <FlatList
        data={filteredStores}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ paddingHorizontal: Spacing.xl, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        ListFooterComponent={search.trim() && !exactMatch ? (
          <QuickCreateCard 
            title={t('create_new_client')}
            searchTerm={search.trim()}
            onPress={() => handleOneTouchCreate(search.trim())}
            loading={saving}
          />
        ) : null}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => { setSelectedStore(item); setStep('items'); }}
            activeOpacity={0.8} style={[styles.clientRow, Shadow.md]}>
            <LinearGradient colors={Gradients.amber} style={styles.rowAvatar}>
              <Text style={styles.rowAvatarText}>{tData(item.name).charAt(0).toUpperCase()}</Text>
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowName}>{tData(item.name)}</Text>
              <View style={styles.metaRow}>
                {item.area && <><Ionicons name="location" size={12} color={Colors.textSecondary} /><Text style={styles.rowSub}>{item.area}</Text></>}
                {item.phone && <><Ionicons name="call" size={12} color={Colors.textSecondary} style={{ marginLeft: 10 }} /><Text style={styles.rowSub}>{item.phone}</Text></>}
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.textSecondary} />
          </TouchableOpacity>
        )}
      />
    </View>
  );

  const renderSuccessStep = () => {
    const validRows = rows.filter(r => r.name.trim() && Number(r.quantity) > 0);
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: Spacing.xl }]}>
        <View style={[styles.successCard, Shadow.lg]}>
          <LinearGradient colors={['#10B981', '#059669']} style={styles.successIconBg}>
            <Ionicons name="checkmark-done" size={60} color={Colors.white} />
          </LinearGradient>
          
          <Text style={styles.successTitle}>{t('done')}</Text>
          <Text style={styles.successSub}>{t('order_placed_msg')}</Text>
          
          <View style={styles.successDetailRow}>
            <Text style={styles.successDetailLabel}>{t('order_number')}</Text>
            <Text style={styles.successDetailValue}>{orderId?.slice(0, 8).toUpperCase()}</Text>
          </View>

          <View style={[styles.successDetailRow, { borderBottomWidth: 0, paddingBottom: 4 }]}>
            <Text style={[styles.successDetailLabel, { fontWeight: Typography.bold, color: Colors.textPrimary }]}>
              {t('items_label')}
            </Text>
          </View>

          <View style={styles.successItemsContainer}>
            <ScrollView style={{ maxHeight: 200 }} showsVerticalScrollIndicator={false}>
              {validRows.map((item, idx) => {
                const itemPrice = Math.round((Number(item.base_price) || 0) * marginMultiplier);
                const subtotal = itemPrice * (Number(item.quantity) || 0);
                return (
                  <View key={item.id} style={[styles.successItemRow, idx === 0 && { borderTopWidth: 0 }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.successItemName} numberOfLines={1}>{item.name}</Text>
                      <Text style={styles.successItemQty}>{item.quantity} {item.unit} × {formatCurrency(itemPrice)}</Text>
                    </View>
                    <Text style={styles.successItemTotal}>{formatCurrency(subtotal)}</Text>
                  </View>
                );
              })}
            </ScrollView>
          </View>

          <View style={[styles.successDetailRow, { borderTopWidth: 1, borderTopColor: Colors.borderLight, marginTop: 10 }]}>
            <Text style={[styles.successDetailLabel, { fontWeight: Typography.bold, color: Colors.textPrimary }]}>
              {t('grand_total_label')}
            </Text>
            <Text style={[styles.successDetailValue, { color: Colors.amber, fontSize: Typography.md }]}>
              {formatCurrency(grandTotal)}
            </Text>
          </View>

          <TouchableOpacity 
            style={styles.successButtonPrimary} 
            onPress={() => router.replace('/(tabs)/orders')}
          >
            <Text style={styles.successButtonTextPrimary}>{t('view_orders')}</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.successButtonSecondary} 
            onPress={() => {
              setRows([{ id: Math.random().toString(), name: '', base_price: '', unit: 'kg', quantity: '' }]);
              setNotes('');
              setStep('client');
              setOrderId(null);
              setSelectedStore(null);
            }}
          >
            <Text style={styles.successButtonTextSecondary}>{t('new_order')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderItemsStep = () => (
    <>
      <View style={[styles.clientBanner, Shadow.md]}>
        <View style={styles.bannerIconBg}>
          <Ionicons name="storefront-outline" size={20} color={Colors.amber} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.bannerLabel}>{t('selected_client_label') || 'SELECTED CLIENT'}</Text>
          <Text style={styles.clientBannerName}>{tData(selectedStore?.name ?? '')}</Text>
        </View>
        <TouchableOpacity onPress={() => setStep('client')} style={styles.changeBtnTouch}>
          <Text style={styles.changeBtn}>{t('change_btn')}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tableHeader}>
        <Text style={[styles.headerCell, { flex: 1 }]}>{t('product_name_header') || 'Product'}</Text>
        <Text style={[styles.headerCell, { width: 45, textAlign: 'center' }]}>{t('unit') || 'Unit'}</Text>
        <Text style={[styles.headerCell, { width: 40, textAlign: 'center' }]}>{t('qty_header') || 'Qty'}</Text>
        <Text style={[styles.headerCell, { width: 70, textAlign: 'center' }]}>{t('price_header') || 'Price'}</Text>
        <Text style={[styles.headerCell, { minWidth: 90, textAlign: 'right', paddingRight: 32 }]}>{t('total_header') || 'Total'}</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} keyboardShouldPersistTaps="handled">
        {rows.map((row, index) => (
          <OrderItemRow 
            key={row.id}
            row={row}
            index={index}
            isLast={rows.length === 1}
            materials={materials}
            multiplier={marginMultiplier}
            onUpdate={updateRow}
            onRemove={removeRow}
            onSelectMaterial={onSelectMaterial}
            tData={tData}
          />
        ))}

        <TouchableOpacity onPress={addRow} style={styles.addRowContainer} activeOpacity={0.7}>
          <View style={styles.plusCircle}>
             <Ionicons name="add" size={20} color={Colors.white} />
          </View>
          <Text style={styles.addRowLink}>{t('add_more_product')}</Text>
        </TouchableOpacity>

        <View style={{ paddingHorizontal: Spacing.xl, marginTop: 25 }}>
           <Text style={styles.notesLabel}>{t('notes_optional')}</Text>
           <TextInput 
              value={notes} 
              onChangeText={setNotes}
              placeholder={t('notes_placeholder')}
              multiline
              numberOfLines={2}
              style={styles.notesInput}
           />
        </View>
      </ScrollView>

      <View style={[styles.bottomBar, Shadow.lg]}>
        <View>
          <Text style={styles.bottomLabel}>{t('grand_total_label')}</Text>
          <Text style={styles.bottomTotal}>{formatCurrency(grandTotal)}</Text>
        </View>
        <TouchableOpacity onPress={handleSubmit} disabled={saving} activeOpacity={0.85}>
          <LinearGradient colors={saving ? [Colors.border, Colors.border] : Gradients.amber}
            style={styles.nextBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            {saving ? (
              <ActivityIndicator size="small" color={Colors.white} style={{ marginRight: 8 }} />
            ) : (
              <Ionicons name="cart-outline" size={18} color={Colors.white} style={{ marginRight: 8 }} />
            )}
            <Text style={styles.nextBtnText}>
              {saving ? t('saving_btn') : t('place_order_btn')}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </>
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.container}>
        {step === 'client' && renderClientStep()}
        {step === 'items' && renderItemsStep()}
        {step === 'success' && renderSuccessStep()}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  searchContainer: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.md },
  stepTitle: {
    fontSize: Typography.lg, fontWeight: Typography.black,
    color: Colors.textPrimary, padding: Spacing.xl, paddingBottom: Spacing.md,
  },
  clientRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    borderRadius: Radius.xl, padding: Spacing.lg, marginBottom: Spacing.md,
    backgroundColor: Colors.white, ...Shadow.sm,
  },
  rowAvatar: { width: 44, height: 44, borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center' },
  rowAvatarText: { fontSize: Typography.base, fontWeight: Typography.bold, color: Colors.white },
  rowName: { fontSize: Typography.base, fontWeight: Typography.bold, color: Colors.textPrimary },
  rowSub:  { fontSize: 13, color: Colors.textSecondary },

  clientBanner: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    padding: Spacing.md, marginHorizontal: Spacing.xl, marginBottom: Spacing.lg,
    marginTop: 20,
    borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.amber + '30', backgroundColor: Colors.white,
  },
  bannerIconBg: { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.amber + '10', alignItems: 'center', justifyContent: 'center' },
  bannerLabel: { fontSize: 9, fontWeight: '900', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 },
  clientBannerName: { fontSize: Typography.base, fontWeight: Typography.bold, color: Colors.textPrimary },
  changeBtnTouch: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: Radius.md, backgroundColor: Colors.bg },
  changeBtn: { fontSize: 12, color: Colors.amber, fontWeight: Typography.black },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },

  tableHeader: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: 'rgba(0,0,0,0.02)',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    marginBottom: 4,
  },
  headerCell: {
    fontSize: 10,
    fontWeight: Typography.black,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.03)',
  },
  tableRowAlt: {
    backgroundColor: 'rgba(255, 191, 0, 0.02)',
  },
  cellInput: {
    fontSize: 13,
    paddingVertical: 8,
    paddingHorizontal: 8,
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    height: 40,
    borderWidth: 1,
    borderColor: Colors.border,
    marginHorizontal: 2,
    color: Colors.textPrimary,
  },
  subtotalText: {
    fontSize: 13,
    fontWeight: Typography.black,
    color: Colors.textPrimary,
    marginRight: 4,
  },
  inlineRemoveBtn: { padding: 4 },
  tableSuggestions: {
    position: 'absolute',
    top: 48,
    left: Spacing.lg,
    right: Spacing.lg,
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    zIndex: 1000,
    ...Shadow.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  suggestionItem: {
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  suggestionText: { fontSize: 13, color: Colors.textPrimary },
  addRowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.lg,
    gap: Spacing.sm,
    backgroundColor: Colors.amber + '05',
    paddingVertical: Spacing.md,
    marginHorizontal: Spacing.xl,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.amber + '20',
    borderStyle: 'dashed',
    justifyContent: 'center',
  },
  plusCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.amber,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addRowLink: { fontSize: Typography.sm, fontWeight: Typography.bold, color: Colors.amber },
  notesLabel: { fontSize: 11, fontWeight: '900', color: Colors.textMuted, textTransform: 'uppercase', marginBottom: 6 },
  notesInput: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    height: 60,
    textAlignVertical: 'top',
    fontSize: 13,
  },
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg,
    backgroundColor: Colors.white, borderTopWidth: 1, borderTopColor: Colors.border,
    ...Shadow.lg,
  },
  bottomLabel: { fontSize: 10, fontWeight: '900', color: Colors.textMuted, textTransform: 'uppercase' },
  bottomTotal: { fontSize: 24, fontWeight: Typography.black, color: Colors.amber },
  nextBtn: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 24, paddingVertical: 14, borderRadius: Radius.lg,
    ...Shadow.sm,
  },
  nextBtnText: { fontSize: Typography.base, fontWeight: Typography.black, color: Colors.white },
  
  successCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xxl,
    padding: 30,
    width: '100%',
    alignItems: 'center',
    ...Shadow.lg,
  },
  successIconBg: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    ...Shadow.sm,
  },
  successTitle: { fontSize: 26, fontWeight: Typography.black, color: Colors.textPrimary, marginBottom: 8 },
  successSub: { fontSize: 15, color: Colors.textSecondary, textAlign: 'center', marginBottom: 30, lineHeight: 22 },
  successDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  successDetailLabel: { fontSize: 13, color: Colors.textSecondary },
  successDetailValue: { fontSize: 13, fontWeight: Typography.bold, color: Colors.textPrimary },
  successButtonPrimary: {
    backgroundColor: Colors.amber,
    width: '100%',
    paddingVertical: 16,
    borderRadius: Radius.xl,
    alignItems: 'center',
    marginTop: 30,
    ...Shadow.sm,
  },
  successButtonTextPrimary: { color: Colors.white, fontSize: 15, fontWeight: Typography.black },
  successButtonSecondary: { width: '100%', paddingVertical: 16, alignItems: 'center', marginTop: 10 },
  successButtonTextSecondary: { color: Colors.textSecondary, fontSize: 13, fontWeight: '700' },
  successItemsContainer: {
    width: '100%',
    marginVertical: 10,
    backgroundColor: Colors.bg,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  successItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  successItemName: { fontSize: 14, fontWeight: Typography.bold, color: Colors.textPrimary },
  successItemQty: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
  successItemTotal: { fontSize: 14, fontWeight: Typography.black, color: Colors.textPrimary },

  modalSubmitBtn: { marginTop: Spacing.lg, borderRadius: Radius.lg, overflow: 'hidden' },
  modalSubmitGradient: { paddingVertical: Spacing.md, alignItems: 'center', justifyContent: 'center' },
  modalSubmitText: { color: Colors.white, fontSize: Typography.base, fontWeight: Typography.bold },
});