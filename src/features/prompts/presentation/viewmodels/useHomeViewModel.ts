import { useCallback, useMemo, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { type AppError, isAppError, unknownError } from '@core/errors/AppError';
import { fireAndForget } from '@core/utils/fireAndForget';
import { useStableCallback } from '@core/hooks/useStableCallback';
import { categoryId as toCategoryId } from '@core/types/branded';
import { type RootStackParamList } from '@app/navigation/navigation.types';
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
  readonly isFetchingMore: boolean;
  readonly isRefreshing: boolean;
  readonly onSelectCategory: (categoryId: string | null) => void;
  readonly onPressPrompt: (promptId: string) => void;
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
 * interrupts that with a fixed, finite set. The only control is the category
 * filter, which narrows the same stream instead of navigating away from it.
 *
 * The filter lives in `useState`, not a store: nothing outside this screen
 * reads it, and it should reset when the screen is left.
 */
export const useHomeViewModel = (): HomeViewModel => {
  const navigation = useNavigation<Nav>();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  const categories = useCategories();
  const feed = usePromptFeed({
    sort: 'newest',
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
    isFetchingMore: feed.isFetchingNextPage,
    isRefreshing: feed.isRefetching && !feed.isFetchingNextPage,
    onSelectCategory,
    onPressPrompt,
    onEndReached,
    onRefresh,
    retry,
  };
};
