/** 4-point scale. Every gap, pad and inset in the app comes from here. */
export const baseSpacing = {
  none: 0,
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 48,
  huge: 64,
} as const;

export type SpacingToken = keyof typeof baseSpacing;
export type Spacing = Record<SpacingToken, number>;

/**
 * Tablets get roomier spacing from one multiplier rather than from bespoke
 * `isTablet ? 24 : 16` checks scattered across screens.
 */
export const createSpacing = (scale: number): Spacing => {
  const out = {} as Record<SpacingToken, number>;
  for (const key of Object.keys(baseSpacing) as SpacingToken[]) {
    out[key] = Math.round(baseSpacing[key] * scale);
  }
  return out;
};
