import React, { memo, useCallback, useState } from 'react';
import {
  ScrollView,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import { AppImage, Text, type Theme, useThemedStyles } from '@ds';

import { type PromptImage } from '../../domain/entities/Prompt';

export type PromptImagePagerProps = {
  readonly images: readonly PromptImage[];
  readonly title: string;
};

const styleFactory = (theme: Theme) => ({
  dots: {
    position: 'absolute' as const,
    bottom: theme.spacing.sm,
    alignSelf: 'center' as const,
    flexDirection: 'row' as const,
    gap: theme.spacing.xs,
    // The scrim is dark and onAccent is white in BOTH themes, so this pill
    // stays legible over any image without a theme-specific branch.
    backgroundColor: theme.colors.bg.scrim,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radius.pill,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.text.onAccent,
    opacity: 0.45,
  },
  dotActive: { opacity: 1 },
  counter: {
    position: 'absolute' as const,
    top: theme.spacing.base,
    right: theme.spacing.base,
    backgroundColor: theme.colors.bg.scrim,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xxs,
    borderRadius: theme.radius.pill,
  },
  counterText: { color: theme.colors.text.onAccent },
});

/**
 * The hero image, or a swipeable strip when a prompt has more than one —
 * a before/after pair, or two poses of the same "unisex" prompt.
 *
 * Height is fixed to the PRIMARY image's ratio for every page. Letting each
 * page size itself would resize the hero mid-swipe and shunt the whole article
 * up and down under the user's thumb.
 */
export const PromptImagePager = memo<PromptImagePagerProps>(({ images, title }) => {
  const styles = useThemedStyles(styleFactory);
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);

  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const next = Math.round(event.nativeEvent.contentOffset.x / width);
      setIndex(current => (current === next ? current : next));
    },
    [width],
  );

  const primary = images[0];
  if (primary === undefined) {
    return null;
  }

  const hasMany = images.length > 1;

  return (
    <View>
      {/*
        One ScrollView whether there is one image or five.
        Swapping between a bare <AppImage> and a pager when the real document
        replaces the cached placeholder would unmount the image mid-view: the
        picture the user is already looking at vanishes and reloads.
      */}
      <ScrollView
        horizontal
        pagingEnabled
        scrollEnabled={hasMany}
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        // 16/s is enough to keep the dots in step without waking JS every frame.
        scrollEventThrottle={64}
        testID="detail-image-pager"
      >
        {images.map((image, position) => (
          // Keyed by POSITION, never by url. The placeholder paints the cached
          // thumbnail and the real document swaps in the full-resolution file
          // moments later; keying on the url makes that a remount — a blank
          // frame and a second load — instead of the crossfade it should be.
          <View key={position} style={{ width }}>
            <AppImage
              testID={`detail-image-${position}`}
              uri={image.url}
              // The grid already has this in cache, so it paints on the first
              // frame and holds until the full-resolution file covers it —
              // one visible load instead of two.
              placeholderUri={image.thumbnailUrl}
              aspectRatio={primary.aspectRatio}
              // Only the visible page is worth fetching eagerly.
              priority={position === 0 ? 'high' : 'normal'}
              borderRadius={0}
              transition="fade"
              accessibilityLabel={
                hasMany ? `${title} (${position + 1} of ${images.length})` : title
              }
            />
          </View>
        ))}
      </ScrollView>

      {hasMany && (
        <>
          <View style={styles.counter} pointerEvents="none">
            <Text variant="caption" style={styles.counterText}>
              {`${index + 1}/${images.length}`}
            </Text>
          </View>

          <View style={styles.dots} pointerEvents="none">
            {images.map((image, position) => (
              <View
                key={image.url}
                style={[styles.dot, position === index && styles.dotActive]}
              />
            ))}
          </View>
        </>
      )}
    </View>
  );
});

PromptImagePager.displayName = 'PromptImagePager';
