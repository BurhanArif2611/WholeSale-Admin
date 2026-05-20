import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenHeader } from '@/lib/common/components/ScreenHeader';
import { Button } from '@/components/ui';
import { BusinessCategoryGrid } from '@/components/onboarding/BusinessCategoryGrid';
import { Colors, Spacing, Gradients, Typography } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { useDatabase } from '@/hooks/useDatabase';
import { useBusinessCategories } from '@/hooks/useBusinessCategories';
import { categoryRepository } from '@/lib/data/repositories/categoryRepository';
import type { Category } from '@/lib/domain/models';
import { appAlert } from '@/lib/common/utils/appAlert';

export default function CategorySetupScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const { isReady } = useDatabase();
  const { completeCategorySetup, skipCategorySetup, user } = useAuth();
  const { preferredIds, refresh: refreshBusinessCategories } = useBusinessCategories();
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showValidation, setShowValidation] = useState(false);

  useEffect(() => {
    if (preferredIds.length) setSelectedIds(preferredIds);
  }, [preferredIds]);

  const load = useCallback(async () => {
    if (!isReady) return;
    setLoading(true);
    try {
      const cats = await categoryRepository.ensureSeeded();
      setCategories(cats);
    } finally {
      setLoading(false);
    }
  }, [isReady]);

  useEffect(() => {
    if (!isReady) {
      setLoading(true);
      return;
    }
    void load();
  }, [isReady, load]);

  const toggle = (id: string) => {
    setShowValidation(false);
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const canContinue = selectedIds.length >= 1;

  const handleContinue = async () => {
    if (!user?.id) {
      void appAlert(t('error'), t('not_signed_in') || 'Please sign in again.', 'error');
      return;
    }
    if (!canContinue) {
      setShowValidation(true);
      return;
    }
    setSaving(true);
    try {
      await completeCategorySetup(selectedIds);
      await refreshBusinessCategories();
    } catch (e) {
      void appAlert(t('error'), (e as Error).message, 'error');
      setSaving(false);
    }
  };

  const handleSkip = async () => {
    if (!user?.id) return;
    setSaving(true);
    try {
      await skipCategorySetup();
      await refreshBusinessCategories();
    } catch (e) {
      void appAlert(t('error'), (e as Error).message, 'error');
      setSaving(false);
    }
  };

  const footerPad = Math.max(insets.bottom, Spacing.md);

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <LinearGradient colors={Gradients.header} style={StyleSheet.absoluteFill} />

      <ScreenHeader title={t('category_setup_title')} showBack={false} />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.amber} />
          <Text style={styles.loadingText}>{t('category_setup_loading')}</Text>
        </View>
      ) : (
        <>
          <View style={styles.hero}>
            <Text style={styles.subtitle}>{t('category_setup_subtitle')}</Text>
            <View style={styles.progress}>
              <View style={[styles.progressDot, styles.progressDotDone]} />
              <View style={[styles.progressDot, styles.progressDotActive]} />
              <Text style={styles.progressLabel}>{t('category_setup_step')}</Text>
            </View>
          </View>

          <View style={styles.gridWrap}>
            <BusinessCategoryGrid
              categories={categories}
              selectedIds={selectedIds}
              onToggle={toggle}
              searchPlaceholder={t('category_setup_search')}
              minRequired={1}
              listBottomInset={footerPad + 140}
            />
          </View>

          <View style={[styles.footer, { paddingBottom: footerPad }]}>
            {showValidation && !canContinue ? (
              <Text style={styles.validation}>{t('category_setup_min')}</Text>
            ) : canContinue ? (
              <Text style={styles.selectionHint}>
                {t('category_setup_selected', { count: selectedIds.length })}
              </Text>
            ) : (
              <Text style={styles.validationMuted}>{t('category_setup_hint')}</Text>
            )}

            <Button
              label={saving ? t('category_setup_saving') : t('category_setup_continue')}
              onPress={handleContinue}
              loading={saving}
              disabled={saving}
              size="lg"
              style={styles.continueBtn}
            />

            <Pressable
              style={styles.skipBtn}
              onPress={handleSkip}
              disabled={saving}
              accessibilityRole="button"
            >
              <Text style={styles.skipText}>{t('category_setup_skip')}</Text>
            </Pressable>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  loadingText: { fontSize: Typography.sm, color: Colors.textMuted },
  hero: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  subtitle: {
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
    justifyContent: 'center',
  },
  progressDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.border,
  },
  progressDotDone: { backgroundColor: Colors.success },
  progressDotActive: { backgroundColor: Colors.amber, width: 24, borderRadius: 5 },
  progressLabel: { fontSize: 11, color: Colors.textMuted, fontWeight: '700' },
  gridWrap: { flex: 1, minHeight: 0, paddingHorizontal: Spacing.md },
  footer: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    backgroundColor: Colors.bg,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    ...StyleSheet.flatten({
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 8,
    }),
  },
  validation: {
    fontSize: Typography.xs,
    color: Colors.danger,
    fontWeight: Typography.semibold,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  validationMuted: {
    fontSize: Typography.xs,
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  selectionHint: {
    fontSize: Typography.xs,
    color: Colors.success,
    fontWeight: Typography.semibold,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  continueBtn: { width: '100%' },
  skipBtn: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
    marginTop: Spacing.xs,
  },
  skipText: {
    fontSize: Typography.sm,
    fontWeight: Typography.semibold,
    color: Colors.textMuted,
  },
});
