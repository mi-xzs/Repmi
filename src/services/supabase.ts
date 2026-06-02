import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, Platform } from 'react-native';
import { supabaseSecureStorage } from './secureStoreAdapter';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// SECURITY: persist the auth session in the platform secure key store
// (Keychain on iOS, EncryptedSharedPreferences on Android) via
// expo-secure-store. AsyncStorage stores plain JSON on disk and is
// readable by anyone with adb / filesystem access on a rooted device.
//
// SecureStore is native-only — on web we fall back to AsyncStorage
// (which on web uses localStorage). Browser localStorage is the
// standard location for web auth tokens anyway, so that's fine.
const sessionStorage =
  Platform.OS === 'web' ? AsyncStorage : supabaseSecureStorage;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: sessionStorage,
    autoRefreshToken: true,
    persistSession: true,
    // Web: let Supabase parse `#access_token=…&type=recovery` from the
    // URL hash after the user clicks a confirm-signup / password-reset
    // email link. Without this, the recovery session is never created
    // and the PasswordResetConfirmScreen has no token to work with.
    // Native uses deep-link query params (parsed by Expo Linking) and
    // calls setSession() explicitly — so detectSessionInUrl stays off.
    detectSessionInUrl: Platform.OS === 'web',
  },
});

// Only refresh tokens while the app is foregrounded — recommended for RN
// to avoid background refresh churn / hitting OS-level networking limits.
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});
