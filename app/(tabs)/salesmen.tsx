// app/(tabs)/salesmen.tsx
import React, { useState, useCallback, useMemo } from 'react';
import { 
  View, Text, StyleSheet, FlatList, RefreshControl, 
  TouchableOpacity, ActivityIndicator, Alert, Share
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Typography, Spacing, Radius, Shadow, Gradients } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { removeSalesmanFromFirm } from '@/lib/api';
import { useDataStore } from '@/hooks/useDataStore';
import { ModernToast } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/types';

/**
 * SalesmanItem - Memoized list component for staff management.
 */
const SalesmanItem = React.memo(({ item, onRemove }: { item: Profile; onRemove: (p: Profile) => void }) => (
  <View style={[styles.card, Shadow.md]}>
    <View style={styles.cardHeader}>
      <LinearGradient 
        colors={[Colors.info + '20', Colors.info + '05']} 
        style={styles.avatar}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Text style={styles.avatarText}>{item.full_name?.charAt(0) || 'S'}</Text>
      </LinearGradient>
      <View style={{ flex: 1 }}>
        <Text style={styles.name}>{item.full_name}</Text>
        <View style={styles.activeRow}>
           <View style={styles.statusDot} />
           <Text style={styles.role}>Authorized Sales Agent</Text>
        </View>
      </View>
      <TouchableOpacity 
        onPress={() => onRemove(item)} 
        style={styles.deleteBtn}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="trash-outline" size={20} color={Colors.danger} />
      </TouchableOpacity>
    </View>
  </View>
));

/**
 * SalesmenScreen - Staff Management Dashboard.
 * Allows owners to view linked salesmen and manage firm membership.
 * Displays the unique 'Firm Code' required for new staff onboarding.
 */
export default function SalesmenScreen() {
  const { profile } = useAuth();
  const ownerId = profile?.role === 'owner' ? profile?.id : profile?.owner_id;
  const { salesmen, loading, refresh } = useDataStore(ownerId);
  
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info', visible: boolean }>({
    message: '', type: 'info', visible: false
  });

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type, visible: true });
  };

  const handleRefresh = useCallback(async () => {
    await refresh(true);
  }, [refresh]);

  const handleRemove = useCallback((salesman: Profile) => {
    Alert.alert(
      'Remove Staff Member',
      `Are you sure you want to disconnect ${salesman.full_name} from this firm? They will lose access to all firm data immediately.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove Access', 
          style: 'destructive',
          onPress: async () => {
            try {
              await removeSalesmanFromFirm(salesman.id);
              showToast('Staff access revoked');
              void refresh();
            } catch (e) {
              showToast('Failed to revoke access', 'error');
            }
          }
        }
      ]
    );
  }, [refresh]);

  const onShareCode = async () => {
    const code = ownerId?.slice(0, 6).toUpperCase();
    try {
      await Share.share({
        message: `Register as a Salesman in my firm using this code: ${code}`,
        title: 'Join My Wholesale Firm'
      });
    } catch (error) {
      console.error('Share failed', error);
    }
  };

  const renderItem = useCallback(({ item }: { item: Profile }) => (
      <SalesmanItem item={item} onRemove={handleRemove} />
  ), [handleRemove]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>Staff Directory</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{salesmen.length}</Text>
          </View>
        </View>
        
        <View style={[styles.codeCard, Shadow.sm]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.codeLabel}>Active Firm Code</Text>
            <Text style={styles.codeValue}>{ownerId?.slice(0, 6).toUpperCase()}</Text>
          </View>
          <TouchableOpacity style={styles.codeIcon} onPress={onShareCode}>
            <Ionicons name="share-social-outline" size={20} color={Colors.amber} />
          </TouchableOpacity>
        </View>
        <Text style={styles.codeHint}>New staff members must enter this code during onboarding.</Text>
      </View>

      <FlatList
        data={salesmen}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={handleRefresh} tintColor={Colors.amber} />}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={Colors.amber} style={{ marginTop: 40 }} />
          ) : (
            <View style={styles.empty}>
              <Ionicons name="people-outline" size={64} color={Colors.textMuted} />
              <Text style={styles.emptyText}>No registered staff found.</Text>
            </View>
          )
        }
        renderItem={renderItem}
      />

      <ModernToast 
        visible={toast.visible} 
        message={toast.message} 
        type={toast.type} 
        onHide={() => setToast(prev => ({ ...prev, visible: false }))} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  list: { padding: Spacing.xl },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 18, fontWeight: Typography.black, color: Colors.info },
  name: { fontSize: 17, fontWeight: Typography.bold, color: Colors.textPrimary },
  activeRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.success },
  role: { fontSize: 12, color: Colors.textSecondary, fontWeight: '500' },
  deleteBtn: { padding: 8 },
  empty: { alignItems: 'center', marginTop: 100, gap: Spacing.md },
  emptyText: { fontSize: 16, color: Colors.textMuted, fontWeight: '500' },
  
  header: { padding: Spacing.xl, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  headerTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.lg },
  headerTitle: { fontSize: 22, fontWeight: Typography.black, color: Colors.textPrimary },
  badge: { backgroundColor: Colors.info, paddingHorizontal: 10, paddingVertical: 2, borderRadius: 12 },
  badgeText: { color: Colors.white, fontSize: 12, fontWeight: Typography.black },
  
  codeCard: { 
    flexDirection: 'row', alignItems: 'center', padding: Spacing.lg, 
    borderRadius: Radius.xl, backgroundColor: Colors.bg, borderWidth: 1, borderColor: Colors.border
  },
  codeLabel: { fontSize: 11, color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 1.2, fontWeight: '900', marginBottom: 4 },
  codeValue: { fontSize: 28, fontWeight: Typography.black, color: Colors.textPrimary, letterSpacing: 3 },
  codeIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.white, alignItems: 'center', justifyContent: 'center', ...Shadow.sm },
  codeHint: { fontSize: 11, color: Colors.textSecondary, marginTop: Spacing.md, fontStyle: 'italic', textAlign: 'center' },
});
