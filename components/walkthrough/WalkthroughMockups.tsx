import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { WalkthroughColors, WalkthroughGradients } from '@/constants/walkthroughTheme';
import { Radius, Spacing, Typography } from '@/constants/theme';

function useFloatAnim(delay = 0) {
  const y = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(y, { toValue: -6, duration: 1400, delay, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(y, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [y, delay]);
  return y;
}

function GlassCard({ children, style }: { children: React.ReactNode; style?: object }) {
  return (
    <View style={[styles.glassCard, style]}>
      <LinearGradient colors={WalkthroughGradients.card} style={StyleSheet.absoluteFill} />
      {children}
    </View>
  );
}

export function ClientsWalkthroughMockup() {
  const fabY = useFloatAnim(200);
  const card1 = useFloatAnim(0);
  const card2 = useFloatAnim(400);

  return (
    <View style={styles.mockRoot}>
      <Animated.View style={[styles.clientCard, { transform: [{ translateY: card1 }] }]}>
        <GlassCard>
          <View style={styles.clientRow}>
            <LinearGradient colors={WalkthroughGradients.amber} style={styles.avatar}>
              <Text style={styles.avatarText}>RS</Text>
            </LinearGradient>
            <View style={styles.clientInfo}>
              <Text style={styles.mockTitle}>Raj Store</Text>
              <Text style={styles.mockSub}>Downtown · +91 98••••01</Text>
            </View>
            <View style={styles.debtBadge}>
              <Text style={styles.debtText}>₹2,400</Text>
            </View>
          </View>
        </GlassCard>
      </Animated.View>

      <Animated.View style={[styles.clientCard, styles.clientCardOffset, { transform: [{ translateY: card2 }] }]}>
        <GlassCard>
          <View style={styles.clientRow}>
            <View style={[styles.avatar, { backgroundColor: WalkthroughColors.info }]}>
              <Ionicons name="person" size={18} color={WalkthroughColors.textPrimary} />
            </View>
            <View style={styles.clientInfo}>
              <Text style={styles.mockTitle}>Mehta Traders</Text>
              <Text style={styles.mockSub}>Market Road</Text>
            </View>
            <Ionicons name="checkmark-circle" size={20} color={WalkthroughColors.success} />
          </View>
        </GlassCard>
      </Animated.View>

      <Animated.View style={[styles.fab, { transform: [{ translateY: fabY }] }]}>
        <LinearGradient colors={WalkthroughGradients.amber} style={styles.fabInner}>
          <Ionicons name="add" size={28} color={WalkthroughColors.textPrimary} />
        </LinearGradient>
      </Animated.View>
    </View>
  );
}

export function ProductsWalkthroughMockup() {
  const cardY = useFloatAnim(100);

  return (
    <View style={styles.mockRoot}>
      <Animated.View style={[styles.productGrid, { transform: [{ translateY: cardY }] }]}>
        <GlassCard style={styles.productCard}>
          <View style={styles.productIcon}>
            <Ionicons name="nutrition-outline" size={22} color={WalkthroughColors.amber} />
          </View>
          <Text style={styles.mockTitle}>Basmati Rice</Text>
          <Text style={styles.qtyHighlight}>0.5 KG</Text>
          <Text style={styles.priceText}>₹120.00</Text>
        </GlassCard>
        <GlassCard style={styles.productCard}>
          <View style={[styles.productIcon, { backgroundColor: WalkthroughColors.success + '33' }]}>
            <Ionicons name="water-outline" size={22} color={WalkthroughColors.success} />
          </View>
          <Text style={styles.mockTitle}>Fresh Milk</Text>
          <Text style={styles.mockSub}>1 L · In stock</Text>
          <Text style={styles.priceText}>₹58.00</Text>
        </GlassCard>
      </Animated.View>
      <View style={styles.searchBar}>
        <Ionicons name="search" size={16} color={WalkthroughColors.textMuted} />
        <Text style={styles.searchPlaceholder}>Search products...</Text>
      </View>
    </View>
  );
}

export function OrderWalkthroughMockup() {
  const cartY = useFloatAnim(0);

  return (
    <View style={styles.mockRoot}>
      <GlassCard style={styles.orderCard}>
        <View style={styles.orderLine}>
          <Text style={styles.mockTitle}>Basmati Rice</Text>
          <Text style={styles.mockSub}>0.5 KG × ₹120</Text>
        </View>
        <View style={styles.orderLine}>
          <Text style={styles.mockTitle}>Cooking Oil</Text>
          <Text style={styles.mockSub}>2 Pcs × ₹180</Text>
        </View>
        <View style={styles.discountRow}>
          <Ionicons name="pricetag" size={14} color={WalkthroughColors.amber} />
          <Text style={styles.discountText}>5% discount applied</Text>
        </View>
      </GlassCard>

      <Animated.View style={[styles.checkoutBar, { transform: [{ translateY: cartY }] }]}>
        <LinearGradient colors={WalkthroughGradients.amber} style={styles.checkoutGradient}>
          <View>
            <Text style={styles.checkoutLabel}>3 items</Text>
            <Text style={styles.checkoutTotal}>₹540.00</Text>
          </View>
          <View style={styles.checkoutBtn}>
            <Text style={styles.checkoutBtnText}>Checkout</Text>
            <Ionicons name="arrow-forward" size={18} color={WalkthroughColors.bg} />
          </View>
        </LinearGradient>
      </Animated.View>

      <View style={styles.receiptChip}>
        <Ionicons name="share-social-outline" size={14} color={WalkthroughColors.info} />
        <Text style={styles.receiptText}>Share Receipt</Text>
      </View>
    </View>
  );
}

export function LedgerWalkthroughMockup() {
  const row1 = useFloatAnim(0);
  const row2 = useFloatAnim(300);

  return (
    <View style={styles.mockRoot}>
      <View style={styles.ledgerSummary}>
        <GlassCard style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Outstanding</Text>
          <Text style={[styles.summaryValue, { color: WalkthroughColors.danger }]}>₹12,450</Text>
        </GlassCard>
        <GlassCard style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Collected</Text>
          <Text style={[styles.summaryValue, { color: WalkthroughColors.success }]}>₹8,200</Text>
        </GlassCard>
      </View>

      <Animated.View style={{ transform: [{ translateY: row1 }] }}>
        <GlassCard style={styles.ledgerRow}>
          <View style={styles.ledgerLeft}>
            <Text style={styles.mockTitle}>Raj Store</Text>
            <Text style={styles.mockSub}>Payment · Today</Text>
          </View>
          <View style={[styles.statusPill, styles.paidPill]}>
            <Text style={styles.paidText}>Paid</Text>
          </View>
          <Text style={styles.ledgerAmount}>+₹2,000</Text>
        </GlassCard>
      </Animated.View>

      <Animated.View style={{ transform: [{ translateY: row2 }] }}>
        <GlassCard style={styles.ledgerRow}>
          <View style={styles.ledgerLeft}>
            <Text style={styles.mockTitle}>Kumar Wholesale</Text>
            <Text style={styles.mockSub}>Order #1042</Text>
          </View>
          <View style={[styles.statusPill, styles.pendingPill]}>
            <Text style={styles.pendingText}>Pending</Text>
          </View>
          <Text style={[styles.ledgerAmount, { color: WalkthroughColors.danger }]}>₹4,200</Text>
        </GlassCard>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  mockRoot: { flex: 1, justifyContent: 'center', paddingHorizontal: Spacing.lg, minHeight: 280 },
  glassCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: WalkthroughColors.border,
    overflow: 'hidden',
    padding: Spacing.md,
  },
  clientCard: { marginBottom: Spacing.sm },
  clientCardOffset: { marginLeft: Spacing.lg, opacity: 0.92 },
  clientRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: WalkthroughColors.textPrimary, fontWeight: Typography.bold, fontSize: 14 },
  clientInfo: { flex: 1 },
  mockTitle: { color: WalkthroughColors.textPrimary, fontSize: 14, fontWeight: Typography.bold },
  mockSub: { color: WalkthroughColors.textMuted, fontSize: 11, marginTop: 2 },
  debtBadge: {
    backgroundColor: WalkthroughColors.danger + '22',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.sm,
  },
  debtText: { color: WalkthroughColors.danger, fontSize: 11, fontWeight: Typography.bold },
  fab: {
    position: 'absolute',
    right: Spacing.lg,
    bottom: 20,
  },
  fabInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: WalkthroughColors.amber,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  productGrid: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  productCard: { flex: 1 },
  productIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: WalkthroughColors.amber + '22',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  qtyHighlight: {
    color: WalkthroughColors.amberLight,
    fontSize: 12,
    fontWeight: Typography.bold,
    marginTop: 4,
  },
  priceText: { color: WalkthroughColors.textPrimary, fontSize: 13, fontWeight: Typography.bold, marginTop: 4 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: WalkthroughColors.surface,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: WalkthroughColors.border,
  },
  searchPlaceholder: { color: WalkthroughColors.textMuted, fontSize: 12 },
  orderCard: { marginBottom: Spacing.md },
  orderLine: { marginBottom: Spacing.sm },
  discountRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  discountText: { color: WalkthroughColors.amberLight, fontSize: 11, fontWeight: Typography.semibold },
  checkoutBar: { borderRadius: Radius.lg, overflow: 'hidden' },
  checkoutGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
  },
  checkoutLabel: { color: WalkthroughColors.bg, fontSize: 11, opacity: 0.85 },
  checkoutTotal: { color: WalkthroughColors.bg, fontSize: 18, fontWeight: Typography.extrabold },
  checkoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: WalkthroughColors.textPrimary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.full,
  },
  checkoutBtnText: { color: WalkthroughColors.bg, fontWeight: Typography.bold, fontSize: 13 },
  receiptChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'center',
    marginTop: Spacing.md,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: WalkthroughColors.info + '22',
  },
  receiptText: { color: WalkthroughColors.info, fontSize: 11, fontWeight: Typography.semibold },
  ledgerSummary: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  summaryCard: { flex: 1, alignItems: 'center' },
  summaryLabel: { color: WalkthroughColors.textMuted, fontSize: 10, fontWeight: Typography.semibold },
  summaryValue: { fontSize: 16, fontWeight: Typography.extrabold, marginTop: 4 },
  ledgerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  ledgerLeft: { flex: 1 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full },
  paidPill: { backgroundColor: WalkthroughColors.success + '28' },
  pendingPill: { backgroundColor: WalkthroughColors.amber + '28' },
  paidText: { color: WalkthroughColors.success, fontSize: 10, fontWeight: Typography.bold },
  pendingText: { color: WalkthroughColors.amberLight, fontSize: 10, fontWeight: Typography.bold },
  ledgerAmount: { color: WalkthroughColors.success, fontSize: 13, fontWeight: Typography.bold },
});
