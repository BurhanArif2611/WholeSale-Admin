import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenLayout } from '@/lib/common/components/ScreenLayout';
import { Colors, Spacing, Radius, Typography, Fonts } from '@/constants/theme';
import { useLanguage } from '@/hooks/useLanguage';
import { LANGUAGES, Locale } from '@/constants/translations';

export default function LanguageSettingsScreen() {
  const { t, locale, setLocale } = useLanguage();

  return (
    <ScreenLayout title={t('settings_language')} scroll>
      <Text style={styles.hint}>{t('settings_language_hint')}</Text>
      <View style={styles.list}>
        {LANGUAGES.map((lang, idx) => {
          const active = locale === lang.value;
          return (
            <TouchableOpacity
              key={lang.value}
              style={[styles.item, idx < LANGUAGES.length - 1 && styles.itemBorder, active && styles.itemActive]}
              onPress={() => setLocale(lang.value as Locale)}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
            >
              <View style={[styles.flag, active && { backgroundColor: Colors.amber + '22' }]}>
                <Ionicons name="language" size={22} color={active ? Colors.amber : Colors.textSecondary} />
              </View>
              <Text style={[styles.label, active && styles.labelActive]}>{lang.label}</Text>
              {active ? <Ionicons name="checkmark-circle" size={24} color={Colors.amber} /> : null}
            </TouchableOpacity>
          );
        })}
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  hint: {
    fontSize: Typography.sm,
    color: Colors.textMuted,
    marginBottom: Spacing.lg,
    lineHeight: 20,
  },
  list: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.md,
  },
  itemBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border },
  itemActive: { backgroundColor: Colors.amber + '08' },
  flag: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { flex: 1, fontSize: Typography.base, fontFamily: Fonts.bold, color: Colors.textPrimary },
  labelActive: { color: Colors.amberDim },
});
