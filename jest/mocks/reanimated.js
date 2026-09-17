/**
 * Hand-written Reanimated mock.
 *
 * Reanimated 4's own `react-native-reanimated/mock` re-enters the real module
 * (which needs a JSI runtime), and its web build expects react-native-web.
 * Neither is available under Jest.
 *
 * We use a small, stable slice of the API, so mocking that slice directly is
 * both simpler and more honest than bending the library's build resolution:
 * animations resolve instantly to their target value, which is exactly what a
 * unit test wants — assert the end state, not the interpolation.
 */
const React = require('react');
const { View, Text, ScrollView, Image } = require('react-native');

const createAnimatedComponent = (Component) => {
  const Wrapped = React.forwardRef((props, ref) => React.createElement(Component, { ...props, ref }));
  Wrapped.displayName = `Animated(${Component.displayName || Component.name || 'Component'})`;
  return Wrapped;
};

const noop = () => {};

const Animated = {
  View: createAnimatedComponent(View),
  Text: createAnimatedComponent(Text),
  ScrollView: createAnimatedComponent(ScrollView),
  Image: createAnimatedComponent(Image),
  FlatList: createAnimatedComponent(View),
  createAnimatedComponent,
  // @gorhom/bottom-sheet registers native props at import time.
  addWhitelistedUIProps: noop,
  addWhitelistedNativeProps: noop,
};

/** Animations settle immediately; callbacks fire as "finished". */
const settle = (toValue, _config, callback) => {
  if (typeof _config === 'function') {
    _config(true);
  } else if (typeof callback === 'function') {
    callback(true);
  }
  return toValue;
};

const interpolate = (value, inputRange = [0, 1], outputRange = [0, 1]) => {
  if (inputRange.length < 2 || outputRange.length < 2) {
    return value;
  }
  const inMin = inputRange[0];
  const inMax = inputRange[inputRange.length - 1];
  const outMin = outputRange[0];
  const outMax = outputRange[outputRange.length - 1];
  if (inMax === inMin) {
    return outMin;
  }
  const clamped = Math.max(inMin, Math.min(inMax, value));
  return outMin + ((clamped - inMin) / (inMax - inMin)) * (outMax - outMin);
};

const easingFn = (t) => t;
const Easing = {
  linear: easingFn,
  ease: easingFn,
  quad: easingFn,
  cubic: easingFn,
  bezier: () => easingFn,
  in: () => easingFn,
  out: () => easingFn,
  inOut: () => easingFn,
};

module.exports = {
  __esModule: true,
  default: Animated,
  ...Animated,

  /*
   * Stable across renders, as the real hook is.
   *
   * Returning a fresh `{ value }` each render made every shared value read back
   * as its initial value forever: a component that writes one in an effect and
   * reads it in `useAnimatedStyle` on a later render saw the write vanish, so
   * no animated placement could be asserted at all.
   */
  useSharedValue: (initial) => {
    const ref = React.useRef(null);
    if (ref.current === null) {
      ref.current = { value: initial };
    }
    return ref.current;
  },
  useAnimatedStyle: (factory) => factory(),
  useDerivedValue: (factory) => ({ value: factory() }),
  useAnimatedRef: () => ({ current: null }),
  useAnimatedScrollHandler: () => () => {},

  withTiming: settle,
  withSpring: settle,
  withDelay: (_delay, animation) => animation,
  withRepeat: (animation) => animation,
  withSequence: (...animations) => animations[animations.length - 1],
  cancelAnimation: () => {},

  interpolate,
  interpolateColor: (_value, _input, outputRange) => outputRange[0],
  Extrapolation: { CLAMP: 'clamp', EXTEND: 'extend', IDENTITY: 'identity' },
  Easing,

  runOnJS: (fn) => fn,
  runOnUI: (fn) => fn,

  addWhitelistedUIProps: noop,
  addWhitelistedNativeProps: noop,
  createAnimatedPropAdapter: (fn) => fn,
  useAnimatedProps: (factory) => factory(),
  useAnimatedGestureHandler: () => () => {},
  useAnimatedReaction: noop,
  useFrameCallback: () => ({ setActive: noop }),
  measure: () => null,
  scrollTo: noop,
  ReduceMotion: { System: 'system', Always: 'always', Never: 'never' },
  isReducedMotion: () => false,
  KeyboardState: { UNKNOWN: 0, OPENING: 1, OPEN: 2, CLOSING: 3, CLOSED: 4 },
  useAnimatedKeyboard: () => ({ height: { value: 0 }, state: { value: 4 } }),

  FadeIn: { duration: () => ({}) },
  FadeOut: { duration: () => ({}) },
  Layout: { springify: () => ({}) },
};
