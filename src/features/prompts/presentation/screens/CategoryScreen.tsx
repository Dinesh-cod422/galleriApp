import React, { useEffect, useMemo } from 'react';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useStableCallback } from '@core/hooks/useStableCallback';
import { categoryId as toCategoryId } from '@core/types/branded';
import { type RootStackParamList } from '@app/navigation/navigation.types';
import { Screen } from '@ds';

import { PromptFeedView } from '../components/PromptFeedView';
import { useCategories } from '../hooks/useCategories';
import { usePromptsByCategory } from '../hooks/usePrompts';

/** Shown until the category's real name is known — see below. */
const FALLBACK_TITLE = 'Category';

export const CategoryScreen = (): React.JSX.Element => {
  const route = useRoute<RouteProp<RootStackParamList, 'Category'>>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const feed = usePromptsByCategory(toCategoryId(route.params.categoryId));

  /*
   * Arriving from inside the app, the caller already knows the name and passes
   * it so the header paints immediately. A deep link carries only the id, so
   * the name is looked up instead — `useCategories` is cached for an hour and
   * usually resolves without a request.
   */
  const categories = useCategories();
  const title = useMemo(() => {
    if (route.params.title !== undefined) {
      return route.params.title;
    }
    return (
      categories.data?.find(c => c.id === route.params.categoryId)?.name ?? FALLBACK_TITLE
    );
  }, [categories.data, route.params.categoryId, route.params.title]);

  // The navigator's static option cannot wait for a query, so the header is
  // corrected here once the name is known.
  useEffect(() => {
    navigation.setOptions({ title });
  }, [navigation, title]);

  const onPressPrompt = useStableCallback((promptId: string) => {
    navigation.push('PromptDetail', { promptId });
  });

  return (
    <Screen edges={[]}>
      <PromptFeedView
        feed={feed}
        onPressPrompt={onPressPrompt}
        emptyTitle="Nothing here yet"
        emptyDescription={`No published prompts in ${title}.`}
        testID="category-grid"
      />
    </Screen>
  );
};
