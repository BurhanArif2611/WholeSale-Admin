import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, ScrollView } from 'react-native';
import { BottomSheet } from '@/lib/common/components/BottomSheet';
import { FormField } from '@/lib/common/components/FormField';
import { CategorySelect } from '@/lib/common/components/CategorySelect';
import { Button } from '@/components/ui';
import { Colors, Spacing, Radius, Typography, Fonts } from '@/constants/theme';
import { useLanguage } from '@/hooks/useLanguage';
import { useCategories } from '@/hooks/useCategories';
import { useBusinessCategories } from '@/hooks/useBusinessCategories';
import { productRepository } from '@/lib/data/repositories/productRepository';
import { categoryRepository } from '@/lib/data/repositories/categoryRepository';
import { FALLBACK_CATEGORY_SLUG } from '@/lib/domain/defaultCategories';
import { UNIT_OPTIONS, QUICK_ADD_UNIT_OPTIONS } from '@/lib/common/utils/pricing';
import type { Product, UnitType } from '@/lib/domain/models';

export type QuickAddProductMode = 'standard' | 'purchase';

interface QuickAddProductSheetProps {
  visible: boolean;
  onClose: () => void;
  onCreated: (product: Product) => void;
  mode?: QuickAddProductMode;
  initialName?: string;
}

export function QuickAddProductSheet({
  visible,
  onClose,
  onCreated,
  mode = 'standard',
  initialName = '',
}: QuickAddProductSheetProps) {
  const isPurchase = mode === 'purchase';
  const { t } = useLanguage();
  const { categories: allCategories, reload } = useCategories();
  const { filterCategoryList, preferredIds } = useBusinessCategories();
  const categories = filterCategoryList(allCategories);
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [unitType, setUnitType] = useState<UnitType>('piece');
  const [sellingPrice, setSellingPrice] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [barcode, setBarcode] = useState('');
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (visible) {
      void reload();
      if (initialName.trim()) setName(initialName.trim());
    }
  }, [visible, reload, initialName]);

  useEffect(() => {
    if (!isPurchase && !categoryId && categories.length > 0) {
      const preferred = categories.find((c) => preferredIds.includes(c.id));
      const other = categories.find((c) => c.slug === FALLBACK_CATEGORY_SLUG);
      setCategoryId(preferred?.id ?? other?.id ?? categories[0].id);
    }
  }, [categories, categoryId, preferredIds, isPurchase]);

  const reset = () => {
    setName('');
    setBrand('');
    setSellingPrice('');
    setPurchasePrice('');
    setBarcode('');
    setUnitType('piece');
    setSubmitted(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSave = async () => {
    setSubmitted(true);
    if (!name.trim()) {
      Alert.alert(t('required'), t('err_product_name'));
      return;
    }
    if (isPurchase) {
      if (!purchasePrice.trim() || parseFloat(purchasePrice) <= 0) {
        Alert.alert(t('required'), t('err_purchase_price_required'));
        return;
      }
      if (!sellingPrice.trim() || parseFloat(sellingPrice) <= 0) {
        Alert.alert(t('required'), t('err_selling_price'));
        return;
      }
    } else if (!sellingPrice.trim()) {
      Alert.alert(t('required'), t('err_selling_price'));
      return;
    }

    setSaving(true);
    try {
      let product: Product;
      if (isPurchase) {
        product = await productRepository.createQuickIncomplete({
          name: name.trim(),
          unit_type: unitType,
          purchase_price: parseFloat(purchasePrice) || 0,
          selling_price: parseFloat(sellingPrice) || 0,
          brand: brand.trim() || null,
          barcode: barcode.trim() || null,
        });
      } else {
        let catId = categoryId;
        if (!catId) {
          const other = await categoryRepository.getFallback();
          catId = other.id;
        }
        product = await productRepository.create({
          name: name.trim(),
          category_id: catId,
          sku: null,
          barcode: barcode.trim() || null,
          brand: brand.trim() || null,
          purchase_price: parseFloat(purchasePrice) || 0,
          selling_price: parseFloat(sellingPrice) || 0,
          unit_type: unitType,
          stock_quantity: 0,
          min_stock_alert: 0,
          expiry_date: null,
          image_uri: null,
          tax_percent: 0,
          discount_percent: 0,
          allow_discount: false,
          max_discount_percent: 0,
          notes: null,
          is_incomplete: false,
        });
      }
      reset();
      onCreated(product);
      onClose();
    } catch (e) {
      Alert.alert(t('error'), (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const unitOptions = isPurchase ? QUICK_ADD_UNIT_OPTIONS : UNIT_OPTIONS;

  return (
    <BottomSheet
      visible={visible}
      title={isPurchase ? t('quick_add_product') : t('create_new_product')}
      onClose={handleClose}
      footer={
        <Button
          label={isPurchase ? t('add_and_continue') : t('save_product')}
          onPress={handleSave}
          loading={saving}
        />
      }
    >
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <FormField
          label={t('product_name_label') || 'Product Name'}
          value={name}
          onChangeText={setName}
          placeholder={t('ph_product_name')}
          error={submitted && !name.trim() ? t('err_product_name') : null}
          autoFocus
        />

        <Text style={styles.label}>{t('unit_label') || 'Unit Type'}</Text>
        <View style={styles.unitRow}>
          {unitOptions.map((u) => (
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

        <FormField
          label={t('purchase_price_label') || 'Purchase Price'}
          value={purchasePrice}
          onChangeText={setPurchasePrice}
          placeholder={t('ph_purchase_price')}
          keyboardType="decimal-pad"
          error={
            submitted && isPurchase && (!purchasePrice.trim() || parseFloat(purchasePrice) <= 0)
              ? t('err_purchase_price_required')
              : null
          }
        />

        {isPurchase ? (
          <FormField
            label={t('selling_price_label') || 'Selling Price'}
            value={sellingPrice}
            onChangeText={setSellingPrice}
            placeholder={t('ph_selling_price')}
            keyboardType="decimal-pad"
            required
            error={
              submitted && (!sellingPrice.trim() || parseFloat(sellingPrice) <= 0)
                ? t('err_selling_price')
                : null
            }
          />
        ) : null}

        {!isPurchase ? (
          <>
            <CategorySelect
              categories={categories}
              selectedId={categoryId}
              onSelect={setCategoryId}
              label={`${t('select_category_title')} (${t('label_optional_suffix')})`}
            />
            <FormField
              label={t('selling_price_label') || 'Selling Price'}
              value={sellingPrice}
              onChangeText={setSellingPrice}
              placeholder={t('ph_selling_price')}
              keyboardType="decimal-pad"
              error={submitted && !sellingPrice.trim() ? t('err_selling_price') : null}
            />
          </>
        ) : null}

        <FormField
          label={t('brand_name_label') || 'Brand Name'}
          value={brand}
          onChangeText={setBrand}
          placeholder={t('ph_brand_name')}
          hint={t('optional')}
        />
        <FormField
          label={t('barcode_label') || 'Barcode'}
          value={barcode}
          onChangeText={setBarcode}
          placeholder={t('ph_barcode')}
          hint={t('optional')}
          keyboardType="numeric"
        />

        {isPurchase ? (
          <Text style={styles.hint}>{t('quick_add_incomplete_hint')}</Text>
        ) : null}
      </ScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: Typography.xs,
    fontFamily: Fonts.semibold,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
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
  hint: {
    fontSize: Typography.xs,
    color: Colors.textMuted,
    lineHeight: 18,
    marginBottom: Spacing.md,
  },
});
