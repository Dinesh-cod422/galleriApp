import React from 'react';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useStableCallback } from '@core/hooks/useStableCallback';
import { type RootStackParamList } from '@app/navigation/navigation.types';
import { Screen } from '@ds';

import { PromptFeedView } from '../components/PromptFeedView';
import { usePromptFeed } from '../hooks/usePrompts';
import { sectionForSort } from '../sections';

/**
 * The full list behind a detail-page section's "Show all".
 *
 * One screen for every section rather than one per sort: the sort is a route
 * param, so adding a fifth section is a line in DETAIL_SECTIONS and nothing
 * else. The header title comes from the same table the rail used.
 */
export const PromptSectionScreen = (): React.JSX.Element => {
  const route = useRoute<RouteProp<RootStackParamList, 'PromptSection'>>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { sort } = route.params;

  const feed = usePromptFeed({ sort });
  const section = sectionForSort(sort);

  const onPressPrompt = useStableCallback((promptId: string) => {
    navigation.push('PromptDetail', { promptId });
  });

  return (
    <Screen edges={[]} testID="prompt-section">
      <PromptFeedView
        feed={feed}
        onPressPrompt={onPressPrompt}
        emptyTitle="Nothing here yet"
        emptyDescription={section?.emptyDescription ?? 'Nothing to show.'}
        testID="section-grid"
      />
    </Screen>
  );
};
