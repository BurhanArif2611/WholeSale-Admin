import React, { useState } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenLayout } from '@/lib/common/components/ScreenLayout';
import { FormField } from '@/lib/common/components/FormField';
import { MobileFormField } from '@/lib/common/components/MobileFormField';
import { Button } from '@/components/ui';
import { useLanguage } from '@/hooks/useLanguage';
import { clientRepository } from '@/lib/data/repositories/clientRepository';
import { isValidEmail, isValidGst, getMobileFieldError } from '@/lib/common/utils/validation';

export default function NewClientScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [alternateMobile, setAlternateMobile] = useState('');
  const [address, setAddress] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [creditLimit, setCreditLimit] = useState('');
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const touch = (field: string) => setTouched((p) => ({ ...p, [field]: true }));

  const mobileMessages = {
    required: t('err_mobile_required'),
    invalid: t('err_mobile_invalid'),
  };

  const errors = {
    name: !name.trim() ? t('err_client_name') : null,
    mobile: getMobileFieldError(mobile, { required: true, messages: mobileMessages }),
    alternateMobile: getMobileFieldError(alternateMobile, {
      required: false,
      messages: { invalid: t('err_mobile_invalid') },
    }),
    email: email.trim() && !isValidEmail(email) ? t('err_email_invalid') : null,
    gst: gstNumber.trim() && !isValidGst(gstNumber) ? t('err_gst_invalid') : null,
  };

  const showErr = (field: keyof typeof errors) =>
    submitted || touched[field] ? errors[field] : null;

  const handleSave = async () => {
    setSubmitted(true);
    Object.keys(errors).forEach((k) => touch(k));

    if (errors.name || errors.mobile || errors.alternateMobile || errors.email || errors.gst) {
      return Alert.alert(t('required'), t('client_name_required'));
    }

    const duplicate = await clientRepository.findByMobile(mobile);
    if (duplicate) return Alert.alert(t('error'), 'A client with this mobile already exists');

    setSaving(true);
    try {
      await clientRepository.create({
        name,
        mobile,
        alternate_mobile: alternateMobile || null,
        address: address || null,
        gst_number: gstNumber || null,
        email: email || null,
        notes: notes || null,
        credit_limit: parseFloat(creditLimit) || 0,
        profile_photo_uri: null,
      });
      router.back();
    } catch (e) {
      Alert.alert(t('error'), (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenLayout title={t('new_client_title')} scroll keyboardAvoiding>
      <FormField
        label={t('client_business_name')}
        required
        value={name}
        onChangeText={setName}
        onBlur={() => touch('name')}
        placeholder={t('ph_client_name')}
        hint={t('hint_client_name')}
        error={showErr('name')}
        icon="person-outline"
        returnKeyType="next"
      />
      <MobileFormField
        label={t('phone_no')}
        required
        value={mobile}
        onChangeText={setMobile}
        onBlur={() => touch('mobile')}
        placeholder={t('ph_mobile')}
        hint={t('hint_mobile')}
        showValidation={submitted || !!touched.mobile}
        requiredMessage={t('err_mobile_required')}
        invalidMessage={t('err_mobile_invalid')}
        error={showErr('mobile')}
      />
      <MobileFormField
        label={t('alternate_mobile')}
        required={false}
        value={alternateMobile}
        onChangeText={setAlternateMobile}
        onBlur={() => touch('alternateMobile')}
        placeholder={t('ph_alternate_mobile')}
        hint={t('hint_alternate_mobile')}
        showValidation={submitted || !!touched.alternateMobile}
        invalidMessage={t('err_mobile_invalid')}
        error={showErr('alternateMobile')}
      />
      <FormField
        label={t('address')}
        value={address}
        onChangeText={setAddress}
        placeholder={t('ph_address')}
        multiline
        numberOfLines={3}
      />
      <FormField
        label="GST Number"
        value={gstNumber}
        onChangeText={setGstNumber}
        onBlur={() => touch('gst')}
        placeholder={t('ph_gst')}
        hint={t('hint_gst_optional')}
        error={showErr('gst')}
        autoCapitalize="characters"
        maxLength={15}
      />
      <FormField
        label="Email"
        value={email}
        onChangeText={setEmail}
        onBlur={() => touch('email')}
        placeholder={t('ph_client_email')}
        hint={t('hint_email_optional')}
        error={showErr('email')}
        keyboardType="email-address"
        autoCapitalize="none"
        icon="mail-outline"
      />
      <FormField
        label="Credit Limit"
        value={creditLimit}
        onChangeText={setCreditLimit}
        placeholder={t('ph_credit_limit')}
        hint={t('hint_credit_limit')}
        keyboardType="numeric"
      />
      <FormField
        label={t('notes_optional')}
        value={notes}
        onChangeText={setNotes}
        placeholder={t('notes_placeholder')}
        hint={t('hint_notes')}
        multiline
        numberOfLines={3}
      />
      <Button label={t('save_client')} onPress={handleSave} loading={saving} style={{ marginTop: 8 }} />
    </ScreenLayout>
  );
}
