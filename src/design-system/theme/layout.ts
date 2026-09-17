
import { type Responsive } from './responsive';
import { resolveBreakpoint } from '../responsive/breakpoints';

/**
 * The handful of measurements that are DERIVED rather than looked up, gathered
 * so the derivation happens once instead of in each of the screens that needs
 * it.
 *
 * Called inside a style factory, the way the doctor app's sheets call
 * `dashboardPalette(appTheme)` — it takes `responsive` and returns plain
 * numbers, so it costs nothing and cannot drift from the maps it reads.
 */
export const layoutOf = (responsive: Responsive) => {
  const { HScale, width, height } = responsive;
  const breakpoint = resolveBreakpoint(Math.min(width, height));

  // 64dp and 16dp at the design window.
  const tabBarHeight = HScale.Width_74;
  const tabBarInset = HScale.Width_18;

  return {
    /** Horizontal screen padding — 16dp. Set once, never re-derived per screen. */
    gutter: HScale.Width_18,
    /** 12dp. */
    gridGap: HScale.Width_14,
    gridColumns: GRID_COLUMNS[breakpoint],
    maxContentWidth: MAX_CONTENT_WIDTH[breakpoint],
    /**
     * NOT scaled. Apple HIG and Material both land near 44dp, and a fingertip
     * is the same size on a tablet as on a phone.
     */
    minTouchTarget: 44,
    /** Extra tap area around a small control, on every side — 8dp. */
    hitSlop: HScale.Width_9,
    tabBarHeight,
    tabBarInset,
    /**
     * Bottom padding a scrolling screen needs so its last row clears the
     * floating tab bar.
     *
     * Derived, not typed in. It was a literal `120` in three separate screens
     * while the bar's height lived in the navigator — so scaling the bar would
     * have clipped content on every one of them, and nothing connected the
     * numbers to say why.
     */
    tabBarClearance: tabBarHeight + tabBarInset * 2 + HScale.Width_28,
  };
};

export type Layout = ReturnType<typeof layoutOf>;

/** A grid cannot have 2.4 columns, so this one decision stays stepped. */
const GRID_COLUMNS = { sm: 2, md: 2, lg: 3, xl: 4 } as const;

/**
 * Content is centred and capped on tablets so lines never run too long.
 * Deliberately unscaled: this is a cap ON the window, and a cap that grows with
 * what it caps is not a cap.
 */
const MAX_CONTENT_WIDTH = { sm: Infinity, md: Infinity, lg: 720, xl: 1100 } as const;
