import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Switch, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenLayout } from '@/lib/common/components/ScreenLayout';
import { Button } from '@/components/ui';
import { BusinessCategoryGrid } from '@/components/onboarding/BusinessCategoryGrid';
import { Colors, Spacing, Typography, Fonts } from '@/constants/theme';
import { useLanguage } from '@/hooks/useLanguage';
import { useDatabase } from '@/hooks/useDatabase';
import { useBusinessCategories } from '@/hooks/useBusinessCategories';
import { categoryRepository } from '@/lib/data/repositories/categoryRepository';
import type { Category } from '@/lib/domain/models';
import { appAlert } from '@/lib/common/utils/appAlert';

export default function BusinessCategoriesSettingsScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const { isReady } = useDatabase();
  const {
    preferredIds,
    showAllCategories,
    setShowAllCategories,
    savePreferences,
    refresh,
  } = useBusinessCategories();
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setSelectedIds(preferredIds);
  }, [preferredIds]);

  const load = useCallback(async () => {
    if (!isReady) return;
    setLoading(true);
    setCategories(await categoryRepository.ensureSeeded());
    setLoading(false);
  }, [isReady]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggle = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const moveUp = (id: string) => {
    setSelectedIds((prev) => {
      const i = prev.indexOf(id);
      if (i <= 0) return prev;
      const next = [...prev];
      [next[i - 1], next[i]] = [next[i], next[i - 1]];
      return next;
    });
  };

  const handleSave = async () => {
    if (selectedIds.length < 1) {
      void appAlert(t('required'), t('category_setup_min'), 'warning');
      return;
    }
    setSaving(true);
    try {
      await savePreferences(selectedIds, true);
      await refresh();
      void appAlert(t('done'), t('category_prefs_saved'), 'success');
      router.back();
    } catch (e) {
      void appAlert(t('error'), (e as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const priorityLabels = selectedIds
    .map((id) => categories.find((c) => c.id === id)?.name)
    .filter(Boolean) as string[];

  return (
    <ScreenLayout
      title={t('settings_business_categories')}
      onBack={() => router.back()}
      scroll={false}
      loading={loading}
      padded={false}
      contentStyle={styles.content}
      footer={
        <View style={styles.footer}>
          <Button label={t('save')} onPress={handleSave} loading={saving} disabled={selectedIds.length < 1} />
        </View>
      }
    >
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('category_prefs_filter_title')}</Text>
        <View style={styles.toggleRow}>
          <View style={styles.toggleText}>
            <Text style={styles.toggleLabel}>{t('show_all_categories')}</Text>
            <Text style={styles.toggleSub}>{t('show_all_categories_sub')}</Text>
          </View>
          <Switch
            value={showAllCategories}
            onValueChange={(v) => void setShowAllCategories(v)}
            trackColor={{ false: Colors.border, true: Colors.amber + '88' }}
            thumbColor={showAllCategories ? Colors.amber : Colors.surface}
          />
        </View>
      </View>

      {priorityLabels.length > 0 ? (
        <View style={styles.prioritySection}>
          <Text style={styles.sectionTitle}>{t('category_priority')}</Text>
          {selectedIds.map((id, index) => {
            const name = categories.find((c) => c.id === id)?.name ?? '—';
            return (
              <View key={id} style={styles.priorityRow}>
                <Text style={styles.priorityIndex}>{index + 1}</Text>
                <Text style={styles.priorityName} numberOfLines={1}>
                  {name}
                </Text>
                <Pressable onPress={() => moveUp(id)} disabled={index === 0} style={styles.priorityBtn}>
                  <Ionicons
                    name="arrow-up"
                    size={18}
                    color={index === 0 ? Colors.border : Colors.amber}
                  />
                </Pressable>
              </View>
            );
          })}
        </View>
      ) : null}

      <Text style={styles.gridHint}>{t('category_setup_subtitle')}</Text>
      <View style={styles.grid}>
        <BusinessCategoryGrid
          categories={categories}
          selectedIds={selectedIds}
          onToggle={toggle}
          searchPlaceholder={t('category_setup_search')}
        />
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, paddingHorizontal: Spacing.md },
  section: { paddingTop: Spacing.md, paddingBottom: Spacing.sm },
  sectionTitle: {
    fontSize: 11,
    fontFamily: Fonts.bold,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: Spacing.sm,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.md,
  },
  toggleText: { flex: 1 },
  toggleLabel: { fontSize: Typography.sm, fontFamily: Fonts.bold, color: Colors.textPrimary },
  toggleSub: { fontSize: Typography.xs, color: Colors.textMuted, marginTop: 4 },
  prioritySection: { marginBottom: Spacing.sm },
  priorityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: 8,
    marginBottom: 4,
    gap: Spacing.sm,
  },
  priorityIndex: {
    width: 22,
    fontSize: Typography.xs,
    fontFamily: Fonts.bold,
    color: Colors.amberDim,
  },
  priorityName: { flex: 1, fontSize: Typography.sm, color: Colors.textPrimary },
  priorityBtn: { padding: 4 },
  gridHint: {
    fontSize: Typography.xs,
    color: Colors.textMuted,
    marginBottom: Spacing.xs,
  },
  grid: { flex: 1 },
  footer: {
    padding: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    backgroundColor: Colors.bg,
  },
});
