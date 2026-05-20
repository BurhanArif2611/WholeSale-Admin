import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BottomSheet } from '@/lib/common/components/BottomSheet';
import { Colors, Spacing, Radius, Typography } from '@/constants/theme';
import type { ReceiptData } from '@/lib/receipt/receiptTypes';
import {
  printReceipt,
  saveAndSharePdf,
  shareReceiptWhatsApp,
  shareReceiptWhatsAppWithPdf,
  previewReceipt,
} from '@/lib/receipt/receiptService';

interface ShareReceiptSheetProps {
  visible: boolean;
  data: ReceiptData | null;
  onClose: () => void;
  t: (key: string) => string;
}

type ShareAction = 'whatsapp' | 'whatsapp_pdf' | 'pdf' | 'print' | 'preview';

export function ShareReceiptSheet({ visible, data, onClose, t }: ShareReceiptSheetProps) {
  const [busy, setBusy] = useState<ShareAction | null>(null);

  const run = async (action: ShareAction, fn: () => Promise<void>) => {
    if (!data) return;
    setBusy(action);
    try {
      await fn();
      if (action !== 'preview' && action !== 'print') onClose();
    } catch (e) {
      Alert.alert(t('error'), (e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const hasPhone = !!(data?.client.mobile && data.client.mobile.replace(/\D/g, '').length >= 10);

  return (
    <BottomSheet
      visible={visible}
      title={t('share_receipt') || 'Share Receipt'}
      onClose={onClose}
    >
      <Text style={styles.subtitle}>
        {t('share_receipt_hint') || 'Choose how to send this invoice to your customer'}
      </Text>

      {hasPhone ? (
        <ShareOption
          icon="logo-whatsapp"
          iconColor="#25D366"
          label={t('share_whatsapp') || 'WhatsApp (Text)'}
          subtitle={data?.client.mobile}
          loading={busy === 'whatsapp'}
          onPress={() => run('whatsapp', () => shareReceiptWhatsApp(data!))}
        />
      ) : null}

      <ShareOption
        icon="logo-whatsapp"
        iconColor="#25D366"
        label={t('share_whatsapp_pdf') || 'WhatsApp / Share PDF'}
        subtitle={t('share_whatsapp_pdf_hint') || 'Attach PDF invoice'}
        loading={busy === 'whatsapp_pdf'}
        onPress={() => run('whatsapp_pdf', () => shareReceiptWhatsAppWithPdf(data!))}
      />

      <ShareOption
        icon="document-text"
        iconColor={Colors.amber}
        label={t('save_pdf') || 'Save / Share PDF'}
        subtitle={t('save_pdf_hint') || 'Download or send PDF file'}
        loading={busy === 'pdf'}
        onPress={() => run('pdf', () => saveAndSharePdf(data!))}
      />

      <ShareOption
        icon="eye-outline"
        iconColor={Colors.info}
        label={t('preview_receipt') || 'Preview Receipt'}
        subtitle={t('preview_receipt_hint') || 'Open print preview'}
        loading={busy === 'preview'}
        onPress={() => run('preview', () => previewReceipt(data!))}
      />

      <ShareOption
        icon="print-outline"
        iconColor={Colors.purple}
        label={t('print_receipt') || 'Print Receipt'}
        subtitle={t('print_receipt_hint') || 'Send to printer'}
        loading={busy === 'print'}
        onPress={() => run('print', () => printReceipt(data!))}
      />
    </BottomSheet>
  );
}

function ShareOption({
  icon,
  iconColor,
  label,
  subtitle,
  onPress,
  loading,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  label: string;
  subtitle?: string;
  onPress: () => void;
  loading?: boolean;
}) {
  return (
    <Pressable style={styles.option} onPress={onPress} disabled={loading}>
      <View style={[styles.iconWrap, { backgroundColor: iconColor + '18' }]}>
        {loading ? (
          <ActivityIndicator size="small" color={iconColor} />
        ) : (
          <Ionicons name={icon} size={24} color={iconColor} />
        )}
      </View>
      <View style={styles.optionText}>
        <Text style={styles.optionLabel}>{label}</Text>
        {subtitle ? <Text style={styles.optionSub}>{subtitle}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  subtitle: {
    fontSize: Typography.sm,
    color: Colors.textMuted,
    marginBottom: Spacing.lg,
    lineHeight: 20,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    backgroundColor: Colors.surface2,
    borderRadius: Radius.lg,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: { flex: 1 },
  optionLabel: { fontSize: Typography.sm, fontWeight: Typography.bold, color: Colors.textPrimary },
  optionSub: { fontSize: Typography.xs, color: Colors.textMuted, marginTop: 2 },
});
