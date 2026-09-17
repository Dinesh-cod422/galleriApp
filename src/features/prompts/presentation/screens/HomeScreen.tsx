import React, { useCallback, useRef } from 'react';
import { StyleSheet, View } from 'react-native';

import { useStableCallback } from '@core/hooks/useStableCallback';
import {
  EmptyState,
  ErrorState,
  Icon,
  PullToRefresh,
  Screen,
  Text,
  createStyles,
  layoutOf,
  type AppTheme,
  type BottomSheetRef,
  type Responsive,
} from '@ds';

import { type PromptSort } from '../../domain/repositories/PromptRepository';
import { CategoryChips } from '../components/CategoryChips';
import { GalleryHeader } from '../components/GalleryHeader';
import { PromptFilterSheet } from '../components/PromptFilterSheet';
import { PromptMasonryGrid } from '../components/PromptMasonryGrid';
import { PromptMasonrySkeleton } from '../components/PromptMasonrySkeleton';
import { useHomeViewModel } from '../viewmodels/useHomeViewModel';

const getStyles = (_appTheme: AppTheme, responsive: Responsive) => {
  const { HScale, IconSize } = responsive;
  const layout = layoutOf(responsive);

  return {
    ...StyleSheet.create({
      feed: { flex: 1 },
      skeleton: { paddingTop: layout.gridGap },
      footer: { padding: HScale.Width_28, alignItems: 'center' as const },
    }),
    iconSizes: { xl: IconSize.iconSize_45 },
  };
};

const useStyles = createStyles(getStyles);

/**
 * An endless wall of prompts under a fixed masthead.
 *
 * No featured/trending rails: every row of chrome above the grid is a row of
 * ideas the user cannot see. What does sit above it — the brand header and the
 * category filter — is pinned outside the scroll view rather than scrolling
 * away, because search and filtering are how you steer an endless feed and both
 * have to stay reachable at any scroll depth.
 */
export const HomeScreen = (): React.JSX.Element => {
  const styles = useStyles();
  const vm = useHomeViewModel();

  // The sheet's imperative handle lives here rather than in the view model:
  // a ref is a piece of the view, and the view model deals in choices.
  const filterSheet = useRef<BottomSheetRef>(null);

  const onPressFilter = useCallback(() => {
    filterSheet.current?.open();
  }, []);

  // Choosing IS confirming — the sheet closes itself rather than making the
  // user dismiss a decision they have already expressed.
  const onSelectSort = useStableCallback((sort: PromptSort) => {
    vm.onSelectSort(sort);
    filterSheet.current?.close();
  });

  // A plain function, not a nested component: rendering it as <Feed /> would
  // remount the whole subtree — and the grid's scroll position with it — on
  // every parent render.
  const feed = (): React.JSX.Element => {
    if (vm.status === 'loading') {
      return (
        <View style={styles.skeleton} testID="home-loading">
          <PromptMasonrySkeleton />
        </View>
      );
    }

    if (vm.status === 'error' && vm.error) {
      return <ErrorState error={vm.error} onRetry={vm.retry} testID="home-error" />;
    }

    if (vm.status === 'empty') {
      return (
        <EmptyState
          title="Nothing here yet"
          description={
            vm.selectedCategoryName === null
              ? 'Once prompts are published they will appear here.'
              : `No published prompts in ${vm.selectedCategoryName}.`
          }
          icon={<Icon name="inbox" size={styles.iconSizes.xl} color="tertiary" />}
          actionLabel="Refresh"
          onAction={vm.onRefresh}
        />
      );
    }

    return (
      <PromptMasonryGrid
        items={vm.prompts}
        onPressPrompt={vm.onPressPrompt}
        onEndReached={vm.onEndReached}
        testID="home-grid"
        refreshControl={<PullToRefresh refreshing={vm.isRefreshing} onRefresh={vm.onRefresh} />}
        ListFooterComponent={
          vm.isFetchingMore ? (
            <View style={styles.footer}>
              <Text variant="caption" color="secondary">
                Loading more…
              </Text>
            </View>
          ) : null
        }
      />
    );
  };

  return (
    <Screen testID="home">
      <GalleryHeader
        onPressSearch={vm.onPressSearch}
        onPressFilter={onPressFilter}
        isFiltered={vm.isFiltered}
      />
      <CategoryChips
        categories={vm.categories ?? []}
        loading={vm.isLoadingCategories}
        selectedId={vm.selectedCategoryId}
        onSelect={vm.onSelectCategory}
      />
      <View style={styles.feed}>{feed()}</View>

      <PromptFilterSheet ref={filterSheet} selected={vm.sort} onSelect={onSelectSort} />
    </Screen>
  );
};
