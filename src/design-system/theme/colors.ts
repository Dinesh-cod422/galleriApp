/**
 * Two-tier color system.
 *
 * Tier 1 — `palette`: raw values. PRIVATE to this file. Nothing else in the
 * app may name a color by its hue, because "blue500" tells a component
 * nothing about whether it is legible on the current background.
 *
 * Tier 2 — semantic tokens: what the color is FOR (`bg.surface`,
 * `text.secondary`). Dark mode is then a second mapping of the same token
 * names, not a `mode === 'dark' ? … : …` conditional sprinkled through screens.
 */
const palette = {
  white: '#FFFFFF',
  black: '#000000',

  ink0: '#FFFFFF',
  ink50: '#F7F7FA',
  ink100: '#EEEEF3',
  ink200: '#E0E0E9',
  ink300: '#C6C6D4',
  ink400: '#9494A8',
  ink500: '#6E6E85',
  ink600: '#4C4C60',
  ink700: '#333343',
  ink800: '#1C1C26',
  ink850: '#15151D',
  ink900: '#0E0E14',
  ink950: '#08080C',

  violet300: '#C4B5FD',
  violet400: '#A78BFA',
  violet500: '#8B5CF6',
  violet600: '#7C3AED',
  violet700: '#6D28D9',

  teal400: '#2DD4BF',
  amber400: '#FBBF24',
  rose400: '#FB7185',
  rose500: '#F43F5E',
  green500: '#22C55E',
} as const;

export type ColorTokens = {
  readonly bg: {
    /** App background, behind everything. */
    readonly canvas: string;
    /** Cards, sheets, anything raised off the canvas. */
    readonly surface: string;
    /** A surface raised above another surface (sheet over card). */
    readonly surfaceElevated: string;
    /** Chips, inputs, skeleton base. */
    readonly subtle: string;
    /** Pressed/hovered feedback layer. */
    readonly pressed: string;
    /** Scrim behind modals and sheets. */
    readonly scrim: string;
    /** Image placeholder before load — avoids a white flash in dark mode. */
    readonly imagePlaceholder: string;
  };
  readonly text: {
    readonly primary: string;
    readonly secondary: string;
    readonly tertiary: string;
    readonly inverse: string;
    readonly onAccent: string;
    readonly danger: string;
  };
  readonly border: {
    readonly subtle: string;
    readonly strong: string;
    readonly focus: string;
  };
  readonly accent: {
    readonly default: string;
    readonly pressed: string;
    readonly subtle: string;
    readonly onSubtle: string;
  };
  readonly status: {
    readonly favorite: string;
    readonly success: string;
    readonly warning: string;
    readonly danger: string;
  };
  readonly skeleton: {
    readonly base: string;
    readonly highlight: string;
  };
};

export const lightColors: ColorTokens = {
  bg: {
    canvas: palette.ink50,
    surface: palette.ink0,
    surfaceElevated: palette.ink0,
    subtle: palette.ink100,
    pressed: palette.ink200,
    scrim: 'rgba(14, 14, 20, 0.45)',
    imagePlaceholder: palette.ink200,
  },
  text: {
    primary: palette.ink900,
    secondary: palette.ink600,
    tertiary: palette.ink400,
    inverse: palette.ink0,
    onAccent: palette.white,
    danger: palette.rose500,
  },
  border: {
    subtle: palette.ink200,
    strong: palette.ink300,
    focus: palette.violet500,
  },
  accent: {
    default: palette.violet600,
    pressed: palette.violet700,
    subtle: '#EDE9FE',
    onSubtle: palette.violet700,
  },
  status: {
    favorite: palette.rose500,
    success: palette.green500,
    warning: palette.amber400,
    danger: palette.rose500,
  },
  skeleton: {
    base: palette.ink100,
    highlight: palette.ink200,
  },
};

export const darkColors: ColorTokens = {
  bg: {
    canvas: palette.ink950,
    surface: palette.ink900,
    surfaceElevated: palette.ink850,
    subtle: palette.ink800,
    pressed: '#23232F',
    scrim: 'rgba(0, 0, 0, 0.6)',
    imagePlaceholder: palette.ink800,
  },
  text: {
    primary: palette.ink50,
    secondary: palette.ink300,
    tertiary: palette.ink500,
    inverse: palette.ink900,
    onAccent: palette.white,
    danger: palette.rose400,
  },
  border: {
    subtle: '#262632',
    strong: palette.ink700,
    focus: palette.violet400,
  },
  accent: {
    default: palette.violet500,
    pressed: palette.violet400,
    subtle: '#2A2140',
    onSubtle: palette.violet300,
  },
  status: {
    favorite: palette.rose400,
    success: palette.green500,
    warning: palette.amber400,
    danger: palette.rose400,
  },
  skeleton: {
    base: palette.ink800,
    highlight: '#26263A',
  },
};
