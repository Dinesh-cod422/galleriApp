import { useMemo } from 'react';
import { useResponsive as usePackageResponsive } from '@dineshcodes/responsive-react-native-ui';

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
 * The window, as the package sees it.
 *
 * Its `useResponsive` subscribes to dimension changes itself, so the numbers
 * stay right after a rotation or a split-screen resize — unlike `Dimensions.get`,
 * which is captured once at module load. `isTablet` and `isLandscape` come from
 * the package too rather than being re-derived here.
 *
 * The one thing added is the breakpoint, which keys off the SHORTEST edge so a
 * phone in landscape stays a phone. That is a SEPARATE question from
 * `isTablet`: the package calls a device a tablet at 600dp (Android's `sw600dp`,
 * true of every iPad), while `xl` sits at 840dp because it answers "is there
 * room for a fourth grid column".
 */
export const useResponsive = (): ResponsiveInfo => {
  const { width, height, isTablet, isLandscape } = usePackageResponsive();

  return useMemo(() => {
    const breakpoint = resolveBreakpoint(Math.min(width, height));
    return {
      width,
      height,
      breakpoint,
      isTablet,
      isLandscape,
      gridColumns: gridColumnsForBreakpoint[breakpoint],
      maxContentWidth: maxContentWidthForBreakpoint[breakpoint],
    };
  }, [width, height, isTablet, isLandscape]);
};
