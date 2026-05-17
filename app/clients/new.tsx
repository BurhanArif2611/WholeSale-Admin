// app/clients/new.tsx
import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView,
  StyleSheet, Alert, KeyboardAvoidingView, Platform, ActivityIndicator
} from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius, Shadow, Gradients } from '@/constants/theme';
import { createStore } from '@/lib/api';
import { Input } from '@/components/ui';
import { useLanguage } from '@/hooks/useLanguage';
import { useDataStore, addStoreOptimistic } from '@/hooks/useDataStore';
import { useAuth } from '@/hooks/useAuth';
import type { StoreWithLatestOrder } from '@/types';

/**
 * NewClientScreen - Manual Customer Registration.
 * Allows owners to add new wholesale stores/clients to their firm.
 * Sets the default margin percentage used for all subsequent orders.
 */
export default function NewClientScreen() {
  const { t } = useLanguage();
  const { profile } = useAuth();
  const router = useRouter();
  const ownerId = profile?.role === 'owner' ? profile?.id : profile?.owner_id;
  const { refresh } = useDataStore(ownerId);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [margin, setMargin] = useState('0');
  const [saving, setSaving] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (!name.trim()) return Alert.alert(t('required'), t('client_name_required') || 'Business name is required');
    
    setSaving(true);
    try {
      if (!ownerId) throw new Error("Firm owner context is missing.");

      // Pre-flight check: Prevent obvious duplicates from hitting the DB
      const currentStores = (refresh as any).stores || []; // Assuming useDataStore expose stores
      // Actually, useDataStore from previous steps might not have stores here easily.
      // Better to rely on the error catch since it's a manual form.

      const tempId = `temp-${Date.now()}`;
      const syntheticStore: StoreWithLatestOrder = {
        id: tempId,
        name: name.trim(),
        phone: phone.trim() || null,
        area: address.trim() || null,
        margin_percentage: margin ? Number(margin) : 0,
        total_debt: 0,
        extra_charges: 0,
        owner_id: ownerId,
        assigned_salesman_id: null,
        created_at: new Date().toISOString(),
        latest_order: null
      };

      // NANO-LATENCY: Optimistic UI update for immediate feedback
      addStoreOptimistic(syntheticStore);
      router.back();

      // Finalize creation in background
      createStore({
        name: name.trim(),
        phone: phone.trim() || undefined,
        area: address.trim() || undefined,
        margin_percentage: margin ? Number(margin) : 0,
        owner_id: ownerId,
      }).then(() => {
        void refresh(); // Replace optimistic entry with real DB record
      }).catch(e => {
          if (e.code === '23505') {
            console.warn('[BG_CLIENT_DUPLICATE] Ignored or already exists');
          } else {
            console.error('[BG_CREATE_CLIENT_FAILED]', e);
          }
          void refresh(); // Wipe the optimistic entry on failure/duplicate
      });
    } catch (e) {
      setSaving(false);
      Alert.alert(t('error'), (e as Error).message);
    }
  }, [name, phone, address, margin, ownerId, t, router, refresh]);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView 
        style={styles.container} 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false} 
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.form, Shadow.clay]}>
          <View style={styles.field}>
            <Text style={styles.label}>{t('client_business_name') || 'Business Name'}</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="storefront-outline" size={16} color={Colors.textMuted} style={styles.inputIcon} />
              <Input
                value={name}
                onChangeText={setName}
                placeholder={t('client_name_placeholder')}
                containerStyle={styles.inputOverrides}
                autoFocus
              />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>{t('phone_no')}</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="call-outline" size={16} color={Colors.textMuted} style={styles.inputIcon} />
              <Input
                value={phone}
                onChangeText={setPhone}
                placeholder={t('phone_placeholder') || '+91 ...'}
                keyboardType="phone-pad"
                containerStyle={styles.inputOverrides}
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.label}>{t('product_margin') || 'Standard Margin %'}</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="trending-up-outline" size={16} color={Colors.purple} style={styles.inputIcon} />
                <Input
                  value={margin}
                  onChangeText={setMargin}
                  placeholder="0"
                  keyboardType="decimal-pad"
                  containerStyle={[styles.inputOverrides, { borderColor: Colors.purple + '30' }]}
                />
              </View>
            </View>

            <View style={[styles.field, { flex: 1.5 }]}>
              <Text style={styles.label}>{t('address') || 'Area / Location'}</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="location-outline" size={16} color={Colors.textMuted} style={styles.inputIcon} />
                <Input
                  value={address}
                  onChangeText={setAddress}
                  placeholder={t('area_placeholder')}
                  containerStyle={styles.inputOverrides}
                />
              </View>
            </View>
          </View>

          <TouchableOpacity onPress={handleSubmit} disabled={saving} activeOpacity={0.85} style={styles.submitContainer}>
            <LinearGradient 
              colors={saving ? [Colors.border, Colors.border] : Gradients.amber}
              start={{ x: 0, y: 0 }} 
              end={{ x: 1, y: 0 }} 
              style={[styles.submitBtn, !saving && Shadow.sm]}
            >
              {saving ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <>
                  <Ionicons name="person-add-outline" size={20} color={Colors.white} />
                  <Text style={styles.submitText}>{t('add_client')}</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: Spacing.xl },

  form: {
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },

  field: { marginBottom: Spacing.lg },
  row: { flexDirection: 'row', gap: Spacing.md },
  label: { 
    fontSize: 11, 
    color: Colors.textMuted, 
    fontWeight: '900', 
    marginBottom: 6, 
    textTransform: 'uppercase', 
    letterSpacing: 0.5 
  },
  inputWrap: { position: 'relative' },
  inputIcon: { position: 'absolute', left: 14, top: 14, zIndex: 1 },
  inputOverrides: { marginBottom: 0, paddingLeft: 42, backgroundColor: Colors.bg },

  submitContainer: { marginTop: Spacing.md },
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
    borderRadius: Radius.lg, paddingVertical: Spacing.lg,
  },
  submitText: { fontSize: Typography.base, fontWeight: Typography.black, color: Colors.white, letterSpacing: 0.5 },
});