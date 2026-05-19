import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Linking, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenLayout } from '@/lib/common/components/ScreenLayout';
import { Colors, Spacing, Radius, formatCurrency, Typography } from '@/constants/theme';
import { useLanguage } from '@/hooks/useLanguage';
import { clientRepository } from '@/lib/data/repositories/clientRepository';
import { orderRepository } from '@/lib/data/repositories/orderRepository';
import { ledgerRepository } from '@/lib/data/repositories/ledgerRepository';
import type { Client, Order, LedgerEntry } from '@/lib/domain/models';

export default function ClientDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useLanguage();
  const [client, setClient] = useState<Client | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const c = await clientRepository.findById(id);
    setClient(c);
    if (c) {
      const [o, l] = await Promise.all([
        orderRepository.findAll({ clientId: id }),
        ledgerRepository.findAll(id),
      ]);
      setOrders(o);
      setLedger(l);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <ScreenLayout
      title={client?.name ?? t('client_details_title')}
      scroll
      loading={loading && !client}
      onRefresh={load}
    >
      {client && (
        <>
          <View style={styles.header}>
            <Text style={styles.meta}>{client.mobile}</Text>
            {client.email ? <Text style={styles.meta}>{client.email}</Text> : null}
            {client.address ? <Text style={styles.meta}>{client.address}</Text> : null}
            <View style={styles.row}>
              <Pressable style={styles.chip} onPress={() => Linking.openURL(`tel:${client.mobile}`)}>
                <Ionicons name="call" size={16} color={Colors.success} />
                <Text style={styles.chipText}>Call</Text>
              </Pressable>
              <Pressable style={styles.chip} onPress={() => Linking.openURL(`https://wa.me/${client.mobile}`)}>
                <Ionicons name="logo-whatsapp" size={16} color="#25D366" />
                <Text style={styles.chipText}>WhatsApp</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardLabel}>Pending Amount</Text>
            <Text style={styles.pending}>{formatCurrency(client.pending_amount)}</Text>
            <Text style={styles.cardSub}>Credit limit: {formatCurrency(client.credit_limit)}</Text>
          </View>

          <Text style={styles.section}>Order History ({orders.length})</Text>
          {orders.length === 0 ? (
            <Text style={styles.muted}>No orders yet</Text>
          ) : (
            orders.map((o) => (
              <Pressable key={o.id} style={styles.item} onPress={() => router.push(`/orders/${o.id}`)}>
                <Text style={styles.itemTitle}>{formatCurrency(o.grand_total)}</Text>
                <Text style={styles.muted}>{new Date(o.created_at).toLocaleDateString()} · {o.payment_status}</Text>
              </Pressable>
            ))
          )}

          <Text style={styles.section}>{t('ledger')}</Text>
          {ledger.map((e) => (
            <View key={e.id} style={styles.item}>
              <Text style={[styles.itemTitle, { color: e.type === 'credit' ? Colors.danger : Colors.success }]}>
                {e.type === 'credit' ? '+' : '-'}{formatCurrency(e.amount)}
              </Text>
              <Text style={styles.muted}>{e.notes} · {new Date(e.created_at).toLocaleDateString()}</Text>
            </View>
          ))}
        </>
      )}
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  header: { marginBottom: Spacing.lg },
  meta: { fontSize: Typography.sm, color: Colors.textMuted, marginTop: 4 },
  row: { flexDirection: 'row', gap: 8, marginTop: Spacing.md },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipText: { fontSize: Typography.xs, fontWeight: Typography.semibold, color: Colors.textPrimary },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  cardLabel: { fontSize: Typography.xs, color: Colors.textMuted, fontWeight: Typography.semibold },
  pending: { fontSize: 28, fontWeight: Typography.black, color: Colors.danger, marginVertical: 4 },
  cardSub: { fontSize: Typography.xs, color: Colors.textSecondary },
  section: {
    fontSize: Typography.sm,
    fontWeight: Typography.bold,
    marginBottom: Spacing.sm,
    color: Colors.textPrimary,
  },
  item: {
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: Radius.md,
    marginBottom: Spacing.sm,
  },
  itemTitle: { fontWeight: Typography.bold, color: Colors.textPrimary },
  muted: { fontSize: Typography.xs, color: Colors.textMuted, marginTop: 2 },
});
