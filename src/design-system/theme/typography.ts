import { Platform, type TextStyle } from 'react-native';

/**
 * System fonts in Phase 1 — shipping a custom face means asset linking on both
 * platforms, which belongs in its own change, not in the foundation.
 */
const fontFamily = Platform.select({
  ios: { regular: 'System', medium: 'System', semibold: 'System', bold: 'System' },
  default: {
    regular: 'sans-serif',
    medium: 'sans-serif-medium',
    semibold: 'sans-serif-medium',
    bold: 'sans-serif',
  },
});

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

type VariantSpec = {
  readonly fontSize: number;
  readonly lineHeight: number;
  readonly letterSpacing: number;
  readonly fontWeight: FontWeightToken;
};

const baseVariants: Record<TextVariant, VariantSpec> = {
  display: { fontSize: 34, lineHeight: 40, letterSpacing: -0.6, fontWeight: 'bold' },
  h1: { fontSize: 28, lineHeight: 34, letterSpacing: -0.4, fontWeight: 'bold' },
  h2: { fontSize: 22, lineHeight: 28, letterSpacing: -0.3, fontWeight: 'semibold' },
  h3: { fontSize: 18, lineHeight: 24, letterSpacing: -0.2, fontWeight: 'semibold' },
  title: { fontSize: 16, lineHeight: 22, letterSpacing: -0.1, fontWeight: 'semibold' },
  body: { fontSize: 15, lineHeight: 22, letterSpacing: 0, fontWeight: 'regular' },
  bodyStrong: { fontSize: 15, lineHeight: 22, letterSpacing: 0, fontWeight: 'medium' },
  caption: { fontSize: 13, lineHeight: 18, letterSpacing: 0, fontWeight: 'regular' },
  label: { fontSize: 12, lineHeight: 16, letterSpacing: 0.2, fontWeight: 'medium' },
  mono: { fontSize: 14, lineHeight: 21, letterSpacing: 0, fontWeight: 'regular' },
};

export type TypographyStyle = Pick<
  TextStyle,
  'fontSize' | 'lineHeight' | 'letterSpacing' | 'fontWeight' | 'fontFamily'
>;
export type Typography = Record<TextVariant, TypographyStyle>;

export const createTypography = (scale: number): Typography => {
  const out = {} as Record<TextVariant, TypographyStyle>;
  for (const key of Object.keys(baseVariants) as TextVariant[]) {
    const spec = baseVariants[key];
    out[key] = {
      fontSize: Math.round(spec.fontSize * scale),
      lineHeight: Math.round(spec.lineHeight * scale),
      letterSpacing: spec.letterSpacing,
      fontWeight: fontWeights[spec.fontWeight],
      fontFamily:
        key === 'mono'
          ? Platform.select({ ios: 'Menlo', default: 'monospace' })
          : fontFamily?.regular,
    };
  }
  return out;
};
