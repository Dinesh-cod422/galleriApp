import React, { memo, useCallback, useEffect, useState } from 'react';
import { StyleSheet, StatusBar, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { APP_NAME, APP_TAGLINE } from '@core/config/brand';
import { BrandMark, Text, type AppTheme, createStyles, type Responsive } from '@ds';

/**
 * How long the mark is held before the curtain lifts.
 *
 * Long enough that the tagline is actually READ, not just technically drawn.
 * An earlier 420 had it finish fading in at 440ms while the curtain began
 * leaving at 420 — on screen at full opacity for no frames at all.
 *
 * Total splash is HOLD + FADE. Past about two seconds a launch stops feeling
 * considered and starts feeling slow, so this is the ceiling rather than a
 * starting point.
 */
const HOLD_MS = 1100;
const FADE_MS = 460;
/**
 * The box, not the visible mark: the glyph fills ~41% of its width, so the
 * drawn mark is about 98pt wide.
 *
 * The ONE length in the app that is deliberately not scaled. It must match
 * MARK_POINTS in tools/seed/build-brand-assets.mjs, because the native launch
 * screen draws a static PNG at that size before any JavaScript exists — and it
 * cannot ask the package for anything. Scale this and the two splashes hand
 * over at different sizes, which is the visible jump this whole file exists to
 * avoid.
 */
const MARK_SIZE = 240;

/**
 * Softer and heavier than a default spring: lower stiffness makes the mark
 * travel for longer, and the extra mass gives it enough overshoot to read as
 * settling rather than snapping.
 */
const ENTER_SPRING = { damping: 15, stiffness: 95, mass: 1.25 };

const getStyles = (appTheme: AppTheme, responsive: Responsive) => {
  const { VScale } = responsive;
  const p = appTheme.colors;

  return {
    ...StyleSheet.create({
      fill: {
        position: 'absolute' as const,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
      },
      centre: { alignItems: 'center' as const, justifyContent: 'center' as const },
      /**
       * Absolutely placed, NOT stacked under the mark in a column.
       *
       * A column would centre mark-plus-tagline as a group, pushing the mark about
       * 19pt above the screen centre — while the native launch screen, which has no
       * tagline, centres the mark exactly. That difference is a visible jump at the
       * very moment the two splashes hand over, which is the seam this whole
       * arrangement exists to avoid.
       */
      tagline: {
        position: 'absolute' as const,
        left: 0,
        right: 0,
        top: '50%' as const,
        // Half the mark clears it; the gap under it is a spacing step like any
        // other, so the tagline sits closer on a small phone and further on a
        // tablet rather than at a fixed 8pt everywhere.
        marginTop: MARK_SIZE / 2 + VScale.Height_9,
        // alignItems, not textAlign: this is a View, and textAlign on a View does
        // nothing in React Native — the text silently renders against the left edge.
        alignItems: 'center' as const,
      },
      // Sits under the mark so the glow reads as light coming off it rather than a
      // disc drawn on top. Tied to the mark, so it does not scale either.
      glow: {
        position: 'absolute' as const,
        width: MARK_SIZE * 2,
        height: MARK_SIZE * 2,
        borderRadius: MARK_SIZE,
      },
    }),
    palette: p,
  };
};

const useStyles = createStyles(getStyles);

export type AnimatedSplashProps = {
  /** The app underneath. Mounted immediately — the splash is a curtain over it. */
  children: React.ReactNode;
  /** Skips the animation entirely, for tests and for reduced-motion. */
  disabled?: boolean;
};

/**
 * The splash the user actually sees.
 *
 * The native launch screen cannot animate — it is a static image the OS shows
 * before any JavaScript exists. So there are two splashes, and the only rule
 * that matters is that this one's FIRST FRAME is identical to the native one:
 * same gradient, same mark, same size and position. Get that wrong and the
 * handover is a visible jump, which is exactly the flash this replaces.
 *
 * The children mount underneath straight away rather than after the animation.
 * Holding them back would make the splash a loading gate — the app would be
 * doing nothing for the half second it plays, instead of hydrating behind it.
 */
const AnimatedSplashComponent = ({
  children,
  disabled = false,
}: AnimatedSplashProps): React.JSX.Element => {
  const styles = useStyles();
  const [finished, setFinished] = useState(disabled);

  const curtain = useSharedValue(disabled ? 0 : 1);
  const mark = useSharedValue(disabled ? 1 : 0.72);
  const glow = useSharedValue(0);
  // Starts invisible: the native splash has no tagline, so fading it in is what
  // makes it read as the app arriving rather than the text popping into place.
  const tagline = useSharedValue(0);

  const done = useCallback(() => {
    setFinished(true);
  }, []);

  useEffect(() => {
    if (disabled) {
      return;
    }
    // Spring, not timing: the mark should arrive with a little weight rather
    // than easing to a stop, which is what makes it read as a mark landing
    // instead of a modal appearing.
    mark.value = withSpring(1, ENTER_SPRING);
    // One pulse, not a loop. A looping glow on a screen that lasts 700ms never
    // completes a cycle and just looks like a flicker.
    glow.value = withSequence(
      withTiming(1, { duration: 460, easing: Easing.out(Easing.quad) }),
      withTiming(0, { duration: 620, easing: Easing.in(Easing.quad) }),
    );
    // In by 620ms, so it sits fully visible for roughly half a second before
    // the curtain starts to lift.
    tagline.value = withDelay(260, withTiming(1, { duration: 360 }));
    curtain.value = withDelay(
      HOLD_MS,
      withTiming(0, { duration: FADE_MS, easing: Easing.out(Easing.cubic) }, complete => {
        if (complete === true) {
          runOnJS(done)();
        }
      }),
    );
  }, [curtain, disabled, done, glow, mark, tagline]);

  const curtainStyle = useAnimatedStyle(() => ({ opacity: curtain.value }));
  const markStyle = useAnimatedStyle(() => ({ transform: [{ scale: mark.value }] }));
  const taglineStyle = useAnimatedStyle(() => ({ opacity: tagline.value }));
  const glowStyle = useAnimatedStyle(() => ({
    opacity: glow.value * 0.28,
    transform: [{ scale: 0.7 + glow.value * 0.5 }],
  }));

  return (
    <View style={styles.fill}>
      {children}

      {/* Unmounted once faded: an always-present full-screen overlay, even at
          zero opacity, is one more layer for every frame to composite. */}
      {!finished && (
        <Animated.View
          style={[styles.fill, curtainStyle]}
          pointerEvents="none"
          testID="animated-splash">
          {/*
            The curtain is a saturated violet-to-magenta gradient in BOTH
            themes — it is the brand mark's own background, not a themed
            surface. In light mode the app's bar style is `dark-content`, which
            put dark glyphs on that gradient: the clock and the battery were
            unreadable for the whole ~1.5s of the launch.

            A nested StatusBar overrides the one in AppProviders for as long as
            it is mounted and hands control straight back when the curtain
            unmounts, which is exactly the stacking React Native designs for.
          */}
          <StatusBar barStyle="light-content" animated />
          <LinearGradient
            colors={[...styles.palette.brand.gradient]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.fill}>
            {/* Centres the MARK ALONE, exactly as the launch screen does. */}
            <View style={[styles.fill, styles.centre]}>
              <Animated.View
                style={[
                  styles.glow,
                  { backgroundColor: styles.palette.text.onAccent },
                  glowStyle,
                ]}
              />
              <Animated.View style={markStyle}>
                {/* No tile behind it: the gradient IS the background here, so a
                    rounded square would draw a seam around the same colours. */}
                <BrandMark size={MARK_SIZE} background={false} testID="splash-mark" />
              </Animated.View>
            </View>

            <Animated.View style={[styles.tagline, taglineStyle]} pointerEvents="none">
              <Text variant="h2" style={{ color: styles.palette.text.onAccent }}>
                {APP_NAME}
              </Text>
              <Text variant="caption" style={{ color: styles.palette.text.onAccent }}>
                {APP_TAGLINE}
              </Text>
            </Animated.View>
          </LinearGradient>
        </Animated.View>
      )}
    </View>
  );
};

export const AnimatedSplash = memo(AnimatedSplashComponent);
AnimatedSplash.displayName = 'AnimatedSplash';
