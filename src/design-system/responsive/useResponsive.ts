import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';

import {
  type Breakpoint,
  gridColumnsForBreakpoint,
  maxContentWidthForBreakpoint,
  resolveBreakpoint,
} from './breakpoints';

export type ResponsiveInfo = {
  readonly width: number;
  readonly height: number;
  readonly breakpoint: Breakpoint;
  readonly isTablet: boolean;
  readonly isLandscape: boolean;
  readonly gridColumns: number;
  readonly maxContentWidth: number;
};

/**
 * Uses `useWindowDimensions` rather than `Dimensions.get`, which is captured
 * once at module load and is wrong after a rotation or a split-screen resize.
 *
 * The breakpoint keys off the SHORTEST edge, so a phone in landscape stays a
 * phone instead of briefly claiming to be a tablet.
 */
export const useResponsive = (): ResponsiveInfo => {
  const { width, height } = useWindowDimensions();

  return useMemo(() => {
    const shortestEdge = Math.min(width, height);
    const breakpoint = resolveBreakpoint(shortestEdge);
    return {
      width,
      height,
      breakpoint,
      isTablet: breakpoint === 'xl',
      isLandscape: width > height,
      gridColumns: gridColumnsForBreakpoint[breakpoint],
      maxContentWidth: maxContentWidthForBreakpoint[breakpoint],
    };
  }, [width, height]);
};
