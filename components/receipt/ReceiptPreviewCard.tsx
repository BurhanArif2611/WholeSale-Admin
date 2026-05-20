import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, formatCurrency, Typography } from '@/constants/theme';
import type { ReceiptData } from '@/lib/receipt/receiptTypes';
import { formatQuantityDisplay } from '@/lib/common/utils/quantity';

interface ReceiptPreviewCardProps {
  data: ReceiptData;
  compact?: boolean;
}

export function ReceiptPreviewCard({ data, compact = false }: ReceiptPreviewCardProps) {
  const visibleItems = compact && data.items.length > 4 ? data.items.slice(0, 4) : data.items;
  const moreCount = data.items.length - visibleItems.length;

  const statusColor =
    data.paymentStatus === 'paid'
      ? Colors.success
      : data.paymentStatus === 'partial'
        ? Colors.amber
        : Colors.danger;

  return (
    <View style={styles.wrap}>
      <View style={styles.badgeRow}>
        <View style={[styles.badge, styles.badgePdf]}>
          <Text style={styles.badgePdfText}>PDF</Text>
        </View>
        <View style={[styles.badge, styles.badgePrint]}>
          <Ionicons name="print-outline" size={10} color={Colors.purple} />
          <Text style={styles.badgePrintText}>PRINT</Text>
        </View>
      </View>

      <View style={styles.shopBlock}>
        <Text style={styles.shopName}>{data.shop.name}</Text>
        {data.shop.address ? <Text style={styles.shopMeta}>{data.shop.address}</Text> : null}
        {data.shop.phone ? <Text style={styles.shopMeta}>{data.shop.phone}</Text> : null}
      </View>

      <View style={styles.divider} />

      <View style={styles.metaBlock}>
        <MetaLine label="Bill No" value={`#${data.invoiceNo}`} />
        <MetaLine
          label="Created On"
          value={new Date(data.createdAt).toLocaleString('en-IN', {
            day: '2-digit',
            month: '2-digit',
            year: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          })}
        />
        <MetaLine label="Bill To" value={`${data.client.name} | ${data.client.mobile}`} />
        {data.client.address ? (
          <MetaLine label="Billing Address" value={data.client.address} multiline />
        ) : null}
      </View>

      <View style={styles.tableHeader}>
        <Text style={[styles.th, styles.thItem]}>Item Name</Text>
        <Text style={styles.th}>Qty</Text>
        <Text style={[styles.th, styles.thRight]}>Rate</Text>
        <Text style={[styles.th, styles.thRight]}>Total</Text>
      </View>

      <ScrollView style={compact ? styles.itemsScroll : undefined} nestedScrollEnabled>
        {visibleItems.map((item, idx) => (
          <View key={`${item.name}-${idx}`} style={[styles.itemRow, idx % 2 === 1 && styles.itemRowAlt]}>
            <Text style={[styles.td, styles.tdItem]} numberOfLines={2}>
              {item.name}
              {item.isTemporary ? <Text style={styles.tempTag}> (Temp)</Text> : null}
            </Text>
            <Text style={styles.td}>
              {formatQuantityDisplay(item.quantity)} {item.unit}
            </Text>
            <Text style={[styles.td, styles.tdRight]}>{formatCurrency(item.rate)}</Text>
            <Text style={[styles.td, styles.tdRight, styles.tdBold]}>{formatCurrency(item.total)}</Text>
          </View>
        ))}
        {moreCount > 0 ? (
          <Text style={styles.moreItems}>+ {moreCount} more items</Text>
        ) : null}
      </ScrollView>

      <View style={styles.dividerBold} />

      <View style={styles.summary}>
        <SummaryLine label="Total Items" value={String(data.totalItems)} />
        <SummaryLine label="Total Quantity" value={String(data.totalQty)} />
        <SummaryLine label="Sub Total" value={formatCurrency(data.subtotal)} />
        {data.productDiscount > 0 ? (
          <SummaryLine label="Discount" value={`−${formatCurrency(data.productDiscount)}`} />
        ) : null}
        {data.taxTotal > 0 ? <SummaryLine label="Tax" value={formatCurrency(data.taxTotal)} /> : null}
        {data.clientDiscount > 0 ? (
          <SummaryLine label="Client Disc." value={`−${formatCurrency(data.clientDiscount)}`} />
        ) : null}
        <View style={styles.grandRow}>
          <Text style={styles.grandLabel}>Total</Text>
          <Text style={styles.grandValue}>{formatCurrency(data.grandTotal)}</Text>
        </View>
        <View style={styles.payRow}>
          <Text style={styles.payMeta}>
            Paid {formatCurrency(data.paid)}
            {data.remaining > 0 ? ` · Due ${formatCurrency(data.remaining)}` : ''}
          </Text>
          <View style={[styles.statusPill, { backgroundColor: statusColor + '22' }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>{data.paymentStatus}</Text>
          </View>
        </View>
      </View>

      <Text style={styles.thanks}>Thank You! Visit Again!</Text>
    </View>
  );
}

function MetaLine({ label, value, multiline }: { label: string; value: string; multiline?: boolean }) {
  return (
    <View style={styles.metaLine}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={[styles.metaValue, multiline && styles.metaMultiline]} numberOfLines={multiline ? 3 : 1}>
        {value}
      </Text>
    </View>
  );
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryLine}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  badgeRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 6, padding: Spacing.sm, paddingBottom: 0 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 8, paddingVertical: 4, borderRadius: Radius.full },
  badgePdf: { backgroundColor: Colors.successBg },
  badgePdfText: { fontSize: 10, fontWeight: Typography.bold, color: Colors.success },
  badgePrint: { backgroundColor: Colors.purpleBg },
  badgePrintText: { fontSize: 10, fontWeight: Typography.bold, color: Colors.purple },
  shopBlock: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm, alignItems: 'center' },
  shopName: { fontSize: Typography.md, fontWeight: Typography.black, color: Colors.textPrimary, textAlign: 'center' },
  shopMeta: { fontSize: Typography.xs, color: Colors.textMuted, textAlign: 'center', marginTop: 2 },
  divider: { height: 1, backgroundColor: Colors.border, marginHorizontal: Spacing.md },
  dividerBold: { height: 2, backgroundColor: Colors.textPrimary, marginHorizontal: Spacing.md, marginTop: Spacing.sm },
  metaBlock: { padding: Spacing.md, gap: 6 },
  metaLine: { flexDirection: 'row', gap: Spacing.sm },
  metaLabel: { width: 100, fontSize: Typography.xs, color: Colors.textMuted, fontWeight: Typography.semibold },
  metaValue: { flex: 1, fontSize: Typography.xs, fontWeight: Typography.bold, color: Colors.textPrimary },
  metaMultiline: { lineHeight: 18 },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: Colors.surface2,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.borderLight,
  },
  th: { flex: 1, fontSize: 10, fontWeight: Typography.bold, color: Colors.textMuted, textTransform: 'uppercase' },
  thItem: { flex: 2 },
  thRight: { textAlign: 'right' },
  itemsScroll: { maxHeight: 160 },
  itemRow: { flexDirection: 'row', paddingVertical: 8, paddingHorizontal: Spacing.sm, alignItems: 'flex-start' },
  itemRowAlt: { backgroundColor: Colors.surface2 },
  td: { flex: 1, fontSize: 11, color: Colors.textPrimary },
  tdItem: { flex: 2 },
  tdRight: { textAlign: 'right' },
  tdBold: { fontWeight: Typography.bold },
  tempTag: { color: Colors.info, fontSize: 10 },
  moreItems: { textAlign: 'center', fontSize: Typography.xs, color: Colors.amber, padding: Spacing.sm },
  summary: { padding: Spacing.md },
  summaryLine: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  summaryLabel: { fontSize: Typography.xs, color: Colors.textSecondary },
  summaryValue: { fontSize: Typography.xs, fontWeight: Typography.semibold, color: Colors.textPrimary },
  grandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    borderStyle: 'dashed',
  },
  grandLabel: { fontSize: Typography.md, fontWeight: Typography.black, color: Colors.textPrimary },
  grandValue: { fontSize: Typography.lg, fontWeight: Typography.black, color: Colors.textPrimary },
  payRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.sm },
  payMeta: { fontSize: 10, color: Colors.textMuted, flex: 1 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full },
  statusText: { fontSize: 10, fontWeight: Typography.bold, textTransform: 'capitalize' },
  thanks: {
    textAlign: 'center',
    fontSize: Typography.xs,
    color: Colors.textMuted,
    padding: Spacing.md,
    backgroundColor: Colors.surface2,
    fontWeight: Typography.semibold,
  },
});
