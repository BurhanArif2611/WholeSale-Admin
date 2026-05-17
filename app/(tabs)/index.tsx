// app/(tabs)/index.tsx
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView,
  StyleSheet, RefreshControl, Dimensions,
  Platform, Alert, Pressable,
  TouchableOpacity,
  Share,
  Animated,
  Easing
} from 'react-native';
import { useRouter, Href } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius, Shadow, Gradients, formatCurrency } from '@/constants/theme';
import { DashboardSkeleton, ModernToast } from '@/components/ui';
import { ComingSoonSheet } from '@/components/ComingSoonSheet';
import VoiceSheet, { VoiceMode } from '@/components/VoiceSheet';
import { useRefreshOnFocus } from '@/hooks/useRefreshOnFocus';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { useDataStore, prefetchData } from '@/hooks/useDataStore';
import { ClientPickerSheet } from '@/components/voice/ClientPickerSheet';
import type { Store } from '@/types';

const { width } = Dimensions.get('window');
const CARD = (width - Spacing.xl * 2 - Spacing.md) / 2;
const GRID_HEIGHT = CARD; 

interface GridItem {
    labelKey: string;
    icon: keyof typeof Ionicons.glyphMap;
    route: Href;
    color: string;
    iconColor: string;
    iconBg: string;
}

const GRID_CONFIG: GridItem[] = [
  { labelKey: 'clients', icon: 'people', route: '/(tabs)/clients' as Href, color: Colors.soft.amber, iconColor: Colors.amber, iconBg: Colors.softIcon.amber },
  { labelKey: 'products', icon: 'cube', route: '/(tabs)/products' as Href, color: Colors.soft.purple, iconColor: Colors.purple, iconBg: Colors.softIcon.purple },
  { labelKey: 'orders', icon: 'receipt', route: '/(tabs)/orders' as Href, color: Colors.soft.info, iconColor: Colors.info, iconBg: Colors.softIcon.info },
  { labelKey: 'ledger', icon: 'journal', route: '/(tabs)/ledger' as Href, color: Colors.soft.success, iconColor: Colors.success, iconBg: Colors.softIcon.success },
];

interface ActionItem {
    mode: VoiceMode;
    labelKey: string;
    subKey: string;
    icon: keyof typeof Ionicons.glyphMap;
    gradient: readonly [string, string];
    route: Href;
}

const ACTION_CONFIG: ActionItem[] = [
  {
    mode: 'order',
    labelKey: 'new_order',
    subKey: 'record_sale',
    icon: 'add-circle-outline',
    gradient: Gradients.amber,
    route: '/orders/new' as Href,
  },
  {
    mode: 'product',
    labelKey: 'add_product',
    subKey: 'add_inventory',
    icon: 'cube-outline',
    gradient: Gradients.purple,
    route: '/products/new' as Href,
  },
  {
    mode: 'client',
    labelKey: 'add_client',
    subKey: 'register_shop',
    icon: 'person-add-outline',
    gradient: Gradients.info,
    route: '/clients/new' as Href,
  },
];

const GridCard = React.memo(({ item, onPress, t }: { item: GridItem; onPress: () => void; t: any }) => (
  <Pressable 
    onPress={onPress} 
    style={({ pressed }) => [
      styles.gridCard, 
      { width: CARD, height: GRID_HEIGHT, backgroundColor: item.color },
      pressed && { opacity: 0.8, transform: [{ scale: 0.96 }] }
    ]}
  >
    <View style={[styles.gridIconBox, { backgroundColor: item.iconBg }]} pointerEvents="none">
      <Ionicons name={item.icon} size={44} color={item.iconColor} />
    </View>
    <Text style={styles.gridLabel} numberOfLines={1} adjustsFontSizeToFit>{t(item.labelKey)}</Text>
  </Pressable>
));

const ActionCard = React.memo(({ action, onPress, onMicPress, t }: { action: ActionItem; onPress: () => void; onMicPress: () => void; t: any }) => (
  <Pressable
    onPress={onPress}
    style={({ pressed }) => [
      styles.actionCard,
      pressed && { backgroundColor: Colors.surface2, transform: [{ scale: 0.99 }] }
    ]}
  >
    <View style={[styles.actionIconCircle, { backgroundColor: action.gradient[1] + '15' }]} pointerEvents="none">
      <Ionicons name={action.icon} size={22} color={action.gradient[1]} />
    </View>
    <View style={styles.actionTextContent}>
      <Text style={styles.actionTitle}>{t(action.labelKey)}</Text>
      <Text style={styles.actionSubText}>{t(action.subKey)}</Text>
    </View>
    <TouchableOpacity
      onPress={onMicPress}
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      activeOpacity={0.7}
      style={styles.micCircleWrap}
    >
      <LinearGradient 
        colors={action.gradient} 
        style={styles.micCircle}
        pointerEvents="none"
      >
        <Ionicons name="mic-outline" size={20} color={action.mode === 'order' ? Colors.black : Colors.white} />
      </LinearGradient>
    </TouchableOpacity>
  </Pressable>
));


/**
 * HomeScreen - Main Dashboard.
 * Serves as the primary navigation hub for Salesmen and Owners.
 * Integrates Voice Extraction UI and real-time business stats.
 */
export default function HomeScreen() {
  const router = useRouter();
  const { signOut, profile, resetProfile } = useAuth();
  const { t } = useLanguage();
  const [voiceMode, setVoiceMode] = useState<VoiceMode | null>(null);
  const [selectedClient, setSelectedClient] = useState<Store | null>(null);
  const [showClientPicker, setShowClientPicker] = useState(false);
  
  const [showSoon, setShowSoon] = useState(false);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info', visible: boolean }>({
    message: '', type: 'info', visible: false
  });

  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type, visible: true });
  };

  const isOwner = profile?.role === 'owner';
  const ownerId = isOwner ? profile?.id : profile?.owner_id;
  
  const { stats, refreshing, loadStats } = useDashboardStats(ownerId);
  const { refresh } = useDataStore(ownerId);

  const onFocusRefresh = useCallback(() => {
    void loadStats();
    void refresh();
  }, [loadStats, refresh]);

  useRefreshOnFocus(onFocusRefresh);

  const handleRefresh = useCallback(async () => {
    try {
        await Promise.all([refresh(true), loadStats()]);
    } catch (e) {
        showNotification("Sync failed. Check connection.", "error");
    }
  }, [loadStats, refresh]);

  useEffect(() => {
    if (ownerId) {
      void prefetchData(ownerId);
    }
  }, [ownerId]);

  const isPendingFirm = profile?.role === 'salesman' && !ownerId;
  
  const handleCopyFirmCode = () => {
      if (profile?.id) {
          Share.share({ 
              message: `Register as Salesman using my Firm Code: ${profile.id.slice(0, 6).toUpperCase()}`,
              title: 'Wholesale Firm Code' 
          }).catch(console.error);
      }
  };

  if (isPendingFirm) {
    return (
      <View style={styles.pendingContainer}>
        <DashboardSkeleton message="Verifying firm membership..." />
      </View>
    );
  }

  return (
    <>
      <View style={styles.header}>
        <View style={styles.headerUser}>
          <Text style={styles.headerTitle} numberOfLines={1}>{profile?.full_name || 'Admin'}</Text>
          <View style={styles.roleBadge}>
            <Ionicons name={isOwner ? "shield-checkmark" : "bicycle"} size={10} color={Colors.white} />
            <Text style={styles.roleBadgeText}>{profile?.role?.toUpperCase()}</Text>
          </View>
        </View>

        <Pressable 
          style={({ pressed }) => [
            styles.headerLogout,
            pressed && { opacity: 0.7, transform: [{ scale: 0.92 }] }
          ]} 
          onPress={() => {
              Alert.alert("Sign Out", "Are you sure you want to end your session?", [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Sign Out', style: 'destructive', onPress: signOut }
              ]);
          }}
        >
          <LinearGradient colors={Gradients.danger} style={styles.logoutCircle} pointerEvents="none">
             <Ionicons name="log-out-outline" size={18} color={Colors.white} />
          </LinearGradient>
        </Pressable>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.amber} />}
        showsVerticalScrollIndicator={false}
      >
        {stats && stats.debt > 0 && (
          <View style={styles.debtBanner}>
            <View>
              <View style={styles.debtLabelRow}>
                <Ionicons name="warning-outline" size={13} color={Colors.amber} />
                <Text style={styles.debtLabel}>{t('outstanding_debt')}</Text>
              </View>
              <Text style={styles.debtAmount}>{formatCurrency(stats.debt)}</Text>
            </View>
            <Ionicons name="wallet" size={32} color={Colors.amber} style={{ opacity: 0.2 }} />
          </View>
        )}

        <View style={styles.grid}>
          {GRID_CONFIG.map((item) => (
            <GridCard key={item.labelKey} item={item} t={t} onPress={() => router.push(item.route)} />
          ))}
        </View>

        <View style={styles.actionList}>
          {ACTION_CONFIG.map((action) => (
            <ActionCard
              key={action.mode}
              action={action}
              t={t}
              onPress={() => router.push(action.route)}
              onMicPress={() => {
                setShowSoon(true);
              }}
            />
          ))}
        </View>

        {isOwner && (
          <View style={styles.ownerSection}>
            <View style={[styles.firmCodeCard, Shadow.md]}>
              <View>
                <Text style={styles.firmCodeLabel}>{t('firm_code_label')}</Text>
                <Text style={styles.firmCodeValue}>{profile?.id?.slice(0, 6).toUpperCase()}</Text>
              </View>
              <TouchableOpacity style={styles.shareBtn} onPress={handleCopyFirmCode}>
                <Ionicons name="share-outline" size={20} color={Colors.white} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>

      <ModernToast 
        visible={toast.visible} 
        message={toast.message} 
        type={toast.type} 
        onHide={() => setToast(prev => ({ ...prev, visible: false }))} 
      />

      <ComingSoonSheet visible={showSoon} onClose={() => setShowSoon(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  pendingContainer: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: Spacing.xl, paddingTop: Spacing.xs },
  headerTitle: { fontSize: 20, fontWeight: Typography.black, color: Colors.textPrimary },
  debtBanner: { borderRadius: Radius.xl, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md, backgroundColor: Colors.amberBg, borderWidth: 1, borderColor: '#F59E0B25' },
  debtLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 2 },
  debtLabel: { fontSize: 10, fontWeight: Typography.bold, color: Colors.amber, letterSpacing: 1.5, textTransform: 'uppercase' },
  debtAmount: { fontSize: 26, fontWeight: Typography.black, color: Colors.amber },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md, marginBottom: Spacing.xl },
  gridCard: { borderRadius: Radius.xxl, padding: Spacing.lg, alignItems: 'center', justifyContent: 'center', gap: Spacing.xs, ...Shadow.lg, borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.05)' },
  gridIconBox: { width: 72, height: 72, borderRadius: Radius.xl, alignItems: 'center', justifyContent: 'center' },
  gridLabel: { 
    fontSize: 20, 
    fontWeight: '900', 
    color: '#000000', 
    textTransform: 'uppercase', 
    letterSpacing: 1, 
    marginTop: 10,
    textShadowColor: 'rgba(0,0,0,0.1)',
    textShadowOffset: { width: 0.5, height: 0.5 },
    textShadowRadius: 1,
    textAlign: 'center',
    width: '100%'
  },
  actionList: { gap: Spacing.md, marginBottom: Spacing.xl },
  actionCard: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: Radius.xl, backgroundColor: Colors.white, ...Shadow.md, borderWidth: 1, borderColor: Colors.borderLight },
  actionIconCircle: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.md },
  actionTextContent: { flex: 1 },
  actionTitle: { fontSize: Typography.md, fontWeight: Typography.black, color: Colors.textPrimary, marginBottom: 2 },
  actionSubText: { fontSize: Typography.xs, color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  micCircleWrap: { padding: 4 },
  micCircle: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', ...Shadow.colored(Colors.amber) },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  headerUser: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  headerLogout: { padding: 4 },
  logoutCircle: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', ...Shadow.md },
  roleBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: Colors.textMuted, paddingHorizontal: 6, paddingVertical: 2, borderRadius: Radius.sm },
  roleBadgeText: { fontSize: 9, fontWeight: '900', color: Colors.white, letterSpacing: 0.5 },
  ownerSection: { marginTop: Spacing.md, marginBottom: Spacing.xl },
  firmCodeCard: { backgroundColor: Colors.info, borderRadius: Radius.xl, padding: Spacing.lg, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  firmCodeLabel: { fontSize: 10, fontWeight: '900', color: 'rgba(255,255,255,0.7)', letterSpacing: 1.5, marginBottom: 4, textTransform: 'uppercase' },
  firmCodeValue: { fontSize: 24, fontWeight: Typography.black, color: Colors.white, letterSpacing: 2 },
  shareBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  resetContainer: { position: 'absolute', bottom: 60, alignSelf: 'center', backgroundColor: Colors.white, borderRadius: Radius.full, paddingHorizontal: 30, paddingVertical: 15, ...Shadow.lg, borderWidth: 1, borderColor: Colors.borderLight },
  resetText: { color: Colors.danger, fontWeight: '900', fontSize: 11, letterSpacing: 1 }
});
