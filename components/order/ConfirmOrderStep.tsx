import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Linking,
  Alert,
  LayoutAnimation,
  Platform,
  UIManager,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Print from 'expo-print';
import { Colors, Spacing, Radius, Shadow, Gradients, formatCurrency, Typography, Fonts } from '@/constants/theme';
import { FormField } from '@/lib/common/components/FormField';
import { formatQuantityDisplay, unitLabel } from '@/lib/common/utils/quantity';
import { buildOrderShareText, generateOrderPreviewHtml, type OrderPreviewInput } from '@/lib/orderInvoicePreview';
import type { CartLineInput } from '@/lib/common/utils/cart';
import type { CartBreakdown, OrderDiscountType } from '@/lib/common/utils/orderDiscount';
import type { Client } from '@/lib/domain/models';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type PaymentStatusKey = 'paid' | 'partial' | 'pending';
type DeliveryTypeKey = 'delivery' | 'pickup' | 'instant';

export interface ConfirmOrderStepProps {
  client: Client;
  cart: CartLineInput[];
  breakdown: CartBreakdown;
  orderDiscountAmount: number;
  discountType: OrderDiscountType;
  discountPercentLabel?: number;
  finalPayable: number;
  paid: number;
  remaining: number;
  paymentMode: string;
  deliveryDate: string;
  notes: string;
  deliveryInstructions: string;
  onNotesChange: (v: string) => void;
  onDeliveryInstructionsChange: (v: string) => void;
  isInstant: boolean;
  isNewClient?: boolean;
  placing: boolean;
  onConfirm: () => void;
  onEdit: () => void;
  onSaveDraft: () => void;
  t: (key: string) => string;
}

const PAYMENT_STATUS: Record<
  PaymentStatusKey,
  { label: string; color: string; bg: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  paid: { label: 'Paid', color: Colors.success, bg: Colors.successBg, icon: 'checkmark-circle' },
  partial: { label: 'Partial', color: Colors.amber, bg: Colors.amberBg, icon: 'time' },
  pending: { label: 'Pending', color: Colors.danger, bg: Colors.dangerBg, icon: 'alert-circle' },
};

function clientInitials(name: string): string {
  return (
    name
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase() || '?'
  );
}

function paymentStatus(paid: number, total: number): PaymentStatusKey {
  if (total <= 0 || paid >= total) return 'paid';
  if (paid > 0) return 'partial';
  return 'pending';
}

function paymentModeIcon(mode: string): keyof typeof Ionicons.glyphMap {
  const m = mode.toLowerCase();
  if (m.includes('upi')) return 'phone-portrait-outline';
  if (m.includes('card')) return 'card-outline';
  return 'cash-outline';
}

function Badge({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <View style={[badgeStyles.wrap, { backgroundColor: bg }]}>
      <Text style={[badgeStyles.text, { color }]}>{label}</Text>
    </View>
  );
}

function SectionCard({
  title,
  icon,
  rightElement,
  children,
  collapsible,
  expanded,
  onToggle,
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  rightElement?: React.ReactNode;
  children: React.ReactNode;
  collapsible?: boolean;
  expanded?: boolean;
  onToggle?: () => void;
}) {
  return (
    <View style={cardStyles.card}>
      <Pressable style={cardStyles.header} onPress={collapsible ? onToggle : undefined} disabled={!collapsible}>
        <View style={cardStyles.headerLeft}>
          <View style={cardStyles.iconCircle}>
            <Ionicons name={icon} size={18} color={Colors.amber} />
          </View>
          <Text style={cardStyles.title}>{title}</Text>
        </View>
        <View style={cardStyles.headerRight}>
          {rightElement}
          {collapsible ? (
            <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={20} color={Colors.textMuted} />
          ) : null}
        </View>
      </Pressable>
      {(!collapsible || expanded) && <View style={cardStyles.body}>{children}</View>}
    </View>
  );
}

function ProductLine({ item }: { item: CartLineInput }) {
  const isLoose = item.order_unit !== item.unit_type || !Number.isInteger(item.quantity);

  return (
    <View style={[productStyles.row, item.is_temporary && productStyles.rowTemp]}>
      <View style={[productStyles.iconBox, item.is_temporary && productStyles.iconBoxTemp]}>
        <Ionicons
          name={item.is_temporary ? 'flash-outline' : 'cube-outline'}
          size={20}
          color={item.is_temporary ? Colors.info : Colors.amberDim}
        />
      </View>
      <View style={productStyles.info}>
        <View style={productStyles.nameRow}>
          <Text style={productStyles.name} numberOfLines={2}>
            {item.product_name}
          </Text>
        </View>
        <View style={productStyles.tagRow}>
          {item.is_temporary ? <Badge label="Temp" color={Colors.info} bg={Colors.infoBg} /> : null}
          {isLoose ? <Badge label="Loose Qty" color={Colors.purple} bg={Colors.purpleBg} /> : null}
          {item.discount_percent > 0 ? (
            <Badge label={`${item.discount_percent}% off`} color={Colors.success} bg={Colors.successBg} />
          ) : null}
        </View>
        <Text style={productStyles.calc}>
          {formatQuantityDisplay(item.quantity)} {unitLabel(item.order_unit)} × {formatCurrency(item.unit_price)}/
          {item.unit_type} = {formatCurrency(item.line_total)}
        </Text>
      </View>
      <Text style={productStyles.total}>{formatCurrency(item.line_total)}</Text>
    </View>
  );
}

function PriceRow({
  label,
  value,
  accent,
  danger,
}: {
  label: string;
  value: string;
  accent?: boolean;
  danger?: boolean;
}) {
  return (
    <View style={priceRowStyles.row}>
      <Text style={priceRowStyles.label}>{label}</Text>
      <Text style={[priceRowStyles.value, accent && { color: Colors.success }, danger && { color: Colors.danger }]}>
        {value}
      </Text>
    </View>
  );
}

export function ConfirmOrderStep({
  client,
  cart,
  breakdown,
  orderDiscountAmount,
  discountType,
  discountPercentLabel,
  finalPayable,
  paid,
  remaining,
  paymentMode,
  deliveryDate,
  notes,
  deliveryInstructions,
  onNotesChange,
  onDeliveryInstructionsChange,
  isInstant,
  isNewClient,
  placing: _placing,
  onConfirm: _onConfirm,
  onEdit: _onEdit,
  onSaveDraft: _onSaveDraft,
  t,
}: ConfirmOrderStepProps) {
  const [itemsExpanded, setItemsExpanded] = useState(true);
  const [priceExpanded, setPriceExpanded] = useState(true);
  const [notesExpanded, setNotesExpanded] = useState(false);
  const [deliveryType, setDeliveryType] = useState<DeliveryTypeKey>(isInstant ? 'instant' : 'delivery');

  const status = paymentStatus(paid, finalPayable);
  const statusCfg = PAYMENT_STATUS[status];
  const orderDate = useMemo(
    () =>
      new Date().toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    [],
  );

  const toggle = (setter: React.Dispatch<React.SetStateAction<boolean>>) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setter((v) => !v);
  };

  const handleCall = () => {
    void Linking.openURL(`tel:${client.mobile}`);
  };

  const visibleItems = itemsExpanded ? cart : cart.slice(0, 3);
  const hiddenCount = Math.max(0, cart.length - 3);

  return (
    <View style={styles.root}>
      <SectionCard title={t('confirm_client_section') || 'Client Details'} icon="person-circle-outline">
        <View style={styles.clientRow}>
          <LinearGradient colors={Gradients.dark} style={styles.avatar}>
            <Text style={styles.avatarText}>{clientInitials(client.name)}</Text>
          </LinearGradient>
          <View style={styles.clientInfo}>
            <View style={styles.badgeRow}>
              <Text style={styles.clientName}>{client.name}</Text>
            </View>
            <View style={styles.tagRow}>
              {isNewClient ? <Badge label="New Client" color={Colors.info} bg={Colors.infoBg} /> : null}
              {client.name === 'Walk-in Customer' ? (
                <Badge label="Walk-in" color={Colors.amberDim} bg={Colors.amberBg} />
              ) : (
                <Badge label="Existing Client" color={Colors.textSecondary} bg={Colors.surface2} />
              )}
            </View>
            <Pressable style={styles.contactRow} onPress={handleCall}>
              <Ionicons name="call-outline" size={16} color={Colors.success} />
              <Text style={styles.contactText}>{client.mobile}</Text>
            </Pressable>
            {client.address ? (
              <View style={styles.contactRow}>
                <Ionicons name="location-outline" size={16} color={Colors.amber} />
                <Text style={styles.addressText} numberOfLines={2}>
                  {client.address}
                </Text>
              </View>
            ) : null}
            <View style={styles.contactRow}>
              <Ionicons name="calendar-outline" size={16} color={Colors.textMuted} />
              <Text style={styles.metaText}>{orderDate}</Text>
            </View>
            {client.pending_amount > 0 ? (
              <View style={styles.outstandingBox}>
                <Text style={styles.outstandingLabel}>Previous outstanding</Text>
                <Text style={styles.outstandingValue}>{formatCurrency(client.pending_amount)}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </SectionCard>

      <SectionCard
        title={`${t('confirm_items_section') || 'Order Items'} (${cart.length})`}
        icon="cart-outline"
        collapsible
        expanded={itemsExpanded}
        onToggle={() => toggle(setItemsExpanded)}
        rightElement={<Text style={styles.sectionMeta}>{formatCurrency(breakdown.itemsTotal)}</Text>}
      >
        {visibleItems.map((item, idx) => (
          <View key={item.line_id}>
            <ProductLine item={item} />
            {idx < visibleItems.length - 1 ? <View style={styles.divider} /> : null}
          </View>
        ))}
        {!itemsExpanded && hiddenCount > 0 ? (
          <Pressable onPress={() => toggle(setItemsExpanded)}>
            <Text style={styles.showMore}>+ {hiddenCount} more items — tap to expand</Text>
          </Pressable>
        ) : null}
      </SectionCard>

      <SectionCard title={t('confirm_delivery_section') || 'Delivery & Pickup'} icon="bicycle-outline">
        <View style={styles.deliveryChips}>
          {(['delivery', 'pickup', 'instant'] as DeliveryTypeKey[]).map((type) => {
            const disabled = isInstant && type !== 'instant';
            const labels: Record<DeliveryTypeKey, string> = {
              delivery: 'Home Delivery',
              pickup: 'Pickup',
              instant: 'Instant Purchase',
            };
            const active = deliveryType === type;
            return (
              <Pressable
                key={type}
                style={[
                  styles.deliveryChip,
                  active && styles.deliveryChipActive,
                  disabled && styles.deliveryChipDisabled,
                ]}
                onPress={() => !disabled && setDeliveryType(type)}
                disabled={disabled}
              >
                <Text style={[styles.deliveryChipText, active && styles.deliveryChipTextActive]}>
                  {labels[type]}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {deliveryDate ? (
          <View style={styles.deliveryMeta}>
            <Ionicons name="time-outline" size={16} color={Colors.textMuted} />
            <Text style={styles.metaText}>Expected delivery: {deliveryDate}</Text>
          </View>
        ) : null}
      </SectionCard>

      <SectionCard
        title={t('confirm_payment_section') || 'Payment Summary'}
        icon="wallet-outline"
        collapsible
        expanded={priceExpanded}
        onToggle={() => toggle(setPriceExpanded)}
      >
        <View style={styles.payMethodRow}>
          <Ionicons name={paymentModeIcon(paymentMode)} size={22} color={Colors.amber} />
          <Text style={styles.payMethodText}>{paymentMode || 'Cash'}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusCfg.bg }]}>
            <Ionicons name={statusCfg.icon} size={14} color={statusCfg.color} />
            <Text style={[styles.statusText, { color: statusCfg.color }]}>{statusCfg.label}</Text>
          </View>
        </View>
        <View style={styles.priceRows}>
          <PriceRow label={t('subtotal_label')} value={formatCurrency(breakdown.subtotal)} />
          {breakdown.lineDiscount > 0 ? (
            <PriceRow label={t('order_product_discount')} value={`−${formatCurrency(breakdown.lineDiscount)}`} accent />
          ) : null}
          {breakdown.taxTotal > 0 ? <PriceRow label="Tax / GST" value={formatCurrency(breakdown.taxTotal)} /> : null}
          <PriceRow label={t('order_items_total')} value={formatCurrency(breakdown.itemsTotal)} />
          {orderDiscountAmount > 0 ? (
            <PriceRow
              label={t('order_client_discount')}
              value={`−${formatCurrency(orderDiscountAmount)}${
                discountType === 'percent' && discountPercentLabel ? ` (${discountPercentLabel}%)` : ''
              }`}
              accent
            />
          ) : null}
          <View style={styles.priceDivider} />
          <PriceRow label="Paid now" value={formatCurrency(paid)} />
          {remaining > 0 ? <PriceRow label="Balance due" value={formatCurrency(remaining)} danger /> : null}
        </View>
      </SectionCard>

      <LinearGradient colors={Gradients.dark} style={styles.totalHero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <Text style={styles.totalLabel}>{t('order_payable_amount') || 'Total Payable'}</Text>
        <Text style={styles.totalValue}>{formatCurrency(finalPayable)}</Text>
        {orderDiscountAmount > 0 ? (
          <View style={styles.discountTag}>
            <Ionicons name="pricetag" size={12} color={Colors.amberLight} />
            <Text style={styles.discountTagText}>Discount applied</Text>
          </View>
        ) : null}
      </LinearGradient>

      <SectionCard
        title={t('confirm_notes_section') || 'Notes & Instructions'}
        icon="document-text-outline"
        collapsible
        expanded={notesExpanded}
        onToggle={() => toggle(setNotesExpanded)}
      >
        <FormField
          label={t('notes_optional')}
          value={notes}
          onChangeText={onNotesChange}
          placeholder={t('notes_placeholder')}
          multiline
          numberOfLines={2}
        />
        <FormField
          label={t('delivery_instructions') || 'Delivery Instructions'}
          value={deliveryInstructions}
          onChangeText={onDeliveryInstructionsChange}
          placeholder={t('delivery_instructions_ph') || 'Landmark, timing, etc.'}
          multiline
          numberOfLines={2}
        />
      </SectionCard>
    </View>
  );
}

export function ConfirmOrderFooter({
  placing,
  onConfirm,
  onEdit,
  onSaveDraft,
  previewInput,
  t,
}: {
  placing: boolean;
  onConfirm: () => void;
  onEdit: () => void;
  onSaveDraft: () => void;
  previewInput: OrderPreviewInput;
  t: (key: string) => string;
}) {
  const handlePreview = async () => {
    try {
      await Print.printAsync({ html: generateOrderPreviewHtml(previewInput) });
    } catch (e) {
      Alert.alert(t('error'), (e as Error).message);
    }
  };

  const handleShare = async () => {
    const text = buildOrderShareText(previewInput);
    const url = `whatsapp://send?text=${encodeURIComponent(text)}`;
    const ok = await Linking.canOpenURL(url);
    if (ok) await Linking.openURL(url);
    else Alert.alert('WhatsApp', 'WhatsApp is not installed on this device.');
  };

  return (
    <View style={footerStyles.wrap}>
      <Pressable onPress={onConfirm} disabled={placing} style={footerStyles.primaryWrap}>
        <LinearGradient colors={Gradients.amber} style={footerStyles.primaryBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
          {placing ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={22} color={Colors.white} />
              <Text style={footerStyles.primaryText}>{t('confirm_place_order') || 'Confirm Order'}</Text>
            </>
          )}
        </LinearGradient>
      </Pressable>
      <View style={footerStyles.secondaryRow}>
        <FooterChip icon="create-outline" label={t('edit_order') || 'Edit'} onPress={onEdit} />
        <FooterChip icon="bookmark-outline" label={t('save_draft') || 'Draft'} onPress={onSaveDraft} />
        <FooterChip icon="document-outline" label={t('invoice_preview') || 'Invoice'} onPress={handlePreview} />
        <FooterChip icon="logo-whatsapp" label="Share" onPress={handleShare} color="#25D366" />
      </View>
    </View>
  );
}

function FooterChip({
  icon,
  label,
  onPress,
  color,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  color?: string;
}) {
  return (
    <Pressable style={footerStyles.chip} onPress={onPress}>
      <Ionicons name={icon} size={20} color={color ?? Colors.textSecondary} />
      <Text style={footerStyles.chipLabel}>{label}</Text>
    </Pressable>
  );
}

const badgeStyles = StyleSheet.create({
  wrap: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full },
  text: { fontSize: 10, fontFamily: Fonts.bold },
});

const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    overflow: 'hidden',
    ...Shadow.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    backgroundColor: Colors.surface2,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flex: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.amberBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: Typography.sm, fontFamily: Fonts.bold, color: Colors.textPrimary },
  body: { padding: Spacing.md },
});

const productStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  rowTemp: { backgroundColor: Colors.infoBg + '66', marginHorizontal: -4, padding: 4, borderRadius: Radius.md },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    backgroundColor: Colors.amberBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBoxTemp: { backgroundColor: Colors.infoBg },
  info: { flex: 1 },
  nameRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, alignItems: 'center' },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4, marginBottom: 4 },
  name: { fontSize: Typography.sm, fontFamily: Fonts.bold, color: Colors.textPrimary, flex: 1 },
  calc: { fontSize: Typography.xs, color: Colors.textSecondary, lineHeight: 18 },
  total: { fontSize: Typography.sm, fontFamily: Fonts.bold, color: Colors.amber },
});

const priceRowStyles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  label: { fontSize: Typography.xs, color: Colors.textSecondary },
  value: { fontSize: Typography.sm, fontFamily: Fonts.semibold, color: Colors.textPrimary },
});

const footerStyles = StyleSheet.create({
  wrap: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    ...Shadow.md,
  },
  primaryWrap: { borderRadius: Radius.full, overflow: 'hidden', marginBottom: Spacing.md, ...Shadow.amber },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: 16,
    borderRadius: Radius.full,
  },
  primaryText: { color: Colors.white, fontSize: Typography.md, fontFamily: Fonts.bold },
  secondaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  chip: { alignItems: 'center', flex: 1, paddingVertical: Spacing.xs },
  chipLabel: { fontSize: 10, fontFamily: Fonts.semibold, color: Colors.textMuted, marginTop: 4 },
});

const styles = StyleSheet.create({
  root: { paddingBottom: Spacing.md },
  clientRow: { flexDirection: 'row', gap: Spacing.md },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: Colors.white, fontSize: Typography.md, fontFamily: Fonts.bold },
  clientInfo: { flex: 1 },
  clientName: { fontSize: Typography.md, fontFamily: Fonts.bold, color: Colors.textPrimary },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginBottom: 4 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 6 },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  contactText: { fontSize: Typography.sm, color: Colors.success, fontFamily: Fonts.semibold },
  addressText: { fontSize: Typography.xs, color: Colors.textSecondary, flex: 1 },
  metaText: { fontSize: Typography.xs, color: Colors.textMuted },
  outstandingBox: {
    marginTop: Spacing.sm,
    padding: Spacing.sm,
    backgroundColor: Colors.dangerBg,
    borderRadius: Radius.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  outstandingLabel: { fontSize: Typography.xs, color: Colors.danger },
  outstandingValue: { fontSize: Typography.sm, fontFamily: Fonts.bold, color: Colors.danger },
  sectionMeta: { fontSize: Typography.xs, fontFamily: Fonts.bold, color: Colors.amber },
  divider: { height: 1, backgroundColor: Colors.borderLight, marginVertical: Spacing.sm },
  showMore: {
    textAlign: 'center',
    color: Colors.amber,
    fontFamily: Fonts.semibold,
    fontSize: Typography.xs,
    marginTop: Spacing.sm,
  },
  deliveryChips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  deliveryChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface2,
  },
  deliveryChipActive: { borderColor: Colors.amber, backgroundColor: Colors.amberBg },
  deliveryChipDisabled: { opacity: 0.4 },
  deliveryChipText: { fontSize: Typography.xs, color: Colors.textSecondary, fontFamily: Fonts.semibold },
  deliveryChipTextActive: { color: Colors.amberDim },
  deliveryMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: Spacing.md },
  payMethodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
    padding: Spacing.sm,
    backgroundColor: Colors.surface2,
    borderRadius: Radius.md,
  },
  payMethodText: { flex: 1, fontSize: Typography.sm, fontFamily: Fonts.bold, color: Colors.textPrimary },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  statusText: { fontSize: 11, fontFamily: Fonts.bold },
  priceRows: { gap: 2 },
  priceDivider: { height: 1, backgroundColor: Colors.border, marginVertical: Spacing.sm },
  totalHero: {
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    marginBottom: Spacing.md,
    alignItems: 'center',
    ...Shadow.lg,
  },
  totalLabel: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: Typography.xs,
    fontFamily: Fonts.bold,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  totalValue: {
    color: Colors.white,
    fontSize: 36,
    fontFamily: Fonts.bold,
    marginVertical: Spacing.sm,
  },
  discountTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  discountTagText: { color: Colors.amberLight, fontSize: 11, fontFamily: Fonts.semibold },
});
