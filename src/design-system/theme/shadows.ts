import { Platform, type ViewStyle } from 'react-native';

/**
 * iOS shadow props and Android elevation are different systems; pairing them
 * per token means no component ever ships a shadow that works on one platform
 * only. In dark mode shadows are near-invisible, so elevation there is carried
 * by `bg.surfaceElevated` instead and the shadow is deliberately softened.
 */
export type ShadowToken = 'none' | 'sm' | 'md' | 'lg';
export type Shadows = Record<ShadowToken, ViewStyle>;

const ios = (opacity: number, radiusValue: number, offsetY: number, color: string): ViewStyle => ({
  shadowColor: color,
  shadowOpacity: opacity,
  shadowRadius: radiusValue,
  shadowOffset: { width: 0, height: offsetY },
});

export const createShadows = (mode: 'light' | 'dark'): Shadows => {
  const color = '#000000';
  const factor = mode === 'dark' ? 0.6 : 1;

  return {
    none: {},
    sm: Platform.select<ViewStyle>({
      ios: ios(0.06 * factor, 6, 2, color),
      default: { elevation: 2 },
    }),
    md: Platform.select<ViewStyle>({
      ios: ios(0.1 * factor, 14, 6, color),
      default: { elevation: 5 },
    }),
    lg: Platform.select<ViewStyle>({
      ios: ios(0.16 * factor, 26, 12, color),
      default: { elevation: 10 },
    }),
  };
};
