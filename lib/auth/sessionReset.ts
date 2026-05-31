import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { wipeAllUserData } from '@/lib/core/database';
import { emitDatabaseReset } from '@/lib/core/databaseReset';
import { clearAllCaches } from '@/hooks/useDataStore';

/** Device-level keys preserved across logout (not user business data). */
const KEEP_ASYNC_KEYS = new Set([
  'wholesale_walkthrough_completed',
  'user-language',
  'settings_notifications_enabled',
]);

function shouldRemoveAsyncKey(key: string): boolean {
  if (KEEP_ASYNC_KEYS.has(key)) return false;
  if (key.startsWith('wholesale_')) return true;
  if (key.startsWith('order_draft_')) return true;
  if (key.startsWith('receipt_last_shared_')) return true;
  if (key.startsWith('sb-')) return true;
  return false;
}

async function clearAsyncStorageSessionData(): Promise<void> {
  const keys = await AsyncStorage.getAllKeys();
  const toRemove = keys.filter(shouldRemoveAsyncKey);
  if (toRemove.length > 0) {
    await AsyncStorage.multiRemove(toRemove);
  }
}

/** Best-effort SecureStore wipe for any app-stored secrets. */
async function clearSecureStorage(): Promise<void> {
  try {
    const keys = [
      'wholesale_dev_session_v1',
      'supabase.auth.token',
    ];
    await Promise.all(
      keys.map((k) => SecureStore.deleteItemAsync(k).catch(() => undefined)),
    );
  } catch {
    // SecureStore may be empty — ignore
  }
}

/**
 * Wipes all user/session data so the next login starts fresh.
 * Safe to call offline (logout without internet).
 */
export async function performFullSessionReset(): Promise<void> {
  await clearAllCaches();
  await clearAsyncStorageSessionData();
  await clearSecureStorage();
  await wipeAllUserData();
  emitDatabaseReset();
}
