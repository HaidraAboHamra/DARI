import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { api } from './api';
import { secureStorage } from './secure-storage';

const TOKEN_KEY = 'dari.pushToken';

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

/**
 * Asks for permission and registers this phone for push. Silent no-op on
 * simulators, the web preview, or builds without an EAS project id.
 */
export async function registerForPush(): Promise<void> {
  if (Platform.OS === 'web' || !Device.isDevice) return;
  const projectId = (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId;
  if (!projectId) return;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', { name: 'داري', importance: Notifications.AndroidImportance.HIGH });
  }
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return;
  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
  await api.request('/me/devices', { method: 'PUT', body: { token, platform: Platform.OS } });
  await secureStorage.set(TOKEN_KEY, token);
}

export async function unregisterPush(): Promise<void> {
  const token = await secureStorage.get(TOKEN_KEY);
  if (!token) return;
  await api.request('/me/devices', { method: 'DELETE', body: { token } }).catch(() => undefined);
  await secureStorage.remove(TOKEN_KEY);
}
