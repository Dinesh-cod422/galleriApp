import React, { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { FlashList, type FlashListProps } from '@shopify/flash-list';

import { type AppTheme, layoutOf, type Responsive, useResponsive, createStyles } from '@ds';

import { type PromptCardVm } from '../mappers/toPromptCardVm';
import { PromptTile } from './PromptTile';

const getStyles = (_appTheme: AppTheme, responsive: Responsive) => {
  const layout = layoutOf(responsive);
  // Half a gap on each cell adds up to a full gap between columns, which is
  // the only way to space a masonry grid: FlashList assigns cells to whichever
  // column is shortest, so no cell can know whether it is on an edge.
  const inset = layout.gridGap / 2;

  return {
    ...StyleSheet.create({
      content: {
        // What is left over after the cells' own half-gaps, so the outermost
        // cell edges land exactly on the screen gutter.
        paddingHorizontal: layout.gutter - inset,
        paddingTop: layout.gridGap,
        // Clears the floating tab bar, which the grid scrolls UNDERNEATH rather
        // than stopping above — without this the last row sits behind it and
        // cannot be scrolled into view. From the theme, because the bar's size is
        // defined there: this was `huge + xxl` here and a literal 120 on two
        // other screens, three guesses at one number.
        paddingBottom: layout.tabBarClearance,
      },
      cell: {
        // A definite width, not an inherited one. FlashList's masonry cells do
        // not impose a width on their child, so a tile whose only sizing rule is
        // an aspectRatio resolves to 0x0 — and a list of zero-height cells never
        // fills the viewport, so FlashList re-renders until it gives up with
        // "Exceeded max renders without commit" and paints nothing at all.
        width: '100%',
        paddingHorizontal: inset,
        paddingBottom: layout.gridGap,
      },
    }),
    layout,
  };
};

const useStyles = createStyles(getStyles);

export type PromptMasonryGridProps = {
  items: readonly PromptCardVm[];
  /** Must be stable — it reaches every memoized tile. */
  onPressPrompt: (promptId: string) => void;
  onEndReached?: () => void;
  ListFooterComponent?: FlashListProps<PromptCardVm>['ListFooterComponent'];
  refreshControl?: React.ReactElement;
  testID?: string;
};

/**
 * The Pinterest-style gallery: a masonry grid of variable-height tiles.
 *
 * Shared by Home and Category rather than duplicated, because the column and
 * gutter arithmetic below is the part that is easy to get subtly wrong.
 *
 * Why `masonry` and not a hand-rolled two-column layout: splitting the data
 * into per-column arrays and stacking them in a ScrollView is the usual
 * workaround, and it forfeits recycling — every tile in the feed stays mounted,
 * so a 500-prompt scroll holds 500 live images. FlashList's masonry keeps
 * windowing, so the number of mounted tiles stays proportional to the screen.
 *
 * `optimizeItemArrangement` is deliberately OFF. It balances column heights by
 * reordering items, which reshuffles tiles the user has already seen each time
 * a page is appended. Plain shortest-column placement is stable under append
 * and already produces the staggered look.
 */
export const PromptMasonryGrid = ({
  items,
  onPressPrompt,
  onEndReached,
  ListFooterComponent,
  refreshControl,
  testID,
}: PromptMasonryGridProps): React.JSX.Element => {
  const styles = useStyles();
  const { gridColumns } = useResponsive();

  const renderItem = useCallback(
    ({ item }: { item: PromptCardVm }) => (
      <View style={styles.cell}>
        <PromptTile vm={item} onPress={onPressPrompt} />
      </View>
    ),
    [styles.cell, onPressPrompt],
  );

  const keyExtractor = useCallback((item: PromptCardVm) => item.id, []);
  return (
    <FlashList
      masonry
      data={items}
      numColumns={gridColumns}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      contentContainerStyle={styles.content}
      ListFooterComponent={ListFooterComponent}
      refreshControl={refreshControl}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.6}
      showsVerticalScrollIndicator={false}
      testID={testID}
    />
  );
};

