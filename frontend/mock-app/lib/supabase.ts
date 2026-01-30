import 'react-native-url-polyfill/auto'
import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'

const isServer = typeof window === 'undefined'

const ExpoWebSecureStoreAdapter = {
  getItem: (key: string) => {
    if (isServer) return Promise.resolve(null)
    return AsyncStorage.getItem(key)
  },
  setItem: (key: string, value: string) => {
    if (isServer) return Promise.resolve()
    return AsyncStorage.setItem(key, value)
  },
  removeItem: (key: string) => {
    if (isServer) return Promise.resolve()
    return AsyncStorage.removeItem(key)
  },
};

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '',
  {
    auth: {
      storage: ExpoWebSecureStoreAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  },
)