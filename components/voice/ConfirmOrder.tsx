// components/voice/ConfirmOrder.tsx
import React from 'react';
import { View, Text, ScrollView, StyleSheet, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius, Gradients, formatCurrency } from '@/constants/theme';
import { useLanguage } from '@/hooks/useLanguage';
import { resolvePrice } from '@/lib/api';
import type { Store, Material } from '@/types';

interface ConfirmOrderProps {
  transcript: string;
  matchedStore: Store | null; 
  matchedItems: { material: Material; quantity: number }[];
  onUpdateItems: (items: { material: Material; quantity: number }[]) => void;
  notFound?: string[];
}

/**
 * ConfirmOrder - Verification screen for AI-extracted orders
 * Allows line-by-line editing of products, quantities, and prices prior to database commit.
 */
export const ConfirmOrder = React.memo(({ transcript, matchedStore, matchedItems, onUpdateItems, notFound = [] }: ConfirmOrderProps) => {
  const { t } = useLanguage();
  const itemsTotal = matchedItems.reduce((s, i) => s + resolvePrice(i.material.base_price, i.quantity, matchedStore?.margin_percentage ?? 0).subtotal, 0);
  const charge     = Number(matchedStore?.extra_charges ?? 0);
  const grandTotal = itemsTotal + charge;

  const handleUpdateQuantity = (index: number, qtyStr: string) => {
    const newItems = [...matchedItems];
    newItems[index] = { ...newItems[index], quantity: parseFloat(qtyStr) || 0 };
    onUpdateItems(newItems);
  };

  const handleUpdatePrice = (index: number, priceStr: string) => {
      const newItems = [...matchedItems];
      newItems[index] = { ...newItems[index], material: { ...newItems[index].material, base_price: parseFloat(priceStr) || 0 } };
      onUpdateItems(newItems);
  };

  const handleUpdateName = (index: number, name: string) => {
      const newItems = [...matchedItems];
      newItems[index] = { ...newItems[index], material: { ...newItems[index].material, name } };
      onUpdateItems(newItems);
  };

  return (
    <ScrollView 
      showsVerticalScrollIndicator={false} 
      contentContainerStyle={{ paddingBottom: Spacing.xxl }}
      style={{ flex: 1 }}
    >
      <View style={styles.transcriptBox}>
        <Ionicons name="mic-outline" size={13} color={Colors.textMuted} />
        <Text style={styles.transcriptText}>{transcript}</Text>
      </View>

      {/* Client Section */}
      <LinearGradient colors={Gradients.card} style={[styles.section, !matchedStore && styles.sectionError]}>
        <Text style={styles.sLabel}>CLIENT</Text>
        {matchedStore ? (
          <View style={styles.row}>
            <LinearGradient colors={Gradients.amber} style={styles.avatar}>
              <Text style={styles.avatarText}>{matchedStore.name[0]}</Text>
            </LinearGradient>
            <View>
              <Text style={styles.sValue}>{matchedStore.name}</Text>
              {matchedStore.area ? <Text style={styles.sMeta}>{matchedStore.area}</Text> : null}
            </View>
          </View>
        ) : (
          <View style={styles.row}>
            <Ionicons name="alert-circle" size={24} color={Colors.danger} />
            <Text style={[styles.sValue, { color: Colors.danger }]}>No client matched</Text>
          </View>
        )}
      </LinearGradient>

      {/* Items Section */}
      <LinearGradient colors={Gradients.card} style={styles.section}>
        <Text style={styles.sLabel}>ITEMS (EDITABLE)</Text>
        {matchedItems.length === 0 && !notFound.length && (
            <Text style={styles.emptyText}>No items found in transcript</Text>
        )}
        
        {matchedItems.map((item, idx) => {
          const p = resolvePrice(item.material.base_price, item.quantity, matchedStore?.margin_percentage ?? 0);
          return (
            <View key={idx} style={styles.itemRow}>
              <View style={{ flex: 1 }}>
                <TextInput
                  style={styles.itemNameInput}
                  value={item.material.name}
                  onChangeText={(v) => handleUpdateName(idx, v)}
                  placeholder={t('ph_product_name_row')}
                  accessibilityLabel={t('ph_product_name')}
                />
                <View style={styles.qtyEditRow}>
                  <TextInput
                    style={styles.qtyInput}
                    value={item.quantity.toString()}
                    onChangeText={(v) => handleUpdateQuantity(idx, v)}
                    keyboardType="decimal-pad"
                    placeholder={t('ph_quantity')}
                    accessibilityLabel={t('qty_header')}
                  />
                  <Text style={styles.itemMeta}>{item.material.unit} × </Text>
                  <TextInput
                    style={styles.priceInput}
                    value={item.material.base_price.toString()}
                    onChangeText={(v) => handleUpdatePrice(idx, v)}
                    keyboardType="decimal-pad"
                    placeholder={t('ph_selling_price')}
                    accessibilityLabel={t('price_header')}
                  />
                </View>
              </View>
              <Text style={styles.itemTotal}>{formatCurrency(p.subtotal)}</Text>
            </View>
          );
        })}

        {/* Not Found Items (manual correction feedback) */}
        {notFound.length > 0 && (
            <View style={styles.notFoundSection}>
                <Text style={styles.nfHeader}>MISSING PRODUCTS (FAILED MATCH)</Text>
                {notFound.map((name, i) => (
                    <View key={i} style={styles.nfRow}>
                        <Ionicons name="warning-outline" size={12} color={Colors.danger} />
                        <Text style={styles.nfText}>{name}</Text>
                    </View>
                ))}
            </View>
        )}
      </LinearGradient>

      {/* Summary Section */}
      <LinearGradient colors={Gradients.card} style={styles.section}>
        <Text style={styles.sLabel}>SUMMARY</Text>
        <View style={styles.totalRow}>
          <Text style={styles.tLabel}>Items Subtotal</Text>
          <Text style={styles.tVal}>{formatCurrency(itemsTotal)}</Text>
        </View>
        {charge > 0 && (
          <View style={styles.totalRow}>
            <Text style={styles.tLabel}>Extra Charges</Text>
            <Text style={styles.tVal}>{formatCurrency(charge)}</Text>
          </View>
        )}
        <View style={[styles.totalRow, styles.grandRow]}>
          <Text style={styles.gLabel}>Grand Total</Text>
          <Text style={[styles.gVal, { color: Colors.amber }]}>{formatCurrency(grandTotal)}</Text>
        </View>
      </LinearGradient>
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  transcriptBox:  { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, backgroundColor: Colors.surface2, borderRadius: Radius.md, padding: Spacing.md, marginVertical: Spacing.md, borderWidth: 1, borderColor: Colors.border, width: '100%' },
  transcriptText: { flex: 1, fontSize: Typography.xs, color: Colors.textSecondary, fontStyle: 'italic', lineHeight: 18 },
  section:  { borderRadius: Radius.lg, padding: Spacing.lg, marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  sectionError: { borderColor: Colors.danger + '44', backgroundColor: Colors.dangerBg },
  sLabel:   { fontSize: 10, fontWeight: Typography.black, color: Colors.textMuted, letterSpacing: 1.5, marginBottom: Spacing.md },
  row:      { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  avatar:   { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: Typography.base, fontWeight: Typography.black, color: Colors.black },
  sValue:   { fontSize: Typography.base, fontWeight: Typography.bold, color: Colors.textPrimary },
  sMeta:    { fontSize: Typography.xs, color: Colors.textMuted, marginTop: 2 },
  itemRow:  { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm, borderBottomWidth: 1, borderColor: Colors.border + '55' },
  itemNameInput: { fontSize: Typography.sm, fontWeight: Typography.semibold, color: Colors.textPrimary, padding: 0 },
  itemMeta: { fontSize: Typography.xs, color: Colors.textMuted },
  qtyEditRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginTop: 4 },
  qtyInput: { fontSize: Typography.sm, fontWeight: Typography.bold, color: Colors.textPrimary, backgroundColor: Colors.surface2, borderRadius: Radius.sm, paddingHorizontal: 6, paddingVertical: 2, minWidth: 40, textAlign: 'center' },
  priceInput: { fontSize: Typography.xs, fontWeight: Typography.bold, color: Colors.textPrimary, backgroundColor: Colors.surface2, borderRadius: Radius.sm, paddingHorizontal: 4, paddingVertical: 2, minWidth: 50 },
  itemTotal:{ fontSize: Typography.base, fontWeight: Typography.bold, color: Colors.amber },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  tLabel:   { fontSize: Typography.sm, color: Colors.textSecondary },
  tVal:     { fontSize: Typography.sm, color: Colors.textPrimary, fontWeight: Typography.semibold },
  grandRow: { borderTopWidth: 1, borderColor: Colors.border, marginTop: Spacing.sm, paddingTop: Spacing.sm },
  gLabel:   { fontSize: Typography.base, fontWeight: Typography.black, color: Colors.textPrimary },
  gVal:     { fontSize: Typography.xl, fontWeight: Typography.black },
  emptyText: { fontSize: Typography.xs, color: Colors.textMuted, textAlign: 'center', paddingVertical: Spacing.md },
  notFoundSection: { marginTop: Spacing.md, paddingTop: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border + '33' },
  nfHeader: { fontSize: 8, fontWeight: '900', color: Colors.danger, letterSpacing: 1, marginBottom: 8 },
  nfRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  nfText: { fontSize: Typography.xs, color: Colors.textSecondary, fontStyle: 'italic' }
});
