import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from './api';
import { config } from './config';

const KEY = 'dari.server.v1';

/** Normalizes what a tester types: `1.2.3.4:4000` → `http://1.2.3.4:4000/api/v1`. */
export function normalizeServerUrl(input: string): string {
  let url = input.trim().replace(/\/+$/, '');
  if (!/^https?:\/\//i.test(url)) url = `http://${url}`;
  if (!/\/api\/v\d+$/.test(url)) url = `${url}/api/v1`;
  return url;
}

let configured = !config.serverSwitch;

/** True once a test build knows which server to talk to (always true in store builds). */
export const isServerConfigured = (): boolean => configured;

/** Applies a saved server override (test builds only) before the session is restored. */
export async function loadServerOverride(): Promise<void> {
  if (!config.serverSwitch) return;
  const saved = await AsyncStorage.getItem(KEY).catch(() => null);
  if (saved) {
    api.setBaseUrl(saved);
    configured = true;
  }
}

/** Checks the server answers, then remembers it. Throws a user-facing message on failure. */
export async function switchServer(input: string): Promise<string> {
  const url = normalizeServerUrl(input);
  const ok = await fetch(`${url}/cities`, { headers: { accept: 'application/json' } })
    .then((r) => r.ok)
    .catch(() => false);
  if (!ok) throw new Error('الخادم لا يستجيب على هذا العنوان');
  api.setBaseUrl(url);
  configured = true;
  await AsyncStorage.setItem(KEY, url);
  return url;
}
