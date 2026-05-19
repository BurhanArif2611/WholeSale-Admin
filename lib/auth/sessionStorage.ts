import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session, User } from '@supabase/supabase-js';

const DEV_SESSION_KEY = 'wholesale_dev_session_v1';

/** Dev bypass sessions last 90 days (renewed on each login). */
const DEV_SESSION_TTL_SEC = 60 * 60 * 24 * 90;

export type PersistedDevSession = {
  session: Session;
  user: User;
  savedAt: string;
};

export function isDevBypassSession(session: Session | null | undefined): boolean {
  return session?.access_token === 'dev-bypass';
}

export async function saveDevSession(session: Session, user: User): Promise<void> {
  const expiresAt = Math.floor(Date.now() / 1000) + DEV_SESSION_TTL_SEC;
  const payload: PersistedDevSession = {
    session: { ...session, expires_at: expiresAt, expires_in: DEV_SESSION_TTL_SEC },
    user,
    savedAt: new Date().toISOString(),
  };
  await AsyncStorage.setItem(DEV_SESSION_KEY, JSON.stringify(payload));
}

export async function loadDevSession(): Promise<PersistedDevSession | null> {
  const raw = await AsyncStorage.getItem(DEV_SESSION_KEY);
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as PersistedDevSession;
    const expiresAt = data.session?.expires_at;
    if (expiresAt && expiresAt * 1000 < Date.now()) {
      await clearDevSession();
      return null;
    }
    return data;
  } catch {
    await clearDevSession();
    return null;
  }
}

export async function clearDevSession(): Promise<void> {
  await AsyncStorage.removeItem(DEV_SESSION_KEY);
}
