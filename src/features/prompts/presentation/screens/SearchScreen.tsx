import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Pressable, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { env } from '@core/config/env';
import { isAppError, unknownError } from '@core/errors/AppError';
import { fireAndForget } from '@core/utils/fireAndForget';
import { useDebouncedValue } from '@core/hooks/useDebouncedValue';
import { useStableCallback } from '@core/hooks/useStableCallback';
import { type RootStackParamList } from '@app/navigation/navigation.types';
import {
  EmptyState,
  ErrorState,
  Icon,
  IconButton,
  Screen,
  SearchField,
  Text,
  createStyles,
  layoutOf,
  type AppTheme,
  type Responsive,
} from '@ds';

import { PromptMasonryGrid } from '../components/PromptMasonryGrid';
import { PromptMasonrySkeleton } from '../components/PromptMasonrySkeleton';
import { useCategories } from '../hooks/useCategories';
import { useSearchResults } from '../hooks/usePrompts';
import { toPromptCardVm } from '../mappers/toPromptCardVm';

const getStyles = (appTheme: AppTheme, responsive: Responsive) => {
  const { HScale, IconSize, VScale } = responsive;
  const layout = layoutOf(responsive);
  const p = appTheme.colors;

  return {
    ...StyleSheet.create({
      bar: {
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        gap: HScale.Width_9,
        paddingHorizontal: layout.gutter,
        paddingTop: VScale.Height_9,
        paddingBottom: VScale.Height_14,
      },
      field: { flex: 1 },
      back: { width: HScale.Width_46, height: HScale.Width_46, borderRadius: 999 },
      body: { flex: 1 },
      suggestions: { paddingHorizontal: layout.gutter, gap: HScale.Width_14 },
      chips: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: HScale.Width_9 },
      chip: {
        paddingHorizontal: HScale.Width_18,
        paddingVertical: VScale.Height_9,
        borderRadius: 999,
        backgroundColor: p.bg.subtle,
      },
    }),
    palette: p,
    iconSizes: { lg: IconSize.iconSize_24, xl: IconSize.iconSize_45 },
  };
};

const useStyles = createStyles(getStyles);

/**
 * Finding one specific prompt, rather than browsing for any prompt.
 *
 * Matching is by WHOLE WORD. Firestore's `array-contains` can only test for a
 * complete element, so "roman" does not find "romantic" — and adding every
 * prefix to `searchTokens` would blow past the 20-token cap the seed applies.
 * That constraint is why this screen leads with tappable suggestions instead of
 * an empty field: a chip is a guaranteed-valid whole word, which turns the
 * limitation into a shortcut rather than a dead end.
 */
export const SearchScreen = (): React.JSX.Element => {
  const styles = useStyles();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [query, setQuery] = useState('');

  // Debounced so a five-letter word is one query, not five.
  const debounced = useDebouncedValue(query, env.SEARCH_DEBOUNCE_MS);
  const results = useSearchResults(debounced);
  const categories = useCategories();

  const cards = useMemo(() => results.items.map(item => toPromptCardVm(item)), [results.items]);

  const onPressPrompt = useStableCallback((promptId: string) => {
    navigation.push('PromptDetail', { promptId });
  });

  const onEndReached = useStableCallback(() => {
    if (results.hasNextPage && !results.isFetchingNextPage) {
      fireAndForget(results.fetchNextPage());
    }
  });

  const retry = useStableCallback(() => {
    fireAndForget(results.refetch());
  });

  const goBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const body = (): React.JSX.Element => {
    if (!results.enabled) {
      return (
        <View style={styles.suggestions}>
          <Text variant="bodyStrong">Try a category</Text>
          <View style={styles.chips}>
            {(categories.data ?? []).map(category => (
              <Pressable
                key={category.id}
                style={styles.chip}
                onPress={() => setQuery(category.name)}
                accessibilityRole="button"
                accessibilityLabel={`Search for ${category.name}`}
                testID={`search-suggestion-${category.id}`}>
                <Text variant="label">{category.name}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      );
    }

    if (results.isPending) {
      return <PromptMasonrySkeleton />;
    }

    if (results.isError) {
      return (
        <ErrorState
          error={isAppError(results.error) ? results.error : unknownError()}
          onRetry={retry}
          testID="search-error"
        />
      );
    }

    if (cards.length === 0) {
      return (
        <EmptyState
          title={`No prompts for "${debounced.trim()}"`}
          // Says what to do, not what went wrong: whole-word matching is the
          // reason, and "try a whole word" is the actionable half of it.
          description="Search matches whole words — try a single word like couple, portrait or vintage."
          icon={<Icon name="search" size={styles.iconSizes.xl} color="tertiary" />}
          testID="search-empty"
        />
      );
    }

    return (
      <PromptMasonryGrid
        items={cards}
        onPressPrompt={onPressPrompt}
        onEndReached={onEndReached}
        testID="search-grid"
      />
    );
  };

  return (
    <Screen testID="search">
      <View style={styles.bar}>
        <IconButton
          variant="surface"
          style={styles.back}
          onPress={goBack}
          accessibilityLabel="Back"
          testID="search-back">
          <Icon name="chevronLeft" size={styles.iconSizes.lg} color="primary" strokeWidth={2.2} />
        </IconButton>
        <View style={styles.field}>
          <SearchField value={query} onChangeText={setQuery} autoFocus testID="search-input" />
        </View>
      </View>
      <View style={styles.body}>{body()}</View>
    </Screen>
  );
};
