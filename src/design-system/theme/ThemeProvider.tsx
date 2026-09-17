import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';

import { createTheme, type AppTheme, type ThemeMode } from './theme';

/** What the user chose. 'system' follows the OS and is the default. */
export type ThemePreference = 'system' | 'light' | 'dark';

type ThemeContextValue = {
  readonly theme: AppTheme;
  readonly preference: ThemePreference;
  readonly setPreference: (preference: ThemePreference) => void;
};

/**
 * The provider lives in the design system, not in `app/`, because design-system
 * components must be able to consume it — and the design system is forbidden
 * from importing `app/`. `app/providers` composes it; it does not own it.
 */
const ThemeContext = createContext<ThemeContextValue | null>(null);

export const ThemeProvider = ({
  children,
  initialPreference = 'system',
  onPreferenceChange,
}: {
  children: React.ReactNode;
  initialPreference?: ThemePreference;
  /**
   * Called whenever the choice changes, so it can be persisted.
   *
   * A callback rather than storage: the design system is forbidden from
   * importing `@infra`, and rightly so — it should not know whether the app
   * keeps preferences in MMKV, on a server, or nowhere at all. `app/providers`
   * decides that and passes the result back in as `initialPreference`.
   */
  onPreferenceChange?: (preference: ThemePreference) => void;
}): React.JSX.Element => {
  const systemScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>(initialPreference);

  const setPreference = useCallback(
    (next: ThemePreference) => {
      setPreferenceState(next);
      onPreferenceChange?.(next);
    },
    [onPreferenceChange],
  );

  const value = useMemo<ThemeContextValue>(() => {
    const resolved: ThemeMode =
      preference === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : preference;

    return {
      /*
       * Colour only. Size is no longer the theme's business: a style factory
       * takes `responsive` as its second argument and reads the package's maps
       * directly, so nothing here has to know how big the window is.
       */
      theme: createTheme(resolved),
      preference,
      setPreference,
    };
  }, [preference, setPreference, systemScheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useThemeContext = (): ThemeContextValue => {
  const context = useContext(ThemeContext);
  if (context === null) {
    // Fail loudly. A silent fallback theme hides the missing provider until
    // it shows up as unexplained colors in a screenshot.
    throw new Error('useTheme must be used inside <ThemeProvider>.');
  }
  return context;
};

export const useTheme = (): AppTheme => useThemeContext().theme;
