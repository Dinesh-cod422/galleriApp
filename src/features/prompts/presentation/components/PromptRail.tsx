import React, { memo, useCallback } from 'react';
import { FlatList, Pressable, View, type ListRenderItemInfo } from 'react-native';

import { Icon, Skeleton, Text, type Theme, useTheme, useThemedStyles } from '@ds';

import { type PromptCardVm } from '../mappers/toPromptCardVm';
import { PromptTile } from './PromptTile';

// Narrower than a grid cell: with no caption block the image carries the whole
// cell, so a smaller tile still reads and more of them fit on screen.
const CARD_WIDTH = 200;
/** One ratio for every rail cell — see PromptCardProps.aspectRatio. */
const CARD_ASPECT = 4 / 3;
const SHOW_ALL_WIDTH = 150;
/** Matches the cards' image block, so the strip reads as one row. */
const SHOW_ALL_HEIGHT = CARD_WIDTH / CARD_ASPECT;

const styleFactory = (theme: Theme) => ({
  section: { gap: theme.spacing.sm },
  // React Native's ScrollView base style is `flexGrow: 1`, so a horizontal list
  // expands to its parent's height instead of hugging its content. Inside a
  // tall container (here, a FlashList header) that leaves a block of dead space
  // under the row — and stretches the cells themselves if they can grow.
  list: { flexGrow: 0 },

  header: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingHorizontal: theme.layout.gutter,
  },
  content: {
    paddingHorizontal: theme.layout.gutter,
    gap: theme.spacing.md,
    // A horizontal list's content container is a flex row, and a row stretches
    // its children to its own height by default. Without this, every card grows
    // to the rail's full height and the metadata floats above a tall void.
    alignItems: 'flex-start' as const,
  },
  contentRow: {
    flexDirection: 'row' as const,
    paddingHorizontal: theme.layout.gutter,
    gap: theme.spacing.md,
    alignItems: 'flex-start' as const,
  },
  showAll: {
    width: SHOW_ALL_WIDTH,
    height: SHOW_ALL_HEIGHT,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: theme.spacing.xs,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border.subtle,
    backgroundColor: theme.colors.bg.subtle,
  },
});

export type PromptRailProps = {
  title: string;
  items: readonly PromptCardVm[];
  loading: boolean;
  onPressPrompt: (promptId: string) => void;
  /**
   * Renders the tenth cell — the strip shows nine prompts and then a way into
   * the full list. Omit it and the rail simply ends after the ninth.
   */
  onShowAll?: () => void;
};

/**
 * FlatList rather than FlashList here on purpose: a rail holds ~8-10 cells,
 * which never recycles enough to repay FlashList's size-estimate tuning.
 */
const PromptRailComponent = ({
  title,
  items,
  loading,
  onPressPrompt,
  onShowAll,
}: PromptRailProps): React.JSX.Element => {
  const styles = useThemedStyles(styleFactory);
  const theme = useTheme();

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<PromptCardVm>) => (
      <PromptTile vm={item} onPress={onPressPrompt} width={CARD_WIDTH} aspectRatio={CARD_ASPECT} />
    ),
    [onPressPrompt],
  );

  const keyExtractor = useCallback((item: PromptCardVm) => item.id, []);

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text variant="h2">{title}</Text>
      </View>

      {loading ? (
        <View style={styles.contentRow}>
          <Skeleton width={CARD_WIDTH} height={SHOW_ALL_HEIGHT} borderRadius={theme.radius.lg} />
          <Skeleton width={CARD_WIDTH} height={SHOW_ALL_HEIGHT} borderRadius={theme.radius.lg} />
        </View>
      ) : (
        <FlatList
          horizontal
          style={styles.list}
          data={items}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.content}
          // Only the visible card or two mount up front; the rest fill in.
          initialNumToRender={3}
          windowSize={5}
          removeClippedSubviews
          ListFooterComponent={
            onShowAll === undefined ? undefined : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Show all ${title.toLowerCase()} prompts`}
                testID={`show-all-${title.toLowerCase().replace(/\s+/g, '-')}`}
                style={styles.showAll}
                onPress={onShowAll}>
                <Icon name="chevronRight" size={22} color="accent" />
                <Text variant="label" color="accent">
                  Show all
                </Text>
              </Pressable>
            )
          }
        />
      )}
    </View>
  );
};

export const PromptRail = memo(PromptRailComponent);
PromptRail.displayName = 'PromptRail';
