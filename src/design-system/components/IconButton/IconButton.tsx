import React, { memo } from 'react';
import { StyleSheet, Pressable, type StyleProp, type ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';

import { usePressScale } from '../../animation/usePressScale';
import { type AppTheme } from '../../theme/theme';
import { type Responsive } from '../../theme/responsive';
import { createStyles } from '../../theme/createStyles';
import { layoutOf } from '../../theme/layout';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type IconButtonVariant = 'plain' | 'surface' | 'overlay';

const getStyles = (appTheme: AppTheme, responsive: Responsive) => {
  const layout = layoutOf(responsive);
  const p = appTheme.colors;

  return {
    ...StyleSheet.create({
      base: {
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
        minWidth: layout.minTouchTarget,
        minHeight: layout.minTouchTarget,
        borderRadius: 999,
      },
      plain: { backgroundColor: 'transparent' },
      surface: { backgroundColor: p.bg.subtle },
      /** For icons sitting on top of imagery — needs its own contrast. */
      overlay: { backgroundColor: p.bg.scrim },
      disabled: { opacity: 0.4 },
    }),
    palette: p,
    layout,
  };
};

const useStyles = createStyles(getStyles);

export type IconButtonProps = {
  /** The icon element. IconButton never picks the icon itself. */
  children: React.ReactNode;
  onPress: () => void;
  /** Required: an icon with no label is invisible to a screen reader. */
  accessibilityLabel: string;
  variant?: IconButtonVariant;
  disabled?: boolean;
  testID?: string;
  style?: StyleProp<ViewStyle>;
};

const IconButtonComponent = ({
  children,
  onPress,
  accessibilityLabel,
  variant = 'plain',
  disabled = false,
  testID,
  style,
}: IconButtonProps): React.JSX.Element => {
  const styles = useStyles();
  const { animatedStyle, onPressIn, onPressOut } = usePressScale(0.88, 1);

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      testID={testID}
      disabled={disabled}
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      // Expands the touch target without inflating the visual size.
      hitSlop={styles.layout.hitSlop}
      style={[styles.base, styles[variant], disabled && styles.disabled, animatedStyle, style]}>
      {children}
    </AnimatedPressable>
  );
};

export const IconButton = memo(IconButtonComponent);
IconButton.displayName = 'IconButton';
