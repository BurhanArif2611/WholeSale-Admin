import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Linking } from 'react-native';
import { appAlert, appConfirm } from '@/lib/common/utils/appAlert';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ScreenLayout } from '@/lib/common/components/ScreenLayout';
import { SettingsSection, SettingsRow } from '@/lib/common/components/settings';
import { Colors, Spacing, Radius, Shadow, Gradients, Typography, Fonts } from '@/constants/theme';
import { useLanguage } from '@/hooks/useLanguage';
import { useAuth } from '@/hooks/useAuth';
import { useDatabase } from '@/hooks/useDatabase';
import { LANGUAGES } from '@/constants/translations';

const NOTIF_KEY = 'settings_notifications_enabled';

export default function SettingsScreen() {
  const router = useRouter();
  const { t, locale } = useLanguage();
  const { profile, user, signOut } = useAuth();
  const { refresh } = useDatabase();
  const [notifications, setNotifications] = useState(true);

  const langLabel = LANGUAGES.find((l) => l.value === locale)?.label ?? 'English';

  useEffect(() => {
    AsyncStorage.getItem(NOTIF_KEY).then((v) => {
      if (v !== null) setNotifications(v === 'true');
    });
  }, []);

  const toggleNotifications = async (v: boolean) => {
    setNotifications(v);
    await AsyncStorage.setItem(NOTIF_KEY, String(v));
  };

  const handleLogout = async () => {
    const yes = await appConfirm(t('settings_logout'), t('settings_logout_confirm'));
    if (yes) void signOut();
  };

  const handleRefresh = () => {
    refresh();
    void appAlert(t('done'), t('settings_data_refreshed'), 'success');
  };

  const openUrl = (url: string) => {
    Linking.openURL(url).catch(() =>
      void appAlert(t('error'), t('settings_link_unavailable'), 'error'),
    );
  };

  const roleLabel =
    profile?.role === 'owner' ? t('settings_role_owner') : t('settings_role_salesman');

  return (
    <ScreenLayout title={t('settings_title')} scroll>
      <LinearGradient colors={Gradients.amber} style={styles.profileCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={32} color={Colors.white} />
        </View>
        <View style={styles.profileText}>
          <Text style={styles.profileEmail}>{user?.email ?? profile?.id ?? '—'}</Text>
          <Text style={styles.profileRole}>{roleLabel}</Text>
        </View>
      </LinearGradient>

      <SettingsSection title={t('settings_section_business')}>
        <SettingsRow
          icon="grid-outline"
          iconColor={Colors.purple}
          iconBg={Colors.purple + '18'}
          label={t('settings_business_categories')}
          subtitle={t('settings_business_categories_sub')}
          onPress={() => router.push('/settings/categories')}
        />
        <SettingsRow
          icon="bar-chart"
          iconColor={Colors.info}
          iconBg={Colors.info + '18'}
          label={t('settings_reports')}
          subtitle={t('settings_reports_sub')}
          onPress={() => router.push('/settings/reports')}
        />
        <SettingsRow
          icon="list"
          iconColor={Colors.amber}
          iconBg={Colors.amber + '18'}
          label={t('settings_order_list')}
          subtitle={t('settings_order_list_sub')}
          onPress={() => router.push('/settings/orders')}
          isLast
        />
      </SettingsSection>

      <SettingsSection title={t('settings_section_profile')}>
        <SettingsRow
          icon="person-circle-outline"
          iconColor={Colors.info}
          iconBg={Colors.info + '18'}
          label={t('profile_edit_title')}
          subtitle={t('profile_edit_sub')}
          onPress={() => router.push('/settings/profile')}
          isLast
        />
      </SettingsSection>

      <SettingsSection title={t('settings_section_preferences')}>
        <SettingsRow
          icon="language"
          iconColor={Colors.purple}
          iconBg={Colors.purple + '18'}
          label={t('settings_language')}
          subtitle={t('settings_language_sub')}
          value={langLabel}
          onPress={() => router.push('/settings/language')}
        />
        <SettingsRow
          icon="notifications-outline"
          iconColor={Colors.success}
          iconBg={Colors.success + '18'}
          label={t('settings_notifications')}
          subtitle={t('settings_notifications_sub')}
          switchValue={notifications}
          onSwitchChange={toggleNotifications}
          showChevron={false}
        />
        <SettingsRow
          icon="refresh"
          iconColor={Colors.info}
          iconBg={Colors.info + '18'}
          label={t('settings_refresh_data')}
          subtitle={t('settings_refresh_data_sub')}
          onPress={handleRefresh}
          isLast
        />
      </SettingsSection>

      <SettingsSection title={t('settings_section_support')}>
        <SettingsRow
          icon="help-circle-outline"
          label={t('settings_help')}
          onPress={() => openUrl('mailto:support@wholesaleadmin.app?subject=Help')}
        />
        <SettingsRow
          icon="chatbubble-ellipses-outline"
          label={t('settings_feedback')}
          onPress={() => openUrl('mailto:support@wholesaleadmin.app?subject=Feedback')}
        />
        <SettingsRow
          icon="shield-checkmark-outline"
          label={t('settings_privacy')}
          onPress={() => openUrl('https://example.com/privacy')}
        />
        <SettingsRow
          icon="document-text-outline"
          label={t('settings_terms')}
          onPress={() => openUrl('https://example.com/terms')}
          isLast
        />
      </SettingsSection>

      <SettingsSection title={t('settings_section_about')}>
        <SettingsRow
          icon="information-circle-outline"
          label={t('settings_about')}
          value={`v${Constants.expoConfig?.version ?? '1.0.0'}`}
          showChevron={false}
          isLast
        />
      </SettingsSection>

      <SettingsSection title={t('settings_section_account')}>
        <SettingsRow
          icon="log-out-outline"
          iconColor={Colors.danger}
          iconBg={Colors.danger + '15'}
          label={t('settings_logout')}
          subtitle={t('settings_logout_sub')}
          onPress={handleLogout}
          destructive
          showChevron={false}
          isLast
        />
      </SettingsSection>

      <Text style={styles.footer}>{t('settings_footer')}</Text>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    borderRadius: Radius.xl,
    marginBottom: Spacing.xl,
    gap: Spacing.md,
    ...Shadow.md,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileText: { flex: 1 },
  profileEmail: { color: Colors.white, fontSize: Typography.md, fontFamily: Fonts.bold },
  profileRole: { color: 'rgba(255,255,255,0.85)', fontSize: Typography.xs, marginTop: 4, fontFamily: Fonts.semibold },
  footer: {
    textAlign: 'center',
    fontSize: Typography.xs,
    color: Colors.textMuted,
    marginTop: Spacing.md,
    marginBottom: Spacing.xl,
  },
});
