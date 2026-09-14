import React, { useCallback } from 'react';
import { View } from 'react-native';
import { FlashList, type FlashListProps } from '@shopify/flash-list';

import { type Theme, useResponsive, useThemedStyles } from '@ds';

import { type PromptCardVm } from '../mappers/toPromptCardVm';
import { PromptTile } from './PromptTile';

const styleFactory = (theme: Theme) => {
  // Half a gap on each cell adds up to a full gap between columns, which is
  // the only way to space a masonry grid: FlashList assigns cells to whichever
  // column is shortest, so no cell can know whether it is on an edge.
  const inset = theme.layout.gridGap / 2;

  return {
    content: {
      // What is left over after the cells' own half-gaps, so the outermost
      // cell edges land exactly on the screen gutter.
      paddingHorizontal: theme.layout.gutter - inset,
      paddingTop: theme.layout.gridGap,
      paddingBottom: theme.spacing.huge,
    },
    cell: {
      paddingHorizontal: inset,
      paddingBottom: theme.layout.gridGap,
    },
  };
};

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
  const styles = useThemedStyles(styleFactory);
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
