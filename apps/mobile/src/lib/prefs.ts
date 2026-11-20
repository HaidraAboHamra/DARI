import type { FulfillmentType } from '@dari/contracts';
import AsyncStorage from '@react-native-async-storage/async-storage';

/** Checkout choices remembered on the device so repeat orders need no typing. */
export interface CheckoutPrefs {
  address: string;
  fulfillment: FulfillmentType;
}

const CHECKOUT = 'dari.checkout.v1';
const INTRO = 'dari.intro.lastFull';

export async function loadCheckoutPrefs(): Promise<Partial<CheckoutPrefs>> {
  try {
    const raw = await AsyncStorage.getItem(CHECKOUT);
    return raw ? (JSON.parse(raw) as Partial<CheckoutPrefs>) : {};
  } catch {
    return {};
  }
}

export function saveCheckoutPrefs(prefs: CheckoutPrefs): void {
  void AsyncStorage.setItem(CHECKOUT, JSON.stringify(prefs)).catch(() => undefined);
}

/** The full brand intro plays once a day; other launches get the short version. */
export async function introMode(): Promise<'full' | 'short'> {
  const today = new Date().toISOString().slice(0, 10);
  try {
    if ((await AsyncStorage.getItem(INTRO)) === today) return 'short';
    await AsyncStorage.setItem(INTRO, today);
  } catch {
    /* storage unavailable: play the full intro */
  }
  return 'full';
}
