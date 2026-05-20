import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, Pressable, Dimensions } from 'react-native';
import { useRouter, Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, Radius, Shadow, Gradients, formatCurrency, Typography, Layout } from '@/constants/theme';
import { ModuleCard } from '@/lib/common/components/ModuleCard';
import { useDatabase } from '@/hooks/useDatabase';
import { dashboardRepository } from '@/lib/data/repositories/dashboardRepository';
import type { DashboardStats } from '@/lib/domain/models';

const { width } = Dimensions.get('window');
const CARD_W = (width - Spacing.lg * 2 - Spacing.md) / 2;

const MODULES = [
  { title: 'Instant Purchase', subtitle: 'Walk-in & quick billing', icon: 'flash' as const, route: '/orders/instant', color: '#FFF8E7', iconColor: Colors.amber },
  { title: 'Add Client', subtitle: 'Customers & ledger', icon: 'people' as const, route: '/clients/new', color: Colors.soft.info, iconColor: Colors.info },
  { title: 'Categories', subtitle: 'Organize products', icon: 'pricetags' as const, route: '/categories', color: Colors.soft.purple, iconColor: Colors.purple },
  { title: 'Products', subtitle: 'Catalog & pricing', icon: 'cube' as const, route: '/(tabs)/products', color: Colors.soft.indigo, iconColor: Colors.info },
  { title: 'New Order', subtitle: 'Create sale', icon: 'cart' as const, route: '/orders/new', color: Colors.soft.amber, iconColor: Colors.amber },
  { title: 'Orders', subtitle: 'Track & invoice', icon: 'receipt' as const, route: '/(tabs)/orders', color: Colors.soft.amber, iconColor: Colors.amberDim },
  { title: 'Inventory', subtitle: 'Stock in/out', icon: 'layers' as const, route: '/(tabs)/inventory', color: Colors.soft.success, iconColor: Colors.success },
  { title: 'Ledger', subtitle: 'Credit & payments', icon: 'journal' as const, route: '/(tabs)/ledger', color: '#FFF0F0', iconColor: Colors.danger },
];

export default function DashboardScreen() {
  const router = useRouter();
  const { isReady, refreshKey } = useDatabase();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadStats = useCallback(async () => {
    if (!isReady) return;
    const data = await dashboardRepository.getStats();
    setStats(data);
  }, [isReady, refreshKey]);

  React.useEffect(() => {
    void loadStats();
  }, [loadStats]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadStats();
    setRefreshing(false);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.amber} />}
    >
      <LinearGradient colors={Gradients.amber} style={styles.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <Text style={styles.heroLabel}>TODAY&apos;S SALES</Text>
        <Text style={styles.heroValue}>{formatCurrency(stats?.todaySales ?? 0)}</Text>
        <View style={styles.heroRow}>
          <HeroChip icon="people-outline" label={`${stats?.totalClients ?? 0} Clients`} />
          <HeroChip icon="cube-outline" label={`${stats?.totalProducts ?? 0} Products`} />
          <HeroChip icon="alert-circle-outline" label={`${stats?.lowStockCount ?? 0} Low Stock`} />
        </View>
      </LinearGradient>

      <View style={styles.statsRow}>
        <StatBox label="Orders" value={String(stats?.totalOrders ?? 0)} color={Colors.info} />
        <StatBox label="Outstanding" value={formatCurrency(stats?.pendingAmount ?? 0)} color={Colors.danger} />
      </View>

      <Text style={styles.sectionTitle}>Quick Modules</Text>
      <View style={styles.grid}>
        {MODULES.map((m) => (
          <View key={m.title} style={{ width: CARD_W }}>
            <ModuleCard
              title={m.title}
              subtitle={m.subtitle}
              icon={m.icon}
              color={m.color}
              iconColor={m.iconColor}
              onPress={() => router.push(m.route as Href)}
              badge={m.title === 'Inventory' ? stats?.lowStockCount : undefined}
            />
          </View>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Recent Orders</Text>
      {(stats?.recentOrders?.length ?? 0) === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="receipt-outline" size={40} color={Colors.textMuted} />
          <Text style={styles.emptyText}>No orders yet. Create your first order.</Text>
          <Pressable style={styles.emptyBtn} onPress={() => router.push('/orders/new' as Href)}>
            <Text style={styles.emptyBtnText}>New Order</Text>
          </Pressable>
        </View>
      ) : (
        stats?.recentOrders.map((o) => (
          <Pressable key={o.id} style={styles.orderRow} onPress={() => router.push(`/orders/${o.id}` as Href)}>
            <View>
              <Text style={styles.orderClient}>{o.client_name}</Text>
              <Text style={styles.orderMeta}>{new Date(o.created_at).toLocaleString()}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.orderTotal}>{formatCurrency(o.grand_total)}</Text>
              <Text style={[styles.orderStatus, { color: o.payment_status === 'paid' ? Colors.success : Colors.amber }]}>
                {o.payment_status}
              </Text>
            </View>
          </Pressable>
        ))
      )}
    </ScrollView>
  );
}

function HeroChip({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  return (
    <View style={styles.chip}>
      <Ionicons name={icon} size={14} color={Colors.white} />
      <Text style={styles.chipText}>{label}</Text>
    </View>
  );
}

function StatBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={[styles.statBox, { borderLeftColor: color }]}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  content: { paddingHorizontal: Layout.screenPaddingH, paddingTop: Spacing.md, paddingBottom: Layout.screenPaddingBottom },
  hero: { borderRadius: Radius.xl, padding: Spacing.xl, marginBottom: Spacing.lg, ...Shadow.md },
  heroLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  heroValue: { color: Colors.white, fontSize: 36, fontWeight: '900', marginVertical: 8 },
  heroRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: Radius.full },
  chipText: { color: Colors.white, fontSize: 11, fontWeight: '600' },
  statsRow: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.lg },
  statBox: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderLeftWidth: 4,
    ...Shadow.sm,
  },
  statLabel: { fontSize: 11, color: Colors.textMuted, fontWeight: '600' },
  statValue: { fontSize: Typography.md, fontWeight: '800', color: Colors.textPrimary, marginTop: 4 },
  sectionTitle: { fontSize: Typography.sm, fontWeight: '800', color: Colors.textPrimary, marginBottom: Spacing.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md, marginBottom: Spacing.xl },
  empty: { alignItems: 'center', padding: Spacing.xl, backgroundColor: Colors.surface, borderRadius: Radius.lg },
  emptyText: { color: Colors.textMuted, marginTop: 8, textAlign: 'center' },
  emptyBtn: { marginTop: Spacing.md, backgroundColor: Colors.amber, paddingHorizontal: 20, paddingVertical: 10, borderRadius: Radius.md },
  emptyBtnText: { color: Colors.white, fontWeight: '700' },
  orderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    marginBottom: Spacing.sm,
    ...Shadow.sm,
  },
  orderClient: { fontWeight: '700', color: Colors.textPrimary },
  orderMeta: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  orderTotal: { fontWeight: '800', color: Colors.textPrimary },
  orderStatus: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', marginTop: 2 },
});
