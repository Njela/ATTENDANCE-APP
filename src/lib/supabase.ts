import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { supabaseSecureStorage } from './supabaseSecureStorage';

const extra = Constants.expoConfig?.extra as
  | { supabaseUrl?: string; supabaseAnonKey?: string }
  | undefined;

const url = extra?.supabaseUrl;
const anonKey = extra?.supabaseAnonKey;

if (!url || !anonKey) {
  console.warn(
    'Supabase URL or anon key missing. Set ATTENDTRACK_SUPABASE_URL and ATTENDTRACK_SUPABASE_ANON_KEY in .env (see .env.example).'
  );
}

/** Prefer SecureStore (chunked) for session; fall back to AsyncStorage if SecureStore fails (e.g. web). */
async function getBestStorage(): Promise<{
  getItem: (k: string) => Promise<string | null>;
  setItem: (k: string, v: string) => Promise<void>;
  removeItem: (k: string) => Promise<void>;
}> {
  try {
    await SecureStore.setItemAsync('__attendtrack_sb_probe__', '1');
    await SecureStore.deleteItemAsync('__attendtrack_sb_probe__');
    return supabaseSecureStorage;
  } catch {
    return AsyncStorage;
  }
}

let storageCache: Awaited<ReturnType<typeof getBestStorage>> | null = null;
async function storage() {
  storageCache ??= await getBestStorage();
  return storageCache;
}

export const supabase = createClient(url ?? '', anonKey ?? '', {
  auth: {
    storage: {
      getItem: async (key: string) => (await storage()).getItem(key),
      setItem: async (key: string, value: string) => (await storage()).setItem(key, value),
      removeItem: async (key: string) => (await storage()).removeItem(key),
    },
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export const ATTENDTRACK_SCHEMA = 'attendtrack' as const;
