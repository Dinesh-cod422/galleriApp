import { keyValueStore } from '@infra/storage/keyValueStore';
import { type ThemePreference } from '@ds';

const STORAGE_KEY = 'theme.preference.v1';

const VALID: readonly ThemePreference[] = ['system', 'light', 'dark'];

/**
 * The chosen theme, remembered between launches.
 *
 * Lives in `app/` rather than the design system because only the app knows
 * where preferences are kept — and MMKV reads synchronously, so the stored
 * choice is available on the very first render. An async read would paint one
 * frame of the wrong theme and then flip it, which is worse than not
 * remembering at all.
 */
export const readThemePreference = (): ThemePreference => {
  const raw = keyValueStore.getString(STORAGE_KEY);
  return VALID.includes(raw as ThemePreference) ? (raw as ThemePreference) : 'system';
};

export const writeThemePreference = (preference: ThemePreference): void => {
  keyValueStore.set(STORAGE_KEY, preference);
};
