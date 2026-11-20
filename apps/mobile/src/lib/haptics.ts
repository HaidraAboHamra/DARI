import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

const on = Platform.OS !== 'web';

/** Light tactile feedback for key moments (no-op on web). */
export const haptic = {
  /** Picking an option or a filter. */
  select: () => on && void Haptics.selectionAsync().catch(() => undefined),
  /** Adding to the basket. */
  tap: () => on && void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined),
  /** Order placed, booking confirmed. */
  success: () => on && void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined),
  warn: () => on && void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined),
};
