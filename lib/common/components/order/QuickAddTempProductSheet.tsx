import React, { useState } from 'react';
import { Alert } from 'react-native';
import { BottomSheet } from '@/lib/common/components/BottomSheet';
import { FormField } from '@/lib/common/components/FormField';
import { Button } from '@/components/ui';
import { useLanguage } from '@/hooks/useLanguage';
import { buildTempCartLine } from '@/lib/common/utils/cart';
import { parseDecimalQuantity } from '@/lib/common/utils/quantity';
import type { CartLineInput } from '@/lib/common/utils/cart';

interface QuickAddTempProductSheetProps {
  visible: boolean;
  onClose: () => void;
  onAdded: (line: CartLineInput) => void;
}

export function QuickAddTempProductSheet({ visible, onClose, onAdded }: QuickAddTempProductSheetProps) {
  const { t } = useLanguage();
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [price, setPrice] = useState('');
  const [notes, setNotes] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const reset = () => {
    setName('');
    setQuantity('1');
    setPrice('');
    setNotes('');
    setSubmitted(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleAdd = () => {
    setSubmitted(true);
    if (!name.trim()) {
      Alert.alert(t('required'), t('err_product_name'));
      return;
    }
    const qty = parseDecimalQuantity(quantity);
    if (qty == null) {
      Alert.alert(t('required'), t('err_quantity_invalid') || 'Enter a valid quantity');
      return;
    }
    const unitPrice = parseFloat(price);
    if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
      Alert.alert(t('required'), t('err_selling_price'));
      return;
    }

    const line = buildTempCartLine({
      product_name: name.trim(),
      quantity: qty,
      unit_price: unitPrice,
      notes: notes.trim() || null,
    });
    reset();
    onAdded(line);
    onClose();
  };

  return (
    <BottomSheet
      visible={visible}
      title={t('add_temp_product') || 'Add Item (Not in Inventory)'}
      onClose={handleClose}
      footer={<Button label={t('add_to_order') || 'Add to Order'} onPress={handleAdd} />}
    >
      <FormField
        label="Product Name"
        value={name}
        onChangeText={setName}
        placeholder={t('ph_product_name')}
        error={submitted && !name.trim() ? t('err_product_name') : null}
        autoFocus
      />
      <FormField
        label={t('qty_header') || 'Quantity'}
        value={quantity}
        onChangeText={setQuantity}
        placeholder="1"
        keyboardType="decimal-pad"
      />
      <FormField
        label={t('price_header') || 'Unit Price'}
        value={price}
        onChangeText={setPrice}
        placeholder="0.00"
        keyboardType="decimal-pad"
        hint={t('temp_price_hint')}
      />
      <FormField
        label={t('notes_optional')}
        value={notes}
        onChangeText={setNotes}
        placeholder={t('notes_placeholder')}
        multiline
        numberOfLines={2}
      />
    </BottomSheet>
  );
}
