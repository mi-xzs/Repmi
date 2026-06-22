import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { logWarn } from './logger';

// ── Foreground behavior ─────────────────────────────────────────────────────
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: false,
      shouldShowList: false,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

// ── Android channel ─────────────────────────────────────────────────────────
export async function ensureRestTimerChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    await Notifications.setNotificationChannelAsync('rest-timer', {
      name: 'Rest timer',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 300, 150, 300, 150, 300],
      sound: 'default',
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: false,
    });
  } catch (e) {
    logWarn('notifications.channel.setup.failed', { name: (e as Error)?.name });
  }
}

// ── Lazy permission priming ─────────────────────────────────────────────────
export async function ensureNotificationPermission(): Promise<boolean> {
  try {
    const settings = await Notifications.getPermissionsAsync();
    const provisional =
      settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
    if (settings.granted || provisional) return true;

    const req = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: false,
        allowSound: true,
      },
    });
    return req.granted;
  } catch (e) {
    logWarn('notifications.permission.check.failed', { name: (e as Error)?.name });
    return false;
  }
}
