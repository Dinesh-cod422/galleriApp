import { useCallback } from 'react';
import {
  type AnimatedStyle,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { type ViewStyle } from 'react-native';

const PRESS_IN = { damping: 18, stiffness: 320, mass: 0.6 };

/**
 * Press feedback that never touches the JS thread.
 *
 * The shared value is written from the Pressable callback and read inside a
 * worklet, so the spring runs entirely on the UI thread — no setState, no
 * re-render, and no dropped frames when a list is mid-scroll.
 */
export const usePressScale = (
  scaleTo = 0.96,
  dimTo = 0.9,
): {
  animatedStyle: AnimatedStyle<ViewStyle>;
  onPressIn: () => void;
  onPressOut: () => void;
} => {
  const pressed = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - pressed.value * (1 - scaleTo) }],
    opacity: 1 - pressed.value * (1 - dimTo),
  }));

  const onPressIn = useCallback(() => {
    pressed.value = withTiming(1, { duration: 90 });
  }, [pressed]);

  const onPressOut = useCallback(() => {
    pressed.value = withSpring(0, PRESS_IN);
  }, [pressed]);

  return { animatedStyle, onPressIn, onPressOut };
};
