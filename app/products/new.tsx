// app/products/new.tsx
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
import { createMaterial } from '@/lib/api';
import { Input } from '@/components/ui';
import { useLanguage } from '@/hooks/useLanguage';
import { useDataStore, addMaterialOptimistic } from '@/hooks/useDataStore';
import { useAuth } from '@/hooks/useAuth';
import UnitPickerModal from '@/components/UnitPickerModal';
import type { Material } from '@/types';

/**
 * NewProductScreen - Manual Inventory Registration.
 * Allows owners to add new products or materials to their firm's catalog.
 * Uses optimistic updates for an "instant" user experience.
 */
export default function NewProductScreen() {
  const { t } = useLanguage();
  const { profile } = useAuth();
  const router = useRouter();
  const ownerId = profile?.role === 'owner' ? profile?.id : profile?.owner_id;
  const { refresh } = useDataStore(ownerId);
  
  const [name,   setName]   = useState('');
  const [unit,   setUnit]   = useState('kg');
  const [price,  setPrice]  = useState('');
  const [remark, setRemark] = useState('');
  const [saving, setSaving] = useState(false);
  const [unitPickerOpen, setUnitPickerOpen] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (!name.trim()) return Alert.alert(t('required'), t('err_product_name_req'));
    if (!unit.trim()) return Alert.alert(t('required'), t('err_unit_req'));
    if (!price || isNaN(Number(price))) return Alert.alert(t('required'), t('err_price_req'));

    setSaving(true);
    try {
      if (!ownerId) throw new Error("Firm context is required.");

      const tempId = `temp-${Date.now()}`;
      const syntheticMaterial: Partial<Material> = {
        id: tempId,
        name: name.trim(),
        unit: unit.trim(),
        base_price: Number(price),
        owner_id: ownerId,
        created_at: new Date().toISOString()
      };

      // NANO-LATENCY: Inject into local cache and navigate back immediately
      addMaterialOptimistic(syntheticMaterial as Material);
      router.back();

      // Finalize creation in background
      createMaterial({
        name:       name.trim(),
        unit:       unit.trim(),
        base_price: Number(price),
        owner_id:   ownerId,
      }).then(() => {
        void refresh(); // Final sync to replace temp object with real DB record
      }).catch(e => {
          console.error('[BG_CREATE_PRODUCT_FAILED]', e);
          void refresh(); // Refresh anyway to clear the optimistic item
      });
    } catch (e) {
      setSaving(false);
      Alert.alert(t('error'), (e as Error).message);
    }
  }, [name, unit, price, ownerId, t, router, refresh]);

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
            <Text style={styles.label}>{t('product_name_label')}</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="cube-outline" size={16} color={Colors.textMuted} style={styles.inputIcon} />
              <Input 
                value={name} 
                onChangeText={setName}
                placeholder={t('product_name_placeholder')} 
                containerStyle={styles.inputOverrides} 
                autoFocus 
              />
            </View>
          </View>

          <View style={styles.row2}>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.label}>{t('unit_label')}</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="scale-outline" size={16} color={Colors.textMuted} style={styles.inputIcon} />
                <TouchableOpacity
                    style={styles.unitPickerBtn}
                    onPress={() => setUnitPickerOpen(true)}
                    activeOpacity={0.7}
                >
                  <Text style={[styles.unitPickerText, !unit && { color: Colors.textMuted }]}>
                    {unit || t('unit_placeholder') || 'kg'}
                  </Text>
                  <Ionicons name="chevron-down" size={14} color={Colors.textMuted} />
                </TouchableOpacity>
              </View>
            </View>
            <View style={[styles.field, { flex: 1.2 }]}>
              <Text style={styles.label}>{t('base_price_label')}</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="cash-outline" size={16} color={Colors.amber} style={styles.inputIcon} />
                <Input 
                    value={price} 
                    onChangeText={setPrice}
                    placeholder="0.00" 
                    keyboardType="decimal-pad"
                    containerStyle={[styles.inputOverrides, { borderColor: Colors.amber + '30' }]} 
                />
              </View>
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>{t('remark_label')}</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="document-text-outline" size={16} color={Colors.textMuted} style={[styles.inputIcon, { top: 14 }]} />
              <Input 
                value={remark} 
                onChangeText={setRemark}
                placeholder={t('remark_placeholder')} 
                multiline 
                numberOfLines={3}
                containerStyle={[styles.inputOverrides, { paddingTop: 6, height: 80 }]} 
              />
            </View>
          </View>
        </View>

        <TouchableOpacity onPress={handleSubmit} disabled={saving} activeOpacity={0.85} style={styles.submitContainer}>
          <LinearGradient 
            colors={saving ? [Colors.border, Colors.border] : Gradients.amber}
            start={{ x: 0, y: 0 }} 
            end={{ x: 1, y: 1 }} 
            style={[styles.submitBtn, !saving && Shadow.sm]}
          >
            {saving ? (
                <ActivityIndicator color={Colors.white} />
            ) : (
                <>
                    <Ionicons name="add-circle-outline" size={20} color={Colors.white} />
                    <Text style={styles.submitText}>{t('add_product')}</Text>
                </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Unit Picker Modal */}
      <UnitPickerModal
        visible={unitPickerOpen}
        selected={unit}
        onSelect={setUnit}
        onClose={() => setUnitPickerOpen(false)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  content:   { padding: Spacing.xl },

  form: { 
    borderRadius: Radius.xl, 
    padding: Spacing.xl, 
    marginBottom: Spacing.lg, 
    backgroundColor: Colors.white, 
    borderWidth: 1, 
    borderColor: Colors.borderLight 
  },
  field: { marginBottom: Spacing.lg },
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
  row2: { flexDirection: 'row', gap: Spacing.md },

  submitContainer: { marginTop: Spacing.md },
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
    borderRadius: Radius.lg, paddingVertical: Spacing.lg,
  },
  submitText: { fontSize: Typography.base, fontWeight: Typography.black, color: Colors.white, letterSpacing: 0.5 },

  unitPickerBtn: {
    paddingLeft: 42,
    paddingRight: 14,
    height: 48,
    backgroundColor: Colors.bg,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  unitPickerText: {
    fontSize: Typography.base,
    color: Colors.textPrimary,
  },
});