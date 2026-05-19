import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, StyleSheet, TouchableOpacity, Text, View, ActivityIndicator } from 'react-native';
import { appAlert, appConfirm } from '@/lib/common/utils/appAlert';
import { ListCard } from '@/lib/common/components/ListCard';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenLayout } from '@/lib/common/components/ScreenLayout';
import { FAB } from '@/lib/common/components/FAB';
import { EmptyState } from '@/components/ui';
import { Colors, Spacing, Radius, Shadow, Typography, Layout } from '@/constants/theme';
import { useLanguage } from '@/hooks/useLanguage';
import { useDatabase } from '@/hooks/useDatabase';
import { categoryRepository } from '@/lib/data/repositories/categoryRepository';
import type { Category } from '@/lib/domain/models';

export default function CategoriesScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const { isReady, refreshKey, refresh } = useDatabase();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!isReady) return;
    setLoading(true);
    setLoadError(null);
    try {
      setCategories(await categoryRepository.ensureSeeded());
    } catch (e) {
      setLoadError((e as Error).message);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }, [isReady, refreshKey]);

  useEffect(() => {
    void load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const handleDelete = async (cat: Category) => {
    const yes = await appConfirm(
      t('delete_category_title'),
      t('delete_category_msg', { name: cat.name }),
    );
    if (!yes) return;
    try {
      await categoryRepository.delete(cat.id);
      refresh();
      await load();
    } catch (e) {
      void appAlert(t('error'), (e as Error).message, 'error');
    }
  };

  return (
    <ScreenLayout title={t('categories_title')} scroll={false} padded={false}>
      {loadError ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{loadError}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={load}>
            <Text style={styles.retryText}>{t('try_again')}</Text>
          </TouchableOpacity>
        </View>
      ) : null}
      <FlatList
        data={categories}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshing={loading}
        onRefresh={load}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator style={{ marginTop: 40 }} color={Colors.amber} />
          ) : loadError ? null : (
            <EmptyState icon="folder-outline" message={t('no_categories')} />
          )
        }
        renderItem={({ item }) => (
          <ListCard
            title={item.name}
            subtitle={item.description ?? undefined}
            meta={`${item.product_count ?? 0} ${t('products_label')}${item.is_preset ? ` · ${t('preset_category_label')}` : ''}`}
            icon="pricetag"
            iconColor={Colors.purple}
            iconBg={Colors.purpleBg}
            onPress={() => router.push(`/categories/${item.id}`)}
            trailing={
              <TouchableOpacity
                onPress={() => void handleDelete(item)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="trash-outline" size={20} color={Colors.danger} />
              </TouchableOpacity>
            }
          />
        )}
      />
      <FAB onPress={() => router.push('/categories/new')} icon="add" />
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: Layout.screenPaddingH,
    paddingTop: Spacing.md,
    paddingBottom: Layout.screenPaddingBottom,
    flexGrow: 1,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
    ...Shadow.sm,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    backgroundColor: Colors.purpleBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flexWrap: 'wrap' },
  name: { fontSize: Typography.sm, fontWeight: Typography.bold, color: Colors.textPrimary },
  presetBadge: {
    backgroundColor: Colors.amberBg,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  presetText: { fontSize: 9, fontWeight: Typography.bold, color: Colors.amberDim, textTransform: 'uppercase' },
  desc: { fontSize: Typography.xs, color: Colors.textMuted, marginTop: 2 },
  count: { fontSize: Typography.xs, color: Colors.textSecondary, marginTop: 4, fontWeight: Typography.semibold },
  deleteBtn: { padding: Spacing.xs },
  errorBox: {
    marginHorizontal: Layout.screenPaddingH,
    marginTop: Spacing.md,
    padding: Spacing.md,
    backgroundColor: Colors.danger + '12',
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.danger + '40',
  },
  errorText: { color: Colors.danger, fontSize: Typography.sm, marginBottom: Spacing.sm },
  retryBtn: { alignSelf: 'flex-start', paddingVertical: 6, paddingHorizontal: 12 },
  retryText: { color: Colors.amber, fontWeight: '700', fontSize: Typography.sm },
});
