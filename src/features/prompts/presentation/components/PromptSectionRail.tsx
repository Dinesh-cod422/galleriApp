import React, { useEffect, useMemo } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useStableCallback } from '@core/hooks/useStableCallback';
import { type RootStackParamList } from '@app/navigation/navigation.types';

import { useSectionPrompts } from '../hooks/usePrompts';
import { type SuggestionLedger } from '../hooks/useSuggestionLedger';
import { toPromptCardVm } from '../mappers/toPromptCardVm';
import { type PromptSectionDef } from '../sections';
import { PromptRail } from './PromptRail';

export type PromptSectionRailProps = {
  section: PromptSectionDef;
  /** The prompt currently on screen — never shown inside its own sections. */
  excludeId: string;
  /**
   * Position among the strips. Lower ranks claim prompts first, so a contested
   * one stays where it is most relevant.
   */
  rank: number;
  ledger: SuggestionLedger;
};

/**
 * One "Most copied" / "Trending" / … strip, wired to its own query.
 *
 * Each rail owns its query rather than the screen fetching all four and passing
 * arrays down: a rail that fails or is still loading then degrades on its own
 * instead of holding up the other three, and the caches are keyed by sort so
 * moving between prompts re-uses them.
 */
export const PromptSectionRail = ({
  section,
  excludeId,
  rank,
  ledger,
}: PromptSectionRailProps): React.JSX.Element | null => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const excluded = ledger.excludedFor(rank);
  const query = useSectionPrompts(section.sort, excludeId, excluded);

  const items = useMemo(() => query.items.map(item => toPromptCardVm(item)), [query.items]);

  // Publish what this strip settled on, so the ones below skip these. Keyed on
  // the ids themselves: the ledger ignores a claim that has not changed, which
  // is what stops this from looping.
  const shownIds = useMemo(() => items.map(item => item.id), [items]);
  useEffect(() => {
    ledger.claim(rank, shownIds);
  }, [ledger, rank, shownIds]);

  const onPressPrompt = useStableCallback((promptId: string) => {
    // push, not navigate: tapping through several prompts should build a back
    // stack, not replace the screen you came from.
    navigation.push('PromptDetail', { promptId });
  });

  const onShowAll = useStableCallback(() => {
    navigation.push('PromptSection', { sort: section.sort, title: section.title });
  });

  // A section that failed or genuinely has nothing is dropped rather than shown
  // as an error: these are suggestions below the content the user asked for.
  if (query.isError || (!query.isPending && items.length === 0)) {
    return null;
  }

  return (
    <PromptRail
      title={section.title}
      icon={section.icon}
      items={items}
      loading={query.isPending}
      onPressPrompt={onPressPrompt}
      onShowAll={onShowAll}
    />
  );
};
