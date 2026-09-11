import React, { memo } from 'react';
import { ActivityIndicator, Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';

import { usePressScale } from '../../animation/usePressScale';
import { type Theme } from '../../theme/theme';
import { useTheme } from '../../theme/ThemeProvider';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { Text } from '../Text/Text';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const styleFactory = (theme: Theme) => ({
  base: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    gap: theme.spacing.sm,
  },
  sm: {
    minHeight: 36,
    paddingHorizontal: theme.spacing.md,
  },
  md: {
    minHeight: theme.layout.minTouchTarget,
    paddingHorizontal: theme.spacing.base,
  },
  lg: {
    minHeight: 52,
    paddingHorizontal: theme.spacing.xl,
  },
  primary: {
    backgroundColor: theme.colors.accent.default,
    borderColor: theme.colors.accent.default,
  },
  secondary: {
    backgroundColor: theme.colors.bg.subtle,
    borderColor: theme.colors.border.subtle,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
  danger: {
    backgroundColor: theme.colors.status.danger,
    borderColor: theme.colors.status.danger,
  },
  disabled: {
    opacity: 0.45,
  },
  fullWidth: {
    alignSelf: 'stretch' as const,
  },
});

const LABEL_COLOR = {
  primary: 'onAccent',
  secondary: 'primary',
  ghost: 'accent',
  danger: 'onAccent',
} as const;

export type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  /** Rendered before the label — an icon, a badge, anything. */
  leading?: React.ReactNode;
  accessibilityHint?: string;
  testID?: string;
  style?: StyleProp<ViewStyle>;
};

const ButtonComponent = ({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = false,
  leading,
  accessibilityHint,
  testID,
  style,
}: ButtonProps): React.JSX.Element => {
  const styles = useThemedStyles(styleFactory);
  const theme = useTheme();
  const { animatedStyle, onPressIn, onPressOut } = usePressScale(0.97);

  const isInteractive = !disabled && !loading;

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !isInteractive, busy: loading }}
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      testID={testID}
      disabled={!isInteractive}
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={[
        styles.base,
        styles[size],
        styles[variant],
        fullWidth && styles.fullWidth,
        !isInteractive && styles.disabled,
        animatedStyle,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' || variant === 'danger'
            ? theme.colors.text.onAccent
            : theme.colors.text.primary}
        />
      ) : (
        <>
          {leading != null && <View>{leading}</View>}
          <Text variant="title" color={LABEL_COLOR[variant]} numberOfLines={1}>
            {label}
          </Text>
        </>
      )}
    </AnimatedPressable>
  );
};

export const Button = memo(ButtonComponent);
Button.displayName = 'Button';
