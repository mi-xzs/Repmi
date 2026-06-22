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
  }
}

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
