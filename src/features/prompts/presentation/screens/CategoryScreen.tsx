import React from 'react';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useStableCallback } from '@core/hooks/useStableCallback';
import { categoryId as toCategoryId } from '@core/types/branded';
import { type RootStackParamList } from '@app/navigation/navigation.types';
import { Screen } from '@ds';

import { PromptFeedView } from '../components/PromptFeedView';
import { usePromptsByCategory } from '../hooks/usePrompts';

export const CategoryScreen = (): React.JSX.Element => {
  const route = useRoute<RouteProp<RootStackParamList, 'Category'>>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const feed = usePromptsByCategory(toCategoryId(route.params.categoryId));

  const onPressPrompt = useStableCallback((promptId: string) => {
    navigation.push('PromptDetail', { promptId });
  });

  return (
    <Screen edges={[]}>
      <PromptFeedView
        feed={feed}
        onPressPrompt={onPressPrompt}
        emptyTitle="Nothing here yet"
        emptyDescription={`No published prompts in ${route.params.title}.`}
        testID="category-grid"
      />
    </Screen>
  );
};
