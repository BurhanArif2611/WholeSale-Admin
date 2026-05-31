import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { appAlert } from '@/lib/common/utils/appAlert';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { ScreenLayout } from '@/lib/common/components/ScreenLayout';
import { FormField } from '@/lib/common/components/FormField';
import { CategoryPicker } from '@/lib/common/components/CategoryPicker';
import { IncompleteProductBadge } from '@/lib/common/components/IncompleteProductBadge';
import { Button } from '@/components/ui';
import { Colors, Spacing, Radius, Typography, Fonts } from '@/constants/theme';
import { useLanguage } from '@/hooks/useLanguage';
import { useCategories } from '@/hooks/useCategories';
import { productRepository } from '@/lib/data/repositories/productRepository';
import { UNIT_OPTIONS } from '@/lib/common/utils/pricing';
import type { UnitType } from '@/lib/domain/models';

export default function CompleteProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useLanguage();
  const { categories, reload } = useCategories();

  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [unitType, setUnitType] = useState<UnitType>('piece');
  const [stockQty, setStockQty] = useState('');
  const [minAlert, setMinAlert] = useState('');
  const [taxPercent, setTaxPercent] = useState('');
  const [allowDiscount, setAllowDiscount] = useState(false);
  const [maxDiscountPercent, setMaxDiscountPercent] = useState('10');
  const [notes, setNotes] = useState('');

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const p = await productRepository.findById(id);
    if (p) {
      setName(p.name);
      setBrand(p.brand ?? '');
      setCategoryId(p.category_id);
      setSku(p.sku ?? '');
      setBarcode(p.barcode ?? '');
      setPurchasePrice(String(p.purchase_price || ''));
      setSellingPrice(String(p.selling_price || ''));
      setUnitType(p.unit_type);
      setStockQty(String(p.stock_quantity || ''));
      setMinAlert(String(p.min_stock_alert || ''));
      setTaxPercent(String(p.tax_percent || ''));
      setAllowDiscount(p.allow_discount);
      setMaxDiscountPercent(String(p.max_discount_percent || 10));
      setNotes(p.notes ?? '');
    }
    setLoading(false);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      void reload();
      void load();
    }, [reload, load]),
  );

  const handleSave = async () => {
    setSubmitted(true);
    if (!id || !name.trim() || !categoryId || !sellingPrice.trim()) {
      void appAlert(t('required'), t('complete_product_validation'), 'warning');
      return;
    }

    setSaving(true);
    try {
      await productRepository.update(id, {
        name: name.trim(),
        category_id: categoryId,
        brand: brand.trim() || null,
        sku: sku.trim() || null,
        barcode: barcode.trim() || null,
        purchase_price: parseFloat(purchasePrice) || 0,
        selling_price: parseFloat(sellingPrice) || 0,
        unit_type: unitType,
        stock_quantity: parseFloat(stockQty) || 0,
        min_stock_alert: parseFloat(minAlert) || 0,
        tax_percent: parseFloat(taxPercent) || 0,
        discount_percent: 0,
        allow_discount: allowDiscount,
        max_discount_percent: allowDiscount ? parseFloat(maxDiscountPercent) || 0 : 0,
        notes: notes.trim() || null,
        is_incomplete: false,
      });
      await productRepository.markComplete(id);
      void appAlert(t('done'), t('product_completed_msg'), 'success');
      router.back();
    } catch (e) {
      void appAlert(t('error'), (e as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenLayout title={t('complete_product_title')} scroll keyboardAvoiding loading={loading}>
      <View style={styles.banner}>
        <IncompleteProductBadge />
        <Text style={styles.bannerText}>{t('complete_product_subtitle')}</Text>
      </View>

      <FormField label={t('product_name_label') || 'Product Name'} required value={name} onChangeText={setName} />
      <CategoryPicker
        categories={categories}
        selectedId={categoryId}
        onSelect={setCategoryId}
        label={t('select_category_title')}
        error={submitted && !categoryId ? t('please_select_category') : null}
      />
      <FormField label={t('brand_name_label') || 'Brand'} value={brand} onChangeText={setBrand} />
      <Text style={styles.label}>{t('unit_label')}</Text>
      <View style={styles.unitRow}>
        {UNIT_OPTIONS.map((u) => (
          <Pressable
            key={u.value}
            style={[styles.unitChip, unitType === u.value && styles.unitChipActive]}
            onPress={() => setUnitType(u.value)}
          >
            <Text style={[styles.unitChipText, unitType === u.value && styles.unitChipTextActive]}>
              {u.label}
            </Text>
          </Pressable>
        ))}
      </View>
      <FormField label={t('purchase_price_label') || 'Purchase Price'} value={purchasePrice} onChangeText={setPurchasePrice} keyboardType="decimal-pad" />
      <FormField
        label={t('selling_price_label') || 'Selling Price'}
        required
        value={sellingPrice}
        onChangeText={setSellingPrice}
        keyboardType="decimal-pad"
        error={submitted && !sellingPrice.trim() ? t('err_selling_price') : null}
      />
      <FormField label="SKU" value={sku} onChangeText={setSku} />
      <FormField label={t('barcode_label') || 'Barcode'} value={barcode} onChangeText={setBarcode} keyboardType="numeric" />
      <FormField label={t('stock_qty_label') || 'Stock'} value={stockQty} onChangeText={setStockQty} keyboardType="decimal-pad" />
      <FormField label={t('min_stock_alert_label') || 'Min Stock Alert'} value={minAlert} onChangeText={setMinAlert} keyboardType="decimal-pad" />
      <FormField label={t('tax_percent_label') || 'Tax %'} value={taxPercent} onChangeText={setTaxPercent} keyboardType="decimal-pad" />
      <Text style={styles.label}>{t('allow_discount_label')}</Text>
      <View style={styles.toggleRow}>
        <Pressable
          style={[styles.toggleChip, !allowDiscount && styles.toggleChipActive]}
          onPress={() => setAllowDiscount(false)}
        >
          <Text style={[styles.toggleChipText, !allowDiscount && styles.toggleChipTextActive]}>{t('off')}</Text>
        </Pressable>
        <Pressable
          style={[styles.toggleChip, allowDiscount && styles.toggleChipActive]}
          onPress={() => setAllowDiscount(true)}
        >
          <Text style={[styles.toggleChipText, allowDiscount && styles.toggleChipTextActive]}>{t('on')}</Text>
        </Pressable>
      </View>
      {allowDiscount ? (
        <FormField
          label={t('max_discount_label')}
          value={maxDiscountPercent}
          onChangeText={setMaxDiscountPercent}
          keyboardType="decimal-pad"
          hint={t('max_discount_hint')}
        />
      ) : null}
      <FormField label={t('notes')} value={notes} onChangeText={setNotes} multiline numberOfLines={3} />

      <Button label={t('save_complete_product')} onPress={handleSave} loading={saving} style={{ marginVertical: Spacing.lg }} />
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: Colors.amberBg,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.amber + '44',
    gap: Spacing.sm,
  },
  bannerText: { fontSize: Typography.sm, color: Colors.textSecondary, lineHeight: 20 },
  label: { fontSize: Typography.xs, fontFamily: Fonts.semibold, color: Colors.textSecondary, marginBottom: Spacing.sm },
  unitRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: Spacing.md },
  unitChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface2,
  },
  unitChipActive: { borderColor: Colors.amber, backgroundColor: Colors.amberBg },
  unitChipText: { fontSize: Typography.xs, color: Colors.textSecondary, fontFamily: Fonts.semibold },
  unitChipTextActive: { color: Colors.amberDim },
  toggleRow: { flexDirection: 'row', gap: 8, marginBottom: Spacing.md },
  toggleChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    backgroundColor: Colors.surface2,
  },
  toggleChipActive: { backgroundColor: Colors.amberBg, borderColor: Colors.amber },
  toggleChipText: { fontSize: 13, fontFamily: Fonts.semibold, color: Colors.textSecondary },
  toggleChipTextActive: { color: Colors.amberDim },
});
