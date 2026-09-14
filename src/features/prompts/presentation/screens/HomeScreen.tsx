import React from 'react';
import { RefreshControl, View } from 'react-native';

import { EmptyState, ErrorState, Icon, Screen, Text, type Theme, useThemedStyles } from '@ds';

import { CategoryChips } from '../components/CategoryChips';
import { PromptMasonryGrid } from '../components/PromptMasonryGrid';
import { PromptMasonrySkeleton } from '../components/PromptMasonrySkeleton';
import { useHomeViewModel } from '../viewmodels/useHomeViewModel';

const styleFactory = (theme: Theme) => ({
  feed: { flex: 1 },
  skeleton: { paddingTop: theme.layout.gridGap },
  footer: { padding: theme.spacing.xl, alignItems: 'center' as const },
});

/**
 * An endless wall of prompts and nothing else.
 *
 * No title block and no featured/trending rails: every row of chrome above the
 * grid is a row of ideas the user cannot see, and the point of the screen is to
 * keep ideas arriving. The category filter is the single exception, and it is
 * pinned outside the scroll view so it stays reachable at any scroll depth.
 */
export const HomeScreen = (): React.JSX.Element => {
  const styles = useThemedStyles(styleFactory);
  const vm = useHomeViewModel();

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
          icon={<Icon name="inbox" size={40} color="tertiary" />}
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
        refreshControl={
          <RefreshControl refreshing={vm.isRefreshing} onRefresh={vm.onRefresh} />
        }
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
      <CategoryChips
        categories={vm.categories ?? []}
        loading={vm.isLoadingCategories}
        selectedId={vm.selectedCategoryId}
        onSelect={vm.onSelectCategory}
      />
      <View style={styles.feed}>{feed()}</View>
    </Screen>
  );
};
