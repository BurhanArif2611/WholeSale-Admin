import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
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

export default function ProfileSetupScreen() {
  const { user, completeProfileSetup } = useAuth();
  const { t, locale, setLocale } = useLanguage();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [address, setAddress] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [preferredLanguage, setPreferredLanguage] = useState<Locale>(locale);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!user?.id) return;
    void loadUserProfile(user.id).then((data) => {
      if (!data) return;
      setFullName(data.fullName);
      setPhone(sanitizeMobileInput(data.phone));
      setBusinessName(data.businessName);
      setAddress(data.address);
      setAvatarUri(data.avatarUri);
      if (data.preferredLanguage) setPreferredLanguage(data.preferredLanguage);
    });
  }, [user?.id]);

  useEffect(() => {
    setPreferredLanguage(locale);
  }, [locale]);

  const touch = (field: string) => setTouched((p) => ({ ...p, [field]: true }));

  const nameError = (submitted || touched.name) && !fullName.trim() ? t('err_profile_name') : null;
  const initials = fullName.trim()
    ? fullName
        .trim()
        .split(/\s+/)
        .map((w) => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : '?';

  const handleSubmit = async () => {
    setSubmitted(true);
    if (!user?.id) return;
    if (!fullName.trim() || !isValidMobile(phone)) {
      void appAlert(t('required'), t('profile_setup_validation'), 'warning');
      return;
    }

    setSaving(true);
    try {
      setLocale(preferredLanguage);
      await completeProfileSetup({
        fullName: fullName.trim(),
        phone: normalizeMobile(phone),
        businessName: businessName.trim(),
        address: address.trim(),
        avatarUri,
        preferredLanguage,
      });
    } catch (e) {
      void appAlert(t('error'), (e as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <LinearGradient colors={Gradients.header} style={StyleSheet.absoluteFill} />
      <ScreenLayout
        title={t('profile_setup_title')}
        showBack={false}
        scroll
        keyboardAvoiding
        padded
      >
        <View style={styles.hero}>
          <Text style={styles.heroSubtitle}>{t('profile_setup_subtitle')}</Text>
          <View style={styles.progress}>
            <View style={[styles.progressDot, styles.progressDotActive]} />
            <View style={styles.progressBar} />
            <Text style={styles.progressLabel}>{t('profile_setup_step')}</Text>
          </View>
        </View>

        <Pressable style={styles.avatarWrap} accessibilityLabel={t('profile_photo_label')}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatar} />
          ) : (
            <LinearGradient colors={Gradients.amber} style={styles.avatar}>
              <Text style={styles.avatarInitials}>{initials}</Text>
            </LinearGradient>
          )}
          <View style={styles.avatarBadge}>
            <Ionicons name="camera" size={16} color={Colors.white} />
          </View>
        </Pressable>
        <Text style={styles.avatarHint}>{t('profile_photo_hint')}</Text>

        <FormField
          label={t('profile_full_name')}
          required
          value={fullName}
          onChangeText={setFullName}
          onBlur={() => touch('name')}
          placeholder={t('ph_profile_full_name')}
          hint={t('hint_profile_full_name')}
          error={nameError}
          icon="person-outline"
          returnKeyType="next"
        />
        <MobileFormField
          label={t('phone_no')}
          required
          value={phone}
          onChangeText={setPhone}
          onBlur={() => touch('phone')}
          placeholder={t('ph_mobile')}
          hint={t('hint_mobile')}
          showValidation={submitted || !!touched.phone}
          requiredMessage={t('err_mobile_required')}
          invalidMessage={t('err_mobile_invalid')}
        />
        <FormField
          label={t('profile_business_name')}
          value={businessName}
          onChangeText={setBusinessName}
          placeholder={t('ph_profile_business')}
          hint={t('hint_profile_business')}
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
                <Text style={[styles.langChipText, active && styles.langChipTextActive]}>
                  {lang.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <Button
          label={t('profile_setup_continue')}
          onPress={handleSubmit}
          loading={saving}
          style={{ marginTop: Spacing.lg, marginBottom: Spacing.xl }}
        />
      </ScreenLayout>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  hero: { marginBottom: Spacing.lg },
  heroSubtitle: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    lineHeight: 22,
    textAlign: 'center',
  },
  progress: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  progressDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.border,
  },
  progressDotActive: { backgroundColor: Colors.amber, width: 24, borderRadius: 5 },
  progressBar: { flex: 1, height: 4, backgroundColor: Colors.border, borderRadius: 2 },
  progressLabel: { fontSize: 11, color: Colors.textMuted, fontFamily: Fonts.bold },
  avatarWrap: { alignSelf: 'center', marginBottom: Spacing.sm, ...Shadow.md },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: Colors.white,
  },
  avatarInitials: { fontSize: 32, fontFamily: Fonts.bold, color: Colors.white },
  avatarBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.amber,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.white,
  },
  avatarHint: {
    textAlign: 'center',
    fontSize: Typography.xs,
    color: Colors.textMuted,
    marginBottom: Spacing.lg,
  },
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
