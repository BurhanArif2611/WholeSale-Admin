import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, TouchableOpacity } from 'react-native';
import { appAlert } from '@/lib/common/utils/appAlert';
import { useRouter, useFocusEffect } from 'expo-router';
import { ScreenLayout } from '@/lib/common/components/ScreenLayout';
import { FormField } from '@/lib/common/components/FormField';
import { CategoryPicker } from '@/lib/common/components/CategoryPicker';
import { Button } from '@/components/ui';
import { Colors, Spacing, Radius, Fonts } from '@/constants/theme';
import { useLanguage } from '@/hooks/useLanguage';
import { useCategories } from '@/hooks/useCategories';
import { productRepository } from '@/lib/data/repositories/productRepository';
import { UNIT_OPTIONS } from '@/lib/common/utils/pricing';
import type { UnitType } from '@/lib/domain/models';

export default function NewProductScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const { categories, loading: loadingCats, error: categoriesLoadError, reload, refresh } = useCategories();

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [categoryTouched, setCategoryTouched] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [name, setName] = useState('');
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
  const [saving, setSaving] = useState(false);
  const [nameTouched, setNameTouched] = useState(false);
  const [priceTouched, setPriceTouched] = useState(false);

  const categoryError =
    (submitted || categoryTouched) && !categoryId ? t('please_select_category') : null;
  const nameError = (submitted || nameTouched) && !name.trim() ? t('err_product_name') : null;
  const priceError =
    (submitted || priceTouched) && !sellingPrice.trim() ? t('err_selling_price') : null;

  const handleCategorySelect = (id: string) => {
    setCategoryTouched(true);
    setCategoryId(id);
  };

  const handleSave = async () => {
    setSubmitted(true);
    setCategoryTouched(true);
    setNameTouched(true);
    setPriceTouched(true);

    if (!name.trim() || !categoryId || !sellingPrice.trim()) {
      void appAlert(
        t('required'),
        !categoryId ? t('category_is_required') : !name.trim() ? t('err_product_name') : t('err_selling_price'),
        'warning',
      );
      return;
    }

    setSaving(true);
    try {
      await productRepository.create({
        name,
        category_id: categoryId,
        sku: sku || null,
        barcode: barcode || null,
        purchase_price: parseFloat(purchasePrice) || 0,
        selling_price: parseFloat(sellingPrice) || 0,
        unit_type: unitType,
        stock_quantity: parseFloat(stockQty) || 0,
        min_stock_alert: parseFloat(minAlert) || 0,
        expiry_date: null,
        image_uri: null,
        tax_percent: parseFloat(taxPercent) || 0,
        discount_percent: 0,
        allow_discount: allowDiscount,
        max_discount_percent: allowDiscount ? parseFloat(maxDiscountPercent) || 0 : 0,
        notes: notes || null,
        brand: null,
        is_incomplete: false,
      });
      refresh();
      router.back();
    } catch (e) {
      void appAlert(t('error'), (e as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenLayout title={t('new_product_title')} scroll keyboardAvoiding>
      <FormField
        label="Product Name"
        required
        value={name}
        onChangeText={setName}
        onBlur={() => setNameTouched(true)}
        placeholder={t('ph_product_name')}
        hint={t('hint_product_name')}
        error={nameError}
        icon="cube-outline"
      />
      {categoriesLoadError ? (
        <View style={styles.catErrorBox}>
          <Text style={styles.catErrorText}>{categoriesLoadError}</Text>
          <TouchableOpacity onPress={reload}>
            <Text style={styles.catRetry}>{t('try_again')}</Text>
          </TouchableOpacity>
        </View>
      ) : null}
      <CategoryPicker
        categories={categories}
        selectedId={categoryId}
        onSelect={handleCategorySelect}
        loading={loadingCats}
        error={categoryError}
        touched={submitted || categoryTouched}
        placeholder={t('select_category_placeholder')}
        onManagePress={() => router.push('/categories')}
        onOpen={() => void reload()}
      />
      <Text style={styles.sectionHint}>{t('hint_category')}</Text>
      <FormField label="SKU" value={sku} onChangeText={setSku} placeholder={t('ph_sku')} />
      <FormField label="Barcode" value={barcode} onChangeText={setBarcode} placeholder={t('ph_barcode')} />
      <FormField
        label="Purchase Price"
        value={purchasePrice}
        onChangeText={setPurchasePrice}
        placeholder={t('ph_purchase_price')}
        keyboardType="numeric"
      />
      <FormField
        label="Selling Price"
        required
        value={sellingPrice}
        onChangeText={setSellingPrice}
        onBlur={() => setPriceTouched(true)}
        placeholder={t('ph_selling_price')}
        hint={t('hint_selling_price')}
        error={priceError}
        keyboardType="numeric"
      />
      <Text style={styles.unitLabel}>Unit Type</Text>
      <View style={styles.unitRow}>
        {UNIT_OPTIONS.map((u) => (
          <Pressable
            key={u.value}
            style={[styles.unitChip, unitType === u.value && styles.unitChipActive]}
            onPress={() => setUnitType(u.value)}
          >
            <Text style={[styles.unitChipText, unitType === u.value && styles.unitChipTextActive]}>{u.label}</Text>
          </Pressable>
        ))}
      </View>
      <FormField
        label="Stock Quantity"
        value={stockQty}
        onChangeText={setStockQty}
        placeholder={t('ph_stock_qty')}
        keyboardType="numeric"
      />
      <FormField
        label="Minimum Stock Alert"
        value={minAlert}
        onChangeText={setMinAlert}
        placeholder={t('ph_min_stock')}
        hint="Get notified when stock is low"
        keyboardType="numeric"
      />
      <FormField
        label="Tax %"
        value={taxPercent}
        onChangeText={setTaxPercent}
        placeholder={t('ph_tax_percent')}
        keyboardType="numeric"
      />
      <Text style={styles.unitLabel}>{t('allow_discount_label')}</Text>
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
          placeholder="10"
          keyboardType="numeric"
          hint={t('max_discount_hint')}
        />
      ) : null}
      <FormField
        label={t('notes_optional')}
        value={notes}
        onChangeText={setNotes}
        placeholder={t('notes_placeholder')}
        hint={t('hint_notes')}
        multiline
        numberOfLines={3}
      />
      <Button label={t('save_product')} onPress={handleSave} loading={saving} style={{ marginTop: 8 }} />
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  catErrorBox: {
    padding: Spacing.md,
    backgroundColor: Colors.danger + '12',
    borderRadius: Radius.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.danger + '35',
  },
  catErrorText: { color: Colors.danger, fontSize: 12, marginBottom: 6 },
  catRetry: { color: Colors.amber, fontFamily: Fonts.bold, fontSize: 12 },
  sectionHint: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: -Spacing.sm,
    marginBottom: Spacing.md,
    fontStyle: 'italic',
  },
  unitLabel: { fontSize: 12, fontFamily: Fonts.bold, color: Colors.textSecondary, marginBottom: 6 },
  unitRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: Spacing.md },
  unitChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  unitChipActive: { backgroundColor: Colors.amber, borderColor: Colors.amber },
  unitChipText: { fontSize: 12, fontFamily: Fonts.semibold, color: Colors.textSecondary },
  unitChipTextActive: { color: Colors.white },
  toggleRow: { flexDirection: 'row', gap: 8, marginBottom: Spacing.md },
  toggleChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    backgroundColor: Colors.surface,
  },
  toggleChipActive: { backgroundColor: Colors.amberBg, borderColor: Colors.amber },
  toggleChipText: { fontSize: 13, fontFamily: Fonts.semibold, color: Colors.textSecondary },
  toggleChipTextActive: { color: Colors.amberDim },
});
