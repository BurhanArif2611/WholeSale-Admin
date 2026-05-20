import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import { BottomSheet } from '@/lib/common/components/BottomSheet';
import { FormField } from '@/lib/common/components/FormField';
import { CategorySelect } from '@/lib/common/components/CategorySelect';
import { Button } from '@/components/ui';
import { Colors, Spacing, Radius, Typography } from '@/constants/theme';
import { useLanguage } from '@/hooks/useLanguage';
import { useCategories } from '@/hooks/useCategories';
import { useBusinessCategories } from '@/hooks/useBusinessCategories';
import { productRepository } from '@/lib/data/repositories/productRepository';
import { categoryRepository } from '@/lib/data/repositories/categoryRepository';
import { FALLBACK_CATEGORY_SLUG } from '@/lib/domain/defaultCategories';
import { UNIT_OPTIONS } from '@/lib/common/utils/pricing';
import type { Product, UnitType } from '@/lib/domain/models';

interface QuickAddProductSheetProps {
  visible: boolean;
  onClose: () => void;
  onCreated: (product: Product) => void;
}

export function QuickAddProductSheet({ visible, onClose, onCreated }: QuickAddProductSheetProps) {
  const { t } = useLanguage();
  const { categories: allCategories, reload } = useCategories();
  const { filterCategoryList, preferredIds } = useBusinessCategories();
  const categories = filterCategoryList(allCategories);
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [unitType, setUnitType] = useState<UnitType>('piece');
  const [sellingPrice, setSellingPrice] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (visible) void reload();
  }, [visible, reload]);

  useEffect(() => {
    if (!categoryId && categories.length > 0) {
      const preferred = categories.find((c) => preferredIds.includes(c.id));
      const other = categories.find((c) => c.slug === FALLBACK_CATEGORY_SLUG);
      setCategoryId(preferred?.id ?? other?.id ?? categories[0].id);
    }
  }, [categories, categoryId, preferredIds]);

  const reset = () => {
    setName('');
    setSellingPrice('');
    setPurchasePrice('');
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
    if (!sellingPrice.trim()) {
      Alert.alert(t('required'), t('err_selling_price'));
      return;
    }

    let catId = categoryId;
    if (!catId) {
      const other = await categoryRepository.getFallback();
      catId = other.id;
    }

    setSaving(true);
    try {
      const product = await productRepository.create({
        name: name.trim(),
        category_id: catId,
        sku: null,
        barcode: null,
        purchase_price: parseFloat(purchasePrice) || 0,
        selling_price: parseFloat(sellingPrice) || 0,
        unit_type: unitType,
        stock_quantity: 0,
        min_stock_alert: 0,
        expiry_date: null,
        image_uri: null,
        tax_percent: 0,
        discount_percent: 0,
        notes: null,
      });
      reset();
      onCreated(product);
      onClose();
    } catch (e) {
      Alert.alert(t('error'), (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet
      visible={visible}
      title={t('create_new_product')}
      onClose={handleClose}
      footer={<Button label={t('save_product')} onPress={handleSave} loading={saving} />}
    >
      <FormField
        label="Product Name"
        value={name}
        onChangeText={setName}
        placeholder={t('ph_product_name')}
        error={submitted && !name.trim() ? t('err_product_name') : null}
        autoFocus
      />
      <CategorySelect
        categories={categories}
        selectedId={categoryId}
        onSelect={setCategoryId}
        label={`${t('select_category_title')} (${t('label_optional_suffix')})`}
      />
      <Text style={styles.label}>{t('unit_label') || 'Unit Type'}</Text>
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
      <FormField
        label="Selling Price"
        value={sellingPrice}
        onChangeText={setSellingPrice}
        placeholder={t('ph_selling_price')}
        keyboardType="decimal-pad"
        error={submitted && !sellingPrice.trim() ? t('err_selling_price') : null}
      />
      <FormField
        label="Purchase Price"
        value={purchasePrice}
        onChangeText={setPurchasePrice}
        placeholder={t('ph_purchase_price')}
        hint={t('optional') || 'Optional'}
        keyboardType="decimal-pad"
      />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: Typography.xs, fontWeight: Typography.semibold, color: Colors.textSecondary, marginBottom: Spacing.sm },
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
  unitChipText: { fontSize: Typography.xs, color: Colors.textSecondary, fontWeight: Typography.semibold },
  unitChipTextActive: { color: Colors.amberDim },
});
