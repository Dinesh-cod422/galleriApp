import React, { memo, useCallback, useMemo } from 'react';
import { StyleSheet, FlatList, Pressable, View, type ListRenderItemInfo } from 'react-native';

import { type Category } from '@features/categories/domain/entities/Category';
import {
  categoryIcon,
  categoryMarkColor,
  DEFAULT_MARK,
} from '@features/categories/presentation/categoryMark';
import {
  Icon,
  Skeleton,
  Text,
  type IconName,
  type AppTheme,
  useTheme,
  createStyles,
  layoutOf,
  type Responsive,
} from '@ds';

const getStyles = (appTheme: AppTheme, responsive: Responsive) => {
  const { HScale, IconSize, VScale } = responsive;
  const layout = layoutOf(responsive);
  const p = appTheme.colors;

  return {
    ...StyleSheet.create({
      list: { flexGrow: 0 },
      // Pinned above the feed rather than scrolling with it: the filter is how you
      // steer an endless feed, so it has to stay reachable at any scroll depth.
      bar: { paddingBottom: VScale.Height_14 },
      content: { paddingHorizontal: layout.gutter, gap: HScale.Width_9 },
      contentRow: {
        flexDirection: 'row' as const,
        paddingHorizontal: layout.gutter,
        gap: HScale.Width_9,
      },
      chip: {
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        gap: HScale.Width_9,
        paddingHorizontal: HScale.Width_18,
        height: HScale.Width_46,
        borderRadius: 999,
        backgroundColor: p.bg.surface,
        borderWidth: 1,
        borderColor: p.border.subtle,
        ...appTheme.shadows.sm,
      },
      chipSelected: {
        backgroundColor: p.accent.default,
        borderColor: p.accent.default,
      },
    }),
    palette: p,
    iconSizes: { sm: IconSize.iconSize_18 },
    metrics: { control: HScale.Width_46, w110: HScale.Width_127, w72: HScale.Width_83, w90: HScale.Width_104 },
    radii: { pill: 999 },
  };
};

const useStyles = createStyles(getStyles);

/** `null` is the "All" chip — the unfiltered feed. */
type Chip = {
  readonly id: string | null;
  readonly label: string;
  readonly icon: IconName | null;
  readonly mark: string;
};

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
  const styles = useStyles();
  const theme = useTheme();

  // "All" is modelled as a chip with a null id rather than as a ListHeader, so
  // selection, keying and styling have exactly one code path. It carries no
  // mark — it is the absence of a filter, not another category alongside them.
  const chips = useMemo<readonly Chip[]>(
    () => [
      { id: null, label: 'All', icon: null, mark: styles.palette.mark[DEFAULT_MARK] },
      ...categories.map(c => ({
        id: c.id,
        // No prompt count: the row is a filter, and a number beside every name
        // doubles each chip's width for information nobody filters on.
        label: c.name,
        icon: categoryIcon(c),
        mark: categoryMarkColor(c, theme),
      })),
    ],
    [categories, theme, styles],
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
          {item.icon !== null && (
            <Icon
              name={item.icon}
              size={styles.iconSizes.sm}
              // Selected chips sit on the accent fill, where a category's own
              // mark colour would be close to unreadable.
              color="onAccent"
              tint={selected ? undefined : item.mark}
            />
          )}
          <Text variant="bodyStrong" color={selected ? 'onAccent' : 'primary'}>
            {item.label}
          </Text>
        </Pressable>
      );
    },
    [onSelect, selectedId, styles.chip, styles.chipSelected, styles.iconSizes.sm],
  );

  const keyExtractor = useCallback((item: Chip) => item.id ?? 'all', []);

  return (
    <View style={styles.bar}>
      {loading ? (
        <View style={styles.contentRow}>
          <Skeleton height={styles.metrics.control} width={styles.metrics.w72} borderRadius={styles.radii.pill} />
          <Skeleton height={styles.metrics.control} width={styles.metrics.w110} borderRadius={styles.radii.pill} />
          <Skeleton height={styles.metrics.control} width={styles.metrics.w90} borderRadius={styles.radii.pill} />
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
