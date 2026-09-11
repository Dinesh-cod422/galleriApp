import {
  type Breakpoint,
  gridColumnsForBreakpoint,
  maxContentWidthForBreakpoint,
  scaleForBreakpoint,
} from '../responsive/breakpoints';
import { type ColorTokens, darkColors, lightColors } from './colors';
import { radius, type Radius } from './radius';
import { createShadows, type Shadows } from './shadows';
import { createSpacing, type Spacing } from './spacing';
import { createTypography, type Typography } from './typography';

export type ThemeMode = 'light' | 'dark';

export type Theme = {
  readonly mode: ThemeMode;
  readonly breakpoint: Breakpoint;
  readonly colors: ColorTokens;
  readonly spacing: Spacing;
  readonly radius: Radius;
  readonly typography: Typography;
  readonly shadows: Shadows;
  readonly layout: {
    /** Horizontal screen padding. Set once, never re-derived per screen. */
    readonly gutter: number;
    readonly gridGap: number;
    readonly gridColumns: number;
    readonly maxContentWidth: number;
    /** Apple HIG / Material both land near 44–48dp. */
    readonly minTouchTarget: number;
  };
};

/**
 * Theme objects are cached by (mode, breakpoint).
 *
 * This matters for performance, not tidiness: `useThemedStyles` memoizes on
 * theme IDENTITY. If the provider built a fresh object each render, every
 * StyleSheet in the tree would be recreated on every render — which in a list
 * of image cards is exactly the work we are trying to avoid.
 */
const cache = new Map<string, Theme>();

export const createTheme = (mode: ThemeMode, breakpoint: Breakpoint): Theme => {
  const key = `${mode}:${breakpoint}`;
  const cached = cache.get(key);
  if (cached) {
    return cached;
  }

  const scale = scaleForBreakpoint[breakpoint];
  const spacing = createSpacing(scale);

  const theme: Theme = {
    mode,
    breakpoint,
    colors: mode === 'dark' ? darkColors : lightColors,
    spacing,
    radius,
    typography: createTypography(scale),
    shadows: createShadows(mode),
    layout: {
      gutter: spacing.base,
      gridGap: spacing.md,
      gridColumns: gridColumnsForBreakpoint[breakpoint],
      maxContentWidth: maxContentWidthForBreakpoint[breakpoint],
      minTouchTarget: 44,
    },
  };

  cache.set(key, theme);
  return theme;
};

export const lightTheme = createTheme('light', 'md');
export const darkTheme = createTheme('dark', 'md');
