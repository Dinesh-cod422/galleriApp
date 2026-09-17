import { useCallback, useMemo, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { type AppError, isAppError, unknownError } from '@core/errors/AppError';
import { fireAndForget } from '@core/utils/fireAndForget';
import { useStableCallback } from '@core/hooks/useStableCallback';
import { categoryId as toCategoryId } from '@core/types/branded';
import { type RootStackParamList } from '@app/navigation/navigation.types';
import { type PromptSort } from '../../domain/repositories/PromptRepository';
import { DEFAULT_FEED_SORT, FEED_SORTS } from '../sections';
import { useCategories } from '../hooks/useCategories';
import { usePromptFeed } from '../hooks/usePrompts';
import { toPromptCardVm, type PromptCardVm } from '../mappers/toPromptCardVm';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export type HomeStatus = 'loading' | 'error' | 'empty' | 'success';

export type HomeViewModel = {
  readonly status: HomeStatus;
  readonly error: AppError | null;
  readonly prompts: readonly PromptCardVm[];
  readonly categories: ReturnType<typeof useCategories>['data'];
  readonly isLoadingCategories: boolean;
  readonly selectedCategoryId: string | null;
  readonly selectedCategoryName: string | null;
  readonly sort: PromptSort;
  /** Title of the active ordering, for the label under the masthead. */
  readonly sortTitle: string;
  /** True when anything other than the defaults is applied. */
  readonly isFiltered: boolean;
  readonly onSelectSort: (sort: PromptSort) => void;
  readonly isFetchingMore: boolean;
  readonly isRefreshing: boolean;
  readonly onSelectCategory: (categoryId: string | null) => void;
  readonly onPressPrompt: (promptId: string) => void;
  readonly onPressSearch: () => void;
  readonly onEndReached: () => void;
  readonly onRefresh: () => void;
  readonly retry: () => void;
};

const asAppError = (error: unknown): AppError =>
  isAppError(error) ? error : unknownError('Could not load prompts.', error);

/**
 * One endless, filterable feed.
 *
 * The screen is deliberately a single stream rather than a set of merchandised
 * rails: the job here is to keep ideas arriving while you scroll, and a rail
 * interrupts that with a fixed, finite set. Both controls — the category row
 * and the sort sheet — narrow or reorder that same stream rather than
 * navigating away from it.
 *
 * Opening the sheet is NOT here: the screen owns the sheet's ref, and a view
 * model that reached for an imperative handle would be holding a piece of the
 * view. It exposes the CHOICE (`onSelectSort`), not the gesture.
 *
 * Both selections live in `useState`, not a store: nothing outside this screen
 * reads them, and they should reset when the screen is left.
 */
export const useHomeViewModel = (): HomeViewModel => {
  const navigation = useNavigation<Nav>();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [sort, setSort] = useState<PromptSort>(DEFAULT_FEED_SORT);

  const categories = useCategories();
  const feed = usePromptFeed({
    sort,
    categoryId: selectedCategoryId === null ? null : toCategoryId(selectedCategoryId),
  });

  // Keyed on `feed.items` alone. The previous version also depended on a
  // `Date.now()` computed during render, which changed every render and so
  // rebuilt every view model every time — a memo that never hit.
  const prompts = useMemo(() => feed.items.map(item => toPromptCardVm(item)), [feed.items]);

  const selectedCategoryName = useMemo(
    () => categories.data?.find(c => c.id === selectedCategoryId)?.name ?? null,
    [categories.data, selectedCategoryId],
  );

  const sortTitle = useMemo(
    () => FEED_SORTS.find(option => option.sort === sort)?.title ?? '',
    [sort],
  );

  const isFiltered = sort !== DEFAULT_FEED_SORT || selectedCategoryId !== null;

  const status: HomeStatus = feed.isPending
    ? 'loading'
    : feed.isError
      ? 'error'
      : prompts.length === 0
        ? 'empty'
        : 'success';

  // Stable identities: these reach memoized tiles, where a new function every
  // render would defeat React.memo for every visible cell.
  const onSelectCategory = useStableCallback((id: string | null) => {
    setSelectedCategoryId(id);
  });

  const onPressPrompt = useStableCallback((promptId: string) => {
    navigation.navigate('PromptDetail', { promptId });
  });

  const onPressSearch = useStableCallback(() => {
    navigation.navigate('Search');
  });

  /**
   * Opening the sheet is the SCREEN's job, not the view model's — it owns the
   * ref. This stays in the contract so the header keeps one prop shape, and so
   * a future filter surface (a full page, say) changes one line here.
   */
  const onSelectSort = useStableCallback((next: PromptSort) => {
    setSort(next);
  });

  const onEndReached = useStableCallback(() => {
    if (feed.hasNextPage && !feed.isFetchingNextPage) {
      fireAndForget(feed.fetchNextPage());
    }
  });

  const onRefresh = useStableCallback(() => {
    fireAndForget(feed.refetch());
  });

  const retry = useCallback(() => {
    fireAndForget(feed.refetch());
  }, [feed]);

  return {
    status,
    error: feed.error ? asAppError(feed.error) : null,
    prompts,
    categories: categories.data,
    isLoadingCategories: categories.isPending,
    selectedCategoryId,
    selectedCategoryName,
    sort,
    sortTitle,
    isFiltered,
    onSelectSort,
    isFetchingMore: feed.isFetchingNextPage,
    isRefreshing: feed.isRefetching && !feed.isFetchingNextPage,
    onSelectCategory,
    onPressPrompt,
    onPressSearch,
    onEndReached,
    onRefresh,
    retry,
  };
};
