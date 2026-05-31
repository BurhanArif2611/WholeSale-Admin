import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Image, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { ScreenLayout } from '@/lib/common/components/ScreenLayout';
import { FormField } from '@/lib/common/components/FormField';
import { Button } from '@/components/ui';
import { Colors, Spacing, Radius, Shadow, Gradients, Typography, Fonts } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { LANGUAGES, Locale } from '@/constants/translations';
import { MobileFormField } from '@/lib/common/components/MobileFormField';
import { isValidMobile, normalizeMobile, sanitizeMobileInput } from '@/lib/common/utils/validation';
import { loadUserProfile } from '@/lib/auth/userProfile';
import { appAlert } from '@/lib/common/utils/appAlert';

export default function EditProfileScreen() {
  const { user, updateUserProfile } = useAuth();
  const { t, locale, setLocale } = useLanguage();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [address, setAddress] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [preferredLanguage, setPreferredLanguage] = useState<Locale>(locale);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    void loadUserProfile(user.id).then((data) => {
      if (data) {
        setFullName(data.fullName);
        setPhone(sanitizeMobileInput(data.phone));
        setBusinessName(data.businessName);
        setAddress(data.address);
        setAvatarUri(data.avatarUri);
        setPreferredLanguage(data.preferredLanguage ?? locale);
      }
      setLoading(false);
    });
  }, [user?.id, locale]);

  const handleSave = async () => {
    setSubmitted(true);
    if (!user?.id || !fullName.trim() || !isValidMobile(phone)) {
      void appAlert(t('required'), t('profile_setup_validation'), 'warning');
      return;
    }
    setSaving(true);
    try {
      setLocale(preferredLanguage);
      await updateUserProfile({
        fullName: fullName.trim(),
        phone: normalizeMobile(phone),
        businessName: businessName.trim(),
        address: address.trim(),
        avatarUri,
        preferredLanguage,
      });
      void appAlert(t('done'), t('profile_saved'), 'success');
    } catch (e) {
      void appAlert(t('error'), (e as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const initials = fullName.trim()
    ? fullName.trim().split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  return (
    <ScreenLayout title={t('profile_edit_title')} scroll keyboardAvoiding loading={loading}>
      <Pressable style={styles.avatarWrap}>
        {avatarUri ? (
          <Image source={{ uri: avatarUri }} style={styles.avatar} />
        ) : (
          <LinearGradient colors={Gradients.amber} style={styles.avatar}>
            <Text style={styles.avatarInitials}>{initials}</Text>
          </LinearGradient>
        )}
      </Pressable>

      <FormField
        label={t('profile_full_name')}
        required
        value={fullName}
        onChangeText={setFullName}
        placeholder={t('ph_profile_full_name')}
        error={submitted && !fullName.trim() ? t('err_profile_name') : null}
        icon="person-outline"
      />
      <MobileFormField
        label={t('phone_no')}
        required
        value={phone}
        onChangeText={setPhone}
        placeholder={t('ph_mobile')}
        hint={t('hint_mobile')}
        showValidation={submitted}
        requiredMessage={t('err_mobile_required')}
        invalidMessage={t('err_mobile_invalid')}
      />
      <FormField
        label={t('profile_business_name')}
        value={businessName}
        onChangeText={setBusinessName}
        placeholder={t('ph_profile_business')}
        icon="business-outline"
      />
      <FormField
        label={t('address')}
        value={address}
        onChangeText={setAddress}
        placeholder={t('ph_address')}
        multiline
        numberOfLines={3}
      />

      <Text style={styles.sectionLabel}>{t('settings_language')}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.langScroll}>
        {LANGUAGES.map((lang) => {
          const active = preferredLanguage === lang.value;
          return (
            <Pressable
              key={lang.value}
              style={[styles.langChip, active && styles.langChipActive]}
              onPress={() => setPreferredLanguage(lang.value)}
            >
              <Text style={[styles.langChipText, active && styles.langChipTextActive]}>{lang.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Button label={t('save_changes')} onPress={handleSave} loading={saving} style={{ marginTop: Spacing.md }} />
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  avatarWrap: { alignSelf: 'center', marginBottom: Spacing.lg, ...Shadow.md },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: Colors.white,
  },
  avatarInitials: { fontSize: 28, fontFamily: Fonts.bold, color: Colors.white },
  sectionLabel: {
    fontSize: 11,
    fontFamily: Fonts.bold,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: Spacing.sm,
    marginTop: Spacing.sm,
  },
  langScroll: { marginBottom: Spacing.md },
  langChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    marginRight: 8,
  },
  langChipActive: { backgroundColor: Colors.amber, borderColor: Colors.amber },
  langChipText: { fontSize: 13, fontFamily: Fonts.semibold, color: Colors.textSecondary },
  langChipTextActive: { color: Colors.white },
});
