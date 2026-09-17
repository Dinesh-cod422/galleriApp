import React, { memo } from 'react';
import { StyleSheet, ActivityIndicator, Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';

import { usePressScale } from '../../animation/usePressScale';
import { type AppTheme } from '../../theme/theme';
import { type Responsive } from '../../theme/responsive';
import { createStyles } from '../../theme/createStyles';
import { Text } from '../Text/Text';
import { layoutOf } from '../../theme/layout';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const getStyles = (appTheme: AppTheme, responsive: Responsive) => {
  const { BORDER_RADIUS, HScale } = responsive;
  const layout = layoutOf(responsive);
  const p = appTheme.colors;

  return {
    ...StyleSheet.create({
      base: {
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
        borderRadius: BORDER_RADIUS.radius_26,
        borderWidth: 1,
        gap: HScale.Width_9,
      },
      sm: {
        minHeight: HScale.Width_42,
        paddingHorizontal: HScale.Width_14,
      },
      md: {
        minHeight: layout.minTouchTarget,
        paddingHorizontal: HScale.Width_18,
      },
      lg: {
        minHeight: HScale.Width_60,
        paddingHorizontal: HScale.Width_28,
      },
      primary: {
        backgroundColor: p.accent.default,
        borderColor: p.accent.default,
      },
      secondary: {
        backgroundColor: p.bg.subtle,
        borderColor: p.border.subtle,
      },
      ghost: {
        backgroundColor: 'transparent',
        borderColor: 'transparent',
      },
      danger: {
        // `dangerFill`, not `danger`: this paints white on it. See colors.ts.
        backgroundColor: p.status.dangerFill,
        borderColor: p.status.dangerFill,
      },
      disabled: {
        opacity: 0.45,
      },
      fullWidth: {
        alignSelf: 'stretch' as const,
      },
    }),
    palette: p,
  };
};

const useStyles = createStyles(getStyles);

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
  const styles = useStyles();
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
            ? styles.palette.text.onAccent
            : styles.palette.text.primary}
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
