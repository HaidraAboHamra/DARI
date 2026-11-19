import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Keychain (iOS) / Keystore (Android) for tokens. The web preview has no secure
 * enclave, so it falls back to localStorage — development only.
 */
export const secureStorage = {
  async get(key: string): Promise<string | null> {
    if (Platform.OS === 'web') return globalThis.localStorage?.getItem(key) ?? null;
    return SecureStore.getItemAsync(key);
  },
  async set(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') return globalThis.localStorage?.setItem(key, value);
    await SecureStore.setItemAsync(key, value, { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK });
  },
  async remove(key: string): Promise<void> {
    if (Platform.OS === 'web') return globalThis.localStorage?.removeItem(key);
    await SecureStore.deleteItemAsync(key);
  },
};
