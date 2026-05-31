import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BottomSheet } from '@/lib/common/components/BottomSheet';
import { FlexibleQuantityInput } from '@/lib/common/components/FlexibleQuantityInput';
import { Button } from '@/components/ui';
import { Colors, Spacing, Radius, formatCurrency, Typography, Fonts, InputDecorationTheme } from '@/constants/theme';
import { calculateLineTotal } from '@/lib/common/utils/pricing';
import {
  discountChipsForProduct,
  validateLineDiscount,
} from '@/lib/common/utils/lineDiscount';
import type { CartLineInput } from '@/lib/common/utils/cart';
import type { Product } from '@/lib/domain/models';

const QUICK_WEIGHT = [0.25, 0.5, 1];

interface ProductQtySheetProps {
  visible: boolean;
  product: Product | null;
  line: CartLineInput | null;
  onClose: () => void;
  onApply: (
    lineId: string,
    quantity: number,
    orderUnit: CartLineInput['order_unit'],
    discountPercent: number,
    needsApproval: boolean,
  ) => void;
  onRemove: (lineId: string) => void;
  t: (key: string) => string;
}

export function ProductQtySheet({
  visible,
  product,
  line,
  onClose,
  onApply,
  onRemove,
  t,
}: ProductQtySheetProps) {
  const [qty, setQty] = useState(1);
  const [orderUnit, setOrderUnit] = useState<CartLineInput['order_unit']>('piece');
  const [discountPercent, setDiscountPercent] = useState(0);
  const [discountText, setDiscountText] = useState('0');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (line) {
      setQty(line.quantity);
      setOrderUnit(line.order_unit);
      setDiscountPercent(line.discount_percent);
      setDiscountText(String(line.discount_percent));
      setSubmitted(false);
    } else if (product) {
      setQty(1);
      setOrderUnit(product.unit_type);
      setDiscountPercent(0);
      setDiscountText('0');
      setSubmitted(false);
    }
  }, [line, product, visible]);

  const validation = useMemo(() => {
    if (!line || !product) {
      return {
        valid: false,
        error: null,
        needsApproval: false,
        finalUnitPrice: 0,
        discountAmountPerUnit: 0,
        lineTotal: 0,
        originalLineTotal: 0,
        discountAmount: 0,
      };
    }

    const priceUnit = product.unit_type;
    const allowDiscount = line.allow_discount && product.allow_discount;
    const maxDiscount = line.max_discount_percent ?? product.max_discount_percent ?? 0;

    return validateLineDiscount({
      unitPrice: line.unit_price,
      purchasePrice: line.purchase_price,
      discountPercent,
      allowDiscount,
      maxDiscountPercent: maxDiscount,
      quantity: qty,
      orderUnit,
      priceUnit,
      stockQuantity: line.stock_quantity,
      taxPercent: line.tax_percent,
    });
  }, [line, product, discountPercent, qty, orderUnit]);

  if (!product || !line) return null;

  const priceUnit = product.unit_type;
  const showQuick = priceUnit === 'kg' || priceUnit === 'gram' || priceUnit === 'liter' || priceUnit === 'ml';
  const allowDiscount = line.allow_discount && product.allow_discount;
  const maxDiscount = line.max_discount_percent ?? product.max_discount_percent ?? 0;
  const chips = discountChipsForProduct(maxDiscount);

  const originalCalc = calculateLineTotal(line.unit_price, priceUnit, qty, orderUnit, 0, line.tax_percent);
  const lineTotal = validation.lineTotal;

  const setDiscount = (value: number) => {
    const clamped = Math.max(0, Math.min(100, value));
    setDiscountPercent(clamped);
    setDiscountText(String(clamped));
  };

  const handleApply = () => {
    setSubmitted(true);
    if (!validation.valid) return;
    onApply(line.line_id, qty, orderUnit, discountPercent, validation.needsApproval);
    onClose();
  };

  const errorMessage = validation.error
    ? validation.error === 'err_max_discount'
      ? t('err_max_discount').replace('{max}', String(maxDiscount))
      : t(validation.error)
    : null;

  return (
    <BottomSheet visible={visible} title={product.name} onClose={onClose}>
      {product.is_incomplete ? (
        <View style={styles.draftBanner}>
          <Ionicons name="alert-circle" size={16} color={Colors.amberDim} />
          <Text style={styles.draftBannerText}>{t('draft_product_badge')} · {t('details_pending_badge')}</Text>
        </View>
      ) : null}

      <View style={styles.priceRow}>
        <Text style={styles.priceLabel}>{t('selling_price_label')}</Text>
        <Text style={styles.priceValue}>
          {formatCurrency(product.selling_price)} / {priceUnit}
        </Text>
      </View>

      {showQuick ? (
        <View style={styles.quickRow}>
          {QUICK_WEIGHT.map((q) => (
            <Pressable
              key={q}
              style={[styles.quickChip, qty === q && orderUnit === priceUnit && styles.quickChipActive]}
              onPress={() => {
                setQty(q);
                setOrderUnit(priceUnit);
              }}
            >
              <Text style={[styles.quickText, qty === q && orderUnit === priceUnit && styles.quickTextActive]}>
                {q} {priceUnit}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <FlexibleQuantityInput
        quantity={qty}
        orderUnit={orderUnit}
        priceUnit={priceUnit}
        unitPrice={line.unit_price}
        lineTotal={lineTotal}
        onQuantityChange={setQty}
        onOrderUnitChange={setOrderUnit}
        autoFocusQty
      />

      <View style={styles.discountSection}>
        <Text style={styles.sectionLabel}>{t('discount_label')}</Text>
        {!allowDiscount ? (
          <View style={styles.notAllowedBox}>
            <Ionicons name="lock-closed-outline" size={16} color={Colors.textMuted} />
            <Text style={styles.notAllowedText}>{t('discount_not_allowed')}</Text>
          </View>
        ) : (
          <>
            <View style={styles.chipRow}>
              {chips.map((chip) => (
                <Pressable
                  key={chip}
                  style={[styles.discountChip, discountPercent === chip && styles.discountChipActive]}
                  onPress={() => setDiscount(chip)}
                >
                  <Text
                    style={[
                      styles.discountChipText,
                      discountPercent === chip && styles.discountChipTextActive,
                    ]}
                  >
                    {chip}%
                  </Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.customDiscountRow}>
              <Text style={styles.customLabel}>{t('discount_percent_label')}</Text>
              <TextInput
                style={styles.discountInput}
                value={discountText}
                onChangeText={(text) => {
                  setDiscountText(text.replace(/[^0-9.]/g, ''));
                  const n = parseFloat(text);
                  if (Number.isFinite(n)) setDiscountPercent(n);
                }}
                onBlur={() => setDiscountText(String(discountPercent))}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={InputDecorationTheme.placeholderColor}
              />
              <Text style={styles.percentSuffix}>%</Text>
            </View>
            <View style={styles.breakdown}>
              <BreakdownRow label={t('original_price_label')} value={formatCurrency(originalCalc.subtotal)} />
              <BreakdownRow
                label={t('discount_amount_label')}
                value={`−${formatCurrency(originalCalc.subtotal - calculateLineTotal(line.unit_price, priceUnit, qty, orderUnit, discountPercent, line.tax_percent).subtotal)}`}
                accent
              />
              <BreakdownRow label={t('final_price_label')} value={formatCurrency(lineTotal)} bold />
            </View>
          </>
        )}
      </View>

      {submitted && errorMessage ? (
        <Text style={styles.errorText}>{errorMessage}</Text>
      ) : null}

      {validation.needsApproval && validation.valid ? (
        <View style={styles.approvalBanner}>
          <Ionicons name="shield-outline" size={18} color={Colors.amberDim} />
          <Text style={styles.approvalText}>{t('requires_manager_approval')}</Text>
        </View>
      ) : null}

      <View style={styles.actions}>
        <Button label={t('apply') || 'Done'} onPress={handleApply} />
        <Button
          label={t('remove') || 'Remove'}
          variant="ghost"
          onPress={() => {
            onRemove(line.line_id);
            onClose();
          }}
        />
      </View>
    </BottomSheet>
  );
}

function BreakdownRow({
  label,
  value,
  bold,
  accent,
}: {
  label: string;
  value: string;
  bold?: boolean;
  accent?: boolean;
}) {
  return (
    <View style={styles.breakdownRow}>
      <Text style={[styles.breakdownLabel, bold && styles.breakdownBold]}>{label}</Text>
      <Text
        style={[
          styles.breakdownValue,
          bold && styles.breakdownBold,
          accent && { color: Colors.success },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  draftBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.amberBg,
    padding: Spacing.sm,
    borderRadius: Radius.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.amber + '55',
  },
  draftBannerText: {
    flex: 1,
    fontSize: Typography.xs,
    fontFamily: Fonts.semibold,
    color: Colors.amberDim,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  priceLabel: { fontSize: Typography.xs, color: Colors.textMuted, fontFamily: Fonts.semibold },
  priceValue: { fontSize: Typography.sm, fontFamily: Fonts.bold, color: Colors.amber },
  quickRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md, flexWrap: 'wrap' },
  quickChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface2,
  },
  quickChipActive: { borderColor: Colors.amber, backgroundColor: Colors.amberBg },
  quickText: { fontSize: Typography.xs, fontFamily: Fonts.semibold, color: Colors.textSecondary },
  quickTextActive: { color: Colors.amberDim },
  discountSection: { marginTop: Spacing.lg },
  sectionLabel: {
    fontSize: Typography.xs,
    fontFamily: Fonts.bold,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  notAllowedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    backgroundColor: Colors.surface2,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  notAllowedText: { fontSize: Typography.sm, color: Colors.textMuted, fontFamily: Fonts.medium },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.sm },
  discountChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface2,
    minWidth: 52,
    alignItems: 'center',
  },
  discountChipActive: { borderColor: Colors.amber, backgroundColor: Colors.amberBg },
  discountChipText: { fontSize: Typography.sm, fontFamily: Fonts.semibold, color: Colors.textSecondary },
  discountChipTextActive: { color: Colors.amberDim },
  customDiscountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  customLabel: { fontSize: Typography.sm, color: Colors.textSecondary, fontFamily: Fonts.semibold },
  discountInput: {
    width: 72,
    fontFamily: InputDecorationTheme.fontFamily,
    fontSize: Typography.sm,
    color: Colors.textPrimary,
    backgroundColor: Colors.surface2,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    textAlign: 'center',
  },
  percentSuffix: { fontSize: Typography.sm, color: Colors.textMuted, fontFamily: Fonts.semibold },
  breakdown: {
    backgroundColor: Colors.surface2,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  breakdownLabel: { fontSize: Typography.sm, color: Colors.textSecondary },
  breakdownValue: { fontSize: Typography.sm, color: Colors.textPrimary, fontFamily: Fonts.semibold },
  breakdownBold: { fontFamily: Fonts.bold, color: Colors.textPrimary },
  errorText: {
    fontSize: Typography.xs,
    fontFamily: Fonts.medium,
    color: Colors.danger,
    marginTop: Spacing.sm,
  },
  approvalBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    padding: Spacing.md,
    backgroundColor: Colors.amberBg,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.amber + '66',
  },
  approvalText: {
    flex: 1,
    fontSize: Typography.sm,
    fontFamily: Fonts.semibold,
    color: Colors.amberDim,
  },
  actions: { marginTop: Spacing.lg, gap: Spacing.sm },
});
