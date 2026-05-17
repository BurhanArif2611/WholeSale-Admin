// app/clients/new.tsx
import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius, Shadow, Gradients, formatCurrency } from '@/constants/theme';
import { createStore } from '@/lib/api';
import { Input, Button } from '@/components/ui';
import { useLanguage } from '@/hooks/useLanguage';

export default function NewClientScreen() {
  const { t } = useLanguage();
  const router = useRouter();
  const [name,    setName]    = useState('');
  const [phone,   setPhone]   = useState('');
  const [address, setAddress] = useState('');
  const [margin,  setMargin]  = useState('');
  const [saving,  setSaving]  = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) return Alert.alert(t('required'), t('client_name_required'));
    setSaving(true);
    try {
      await createStore({
        name:          name.trim(),
        phone:         phone.trim()   || undefined,
        area:          address.trim() || undefined,
        margin_percentage: margin ? Number(margin) : 0,
      });
      router.back();
    } catch (e) {
      Alert.alert(t('error'), (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        <View style={[styles.form, Shadow.clay]}>

          {/* Client Name */}
          <View style={styles.field}>
            <Text style={styles.label}>{t('client_business_name')}</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="storefront-outline" size={16} color={Colors.textMuted} style={styles.inputIcon} />
              <Input
                value={name}
                onChangeText={setName}
                placeholder={t('client_name_placeholder')}
                style={styles.input}
                autoFocus
              />
            </View>
          </View>

          {/* Phone */}
          <View style={styles.field}>
            <Text style={styles.label}>{t('phone_no')}</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="call-outline" size={16} color={Colors.textMuted} style={styles.inputIcon} />
              <Input
                value={phone}
                onChangeText={setPhone}
                placeholder={t('phone_placeholder')}
                keyboardType="phone-pad"
                style={styles.input}
              />
            </View>
          </View>
          <View style={styles.row}>
            {/* Margin Percentage */}
            <View style={[styles.field, { flex: 0.4 }]}>
              <Text style={styles.label}>{t('product_margin')}</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="trending-up-outline" size={16} color={Colors.purple} style={styles.inputIcon} />
                <Input
                  value={margin}
                  onChangeText={setMargin}
                  placeholder={t('margin_placeholder')}
                  keyboardType="decimal-pad"
                  style={{ ...(styles.input as any), borderColor: Colors.purple + '44' }}
                />
              </View>
            </View>

            {/* Address/Area */}
            <View style={[styles.field, { flex: 0.6 }]}>
              <Text style={styles.label}>{t('address')}</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="location-outline" size={16} color={Colors.textMuted} style={styles.inputIcon} />
                <Input
                  value={address}
                  onChangeText={setAddress}
                  placeholder={t('area_placeholder')}
                  style={styles.input}
                />
              </View>
            </View>
          </View>



          {/* Submit */}
          <TouchableOpacity onPress={handleSubmit} disabled={saving} activeOpacity={0.85}
            style={{ marginTop: Spacing.sm }}>
            <LinearGradient colors={saving ? [Colors.borderLight, Colors.borderLight] : Gradients.amber}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.submitBtn, !saving && Shadow.md]}>
              {saving
                ? <Text style={[styles.submitText, { color: Colors.textSecondary }]}>{t('saving')}</Text>
                : <>
                    <Ionicons name="person-add-outline" size={18} color={Colors.white} />
                    <Text style={[styles.submitText, { color: Colors.white }]}>{t('add_client')}</Text>
                  </>
              }
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
  content:   { padding: Spacing.md },

  form: {
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
  },

  field: {
    marginBottom: Spacing.md,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: 0,
  },
  label: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    fontWeight: Typography.semibold,
    marginBottom: Spacing.sm,
  },
  inputWrap: {
    position: 'relative',
  },
  inputIcon: {
    position: 'absolute',
    left: 14,
    top: 14,
    zIndex: 1,
  },
  input: {
    marginBottom: 0,
    paddingLeft: 42,
  } as any,

  chargeHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.sm,
  },
  chargeHintText: {
    fontSize: Typography.xs,
    color: Colors.amber,
    fontWeight: Typography.medium,
    flex: 1,
  },

  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.lg,
  },
  submitText: {
    fontSize: Typography.base,
    fontWeight: Typography.bold,
    letterSpacing: 0.3,
  },
});