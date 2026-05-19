import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { FormField } from '@/lib/common/components/FormField';
import { Colors, Spacing, Radius, Typography, formatCurrency } from '@/constants/theme';
import type { OrderDiscountType } from '@/lib/common/utils/orderDiscount';

export interface OrderDiscountSectionProps {
  type: OrderDiscountType;
  onTypeChange: (type: OrderDiscountType) => void;
  value: string;
  onValueChange: (v: string) => void;
  errorKey: string | null;
  t: (key: string) => string;
  itemsTotal: number;
  discountAmount: number;
  finalPayable: number;
  fromClientHint?: boolean;
}

export function OrderDiscountSection({
  type,
  onTypeChange,
  value,
  onValueChange,
  errorKey,
  t,
  itemsTotal,
  discountAmount,
  finalPayable,
  fromClientHint,
}: OrderDiscountSectionProps) {
  const errorMsg = errorKey ? t(errorKey) : null;

  return (
    <View style={styles.box}>
      <Text style={styles.title}>{t('order_discount_title')}</Text>
      {fromClientHint ? (
        <Text style={styles.hint}>{t('order_discount_client_hint')}</Text>
      ) : null}

      <View style={styles.typeRow}>
        {(['percent', 'fixed'] as const).map((opt) => {
          const active = type === opt;
          return (
            <Pressable
              key={opt}
              style={[styles.typeChip, active && styles.typeChipActive]}
              onPress={() => onTypeChange(opt)}
            >
              <Text style={[styles.typeChipText, active && styles.typeChipTextActive]}>
                {opt === 'percent' ? t('order_discount_percent') : t('order_discount_fixed')}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <FormField
        label={type === 'percent' ? t('order_discount_percent_label') : t('order_discount_amount_label')}
        value={value}
        onChangeText={onValueChange}
        placeholder={type === 'percent' ? t('ph_discount_percent') : t('ph_order_discount_amount')}
        hint={type === 'percent' ? t('hint_order_discount_percent') : t('hint_order_discount_fixed')}
        error={errorMsg}
        keyboardType="decimal-pad"
        icon={type === 'percent' ? 'pricetag-outline' : 'cash-outline'}
      />

      {discountAmount > 0 ? (
        <Text style={styles.applied}>
          {t('order_discount_applied')}: −{formatCurrency(discountAmount)}
        </Text>
      ) : null}

      <View style={styles.breakdown}>
        <BreakdownRow label={t('order_items_total')} value={formatCurrency(itemsTotal)} />
        {discountAmount > 0 ? (
          <BreakdownRow
            label={t('order_client_discount')}
            value={`−${formatCurrency(discountAmount)}`}
            accent
          />
        ) : null}
        <BreakdownRow label={t('order_payable_amount')} value={formatCurrency(finalPayable)} bold />
      </View>
    </View>
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
      <Text style={styles.breakdownLabel}>{label}</Text>
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
  box: {
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  title: {
    fontSize: Typography.sm,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  hint: {
    fontSize: Typography.xs,
    color: Colors.info,
    marginBottom: Spacing.sm,
    fontStyle: 'italic',
  },
  typeRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm },
  typeChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface2,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  typeChipActive: { backgroundColor: Colors.amber, borderColor: Colors.amber },
  typeChipText: { fontSize: Typography.xs, fontWeight: Typography.semibold, color: Colors.textSecondary },
  typeChipTextActive: { color: Colors.white },
  applied: {
    fontSize: Typography.xs,
    color: Colors.success,
    fontWeight: Typography.semibold,
    marginBottom: Spacing.sm,
  },
  breakdown: {
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  breakdownLabel: { fontSize: Typography.xs, color: Colors.textSecondary },
  breakdownValue: { fontSize: Typography.xs, color: Colors.textPrimary, fontWeight: Typography.semibold },
  breakdownBold: { fontSize: Typography.sm, fontWeight: Typography.bold, color: Colors.amber },
});
