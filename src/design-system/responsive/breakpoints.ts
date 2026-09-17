import {
  getBreakpoint,
  setBreakpoints,
  type Breakpoint,
} from '@dineshcodes/responsive-react-native-ui';

/**
 * Breakpoints exist so screens never do `width * 0.42` arithmetic. A screen
 * asks for `layout.gridColumns`; it does not measure the device itself.
 *
 * The resolving is the package's — `setBreakpoints` moves its thresholds and
 * `getBreakpoint` does the lookup. What lives here is only the app's answers:
 * where the thresholds sit, and how many columns each band gets.
 */
export type { Breakpoint };

/** Lower bound (dp) of each breakpoint, by shortest screen edge. */
export const breakpointMinWidth = {
  sm: 0, // small phones (iPhone SE, ~320–359dp)
  md: 360, // mainstream phones
  lg: 600, // large phones landscape, small foldables
  xl: 840, // tablets
} as const satisfies Record<Breakpoint, number>;

/*
 * The package ships 0/600/900/1200, which are WINDOW-width bands for a library
 * that cannot know the app. Ours are shortest-edge bands for a phone-first
 * gallery, so they are pushed down one step and applied globally at import.
 */
setBreakpoints(breakpointMinWidth);

/**
 * The band for a given shortest edge.
 *
 * Shortest edge, not current width, is what makes a phone in landscape stay a
 * phone. The package reads `dims.width`, so asking it about a square window of
 * the shortest edge is how that question is phrased — the thresholds and the
 * ordering both stay the package's.
 */
export const resolveBreakpoint = (shortestEdge: number): Breakpoint =>
  getBreakpoint({ width: shortestEdge, height: shortestEdge });

/*
 * There is deliberately no scale table here any more.
 *
 * Sizing is continuous and comes from the package's own scale helpers via
 * `theme/sizing`, which scale the real window against the design one. A
 * four-step table made every mainstream phone identical — a 360dp Android and a
 * 430dp iPhone Pro Max both landed in `md` and both got exactly 1.0.
 *
 * What remains below is genuinely stepped: a grid cannot have 2.4 columns.
 */

/** Gallery columns per breakpoint — the one place this decision is made. */
export const gridColumnsForBreakpoint: Record<Breakpoint, number> = {
  sm: 2,
  md: 2,
  lg: 3,
  xl: 4,
};

/**
 * Content is centered and capped on tablets so lines never run too long.
 *
 * Deliberately NOT scaled. Every other length here tracks the window; this one
 * is a cap ON the window, and a cap that grows with what it caps is not a cap.
 * It is a reading measure, like `layout.minTouchTarget` is a fingertip.
 */
export const maxContentWidthForBreakpoint: Record<Breakpoint, number> = {
  sm: Infinity,
  md: Infinity,
  lg: 720,
  xl: 1100,
};
