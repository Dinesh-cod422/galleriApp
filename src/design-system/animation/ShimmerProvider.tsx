import React, { createContext, useContext, useEffect } from 'react';
import {
  Easing,
  type SharedValue,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

const ShimmerContext = createContext<SharedValue<number> | null>(null);

/**
 * ONE shimmer clock for the whole app.
 *
 * A loading grid can mount a dozen skeletons at once. Giving each its own
 * `withRepeat` loop means a dozen independent UI-thread animations that drift
 * out of phase and look wrong. A single shared progress value costs one
 * animation regardless of how many skeletons are on screen.
 */
export const ShimmerProvider = ({ children }: { children: React.ReactNode }): React.JSX.Element => {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [progress]);

  return <ShimmerContext.Provider value={progress}>{children}</ShimmerContext.Provider>;
};

/**
 * Returns the shared clock, or a local one when rendered outside the provider
 * (isolated component tests). Both hooks always run — never conditionally.
 */
export const useShimmerProgress = (): SharedValue<number> => {
  const shared = useContext(ShimmerContext);
  const fallback = useSharedValue(0.5);
  return shared ?? fallback;
};
