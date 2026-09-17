import React, { memo } from 'react';
import { StyleSheet, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { interpolate, useAnimatedStyle } from 'react-native-reanimated';

import { useShimmerProgress } from '../../animation/ShimmerProvider';
import { type AppTheme } from '../../theme/theme';
import { type Responsive } from '../../theme/responsive';
import { createStyles } from '../../theme/createStyles';

const getStyles = (appTheme: AppTheme, responsive: Responsive) => {
  const { BORDER_RADIUS, VScale } = responsive;
  const p = appTheme.colors;

  return {
    ...StyleSheet.create({
      root: {
        backgroundColor: p.skeleton.base,
        borderRadius: BORDER_RADIUS.radius_15,
      },
    }),
    palette: p,
    metrics: { line: VScale.Height_17 },
    radii: { sm: BORDER_RADIUS.radius_15 },
  };
};

const useStyles = createStyles(getStyles);

export type SkeletonProps = {
  width?: DimensionValue;
  height?: DimensionValue;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * Skeletons rather than spinners for first load: they reserve the real layout,
 * so content does not jump when it arrives, and perceived wait is shorter.
 *
 * The animation is an opacity pulse driven by the app-wide shimmer clock
 * (see ShimmerProvider). A translating gradient sweep would look richer but
 * needs each skeleton's measured width — per-instance onLayout work on the JS
 * thread, for every cell in a loading grid. Not worth it.
 */
const SkeletonComponent = ({
  width = '100%',
  height,
  borderRadius,
  style,
  testID,
}: SkeletonProps): React.JSX.Element => {
  const styles = useStyles();
  const progress = useShimmerProgress();

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0.45, 1]),
  }));

  return (
    <Animated.View
      testID={testID}
      accessibilityRole="progressbar"
      accessibilityLabel="Loading"
      style={[
        styles.root,
        {
          width,
          // A bar with no height stands in for a line of body text, which is
          // what almost every skeleton is.
          height: height ?? styles.metrics.line,
          borderRadius: borderRadius ?? styles.radii.sm,
        },
        animatedStyle,
        style,
      ]}
    />
  );
};

export const Skeleton = memo(SkeletonComponent);
Skeleton.displayName = 'Skeleton';
