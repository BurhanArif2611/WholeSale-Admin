import React, { useState } from 'react';
import { appAlert } from '@/lib/common/utils/appAlert';
import { useRouter } from 'expo-router';
import { ScreenLayout } from '@/lib/common/components/ScreenLayout';
import { FormField } from '@/lib/common/components/FormField';
import { Button } from '@/components/ui';
import { useLanguage } from '@/hooks/useLanguage';
import { useDatabase } from '@/hooks/useDatabase';
import { categoryRepository } from '@/lib/data/repositories/categoryRepository';

export default function NewCategoryScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const { refresh } = useDatabase();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [touched, setTouched] = useState(false);

  const nameError = (submitted || touched) && !name.trim() ? t('err_category_name') : null;

  const handleSave = async () => {
    setSubmitted(true);
    setTouched(true);
    if (!name.trim()) {
      void appAlert(t('required'), t('category_name_required'), 'warning');
      return;
    }

    setSaving(true);
    try {
      const duplicate = await categoryRepository.findByName(name);
      if (duplicate) {
        void appAlert(t('error'), t('err_category_duplicate'), 'warning');
        setSaving(false);
        return;
      }
      await categoryRepository.create({
        name,
        description: description || null,
        sort_order: 100,
        is_preset: false,
      });
      refresh();
      router.back();
    } catch (e) {
      void appAlert(t('error'), (e as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenLayout title={t('new_category_title')} scroll keyboardAvoiding>
      <FormField
        label={t('category_name')}
        required
        value={name}
        onChangeText={setName}
        onBlur={() => setTouched(true)}
        placeholder={t('ph_category_name')}
        hint="Used to group products in listings and orders"
        error={nameError}
        icon="pricetag-outline"
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
    </ScreenLayout>
  );
}
