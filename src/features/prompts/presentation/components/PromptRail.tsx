import React, { memo, useCallback } from 'react';
import { StyleSheet, FlatList, Pressable, View, type ListRenderItemInfo } from 'react-native';

import {
  Icon,
  Skeleton,
  Text,
  createStyles,
  layoutOf,
  type AppTheme,
  type IconName,
  type Responsive,
} from '@ds';

import { type PromptCardVm } from '../mappers/toPromptCardVm';
import { PromptTile } from './PromptTile';

/**
 * Narrower than a grid cell: with no caption block the image carries the whole
 * cell, so a smaller tile still reads and more of them fit on screen.
 *
 * A DESIGN width — `theme.size` turns it into the width for this window, which
 * is what keeps two rail cells and a bit of the third on screen whatever the
 * screen is.
 */

/** One ratio for every rail cell — see PromptCardProps.aspectRatio. */
const CARD_ASPECT = 4 / 3;

const getStyles = (appTheme: AppTheme, responsive: Responsive) => {
  const { BORDER_RADIUS, HScale, IconSize, VScale } = responsive;
  const layout = layoutOf(responsive);
  const p = appTheme.colors;

  return {
    ...StyleSheet.create({
      section: { gap: HScale.Width_9 },
      // React Native's ScrollView base style is `flexGrow: 1`, so a horizontal list
      // expands to its parent's height instead of hugging its content. Inside a
      // tall container (here, a FlashList header) that leaves a block of dead space
      // under the row — and stretches the cells themselves if they can grow.
      list: { flexGrow: 0 },

      header: {
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        justifyContent: 'space-between' as const,
        gap: HScale.Width_9,
        paddingHorizontal: layout.gutter,
      },
      // Icon + title travel together; the link is pushed to the far edge.
      heading: {
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        gap: HScale.Width_9,
        flexShrink: 1,
      },
      headingIconWell: {
        width: HScale.Width_37,
        height: HScale.Width_37,
        borderRadius: BORDER_RADIUS.radius_26,
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
        backgroundColor: p.accent.subtle,
      },
      showAll: {
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        gap: HScale.Width_2,
        paddingVertical: VScale.Height_5,
        paddingLeft: HScale.Width_9,
      },
      content: {
        paddingHorizontal: layout.gutter,
        gap: HScale.Width_14,
        // A horizontal list's content container is a flex row, and a row stretches
        // its children to its own height by default. Without this, every card grows
        // to the rail's full height and the metadata floats above a tall void.
        alignItems: 'flex-start' as const,
      },
      contentRow: {
        flexDirection: 'row' as const,
        paddingHorizontal: layout.gutter,
        gap: HScale.Width_14,
        alignItems: 'flex-start' as const,
      },
    }),
    palette: p,
    iconSizes: { xs: IconSize.iconSize_16, sm: IconSize.iconSize_18 },
    radii: { lg: BORDER_RADIUS.radius_41 },
    metrics: { cardWidth: HScale.Width_231 },
  };
};

const useStyles = createStyles(getStyles);

export type PromptRailProps = {
  title: string;
  /**
   * The section's mark. Four strips of the same cards differ only by their
   * heading, so the glyph is what tells them apart while scrolling past.
   */
  icon?: IconName;
  items: readonly PromptCardVm[];
  loading: boolean;
  onPressPrompt: (promptId: string) => void;
  /**
   * Shows a "See all" link in the header. Omit it and the rail is just a strip.
   */
  onShowAll?: () => void;
};

/**
 * FlatList rather than FlashList here on purpose: a rail holds ~8-10 cells,
 * which never recycles enough to repay FlashList's size-estimate tuning.
 */
const PromptRailComponent = ({
  title,
  icon,
  items,
  loading,
  onPressPrompt,
  onShowAll,
}: PromptRailProps): React.JSX.Element => {
  const styles = useStyles();

  const cardWidth = styles.metrics.cardWidth;
  /** Matches the cards' image block, so the placeholders read as one row. */
  const showAllHeight = cardWidth / CARD_ASPECT;

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<PromptCardVm>) => (
      <PromptTile vm={item} onPress={onPressPrompt} width={cardWidth} aspectRatio={CARD_ASPECT} />
    ),
    [onPressPrompt, cardWidth],
  );

  const keyExtractor = useCallback((item: PromptCardVm) => item.id, []);

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <View style={styles.heading}>
          {icon !== undefined && (
            <View style={styles.headingIconWell}>
              <Icon name={icon} size={styles.iconSizes.sm} color="accent" strokeWidth={2} />
            </View>
          )}
          <Text variant="h3" numberOfLines={1}>
            {title}
          </Text>
        </View>

        {/* In the header, not after the ninth card: as a trailing cell it was
            only reachable by scrolling the entire strip first, which is the
            one thing someone who wants the full list has already decided not
            to do. */}
        {onShowAll !== undefined && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Show all ${title.toLowerCase()} prompts`}
            testID={`show-all-${title.toLowerCase().replace(/\s+/g, '-')}`}
            style={styles.showAll}
            onPress={onShowAll}>
            <Text variant="label" color="accent">
              See all
            </Text>
            <Icon name="chevronRight" size={styles.iconSizes.xs} color="accent" strokeWidth={2.2} />
          </Pressable>
        )}
      </View>

      {loading ? (
        <View style={styles.contentRow}>
          <Skeleton width={cardWidth} height={showAllHeight} borderRadius={styles.radii.lg} />
          <Skeleton width={cardWidth} height={showAllHeight} borderRadius={styles.radii.lg} />
        </View>
      ) : (
        <FlatList
          horizontal
          style={styles.list}
          data={items}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.content}
          // Only the visible card or two mount up front; the rest fill in.
          initialNumToRender={3}
          windowSize={5}
          removeClippedSubviews
        />
      )}
    </View>
  );
};

export const PromptRail = memo(PromptRailComponent);
PromptRail.displayName = 'PromptRail';
