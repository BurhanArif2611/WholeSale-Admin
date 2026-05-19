import React from 'react';
import {
  View, Text, Modal,
  StyleSheet, ScrollView, Dimensions,
  TouchableOpacity, Alert, TextInput
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius, Shadow, Gradients, formatCurrency, formatDate } from '@/constants/theme';
import type { Order } from '@/types';

import { useLanguage } from '@/hooks/useLanguage';
import { useAuth } from '@/hooks/useAuth';
import { useDataStore } from '@/hooks/useDataStore';
import { OrderItemRow, OrderRow } from '@/components/OrderItemRow';
import { updateOrder } from '@/lib/api';
import { Input } from './ui';
import type { Material } from '@/types';

interface Props {
  visible: boolean;
  order: Order | null;
  onClose: () => void;
  onUpdateStatus?: (status: any) => Promise<void>;
  onDelete?: () => void;
}

export default function OrderDetailsSheet({ visible, order, onClose, onUpdateStatus, onDelete }: Props) {
  const { t, tData } = useLanguage();
  const router = useRouter();
  const { profile } = useAuth();
  const ownerId = profile?.role === 'owner' ? profile?.id : profile?.owner_id;
  
  const { materials, refresh: globalRefresh } = useDataStore(ownerId);
  
  const [isEditing, setIsEditing] = React.useState(false);
  const [localStoreId, setLocalStoreId] = React.useState('');
  const [localRows, setLocalRows] = React.useState<OrderRow[]>([]);
  const [localNotes, setLocalNotes] = React.useState('');
  const [localDate,  setLocalDate]  = React.useState('');
  const [localAdjustment, setLocalAdjustment] = React.useState('0');
  const [saving,     setSaving]     = React.useState(false);
  const [showStorePicker, setShowStorePicker] = React.useState(false);

  const { stores } = useDataStore(ownerId);

  const handleUpdateRow = React.useCallback((id: string, updates: Partial<OrderRow>) => {
    setLocalRows(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
  }, []);

  const handleRemoveRow = React.useCallback((id: string) => {
    setLocalRows(prev => prev.length > 1 ? prev.filter(r => r.id !== id) : prev);
  }, []);

  const handleSelectMaterial = React.useCallback((id: string, mat: Material) => {
    setLocalRows(prev => prev.map(r => r.id === id ? {
        ...r, name: mat.name, base_price: String(mat.base_price), unit: mat.unit, material_id: mat.id, is_new: false
    } : r));
  }, []);

  const addRow = React.useCallback(() => {
    setLocalRows(prev => [...prev, { id: Math.random().toString(), name: '', base_price: '', unit: 'kg', quantity: '' }]);
  }, []);

  // Sync edit state when order changes
  React.useEffect(() => {
    if (order && !isEditing) {
        setLocalStoreId(order.store_id);
        setLocalNotes(order.notes || '');
        setLocalDate(order.date);
        
        // Calculate initial adjustment if any (difference between items total and grand total)
        const itemsTotal = (order.order_items || []).reduce((s, i) => s + Number(i.subtotal), 0);
        setLocalAdjustment(String(Number(order.grand_total) - itemsTotal));
        
        const rows: OrderRow[] = (order.order_items || []).map(item => ({
            id: item.id,
            name: item.material_name || '',
            material_id: item.material_id || undefined,
            quantity: String(item.quantity),
            unit: 'pcs',
            base_price: String(item.price_at_time_of_sale / (1 + (order.stores?.margin_percentage || 0) / 100)),
            is_new: false
        }));

        rows.forEach(r => {
            const m = materials.find(mat => mat.id === r.material_id);
            if (m) { r.unit = m.unit; r.base_price = String(m.base_price); }
        });
        setLocalRows(rows);
    }
  }, [order, materials, isEditing]);

  if (!order) return null;

  const currentStore = stores.find(s => s.id === localStoreId) || order.stores;
  const marginMultiplier = 1 + ((currentStore?.margin_percentage || 0) / 100);

  const localItemsTotal = localRows.reduce((acc, row) => {
    const price = Number(row.base_price) || 0;
    const qty = Number(row.quantity) || 0;
    return acc + (Math.round(price * marginMultiplier) * qty);
  }, 0);

  const localGrandTotal = localItemsTotal + (Number(localAdjustment) || 0);

  const handleSave = async () => {
    if (!ownerId) return;
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

      await updateOrder(order.id, {
        owner_id: ownerId,
        store_id: localStoreId,
        notes: localNotes.trim() || null,
        date: localDate,
        items,
        adjustment: Number(localAdjustment) || 0
      });

      setIsEditing(false);
      globalRefresh(true); 
      onClose(); // Close sheet after successful save to confirm list update
      Alert.alert('Success', 'Order updated successfully.');
    } catch (e) {
      Alert.alert('Error', (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  // Assuming subtotal calculation if not directly present as a separate field in API
  const subtotal = order.order_items?.reduce((s, i) => s + (Number(i.subtotal) || 0), 0) || 0;
  const discount = subtotal - Number(order.grand_total);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.dismissArea} activeOpacity={1} onPress={onClose} />
        
        <View style={styles.sheet}>
          {/* Handle */}
          <View style={styles.handle} />

          <ScrollView 
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: 100 }}
          >
            {/* Header info */}
            <View style={styles.header}>
              <View style={styles.headerTitleRow}>
                <Text style={styles.orderNumber}>{t('order_number')}{order.id.slice(0, 4).toUpperCase()}</Text>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                    <TouchableOpacity 
                        onPress={() => setIsEditing(!isEditing)} 
                        delayPressIn={0}
                        style={[styles.editCircle, isEditing && styles.editActiveCircle]}
                    >
                    <Ionicons name={isEditing ? "close" : "create-outline"} size={24} color={isEditing ? Colors.white : Colors.amber} />
                  </TouchableOpacity>
                  
                  {!isEditing && onDelete && (
                    <TouchableOpacity onPress={onDelete} style={styles.trashCircle}>
                      <Ionicons name="trash-outline" size={24} color={Colors.danger} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
              {isEditing ? (
                  <View style={{ marginTop: 8, gap: 12 }}>
                    <TouchableOpacity 
                        style={styles.storePickerTrigger} 
                        onPress={() => setShowStorePicker(!showStorePicker)}
                    >
                        <Text style={styles.storePickerLabel}>Billed To:</Text>
                        <Text style={styles.storePickerValue}>{tData(currentStore?.name ?? 'Select Store')}</Text>
                        <Ionicons name="chevron-down" size={16} color={Colors.amber} />
                    </TouchableOpacity>

                    {showStorePicker && (
                        <View style={styles.storePickerDropdown}>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                {stores.map(s => (
                                    <TouchableOpacity 
                                        key={s.id} 
                                        style={[styles.storeOption, localStoreId === s.id && styles.storeOptionActive]}
                                        onPress={() => { setLocalStoreId(s.id); setShowStorePicker(false); }}
                                    >
                                        <Text style={[styles.storeOptionText, localStoreId === s.id && styles.storeOptionActiveText]}>
                                            {tData(s.name)}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>
                    )}

                    <Input 
                        label={t('label_date_iso')}
                        value={localDate}
                        onChangeText={setLocalDate}
                        placeholder={t('ph_date_iso')}
                        hint={t('ph_delivery_date')}
                    />
                  </View>
              ) : (
                  <>
                    <Text style={styles.storeName}>{tData(order.stores?.name || t('unknown_store'))}</Text>
                    <Text style={styles.date}>{formatDate(order.date)}</Text>
                  </>
              )}
            </View>

            <View style={styles.divider} />

            {/* Items List */}
            <Text style={styles.sectionLabel}>{t('items_label')}</Text>
            
            {isEditing ? (
                <>
                {localRows.map((row, index) => (
                    <OrderItemRow 
                        key={row.id}
                        row={row} index={index}
                        isLast={localRows.length === 1}
                        materials={materials}
                        multiplier={marginMultiplier}
                        onUpdate={handleUpdateRow}
                        onRemove={handleRemoveRow}
                        onSelectMaterial={handleSelectMaterial}
                        tData={(v) => v || ''}
                        compact={true}
                    />
                ))}
                <TouchableOpacity 
                    onPress={addRow} 
                    delayPressIn={0}
                    style={styles.addRowBtn}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Ionicons name="add-circle-outline" size={20} color={Colors.amber} />
                    <Text style={styles.addRowText}>Add Item</Text>
                </TouchableOpacity>

                <View style={{ marginTop: 20 }}>
                    <Input 
                        label={t('label_internal_notes')}
                        value={localNotes}
                        onChangeText={setLocalNotes}
                        multiline
                        numberOfLines={2}
                        placeholder={t('ph_internal_notes')}
                        hint={t('hint_notes')}
                    />
                </View>
                </>
            ) : (
                order.order_items?.map((item) => (
                    <View key={item.id} style={styles.itemRow}>
                    <Text style={styles.itemName}>
                        {tData(item.material_name)} <Text style={styles.itemQty}>× {Number(item.quantity).toFixed(1)}</Text>
                    </Text>
                    <Text style={styles.itemPrice}>{formatCurrency(item.subtotal)}</Text>
                    </View>
                ))
            )}

            <View style={[styles.divider, { marginTop: Spacing.lg }]} />

            {/* Financials */}
            <View style={styles.financeBox}>
              <View style={styles.financeRow}>
                <Text style={styles.financeLabel}>{t('subtotal_label')}</Text>
                <Text style={styles.financeValue}>{formatCurrency(isEditing ? localItemsTotal : subtotal)}</Text>
              </View>
              
              {isEditing ? (
                  <View style={[styles.financeRow, { paddingVertical: 8 }]}>
                    <Text style={styles.financeLabel}>Adjustment (+/-)</Text>
                    <TextInput 
                        value={localAdjustment}
                        onChangeText={setLocalAdjustment}
                        keyboardType="numbers-and-punctuation"
                        style={[styles.financeValue, { borderBottomWidth: 1, borderBottomColor: Colors.border, minWidth: 60, textAlign: 'right' }]}
                    />
                  </View>
              ) : (
                discount !== 0 && (
                    <View style={styles.financeRow}>
                    <Text style={styles.financeLabel}>{discount < 0 ? 'Adjustment' : t('discount_label')}</Text>
                    <Text style={[styles.financeValue, discount > 0 && { color: Colors.danger }]}>
                        {discount > 0 ? '-' : '+'} {formatCurrency(Math.abs(discount))}
                    </Text>
                    </View>
                )
              )}

              <View style={[styles.financeRow, { marginTop: 4 }]}>
                <Text style={styles.totalLabel}>{t('total_label')}</Text>
                <Text style={styles.totalValue}>{formatCurrency(isEditing ? localGrandTotal : order.grand_total)}</Text>
              </View>
            </View>

            {/* Actions */}
            {!isEditing && (
                <TouchableOpacity style={styles.ledgerLink} activeOpacity={0.7}>
                    <Text style={styles.ledgerLinkText}>{t('record_payment_ledger')}</Text>
                </TouchableOpacity>
            )}

            <View style={styles.btnRow}>
              {isEditing ? (
                  <>
                  <TouchableOpacity 
                    onPress={() => setIsEditing(false)} 
                    style={styles.cancelBtn}
                  >
                    <Text style={styles.cancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={handleSave} 
                    disabled={saving}
                    style={styles.saveBtn}
                  >
                    <LinearGradient colors={Gradients.amber} style={styles.saveGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                        <Text style={styles.saveText}>{saving ? 'Saving...' : 'Save Changes'}</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                  </>
              ) : (
                <TouchableOpacity 
                    style={[styles.payFullBtn, order.status === 'Paid' && styles.paidStatusBtn]} 
                    activeOpacity={0.8}
                    onPress={() => onUpdateStatus?.(order.status === 'Paid' ? 'New' : 'Paid')}
                >
                    <Ionicons 
                    name={order.status === 'Paid' ? 'checkmark-circle' : 'cash-outline'} 
                    size={24} 
                    color={Colors.white} 
                    />
                    <Text style={styles.payFullText}>
                    {order.status === 'Paid' ? t('mark_as_unpaid') : `${t('pay_full')} (${formatCurrency(order.grand_total)})`}
                    </Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  dismissArea: {
    flex: 1,
  },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    maxHeight: '90%',
    ...Shadow.lg,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E2E8F0',
    alignSelf: 'center',
    marginBottom: Spacing.lg,
  },
  header: {
    marginBottom: Spacing.md,
  },
  headerTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 0,
  },
  editCircle: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFFBEB', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#FEF3C7',
  },
  editActiveCircle: { backgroundColor: Colors.amber, borderColor: Colors.amber },
  trashCircle: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.dangerBg, alignItems: 'center', justifyContent: 'center',
  },
  orderNumber: {
    fontSize: Typography.xl,
    fontWeight: Typography.black,
    color: Colors.textPrimary,
  },
  storeName: {
    fontSize: Typography.md,
    fontWeight: Typography.semibold,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  date: {
    fontSize: Typography.sm,
    color: Colors.textMuted,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.md,
  },
  sectionLabel: {
    fontSize: Typography.sm,
    fontWeight: Typography.bold,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.md,
  },
  // View Mode Items
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  itemName: {
    fontSize: Typography.base,
    color: Colors.textPrimary,
    fontWeight: Typography.semibold,
  },
  itemQty: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    fontWeight: Typography.regular,
  },
  itemPrice: {
    fontSize: Typography.base,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
  },
  // Edit Mode Builder
  editHeader: { 
    flexDirection: 'row', gap: 4, paddingVertical: 8, 
    borderBottomWidth: 1, borderBottomColor: Colors.border, marginBottom: 8 
  },
  headerCell: { 
    fontSize: 10, fontWeight: '900', color: Colors.textMuted, 
    textTransform: 'uppercase' 
  },
  addRowBtn: { 
    flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, 
    borderStyle: 'dashed', borderWidth: 1, borderColor: Colors.amber, 
    borderRadius: Radius.md, justifyContent: 'center', marginTop: 12 
  },
  addRowText: { color: Colors.amber, fontWeight: 'bold' },
  
  financeBox: {
    gap: 4,
    marginBottom: Spacing.xl,
  },
  financeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  financeLabel: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
  },
  financeValue: {
    fontSize: Typography.sm,
    fontWeight: Typography.semibold,
    color: Colors.textPrimary,
  },
  totalLabel: {
    fontSize: Typography.md,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
  },
  totalValue: {
    fontSize: Typography.lg,
    fontWeight: Typography.black,
    color: Colors.textPrimary,
  },
  ledgerLink: {
    marginBottom: Spacing.xl,
  },
  ledgerLinkText: {
    color: '#3B82F6', // Indigo/Blue
    fontWeight: Typography.bold,
    fontSize: Typography.sm,
  },
  btnRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  payFullBtn: {
    flex: 1.2,
    backgroundColor: '#22C55E', // Green
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: Radius.full,
    paddingVertical: Spacing.lg,
    ...Shadow.sm,
  },
  paidStatusBtn: {
    backgroundColor: Colors.amber,
  },
  payFullText: {
    color: Colors.white,
    fontWeight: Typography.bold,
    fontSize: Typography.sm,
  },
  cancelBtn: { 
    flex: 1, height: 50, borderRadius: Radius.full, 
    alignItems: 'center', justifyContent: 'center', 
    backgroundColor: Colors.bg, borderWidth: 1, borderColor: Colors.border 
  },
  cancelText: { fontWeight: 'bold', color: Colors.textSecondary },
  saveBtn: { 
    flex: 2, height: 50, borderRadius: Radius.full, overflow: 'hidden' 
  },
  saveGrad: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  saveText: { color: Colors.white, fontWeight: '900' },
  
  // Store Picker
  storePickerTrigger: {
    flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, backgroundColor: Colors.bg, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border,
  },
  storePickerLabel: { fontSize: 12, fontWeight: 'bold', color: Colors.textMuted },
  storePickerValue: { flex: 1, fontSize: 13, fontWeight: 'bold', color: Colors.amber },
  storePickerDropdown: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.border },
  storeOption: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border, marginRight: 8 },
  storeOptionActive: { backgroundColor: Colors.amber, borderColor: Colors.amber },
  storeOptionText: { fontSize: 12, color: Colors.textSecondary },
  storeOptionActiveText: { color: Colors.white, fontWeight: 'bold' },
});
