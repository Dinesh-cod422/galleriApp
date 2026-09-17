import { type ColorTokens, darkColors, lightColors } from './colors';
import { createShadows, type Shadows } from './shadows';

export type ThemeMode = 'light' | 'dark';

/**
 * What a style factory gets in its FIRST argument: colour, and nothing else.
 *
 * The split is the point. A factory reads two things — what colour something
 * is, and how big it is — and they change for different reasons: colour with
 * the theme mode, size with the window. Keeping them in separate arguments is
 * what lets `createStyles` cache on `mode|WxH` and share one sheet across every
 * instance of a component.
 *
 * Every length now comes from the second argument, `responsive`, which is the
 * package's own token maps. There is no `spacing`, `radius`, `control` or
 * `icon` here any more: a factory writes `HScale.Width_18` where it used to
 * write `theme.spacing.base`.
 */
export type AppTheme = {
  readonly mode: ThemeMode;
  readonly isDark: boolean;
  readonly colors: ColorTokens;
  readonly shadows: Shadows;
};

/**
 * Two objects for the life of the process.
 *
 * `createStyles` keys its cache partly on identity of what this returns, and
 * the provider hands it straight to consumers — so a fresh object per call
 * would rebuild every sheet in the tree on every render.
 */
const THEMES: Record<ThemeMode, AppTheme> = {
  light: {
    mode: 'light',
    isDark: false,
    colors: lightColors,
    shadows: createShadows('light'),
  },
  dark: {
    mode: 'dark',
    isDark: true,
    colors: darkColors,
    shadows: createShadows('dark'),
  },
};

export const createTheme = (mode: ThemeMode): AppTheme => THEMES[mode];

export const lightTheme = THEMES.light;
export const darkTheme = THEMES.dark;

export type { ColorTokens };
