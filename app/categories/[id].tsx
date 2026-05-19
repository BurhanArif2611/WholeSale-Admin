import React, { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScreenLayout } from '@/lib/common/components/ScreenLayout';
import { FormField } from '@/lib/common/components/FormField';
import { Button } from '@/components/ui';
import { useLanguage } from '@/hooks/useLanguage';
import { useDatabase } from '@/hooks/useDatabase';
import { categoryRepository } from '@/lib/data/repositories/categoryRepository';
import type { Category } from '@/lib/domain/models';

export default function EditCategoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useLanguage();
  const { refresh } = useDatabase();
  const [category, setCategory] = useState<Category | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [touched, setTouched] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const c = await categoryRepository.findById(id);
    setCategory(c);
    if (c) {
      setName(c.name);
      setDescription(c.description || '');
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const nameError = (submitted || touched) && !name.trim() ? t('err_category_name') : null;

  const handleSave = async () => {
    setSubmitted(true);
    setTouched(true);
    if (!id || !name.trim()) return Alert.alert(t('required'), t('category_name_required'));

    setSaving(true);
    try {
      await categoryRepository.update(id, { name, description: description || null });
      refresh();
      router.back();
    } catch (e) {
      Alert.alert(t('error'), (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenLayout title={t('edit_category_title')} scroll keyboardAvoiding loading={loading && !category}>
      {category && (
        <>
          <FormField
            label={t('category_name')}
            required
            value={name}
            onChangeText={setName}
            onBlur={() => setTouched(true)}
            placeholder={t('ph_category_name')}
            error={nameError}
          />
          <FormField
            label={t('category_description')}
            value={description}
            onChangeText={setDescription}
            placeholder={t('ph_category_desc')}
            multiline
            numberOfLines={3}
          />
          <Button label={t('save_category')} onPress={handleSave} loading={saving} style={{ marginTop: 8 }} />
        </>
      )}
    </ScreenLayout>
  );
}
