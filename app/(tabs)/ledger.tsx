import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PromptModal } from '@/lib/common/components/PromptModal';
import { ScreenLayout } from '@/lib/common/components/ScreenLayout';
import { Colors, Spacing, Radius, Shadow, formatCurrency, Typography, Layout } from '@/constants/theme';
import { EmptyState, SectionHeader } from '@/components/ui';
import { useLanguage } from '@/hooks/useLanguage';
import { useDatabase } from '@/hooks/useDatabase';
import { ledgerRepository } from '@/lib/data/repositories/ledgerRepository';
import { clientRepository } from '@/lib/data/repositories/clientRepository';
import type { LedgerEntry, Client } from '@/lib/domain/models';

export default function LedgerScreen() {
  const { t } = useLanguage();
  const { isReady, refreshKey } = useDatabase();
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [summary, setSummary] = useState({ totalOutstanding: 0, clientCount: 0 });
  const [loading, setLoading] = useState(true);
  const [payClient, setPayClient] = useState<Client | null>(null);

  const pendingClients = clients.filter((c) => c.pending_amount > 0);

  const load = useCallback(async () => {
    if (!isReady) return;
    setLoading(true);
    const [e, c, s] = await Promise.all([
      ledgerRepository.findAll(),
      clientRepository.findAll(),
      ledgerRepository.getOutstandingSummary(),
    ]);
    setEntries(e);
    setClients(c);
    setSummary(s);
    setLoading(false);
  }, [isReady, refreshKey]);

  useEffect(() => {
    void load();
  }, [load]);

  const listHeader = (
    <>
      <View style={styles.summaryCard}>
        <View style={styles.summaryIcon}>
          <Ionicons name="wallet-outline" size={Layout.iconSize.md} color={Colors.danger} />
        </View>
        <Text style={styles.summaryLabel}>{t('total_outstanding')}</Text>
        <Text style={styles.summaryValue}>{formatCurrency(summary.totalOutstanding)}</Text>
        <Text style={styles.summarySub}>
          {summary.clientCount} {t('clients_pending_balance')}
        </Text>
      </View>

      <SectionHeader title={t('party_balances')} icon="people-outline" />
      {pendingClients.length === 0 && !loading ? (
        <Text style={styles.noPending}>{t('no_pending_balances')}</Text>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipList}
        >
          {pendingClients.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.clientChip}
              onPress={() => setPayClient(item)}
              activeOpacity={0.85}
            >
              <Text style={styles.clientChipName} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.clientChipAmt}>{formatCurrency(item.pending_amount)}</Text>
              <View style={styles.payHint}>
                <Ionicons name="cash-outline" size={12} color={Colors.amber} />
                <Text style={styles.payHintText}>{t('record_payment_title')}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <SectionHeader title={t('transaction_history')} icon="list-outline" />
    </>
  );

  return (
    <ScreenLayout title={t('ledger_tab')} padded={false} loading={loading && entries.length === 0}>
      <PromptModal
        visible={!!payClient}
        title={t('record_payment_title')}
        message={payClient ? `${t('outstanding_label')}: ${formatCurrency(payClient.pending_amount)}` : undefined}
        placeholder={t('ph_payment_amount')}
        hint="Enter amount received from client"
        keyboardType="numeric"
        onCancel={() => setPayClient(null)}
        onSubmit={async (amountStr) => {
          const client = payClient;
          setPayClient(null);
          if (!client) return;
          const amount = parseFloat(amountStr || '0');
          if (amount <= 0) return;
          await ledgerRepository.recordPayment(client.id, amount, 'cash', 'Manual payment');
          await load();
        }}
      />

      <FlatList
        data={entries}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshing={loading}
        onRefresh={load}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={
          !loading ? (
            <EmptyState icon="journal-outline" message={t('no_ledger_entries')} />
          ) : null
        }
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={[styles.dot, { backgroundColor: item.type === 'credit' ? Colors.danger : Colors.success }]} />
            <View style={styles.rowBody}>
              <Text style={styles.rowTitle}>{item.client_name}</Text>
              <Text style={styles.rowMeta} numberOfLines={2}>
                {item.notes || item.type} · {new Date(item.created_at).toLocaleString()}
              </Text>
            </View>
            <View style={styles.rowEnd}>
              <Text style={[styles.rowAmt, { color: item.type === 'credit' ? Colors.danger : Colors.success }]}>
                {item.type === 'credit' ? '+' : '-'}
                {formatCurrency(item.amount)}
              </Text>
              <Text style={styles.balance}>Bal: {formatCurrency(item.balance_after)}</Text>
            </View>
          </View>
        )}
      />
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  summaryCard: {
    marginHorizontal: Layout.screenPaddingH,
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    borderLeftWidth: 4,
    borderLeftColor: Colors.danger,
    ...Shadow.md,
  },
  summaryIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    backgroundColor: Colors.dangerBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  summaryLabel: {
    fontSize: Typography.xs,
    color: Colors.textMuted,
    fontWeight: Typography.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryValue: {
    fontSize: Typography.xxl,
    fontWeight: Typography.black,
    color: Colors.textPrimary,
    marginVertical: Spacing.xs,
  },
  summarySub: {
    fontSize: Typography.xs,
    color: Colors.textSecondary,
  },
  chipList: {
    paddingHorizontal: Layout.screenPaddingH,
    gap: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  clientChip: {
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    minWidth: 150,
    maxWidth: 180,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.sm,
  },
  clientChipName: {
    fontWeight: Typography.bold,
    fontSize: Typography.sm,
    color: Colors.textPrimary,
  },
  clientChipAmt: {
    color: Colors.danger,
    fontWeight: Typography.bold,
    fontSize: Typography.sm,
    marginTop: Spacing.xs,
  },
  payHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: Spacing.sm,
  },
  payHintText: {
    fontSize: 10,
    color: Colors.amber,
    fontWeight: Typography.semibold,
  },
  noPending: {
    color: Colors.textMuted,
    fontSize: Typography.sm,
    paddingHorizontal: Layout.screenPaddingH,
    paddingBottom: Spacing.md,
  },
  list: {
    paddingHorizontal: Layout.screenPaddingH,
    paddingBottom: Layout.screenPaddingBottom,
    flexGrow: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadow.sm,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  rowBody: { flex: 1 },
  rowTitle: {
    fontWeight: Typography.bold,
    fontSize: Typography.sm,
    color: Colors.textPrimary,
  },
  rowMeta: {
    fontSize: Typography.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  rowEnd: { alignItems: 'flex-end' },
  rowAmt: {
    fontWeight: Typography.bold,
    fontSize: Typography.sm,
  },
  balance: {
    fontSize: Typography.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
});
