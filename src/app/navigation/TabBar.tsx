import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Pressable, View, type LayoutChangeEvent } from 'react-native';
import { type BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import {
  Icon,
  Text,
  createStyles,
  layoutOf,
  type AppTheme,
  type IconName,
  type Responsive,
} from '@ds';
import { haptics } from '@infra/haptics/haptics';

import { type MainTabParamList } from './navigation.types';

const ICONS: Record<keyof MainTabParamList, IconName> = {
  Home: 'home',
  Explore: 'compass',
  Favorites: 'heart',
  Profile: 'user',
};

/**
 * Soft and slightly heavy, so the indicator arrives with weight rather than
 * snapping. Under-damped on purpose: the small overshoot is what makes the
 * movement read as one object sliding, which is the entire reason for moving a
 * single pill instead of cross-fading four backgrounds.
 */
const SLIDE_SPRING = { damping: 18, stiffness: 190, mass: 0.9 };
/** Tighter, so the icon finishes rising before the pill finishes arriving. */
const RISE_SPRING = { damping: 15, stiffness: 300, mass: 0.6 };

/** How far the active glyph lifts and grows. Small enough to feel, not to see. */
const ACTIVE_SCALE = 0.08;
const PRESS_SCALE = 0.12;

const getStyles = (appTheme: AppTheme, responsive: Responsive) => {
  const { BORDER_RADIUS, HScale, IconSize, VScale } = responsive;
  const layout = layoutOf(responsive);
  const p = appTheme.colors;

  return {
    ...StyleSheet.create({
      /*
       * Detached and floating, not welded to the bottom edge.
       *
       * The grid runs underneath it to the bottom of the screen, which is what
       * keeps the wall feeling endless instead of stopping at a hard edge a third
       * of the way up the home indicator.
       */
      bar: {
        position: 'absolute' as const,
        left: layout.tabBarInset,
        right: layout.tabBarInset,
        height: layout.tabBarHeight,
        borderRadius: BORDER_RADIUS.radius_72,
        backgroundColor: p.bg.surface,
        /*
         * A hairline as well as a shadow.
         *
         * Shadows are near-invisible on ink, so in dark mode the bar would float on
         * nothing and its rounded corners would dissolve into the canvas. The
         * border is what gives it an edge there; in light mode the shadow carries
         * the lift and the border is barely perceptible.
         */
        borderWidth: 1,
        borderColor: p.border.subtle,
        /*
         * Centred and capped, because a floating bar is not a full-width dock. Left
         * to stretch, four tabs on a 1024dp tablet sit a quarter of a screen apart
         * with a lake of empty surface between them.
         */
        alignSelf: 'center' as const,
        maxWidth: HScale.Width_485,
      },
      /*
       * The clipping lives HERE, not on the bar.
       *
       * iOS draws a shadow outside a view's bounds, and `overflow: 'hidden'` sets
       * `masksToBounds` on the same layer — so a view that carries both loses its
       * shadow entirely. The bar keeps the shadow and the radius; this row, which
       * has no shadow, is what rounds the indicator off at the corners.
       */
      row: {
        flex: 1,
        flexDirection: 'row' as const,
        alignItems: 'stretch' as const,
        borderRadius: BORDER_RADIUS.radius_72,
        overflow: 'hidden' as const,
      },
      /**
       * The active indicator, behind the GLYPH only.
       *
       * Behind icon-and-label it becomes a large block of tinted colour that
       * competes with the photographs the bar floats over; behind the glyph alone
       * it reads as a highlight, and the label below stays plain text on the
       * surface where `accent` is measured to be legible.
       */
      pill: {
        position: 'absolute' as const,
        left: 0,
        borderRadius: 999,
        backgroundColor: p.accent.subtle,
      },
      tab: {
        flex: 1,
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
        gap: VScale.Height_2,
      },
      // The glyph's own box is the pill's height, so the pill lands centred on the
      // icon without either one being nudged by a hand-tuned offset.
      glyph: {
        height: HScale.Width_37,
        paddingHorizontal: HScale.Width_14,
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
      },
    }),
    palette: p,
    iconSizes: { lg: IconSize.iconSize_24 },
    metrics: { base: HScale.Width_18, xxs: VScale.Height_2, w72: HScale.Width_83 },
    layout,
    shadows: appTheme.shadows,
  };
};

const useStyles = createStyles(getStyles);

/** Where the glyph band sits inside a tab. Measured, never assumed. */
type GlyphBand = { readonly y: number; readonly height: number };

type TabItemProps = {
  readonly routeKey: string;
  readonly name: keyof MainTabParamList;
  readonly label: string;
  readonly accessibilityLabel?: string;
  readonly focused: boolean;
  readonly onPress: (routeKey: string, name: keyof MainTabParamList, focused: boolean) => void;
  readonly onLongPress: (routeKey: string) => void;
  /** Set on the first tab only — one measurement describes all four. */
  readonly onGlyphLayout?: (band: GlyphBand) => void;
};

const TabItem = memo(
  ({
    routeKey,
    name,
    label,
    accessibilityLabel,
    focused,
    onPress,
    onLongPress,
    onGlyphLayout,
  }: TabItemProps): React.JSX.Element => {
    const styles = useStyles();

    // Captured as a plain number: a worklet cannot reach into the theme object,
    // and the value is fixed for the life of this render anyway.
    const rise = styles.metrics.xxs;

    const active = useSharedValue(focused ? 1 : 0);
    const pressed = useSharedValue(0);

    useEffect(() => {
      active.value = withSpring(focused ? 1 : 0, RISE_SPRING);
    }, [focused, active]);

    const glyphStyle = useAnimatedStyle(() => ({
      transform: [
        { translateY: -active.value * rise },
        { scale: (1 + active.value * ACTIVE_SCALE) * (1 - pressed.value * PRESS_SCALE) },
      ],
    }));

    const handlePressIn = useCallback(() => {
      pressed.value = withSpring(1, RISE_SPRING);
    }, [pressed]);

    const handlePressOut = useCallback(() => {
      pressed.value = withSpring(0, RISE_SPRING);
    }, [pressed]);

    const handlePress = useCallback(() => {
      onPress(routeKey, name, focused);
    }, [onPress, routeKey, name, focused]);

    const handleLongPress = useCallback(() => {
      onLongPress(routeKey);
    }, [onLongPress, routeKey]);

    const handleGlyphLayout = useCallback(
      (event: LayoutChangeEvent) => {
        const { y, height } = event.nativeEvent.layout;
        onGlyphLayout?.({ y, height });
      },
      [onGlyphLayout],
    );

    return (
      <Pressable
        accessibilityRole="tab"
        accessibilityState={{ selected: focused }}
        accessibilityLabel={accessibilityLabel ?? label}
        testID={`tab-${name}`}
        style={styles.tab}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onLongPress={handleLongPress}>
        <Animated.View
          style={[styles.glyph, glyphStyle]}
          onLayout={onGlyphLayout === undefined ? undefined : handleGlyphLayout}>
          <Icon
            // The filled heart is the only glyph with a solid twin, and it earns
            // the exception: a favourite is something you HAVE, so its tab reads
            // as filled once you are standing on it.
            name={name === 'Favorites' && focused ? 'heartFilled' : ICONS[name]}
            size={styles.iconSizes.lg}
            /*
             * The active glyph is drawn ON the pill, so it takes `onSubtle` —
             * the ink measured against `accent.subtle` — rather than `accent`,
             * which is measured against the bar's surface and is what the label
             * below correctly uses.
             */
            tint={focused ? styles.palette.accent.onSubtle : undefined}
            color={focused ? 'accent' : 'tertiary'}
            strokeWidth={focused ? 2.2 : 1.8}
          />
        </Animated.View>
        <Text variant="label" color={focused ? 'accent' : 'tertiary'} numberOfLines={1}>
          {label}
        </Text>
      </Pressable>
    );
  },
);

TabItem.displayName = 'TabItem';

/**
 * The app's bottom navigation.
 *
 * Written by hand rather than configured through `tabBarStyle`, because the
 * part that makes it feel current — ONE indicator that slides between tabs
 * rather than four that fade in and out — is not something the navigator's
 * style props can express. Everything else follows from owning the layout: the
 * safe-area inset, the press feedback, the haptic, and the accessibility roles
 * React Navigation would otherwise have supplied.
 *
 * Both animations run on the UI thread. A tab press lands while the list under
 * it is usually still settling, and a JS-driven indicator drops frames exactly
 * then — which is the moment the bar is most closely watched.
 */
const TabBarComponent = ({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps): React.JSX.Element => {
  const styles = useStyles();
  const insets = useSafeAreaInsets();

  /*
   * Both measured, neither derived.
   *
   * The width cannot come from the window because the bar is capped and centred
   * on a tablet, and the glyph band cannot come from arithmetic because the tab
   * centres a stack whose height depends on the type ramp AND on the OS text
   * size. One `onLayout` on the first tab describes all four.
   */
  const [rowWidth, setRowWidth] = useState(0);
  const [band, setBand] = useState<GlyphBand>({ y: 0, height: 0 });

  const tabCount = state.routes.length;
  const tabWidth = rowWidth > 0 ? rowWidth / tabCount : 0;
  const pillWidth = Math.min(Math.max(tabWidth - styles.metrics.base, 0), styles.metrics.w72);

  const offset = useSharedValue(0);
  /*
   * The first placement must not animate.
   *
   * Without this the pill springs in from the left edge on the first frame the
   * bar is measured — a launch animation nobody asked for, which would play
   * again on every rotation and split-screen resize.
   */
  const placed = useRef(false);

  useEffect(() => {
    if (tabWidth <= 0) {
      return;
    }
    const target = tabWidth * state.index + (tabWidth - pillWidth) / 2;
    if (placed.current) {
      offset.value = withSpring(target, SLIDE_SPRING);
    } else {
      offset.value = target;
      placed.current = true;
    }
  }, [state.index, tabWidth, pillWidth, offset]);

  const pillStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.value }],
  }));

  const onRowLayout = useCallback((event: LayoutChangeEvent) => {
    setRowWidth(event.nativeEvent.layout.width);
  }, []);

  const onGlyphLayout = useCallback((next: GlyphBand) => {
    setBand(current =>
      current.y === next.y && current.height === next.height ? current : next,
    );
  }, []);

  const onPress = useCallback(
    (routeKey: string, name: keyof MainTabParamList, focused: boolean) => {
      /*
       * `canPreventDefault`, because a screen may want the press for itself:
       * tapping the tab you are already on is the conventional "scroll back to
       * the top", and that listener has to be able to stop the navigation.
       */
      const event = navigation.emit({
        type: 'tabPress',
        target: routeKey,
        canPreventDefault: true,
      });

      if (focused || event.defaultPrevented) {
        return;
      }
      // Fired here rather than on every press: a tap that changes nothing
      // should not buzz, or the bar feels noisy instead of responsive.
      haptics.trigger('selection');
      navigation.navigate(name);
    },
    [navigation],
  );

  const onLongPress = useCallback(
    (routeKey: string) => {
      navigation.emit({ type: 'tabLongPress', target: routeKey });
    },
    [navigation],
  );

  return (
    <View
      testID="tab-bar"
      style={[
        styles.bar,
        // The gesture bar's inset where there is one, the bar's own inset where
        // there is not, so it floats the same distance off the glass either way.
        { bottom: Math.max(insets.bottom, styles.layout.tabBarInset) },
        styles.shadows.lg,
      ]}>
      <View accessibilityRole="tablist" testID="tab-row" style={styles.row} onLayout={onRowLayout}>
        {pillWidth > 0 && band.height > 0 && (
          <Animated.View
            testID="tab-indicator"
            pointerEvents="none"
            style={[
              styles.pill,
              { width: pillWidth, top: band.y, height: band.height },
              pillStyle,
            ]}
          />
        )}

        {state.routes.map((route, index) => (
          <TabItem
            key={route.key}
            routeKey={route.key}
            name={route.name as keyof MainTabParamList}
            label={descriptors[route.key]?.options.title ?? route.name}
            accessibilityLabel={descriptors[route.key]?.options.tabBarAccessibilityLabel}
            focused={state.index === index}
            onPress={onPress}
            onLongPress={onLongPress}
            onGlyphLayout={index === 0 ? onGlyphLayout : undefined}
          />
        ))}
      </View>
    </View>
  );
};

export const TabBar = memo(TabBarComponent);
TabBar.displayName = 'TabBar';
