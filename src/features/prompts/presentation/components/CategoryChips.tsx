import React, { memo, useCallback, useMemo } from 'react';
import { FlatList, Pressable, View, type ListRenderItemInfo } from 'react-native';

import { type Category } from '@features/categories/domain/entities/Category';
import { Skeleton, Text, type Theme, useThemedStyles } from '@ds';

const styleFactory = (theme: Theme) => ({
  // React Native's ScrollView base style is `flexGrow: 1`, so a horizontal list
  // expands to its parent's height instead of hugging its content.
  list: { flexGrow: 0 },
  // Pinned above the feed rather than scrolling with it: the filter is how you
  // steer an endless feed, so it has to stay reachable at any scroll depth.
  bar: {
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.bg.canvas,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.subtle,
  },
  content: { paddingHorizontal: theme.layout.gutter, gap: theme.spacing.sm },
  contentRow: {
    flexDirection: 'row' as const,
    paddingHorizontal: theme.layout.gutter,
    gap: theme.spacing.sm,
  },
  chip: {
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.bg.subtle,
    borderWidth: 1,
    borderColor: theme.colors.border.subtle,
    minHeight: 38,
    justifyContent: 'center' as const,
  },
  chipSelected: {
    backgroundColor: theme.colors.accent.default,
    borderColor: theme.colors.accent.default,
  },
});

/** `null` is the "All" chip — the unfiltered feed. */
type Chip = { readonly id: string | null; readonly label: string };

export type CategoryChipsProps = {
  categories: readonly Category[];
  loading: boolean;
  selectedId: string | null;
  /** Stable across renders; `null` clears the filter. */
  onSelect: (categoryId: string | null) => void;
};

const CategoryChipsComponent = ({
  categories,
  loading,
  selectedId,
  onSelect,
}: CategoryChipsProps): React.JSX.Element => {
  const styles = useThemedStyles(styleFactory);

  // "All" is modelled as a chip with a null id rather than as a ListHeader, so
  // selection, keying and styling have exactly one code path.
  const chips = useMemo<readonly Chip[]>(
    () => [
      { id: null, label: 'All' },
      ...categories.map(c => ({ id: c.id, label: `${c.name}  ${c.promptCount}` })),
    ],
    [categories],
  );

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<Chip>) => {
      const selected = item.id === selectedId;
      return (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected }}
          accessibilityLabel={item.label}
          testID={`category-chip-${item.id ?? 'all'}`}
          style={[styles.chip, selected && styles.chipSelected]}
          onPress={() => onSelect(item.id)}>
          <Text variant="label" color={selected ? 'onAccent' : 'primary'}>
            {item.label}
          </Text>
        </Pressable>
      );
    },
    [onSelect, selectedId, styles.chip, styles.chipSelected],
  );

  const keyExtractor = useCallback((item: Chip) => item.id ?? 'all', []);

  return (
    <View style={styles.bar}>
      {loading ? (
        <View style={styles.contentRow}>
          <Skeleton height={38} width={72} borderRadius={999} />
          <Skeleton height={38} width={110} borderRadius={999} />
          <Skeleton height={38} width={90} borderRadius={999} />
        </View>
      ) : (
        <FlatList
          style={styles.list}
          horizontal
          data={chips}
          extraData={selectedId}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.content}
        />
      )}
    </View>
  );
};

export const CategoryChips = memo(CategoryChipsComponent);
CategoryChips.displayName = 'CategoryChips';
