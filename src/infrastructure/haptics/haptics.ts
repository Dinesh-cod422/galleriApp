import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

/**
 * Intent, not waveform. Screens ask for "a selection happened"; only this file
 * knows that iOS calls it `impactLight` — which is also what keeps the mapping
 * in one place when the two platforms disagree.
 */
export type HapticIntent = 'selection' | 'success' | 'warning';

const PATTERN = {
  selection: 'impactLight',
  success: 'notificationSuccess',
  warning: 'notificationWarning',
} as const;

const OPTIONS = {
  // A buzzing motor on a device with no taptic engine is worse than silence.
  enableVibrateFallback: false,
  // Respect the user's system-wide haptics setting rather than overriding it.
  ignoreAndroidSystemSettings: false,
};

export const haptics = {
  trigger(intent: HapticIntent): void {
    ReactNativeHapticFeedback.trigger(PATTERN[intent], OPTIONS);
  },
};
