import { Alert, Platform } from 'react-native';

/** Asks before a destructive action (UX study: error prevention). Works on native and web. */
export function confirmAction(title: string, message: string, confirm: string, onConfirm: () => void): void {
  if (Platform.OS === 'web') {
    if (globalThis.confirm?.(`${title}\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: 'تراجع', style: 'cancel' },
    { text: confirm, style: 'destructive', onPress: onConfirm },
  ]);
}
