import React, { useState } from 'react';
import { Alert } from 'react-native';
import { BottomSheet } from '@/lib/common/components/BottomSheet';
import { FormField } from '@/lib/common/components/FormField';
import { MobileFormField } from '@/lib/common/components/MobileFormField';
import { Button } from '@/components/ui';
import { useLanguage } from '@/hooks/useLanguage';
import { clientRepository } from '@/lib/data/repositories/clientRepository';
import { getMobileFieldError } from '@/lib/common/utils/validation';
import type { Client } from '@/lib/domain/models';

interface QuickAddClientSheetProps {
  visible: boolean;
  onClose: () => void;
  onCreated: (client: Client) => void;
}

export function QuickAddClientSheet({ visible, onClose, onCreated }: QuickAddClientSheetProps) {
  const { t } = useLanguage();
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [address, setAddress] = useState('');
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const mobileError = getMobileFieldError(mobile, {
    required: true,
    messages: { required: t('err_mobile_required'), invalid: t('err_mobile_invalid') },
  });
  const nameError = !name.trim() ? t('err_client_name') : null;

  const reset = () => {
    setName('');
    setMobile('');
    setAddress('');
    setSubmitted(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSave = async () => {
    setSubmitted(true);
    if (nameError || mobileError) {
      Alert.alert(t('required'), nameError ?? mobileError ?? t('client_name_required'));
      return;
    }

    const duplicate = await clientRepository.findByMobile(mobile);
    if (duplicate) {
      Alert.alert(t('error'), 'A client with this mobile already exists');
      return;
    }

    setSaving(true);
    try {
      const client = await clientRepository.create({
        name: name.trim(),
        mobile,
        alternate_mobile: null,
        address: address.trim() || null,
        gst_number: null,
        email: null,
        notes: null,
        credit_limit: 0,
        profile_photo_uri: null,
      });
      reset();
      onCreated(client);
      onClose();
    } catch (e) {
      Alert.alert(t('error'), (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet
      visible={visible}
      title={t('create_new_client')}
      onClose={handleClose}
      footer={<Button label={t('save_client')} onPress={handleSave} loading={saving} />}
    >
      <FormField
        label="Client Name"
        value={name}
        onChangeText={setName}
        placeholder={t('ph_client_name')}
        error={submitted ? nameError : null}
        autoFocus
      />
      <MobileFormField
        label="Phone Number"
        value={mobile}
        onChangeText={setMobile}
        placeholder={t('ph_mobile')}
        error={submitted ? mobileError : null}
      />
      <FormField
        label={t('address')}
        value={address}
        onChangeText={setAddress}
        placeholder={t('ph_address')}
        hint={t('label_optional_suffix')}
        multiline
        numberOfLines={2}
      />
    </BottomSheet>
  );
}
