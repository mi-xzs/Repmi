// src/services/biometricService.ts
//
// H2 — Biometric re-auth (Face ID / Touch ID / fingerprint).
//
// IMPORTANT: This biometric layer is a LOCAL re-auth on top of the
// Supabase session. It is NOT used to derive a key, decrypt a token,
// or unlock anything cryptographically. The Supabase session lives in
// SecureStore; biometrics just gate access to the running app process
// when the user has opted in.
//
// The "enabled" preference lives in SecureStore (NOT AsyncStorage) so
// a forensic reader can't trivially flip the flag and bypass the
// prompt by editing AsyncStorage on a rooted device.

import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

const ENABLED_KEY = 'repmi_biometric_unlock_enabled';

export async function isBiometricAvailable(): Promise<boolean> {
  try {
    const hardware = await LocalAuthentication.hasHardwareAsync();
    if (!hardware) return false;
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    return enrolled;
  } catch {
    return false;
  }
}

export async function isBiometricEnabled(): Promise<boolean> {
  try {
    const v = await SecureStore.getItemAsync(ENABLED_KEY);
    return v === 'true';
  } catch {
    return false;
  }
}

export async function setBiometricEnabled(on: boolean): Promise<void> {
  try {
    if (on) {
      await SecureStore.setItemAsync(ENABLED_KEY, 'true');
    } else {
      await SecureStore.deleteItemAsync(ENABLED_KEY);
    }
  } catch {
    // best-effort
  }
}

/**
 * Prompt the user to authenticate with their device biometric.
 * Returns `true` on success, `false` on cancel/failure. The caller
 * decides whether failure means "show the app anyway" (UX) or "kick
 * to login" (high-security).
 */
export async function authenticateBiometric(
  reason = 'Unlock Repmi',
): Promise<boolean> {
  try {
    const res = await LocalAuthentication.authenticateAsync({
      promptMessage: reason,
      cancelLabel: 'Cancel',
      disableDeviceFallback: false,
      fallbackLabel: 'Use passcode',
    });
    return res.success === true;
  } catch {
    return false;
  }
}
