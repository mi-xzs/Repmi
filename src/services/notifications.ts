// src/services/notifications.ts
//
// Notification setup for the rest timer (and any future local notifications).
// Three responsibilities:
//   1. Configure how notifications behave when the app is foregrounded.
//   2. Ensure the Android channel exists (must be created before scheduling).
//   3. Lazily prompt for permission the first time it's actually needed.
//
// We deliberately do NOT request permission at app launch — out-of-context
// system dialogs get dismissed.  ensureNotificationPermission() is meant to
// be called the first time the user starts a real timer.

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { logWarn } from './logger';

// ── Foreground behavior ─────────────────────────────────────────────────────
// While the rest modal is on screen we don't want a duplicate banner — the
// modal already tells the user the timer ended.  We DO want the sound, since
// a phone-down user wants to hear it.
//
// Guarded off web: expo-notifications has no full browser implementation, and
// the web demo has no local-notification surface. Native builds register the
// handler as before.
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
// Android requires every notification to belong to a channel.  Importance
// HIGH = heads-up banner + sound + vibration on supported versions.
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
    // Channel setup failing is non-fatal — the foreground timer still works,
    // we just won't be able to alert the user when backgrounded.
    logWarn('notifications.channel.setup.failed', { name: (e as Error)?.name });
  }
}

// ── Lazy permission priming ─────────────────────────────────────────────────
// Returns true if we have (or just obtained) permission to post notifications.
// Returns false if the user denied — caller should gracefully degrade to
// foreground-only timer behavior.
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
