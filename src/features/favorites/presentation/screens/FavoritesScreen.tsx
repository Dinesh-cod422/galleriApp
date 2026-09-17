import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useStableCallback } from '@core/hooks/useStableCallback';
import { type RootStackParamList } from '@app/navigation/navigation.types';
import {
  EmptyState,
  Icon,
  Screen,
  Text,
  createStyles,
  layoutOf,
  type AppTheme,
  type Responsive,
} from '@ds';
import { PromptMasonryGrid } from '@features/prompts/presentation/components/PromptMasonryGrid';
import { PromptMasonrySkeleton } from '@features/prompts/presentation/components/PromptMasonrySkeleton';
import { usePromptsByIds } from '@features/prompts/presentation/hooks/usePrompts';
import { toPromptCardVm } from '@features/prompts/presentation/mappers/toPromptCardVm';

import { useFavoriteIds } from '../stores/favoritesStore';

const getStyles = (_appTheme: AppTheme, responsive: Responsive) => {
  const { HScale, IconSize, VScale } = responsive;
  const layout = layoutOf(responsive);

  return {
    ...StyleSheet.create({
      header: {
        paddingHorizontal: layout.gutter,
        paddingTop: VScale.Height_9,
        paddingBottom: VScale.Height_19,
        gap: HScale.Width_2,
      },
      feed: { flex: 1 },
    }),
    iconSizes: { xl: IconSize.iconSize_45 },
  };
};

const useStyles = createStyles(getStyles);

/**
 * Everything the user has saved.
 *
 * The list is device-local (see `favoritesStore`), so there is no server query
 * that returns it — the ids come from storage and the documents are fetched
 * individually. That sounds expensive and is not: `usePromptsByIds` reuses the
 * detail cache, so a prompt you saved while looking at it costs no read at all.
 */
export const FavoritesScreen = (): React.JSX.Element => {
  const styles = useStyles();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const favoriteIds = useFavoriteIds();

  /**
   * Newest first. A Set iterates in insertion order, so reversing it puts the
   * prompt just saved at the top — where the user is looking for it — instead
   * of at the bottom of a long grid.
   */
  const ids = useMemo(() => [...favoriteIds].reverse(), [favoriteIds]);

  const { items, isPending } = usePromptsByIds(ids);

  const cards = useMemo(() => items.map(item => toPromptCardVm(item)), [items]);

  const onPressPrompt = useStableCallback((promptId: string) => {
    navigation.push('PromptDetail', { promptId });
  });

  const body = (): React.JSX.Element => {
    if (ids.length === 0) {
      return (
        <EmptyState
          title="No favourites yet"
          description="Tap the heart on any prompt to keep it here."
          icon={<Icon name="heart" size={styles.iconSizes.xl} color="tertiary" />}
          testID="favorites-empty"
        />
      );
    }

    // Only while nothing is showable at all — see combineDetails.
    if (isPending && cards.length === 0) {
      return <PromptMasonrySkeleton />;
    }

    return (
      <PromptMasonryGrid items={cards} onPressPrompt={onPressPrompt} testID="favorites-grid" />
    );
  };

  return (
    <Screen testID="favorites">
      <View style={styles.header}>
        <Text variant="h1">Favourites</Text>
        <Text variant="caption" color="secondary">
          {ids.length === 0
            ? 'Saved prompts live here'
            : `${ids.length} saved prompt${ids.length === 1 ? '' : 's'}`}
        </Text>
      </View>
      <View style={styles.feed}>{body()}</View>
    </Screen>
  );
};
