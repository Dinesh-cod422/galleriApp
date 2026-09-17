import React, { memo } from 'react';
import { type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { interpolate, useAnimatedStyle } from 'react-native-reanimated';

import { useShimmerProgress } from '../../animation/ShimmerProvider';
import { type Theme } from '../../theme/theme';
import { useTheme } from '../../theme/ThemeProvider';
import { useThemedStyles } from '../../theme/useThemedStyles';

const styleFactory = (theme: Theme) => ({
  root: {
    backgroundColor: theme.colors.skeleton.base,
    borderRadius: theme.radius.sm,
  },
});

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
  height = 16,
  borderRadius,
  style,
  testID,
}: SkeletonProps): React.JSX.Element => {
  const styles = useThemedStyles(styleFactory);
  const theme = useTheme();
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
        { width, height, borderRadius: borderRadius ?? theme.radius.sm },
        animatedStyle,
        style,
      ]}
    />
  );
};

export const Skeleton = memo(SkeletonComponent);
Skeleton.displayName = 'Skeleton';
