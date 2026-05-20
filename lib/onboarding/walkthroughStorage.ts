import AsyncStorage from '@react-native-async-storage/async-storage';

const WALKTHROUGH_KEY = 'wholesale_walkthrough_completed';

export async function isWalkthroughComplete(): Promise<boolean> {
  const v = await AsyncStorage.getItem(WALKTHROUGH_KEY);
  return v === 'true';
}

export async function markWalkthroughComplete(): Promise<void> {
  await AsyncStorage.setItem(WALKTHROUGH_KEY, 'true');
}

export async function resetWalkthrough(): Promise<void> {
  await AsyncStorage.removeItem(WALKTHROUGH_KEY);
}
