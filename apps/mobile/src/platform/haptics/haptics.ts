import * as Haptics from 'expo-haptics';

import { logError } from '@/platform/logging/logger';

// Haptics are a nicety: unsupported devices and simulators must never surface an error.
export function hapticSuccess(): void {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch((error: unknown) =>
    logError('haptics.success', error),
  );
}

export function hapticSelection(): void {
  Haptics.selectionAsync().catch((error: unknown) => logError('haptics.selection', error));
}
