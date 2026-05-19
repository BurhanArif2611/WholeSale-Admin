import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Locale } from '@/constants/translations';
import { isValidMobile } from '@/lib/common/utils/validation';

const setupDataKey = (userId: string) => `wholesale_user_profile_${userId}`;
const setupDoneKey = (userId: string) => `wholesale_profile_setup_done_${userId}`;

export interface UserProfileData {
  userId: string;
  fullName: string;
  phone: string;
  businessName: string;
  address: string;
  avatarUri: string | null;
  preferredLanguage: Locale;
  completedAt: string | null;
}

export const EMPTY_USER_PROFILE = (userId: string): UserProfileData => ({
  userId,
  fullName: '',
  phone: '',
  businessName: '',
  address: '',
  avatarUri: null,
  preferredLanguage: 'en',
  completedAt: null,
});

export async function loadUserProfile(userId: string): Promise<UserProfileData | null> {
  const raw = await AsyncStorage.getItem(setupDataKey(userId));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as UserProfileData;
  } catch {
    return null;
  }
}

export async function saveUserProfile(data: UserProfileData): Promise<void> {
  await AsyncStorage.setItem(setupDataKey(data.userId), JSON.stringify(data));
}

export async function isProfileSetupComplete(userId: string): Promise<boolean> {
  const flag = await AsyncStorage.getItem(setupDoneKey(userId));
  if (flag === 'true') return true;
  const data = await loadUserProfile(userId);
  return !!(data?.completedAt && data.fullName.trim() && isValidMobile(data.phone));
}

export async function markProfileSetupComplete(userId: string): Promise<void> {
  await AsyncStorage.setItem(setupDoneKey(userId), 'true');
}

export async function clearUserProfileStorage(userId: string): Promise<void> {
  await AsyncStorage.multiRemove([setupDataKey(userId), setupDoneKey(userId)]);
}
