import React, { useEffect, useMemo } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useStableCallback } from '@core/hooks/useStableCallback';
import { type CategoryId } from '@core/types/branded';
import { type RootStackParamList } from '@app/navigation/navigation.types';

import { useRelatedPrompts } from '../hooks/usePrompts';
import { type SuggestionLedger } from '../hooks/useSuggestionLedger';
import { toPromptCardVm } from '../mappers/toPromptCardVm';
import { PromptRail } from './PromptRail';

export type PromptRelatedRailProps = {
  /** The prompt on screen — never shown among its own related prompts. */
  promptId: string;
  categoryId: CategoryId;
  categoryName: string;
  /** Position among the strips; lower ranks claim contested prompts first. */
  rank: number;
  ledger: SuggestionLedger;
};

/**
 * "Related", which is deliberately NOT one of DETAIL_SECTIONS.
 *
 * Those four are global rankings — the same nine prompts whichever page you are
 * on — so they are declared as a static table of sorts. This one is a function
 * of the prompt you are looking at, so it needs the prompt's category and could
 * not be expressed in that table without giving every entry a parameter it does
 * not use.
 *
 * Its "Show all" opens the existing Category page rather than a section page:
 * the full list of related prompts IS that category, and a second screen
 * showing the same query under a different title would be a duplicate.
 */
export const PromptRelatedRail = ({
  promptId,
  categoryId,
  categoryName,
  rank,
  ledger,
}: PromptRelatedRailProps): React.JSX.Element | null => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const excluded = ledger.excludedFor(rank);
  const query = useRelatedPrompts(categoryId, promptId, excluded);

  const items = useMemo(() => query.items.map(item => toPromptCardVm(item)), [query.items]);

  // Ranked first, so this strip gets first claim on anything contested — it is
  // the only one that depends on WHICH prompt is open, and therefore the only
  // one whose picks cannot be shown just as well further down.
  const shownIds = useMemo(() => items.map(item => item.id), [items]);
  useEffect(() => {
    ledger.claim(rank, shownIds);
  }, [ledger, rank, shownIds]);

  const onPressPrompt = useStableCallback((id: string) => {
    // push, not navigate: tapping through related prompts should build a back
    // stack, not replace the screen you came from.
    navigation.push('PromptDetail', { promptId: id });
  });

  const onShowAll = useStableCallback(() => {
    navigation.push('Category', { categoryId, title: categoryName });
  });

  // A prompt that is the only one in its category has nothing related to show,
  // and a failed suggestion is not worth an error card under the real content.
  if (query.isError || (!query.isPending && items.length === 0)) {
    return null;
  }

  return (
    <PromptRail
      title="Related"
      icon="grid"
      items={items}
      loading={query.isPending}
      onPressPrompt={onPressPrompt}
      onShowAll={onShowAll}
    />
  );
};
