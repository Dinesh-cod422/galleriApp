import React, { createContext, useContext, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';

import { useResponsive } from '../responsive/useResponsive';
import { createTheme, type Theme, type ThemeMode } from './theme';

/** What the user chose. 'system' follows the OS and is the default. */
export type ThemePreference = 'system' | 'light' | 'dark';

type ThemeContextValue = {
  readonly theme: Theme;
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
}: {
  children: React.ReactNode;
  initialPreference?: ThemePreference;
}): React.JSX.Element => {
  const systemScheme = useColorScheme();
  const { breakpoint } = useResponsive();
  const [preference, setPreference] = useState<ThemePreference>(initialPreference);

  const value = useMemo<ThemeContextValue>(() => {
    const resolved: ThemeMode =
      preference === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : preference;

    return {
      theme: createTheme(resolved, breakpoint),
      preference,
      setPreference,
    };
  }, [preference, systemScheme, breakpoint]);

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

export const useTheme = (): Theme => useThemeContext().theme;
