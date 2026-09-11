/**
 * Breakpoints exist so screens never do `width * 0.42` arithmetic. A screen
 * asks for `layout.gridColumns`; it does not measure the device itself.
 */
export type Breakpoint = 'sm' | 'md' | 'lg' | 'xl';

/** Lower bound (dp) of each breakpoint, by shortest screen edge. */
export const breakpointMinWidth = {
  sm: 0, // small phones (iPhone SE, ~320–359dp)
  md: 360, // mainstream phones
  lg: 600, // large phones landscape, small foldables
  xl: 840, // tablets
} as const satisfies Record<Breakpoint, number>;

export const resolveBreakpoint = (shortestEdge: number): Breakpoint => {
  if (shortestEdge >= breakpointMinWidth.xl) {
    return 'xl';
  }
  if (shortestEdge >= breakpointMinWidth.lg) {
    return 'lg';
  }
  if (shortestEdge >= breakpointMinWidth.md) {
    return 'md';
  }
  return 'sm';
};

/** Spacing/typography multiplier. Small phones tighten, tablets breathe. */
export const scaleForBreakpoint: Record<Breakpoint, number> = {
  sm: 0.92,
  md: 1,
  lg: 1.05,
  xl: 1.12,
};

/** Gallery columns per breakpoint — the one place this decision is made. */
export const gridColumnsForBreakpoint: Record<Breakpoint, number> = {
  sm: 2,
  md: 2,
  lg: 3,
  xl: 4,
};

/** Content is centered and capped on tablets so lines never run too long. */
export const maxContentWidthForBreakpoint: Record<Breakpoint, number> = {
  sm: Infinity,
  md: Infinity,
  lg: 720,
  xl: 1100,
};
