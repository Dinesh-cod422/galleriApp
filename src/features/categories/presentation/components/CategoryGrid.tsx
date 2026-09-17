import React, { memo } from 'react';
import { StyleSheet, Pressable, View } from 'react-native';

import {
  Icon,
  Skeleton,
  Text,
  createStyles,
  layoutOf,
  useTheme,
  type AppTheme,
  type Responsive,
} from '@ds';

import { type Category } from '../../domain/entities/Category';
import { categoryIcon, categoryMarkColor } from '../categoryMark';

const SKELETON_TILES = 6;

const getStyles = (appTheme: AppTheme, responsive: Responsive) => {
  const { BORDER_RADIUS, HScale, IconSize, VScale } = responsive;
  const layout = layoutOf(responsive);
  const p = appTheme.colors;

  return {
    ...StyleSheet.create({
      grid: {
        flexDirection: 'row' as const,
        flexWrap: 'wrap' as const,
        gap: HScale.Width_14,
        paddingHorizontal: layout.gutter,
      },
      /**
       * Two per row, sized by percentage rather than by a measured width.
       *
       * `48%` with a gap leaves the row slightly under-full, which is what lets the
       * same tile work on a phone and a tablet without measuring anything — the
       * alternative is an onLayout pass that reflows on the first frame.
       */
      tile: {
        width: '48%' as const,
        borderRadius: BORDER_RADIUS.radius_41,
        padding: HScale.Width_18,
        gap: HScale.Width_9,
        backgroundColor: p.bg.surface,
        borderWidth: 1,
        borderColor: p.border.subtle,
      },
      glyph: {
        width: HScale.Width_51,
        height: HScale.Width_51,
        borderRadius: BORDER_RADIUS.radius_26,
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
      },
      count: { marginTop: -VScale.Height_2 },
    }),
    palette: p,
    iconSizes: { lg: IconSize.iconSize_24 },
    metrics: { tile: VScale.Height_123 },
    radii: { lg: BORDER_RADIUS.radius_41 },
  };
};

const useStyles = createStyles(getStyles);

export type CategoryGridProps = {
  categories: readonly Category[];
  loading: boolean;
  onPress: (category: Category) => void;
};

/**
 * Every category at once, as a browsable wall.
 *
 * The chip row on Home is a FILTER — one line, scrolls sideways, and hides most
 * of the set off-screen. This is the opposite job: showing the whole shape of
 * the library, which is what someone opening Explore is asking for.
 *
 * No cover images. The data carries `coverUrl`, but they are picsum
 * placeholders — stock photographs of nothing, next to a grid of real
 * generated art. A tinted glyph says "category" honestly; a random landscape
 * says the category is about landscapes.
 */
const CategoryGridComponent = ({
  categories,
  loading,
  onPress,
}: CategoryGridProps): React.JSX.Element => {
  const styles = useStyles();
  const theme = useTheme();

  if (loading) {
    return (
      <View style={styles.grid} testID="category-grid-loading">
        {Array.from({ length: SKELETON_TILES }, (_, i) => (
          <Skeleton key={i} height={styles.metrics.tile} width="48%" borderRadius={styles.radii.lg} />
        ))}
      </View>
    );
  }

  return (
    <View style={styles.grid} testID="category-grid">
      {categories.map(category => {
        const icon = categoryIcon(category);
        const mark = categoryMarkColor(category, theme);
        return (
          <Pressable
            key={category.id}
            style={styles.tile}
            onPress={() => onPress(category)}
            accessibilityRole="button"
            accessibilityLabel={`${category.name}, ${category.promptCount} prompts`}
            testID={`category-tile-${category.id}`}>
            <View style={[styles.glyph, { backgroundColor: `${mark}1A` }]}>
              <Icon name={icon ?? 'grid'} size={styles.iconSizes.lg} tint={mark} strokeWidth={2} />
            </View>
            <Text variant="bodyStrong" numberOfLines={1}>
              {category.name}
            </Text>
            <Text variant="caption" color="secondary" style={styles.count}>
              {`${category.promptCount} ${category.promptCount === 1 ? 'prompt' : 'prompts'}`}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};

export const CategoryGrid = memo(CategoryGridComponent);
CategoryGrid.displayName = 'CategoryGrid';
