import React, { memo, useCallback, useEffect, useState } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import FastImage, { type ResizeMode } from '@d11/react-native-fast-image';

import { type AppTheme } from '../../theme/theme';
import { type Responsive } from '../../theme/responsive';
import { createStyles } from '../../theme/createStyles';
import { Skeleton } from '../Skeleton/Skeleton';

/**
 * The app's single image primitive.
 *
 * Wrapping the image library matters more than usual here: this is an
 * image-heavy gallery, and the choice of library (FastImage today, possibly
 * expo-image later) is exactly the kind of decision that should not be
 * duplicated across 40 call sites. Screens say "show this image at this
 * priority"; only this file knows who draws it.
 *
 * Performance notes:
 *  - FastImage keeps a native memory + disk cache, so a thumbnail already seen
 *    in a list is not re-downloaded or re-decoded on the detail screen.
 *  - `priority` lets above-the-fold imagery jump the queue while off-screen
 *    cells wait, which keeps the first paint fast on a slow connection.
 *  - The placeholder background prevents a white flash in dark mode and, with
 *    a fixed aspect ratio, removes layout shift as images resolve.
 */
export type ImagePriority = 'low' | 'normal' | 'high';

export type AppImageProps = {
  uri: string;
  /** Width / height. Fixing this is what prevents layout shift in lists. */
  aspectRatio?: number;
  priority?: ImagePriority;
  /**
   * Crossfade when the source changes. The detail screen paints a cached
   * thumbnail on the first frame and swaps the full-resolution file in moments
   * later; a hard cut between the two reads as a glitch.
   */
  transition?: 'fade' | 'none';
  resizeMode?: ResizeMode;
  borderRadius?: number;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  /**
   * Shimmer behind the image until it resolves. On by default — a flat grey
   * block and a slow connection are indistinguishable from a broken image.
   */
  showSkeleton?: boolean;
  /**
   * A low-resolution stand-in — usually the thumbnail a list already cached —
   * held UNDERNEATH `uri` until the real file has painted.
   *
   * This is what stops a detail screen looking like it loads its picture
   * twice. Pointing one image at the thumbnail and then at the full file makes
   * the element reload in place, which the eye reads as a second load. As a
   * separate layer the thumbnail is fetched once, never changes source, and
   * simply stays visible until the full-resolution file covers it.
   */
  placeholderUri?: string;
};

const getStyles = (appTheme: AppTheme, responsive: Responsive) => {
  const { BORDER_RADIUS } = responsive;
  const p = appTheme.colors;

  return {
    ...StyleSheet.create({
      container: {
        overflow: 'hidden' as const,
        backgroundColor: p.bg.imagePlaceholder,
      },
      image: {
        width: '100%' as const,
        height: '100%' as const,
      },
      /**
       * BEHIND the image, never over it. A swap from a cached thumbnail to the
       * full-resolution file must not drop a shimmer on top of a picture the user
       * is already looking at — the old frame stays until the new one decodes.
       */
      skeleton: {
        position: 'absolute' as const,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
      },
    }),
    palette: p,
    radii: { md: BORDER_RADIUS.radius_26 },
  };
};

const useStyles = createStyles(getStyles);

const AppImageComponent = ({
  uri,
  aspectRatio,
  priority = 'normal',
  transition = 'none',
  resizeMode = 'cover',
  borderRadius,
  accessibilityLabel,
  style,
  testID,
  showSkeleton = true,
  placeholderUri,
}: AppImageProps): React.JSX.Element => {
  const styles = useStyles();
  const [settled, setSettled] = useState(false);

  // A NEW source is unresolved again — but only a different uri counts. Any
  // other re-render (a theme flip, a parent's state change) must not reset a
  // picture that is already on screen.
  useEffect(() => {
    setSettled(false);
  }, [uri]);

  // onLoadEnd, not onLoad: a 404 fires only the former, and a skeleton that
  // shimmers for ever over a dead URL is worse than an empty frame.
  const onLoadEnd = useCallback(() => {
    setSettled(true);
  }, []);

  // Identical uris would stack the same picture on itself for no benefit.
  const showPlaceholderLayer =
    placeholderUri !== undefined && placeholderUri !== uri && !settled;

  /**
   * Fade ONLY over another image.
   *
   * A fade is a ramp from transparent to opaque, so with nothing behind it the
   * image blends with the grey placeholder ground on its way in — a pale,
   * washed-out frame before the real colours arrive. That is a glitch, not a
   * transition. With the thumbnail layer beneath there IS something to cross
   * into, and the same fade reads as the picture sharpening.
   */
  const effectiveTransition = showPlaceholderLayer ? transition : 'none';

  return (
    <View
      testID={testID}
      style={[
        styles.container,
        { borderRadius: borderRadius ?? styles.radii.md },
        aspectRatio != null && { aspectRatio },
        style,
      ]}>
      {showSkeleton && !settled && (
        <Skeleton
          testID={testID === undefined ? undefined : `${testID}-skeleton`}
          style={styles.skeleton}
          height="100%"
          borderRadius={borderRadius ?? styles.radii.md}
        />
      )}
      {/* Dropped once the real file has painted — holding a second decoded
          bitmap per image for the life of the screen is not worth it. */}
      {showPlaceholderLayer && (
        <FastImage
          testID={testID === undefined ? undefined : `${testID}-placeholder`}
          style={styles.skeleton}
          resizeMode={resizeMode}
          source={{ uri: placeholderUri, priority: 'high', cache: 'immutable' }}
        />
      )}
      <FastImage
        accessible={accessibilityLabel != null}
        accessibilityLabel={accessibilityLabel}
        style={styles.image}
        resizeMode={resizeMode}
        transition={effectiveTransition}
        onLoadEnd={onLoadEnd}
        source={{ uri, priority, cache: 'immutable' }}
      />
    </View>
  );
};

export const AppImage = memo(AppImageComponent);
AppImage.displayName = 'AppImage';
