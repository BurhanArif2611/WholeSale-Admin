import * as FileSystem from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Linking, Alert, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateReceiptHtml, buildReceiptWhatsAppText } from '@/lib/receipt/receiptHtml';
import type { ReceiptData } from '@/lib/receipt/receiptTypes';

const RECEIPT_DIR = `${FileSystem.cacheDirectory}receipts/`;
const SHARED_KEY = (orderId: string) => `receipt_last_shared_${orderId}`;

async function ensureReceiptDir(): Promise<void> {
  const info = await FileSystem.getInfoAsync(RECEIPT_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(RECEIPT_DIR, { intermediates: true });
  }
}

export async function generateReceiptPdfUri(data: ReceiptData): Promise<string> {
  const html = generateReceiptHtml(data);
  const { uri } = await Print.printToFileAsync({ html, base64: false });
  await ensureReceiptDir();
  const dest = `${RECEIPT_DIR}invoice-${data.invoiceNo}-${Date.now()}.pdf`;
  await FileSystem.copyAsync({ from: uri, to: dest });
  return dest;
}

export async function printReceipt(data: ReceiptData): Promise<void> {
  await Print.printAsync({ html: generateReceiptHtml(data) });
}

export async function saveAndSharePdf(data: ReceiptData): Promise<void> {
  const uri = await generateReceiptPdfUri(data);
  await recordShare(data.orderId);
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: `Invoice #${data.invoiceNo}`,
      UTI: 'com.adobe.pdf',
    });
  } else {
    Alert.alert('Share unavailable', `PDF saved at cache. Invoice #${data.invoiceNo}`);
  }
}

/** Share PDF file via system sheet (works as document share; image apps may open PDF). */
export async function shareReceiptPdf(data: ReceiptData): Promise<void> {
  await saveAndSharePdf(data);
}

export async function shareReceiptWhatsApp(data: ReceiptData, phone?: string): Promise<void> {
  const text = buildReceiptWhatsAppText(data);
  await recordShare(data.orderId);

  const digits = (phone ?? data.client.mobile).replace(/\D/g, '');
  const withCountry = digits.length === 10 ? `91${digits}` : digits;

  if (withCountry.length >= 10) {
    const url = `whatsapp://send?phone=${withCountry}&text=${encodeURIComponent(text)}`;
    const ok = await Linking.canOpenURL(url);
    if (ok) {
      await Linking.openURL(url);
      return;
    }
  }

  const fallback = `whatsapp://send?text=${encodeURIComponent(text)}`;
  if (await Linking.canOpenURL(fallback)) {
    await Linking.openURL(fallback);
  } else {
    Alert.alert('WhatsApp', 'WhatsApp is not installed. Use Share PDF instead.');
  }
}

export async function shareReceiptWhatsAppWithPdf(data: ReceiptData, phone?: string): Promise<void> {
  await recordShare(data.orderId);
  const uri = await generateReceiptPdfUri(data);
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: 'Share via WhatsApp',
    });
    return;
  }
  await shareReceiptWhatsApp(data, phone);
}

export async function previewReceipt(data: ReceiptData): Promise<void> {
  await Print.printAsync({ html: generateReceiptHtml(data) });
}

export async function recordShare(orderId: string): Promise<void> {
  await AsyncStorage.setItem(SHARED_KEY(orderId), new Date().toISOString());
}

export async function getLastSharedAt(orderId: string): Promise<string | null> {
  return AsyncStorage.getItem(SHARED_KEY(orderId));
}

export function formatLastShared(iso: string | null): string | null {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return null;
  }
}
