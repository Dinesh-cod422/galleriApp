import { useMemo } from 'react';
import { type ImageStyle, StyleSheet, type TextStyle, type ViewStyle } from 'react-native';

import { type Theme } from './theme';
import { useTheme } from './ThemeProvider';

type NamedStyles = Record<string, ViewStyle | TextStyle | ImageStyle>;

/**
 * Builds a StyleSheet from the active theme, memoized on theme identity.
 *
 * IMPORTANT: `factory` must be a module-level constant, not an inline arrow.
 * An inline factory changes identity every render and defeats the memo —
 * which is why every component here declares its factory outside the component
 * body.
 */
export const useThemedStyles = <T extends NamedStyles>(factory: (theme: Theme) => T): T => {
  const theme = useTheme();
  return useMemo(() => StyleSheet.create(factory(theme)), [theme, factory]);
};
