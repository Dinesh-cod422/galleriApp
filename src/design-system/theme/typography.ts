import { Platform, type TextStyle } from 'react-native';

import { type Responsive } from './responsive';

/**
 * The ceiling on the OS text-size setting ("Text Size" on iOS, "Font size" on
 * Android).
 *
 * A SECOND scaling axis, independent of the window, that `Dimensions` never
 * reports — which is why a screen looks right in a simulator and wrong on a
 * phone whose owner raised it. The OS multiplies every `fontSize` at render and
 * leaves the layout boxes untouched, so text overflows the controls sized
 * around it. It is a CEILING, not a multiplier: the applied scale is
 * `min(osSetting, ceiling)`, and it belongs on every component that renders
 * text directly — `Text` and the one `TextInput`.
 */
export const MAX_FONT_SCALE = 1.4;

/**
 * System fonts — shipping a custom face means asset linking on both platforms,
 * which belongs in its own change rather than in the foundation.
 */
const fontFamily = Platform.select({
  ios: 'System',
  default: 'sans-serif',
});

const monoFamily = Platform.select({ ios: 'Menlo', default: 'monospace' });

export const fontWeights = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} satisfies Record<string, TextStyle['fontWeight']>;

export type FontWeightToken = keyof typeof fontWeights;

export type TextVariant =
  | 'display'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'title'
  | 'body'
  | 'bodyStrong'
  | 'caption'
  | 'label'
  | 'mono';

export type Typography = Record<TextVariant, TextStyle>;

/**
 * The type ramp, on the package's own maps.
 *
 * Size comes from `FONTSIZE` and leading from `VScale`, which is the pairing
 * the doctor app's sheets use — the two axes scale from different sides of the
 * window, so a headline's leading tracks the height it has to fill rather than
 * the width.
 *
 * Every index was chosen so the rendered value at the 390x844 design window
 * equals the dp the design was drawn at: `size_17` is the 15dp body, `size_14`
 * the 12dp label. The index is not the dp — `FONTSIZE.size_N` is
 * `shortSide * N/440` — so reading one of these as a point size is the one
 * mistake to avoid here.
 */
export const buildType = ({ FONTSIZE, VScale }: Responsive): Typography => ({
  // 34dp / 40dp
  display: {
    fontSize: FONTSIZE.size_38,
    lineHeight: VScale.Height_47,
    letterSpacing: -0.6,
    fontWeight: fontWeights.bold,
    fontFamily,
  },
  // 28dp / 34dp
  h1: {
    fontSize: FONTSIZE.size_32,
    lineHeight: VScale.Height_40,
    letterSpacing: -0.4,
    fontWeight: fontWeights.bold,
    fontFamily,
  },
  // 22dp / 28dp
  h2: {
    fontSize: FONTSIZE.size_25,
    lineHeight: VScale.Height_33,
    letterSpacing: -0.3,
    fontWeight: fontWeights.semibold,
    fontFamily,
  },
  // 18dp / 24dp
  h3: {
    fontSize: FONTSIZE.size_20,
    lineHeight: VScale.Height_28,
    letterSpacing: -0.2,
    fontWeight: fontWeights.semibold,
    fontFamily,
  },
  // 16dp / 22dp
  title: {
    fontSize: FONTSIZE.size_18,
    lineHeight: VScale.Height_26,
    letterSpacing: -0.1,
    fontWeight: fontWeights.semibold,
    fontFamily,
  },
  // 15dp / 22dp
  body: {
    fontSize: FONTSIZE.size_17,
    lineHeight: VScale.Height_26,
    letterSpacing: 0,
    fontWeight: fontWeights.regular,
    fontFamily,
  },
  bodyStrong: {
    fontSize: FONTSIZE.size_17,
    lineHeight: VScale.Height_26,
    letterSpacing: 0,
    fontWeight: fontWeights.medium,
    fontFamily,
  },
  // 13dp / 18dp
  caption: {
    fontSize: FONTSIZE.size_15,
    lineHeight: VScale.Height_21,
    letterSpacing: 0,
    fontWeight: fontWeights.regular,
    fontFamily,
  },
  // 12dp / 16dp
  label: {
    fontSize: FONTSIZE.size_14,
    lineHeight: VScale.Height_19,
    letterSpacing: 0.2,
    fontWeight: fontWeights.medium,
    fontFamily,
  },
  // Prompt text, read in long runs. 14dp / 21dp.
  mono: {
    fontSize: FONTSIZE.size_16,
    lineHeight: VScale.Height_25,
    letterSpacing: 0,
    fontWeight: fontWeights.regular,
    fontFamily: monoFamily,
  },
});
