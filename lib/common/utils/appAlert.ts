import { Alert } from 'react-native';
import type { DialogVariant } from '@/lib/common/components/AppDialog';

type DialogApi = {
  alert: (title: string, message?: string, variant?: DialogVariant) => Promise<void>;
  confirm: (title: string, message?: string) => Promise<boolean>;
};

let dialogApi: DialogApi | null = null;

export function registerAppDialog(api: DialogApi | null) {
  dialogApi = api;
}

export async function appAlert(
  title: string,
  message?: string,
  variant: DialogVariant = 'info',
): Promise<void> {
  if (dialogApi) {
    await dialogApi.alert(title, message, variant);
    return;
  }
  Alert.alert(title, message);
}

export async function appConfirm(title: string, message?: string): Promise<boolean> {
  if (dialogApi) {
    return dialogApi.confirm(title, message);
  }
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: 'OK', onPress: () => resolve(true) },
    ]);
  });
}
