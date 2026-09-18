import React, { memo } from 'react';
import { StyleSheet, Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';

import { AppImage, Badge, type BadgeTone, type IconName, type AppTheme, usePressScale, createStyles, type Responsive } from '@ds';
// Cross-feature, and deliberately so: the tile composes a favourites control
// rather than reimplementing one. The dependency is presentation-to-
// presentation — no data layer is crossed — and it points at the feature that
// owns the concept.
import { FavoriteButton } from '@features/favorites/presentation/components/FavoriteButton';

import { type PromptCardVm } from '../mappers/toPromptCardVm';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Clamp the ratio rather than trust it.
 *
 * A masonry column is only as well-behaved as its most extreme cell: a 1:4
 * upload would fill the viewport on its own and push the rest of the column
 * off-screen, and a 6:1 panorama collapses into an unreadable sliver. Every
 * seeded ratio (2:3 … 16:9) already sits inside this range, so nothing visible
 * changes today — this is a guard for real user uploads later.
 */
const MIN_ASPECT = 0.5;
const MAX_ASPECT = 2;

const clampAspect = (ratio: number): number =>
  Number.isFinite(ratio) && ratio > 0 ? Math.min(Math.max(ratio, MIN_ASPECT), MAX_ASPECT) : 1;

/**
 * The mark each status tag wears. Kept beside the tile rather than in the
 * mapper: which glyph reads as "trending" is a presentation decision, and the
 * mapper's job is to say WHICH tag applies, not how it is drawn.
 */
const BADGE_ICONS: Partial<Record<BadgeTone, IconName>> = {
  trending: 'flame',
  fresh: 'sparkles',
  featured: 'sparkles',
};

const getStyles = (_appTheme: AppTheme, responsive: Responsive) => {
  const { BORDER_RADIUS, HScale } = responsive;

  return {
    ...StyleSheet.create({
      // The masonry grid passes no `width` — the tile is expected to fill the
      // column. Without this it has no width rule at all, and the image below
      // it sizes purely from `aspectRatio`, which needs a width to mean
      // anything.
      fillWidth: {
        width: '100%' as const,
      },
      badge: {
        position: 'absolute' as const,
        top: HScale.Width_14,
        left: HScale.Width_14,
      },
      // Opposite corner from the tag, so neither ever covers the other however
      // long the label runs.
      favorite: {
        position: 'absolute' as const,
        top: HScale.Width_9,
        right: HScale.Width_9,
      },
    }),
    radii: { xl: BORDER_RADIUS.radius_56 },
  };
};

const useStyles = createStyles(getStyles);

export type PromptTileProps = {
  vm: PromptCardVm;
  /** Must be stable across renders or the memo below is defeated. */
  onPress: (promptId: string) => void;
  /**
   * Fixed width for a horizontal strip. Omitted in the masonry grid, where
   * FlashList hands each cell its column width and the tile fills it.
   */
  width?: number;
  /**
   * Overrides the image's natural ratio. A horizontal rail sizes itself to its
   * TALLEST cell, so letting each card keep its own ratio leaves dead space
   * under every shorter one. Variable heights are the grid's job; a rail wants
   * uniform cells.
   */
  aspectRatio?: number;
  style?: StyleProp<ViewStyle>;
};

/**
 * The gallery tile: an image, and only what has to sit on top of it.
 *
 * No title, author or counts, anywhere it is used. In a wall of images the
 * picture IS the content — a caption block under every tile roughly doubles the
 * height of a grid and halves how many ideas fit on screen, and the text is
 * redundant the moment the tile is tapped. Everything textual lives on the
 * detail screen.
 *
 * What remains overlays the image: the status tag, because it says which of
 * these images is worth looking at first, and the favourite control, because
 * saving something is the one action worth doing without leaving the wall.
 */
const PromptTileComponent = ({
  vm,
  onPress,
  width,
  aspectRatio,
  style,
}: PromptTileProps): React.JSX.Element => {
  const styles = useStyles();
  const { animatedStyle, onPressIn, onPressOut } = usePressScale(0.97);

  return (
    <AnimatedPressable
      accessibilityRole="button"
      // The tile shows no text, so the accessible name is the only thing a
      // screen reader has to go on.
      accessibilityLabel={`${vm.title}, by ${vm.authorName}`}
      accessibilityHint="Opens the prompt details"
      testID={`prompt-tile-${vm.id}`}
      onPress={() => onPress(vm.id)}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={[width !== undefined ? { width } : styles.fillWidth, animatedStyle, style]}>
      {/* Thumbnail, never the full-resolution image — enforced by the type:
          PromptListItem has no imageUrl at all. */}
      <AppImage
        uri={vm.thumbnailUrl}
        aspectRatio={clampAspect(aspectRatio ?? vm.aspectRatio)}
        priority="normal"
        borderRadius={styles.radii.xl}
        testID={`prompt-tile-image-${vm.id}`}
      />

      {vm.badge !== null && (
        <View style={styles.badge}>
          <Badge
            label={vm.badge.label}
            tone={vm.badge.tone}
            icon={BADGE_ICONS[vm.badge.tone]}
          />
        </View>
      )}

      <View style={styles.favorite}>
        <FavoriteButton promptId={vm.id} promptTitle={vm.title} />
      </View>
    </AnimatedPressable>
  );
};

/**
 * Compared on the fields that can actually change what is drawn. `id` covers
 * the image (it cannot change without one), and favourite state is read inside
 * FavoriteButton rather than passed in — so toggling a heart never re-renders
 * the tile at all.
 */
export const PromptTile = memo(
  PromptTileComponent,
  (prev, next) =>
    prev.vm.id === next.vm.id &&
    prev.vm.badge?.label === next.vm.badge?.label &&
    prev.width === next.width &&
    prev.aspectRatio === next.aspectRatio,
);
PromptTile.displayName = 'PromptTile';
