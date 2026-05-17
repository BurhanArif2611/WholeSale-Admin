// lib/supabase.ts
import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

// Fallback values to prevent constructor crash while still warning the developer
const safeUrl = supabaseUrl || 'https://placeholder.supabase.co';
const safeKey = supabaseKey || 'placeholder-key';

if (!supabaseUrl || !supabaseKey) {
  console.warn(
    '[Supabase] Missing env vars!\n' +
    'Create a .env.local file with:\n' +
    'EXPO_PUBLIC_SUPABASE_URL=your_url\n' +
    'EXPO_PUBLIC_SUPABASE_ANON_KEY=your_key'
  );
}

// Initialize with safe placeholders to prevent constructor crash if env is missing
export const supabase = createClient(safeUrl, safeKey, {
  auth: {
    storage:           AsyncStorage as any,
    autoRefreshToken:  true,
    persistSession:    true,
    detectSessionInUrl: false,
  },
});