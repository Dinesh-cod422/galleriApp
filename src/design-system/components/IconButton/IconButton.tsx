import React, { memo } from 'react';
import { Pressable, type StyleProp, type ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';

import { usePressScale } from '../../animation/usePressScale';
import { type Theme } from '../../theme/theme';
import { useThemedStyles } from '../../theme/useThemedStyles';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type IconButtonVariant = 'plain' | 'surface' | 'overlay';

const styleFactory = (theme: Theme) => ({
  base: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    minWidth: theme.layout.minTouchTarget,
    minHeight: theme.layout.minTouchTarget,
    borderRadius: theme.radius.pill,
  },
  plain: { backgroundColor: 'transparent' },
  surface: { backgroundColor: theme.colors.bg.subtle },
  /** For icons sitting on top of imagery — needs its own contrast. */
  overlay: { backgroundColor: theme.colors.bg.scrim },
  disabled: { opacity: 0.4 },
});

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
  const styles = useThemedStyles(styleFactory);
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
      hitSlop={8}
      style={[styles.base, styles[variant], disabled && styles.disabled, animatedStyle, style]}>
      {children}
    </AnimatedPressable>
  );
};

export const IconButton = memo(IconButtonComponent);
IconButton.displayName = 'IconButton';
