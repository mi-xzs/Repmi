import { Alert, Platform } from 'react-native';

// RN's Alert is a no-op on react-native-web, so fall back to the browser dialogs
// there. Without this, every failure path on web fails completely silently.

export function notify(title: string, message?: string) {
  if (Platform.OS === 'web') {
    window.alert(message ? `${title}\n\n${message}` : title);
    return;
  }
  Alert.alert(title, message);
}

export function confirmDestructive(
  title: string,
  message: string,
  onConfirm: () => void,
  confirmLabel: string = 'Delete',
  destructive: boolean = true,
) {
  if (Platform.OS === 'web') {
    if (window.confirm(message ? `${title}\n\n${message}` : title)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    {
      text: confirmLabel,
      style: destructive ? 'destructive' : 'default',
      onPress: onConfirm,
    },
  ]);
}
