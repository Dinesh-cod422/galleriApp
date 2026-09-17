import React, { forwardRef, memo } from 'react';
import { StyleSheet, Pressable, View } from 'react-native';

import { BottomSheet, type BottomSheetRef, Icon, Text, type AppTheme, createStyles, type Responsive } from '@ds';

import { type PromptSort } from '../../domain/repositories/PromptRepository';
import { FEED_SORTS } from '../sections';

const getStyles = (appTheme: AppTheme, responsive: Responsive) => {
  const { BORDER_RADIUS, HScale, IconSize, VScale } = responsive;
  const p = appTheme.colors;

  return {
    ...StyleSheet.create({
      option: {
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        gap: HScale.Width_18,
        paddingVertical: VScale.Height_14,
        paddingHorizontal: HScale.Width_9,
        borderRadius: BORDER_RADIUS.radius_26,
      },
      optionSelected: { backgroundColor: p.bg.subtle },
      glyph: {
        width: HScale.Width_46,
        height: HScale.Width_46,
        borderRadius: 999,
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
        backgroundColor: p.bg.subtle,
      },
      // Selected swaps the tint so the chosen row reads as filled rather than
      // relying on the tick alone, which is easy to miss at the end of a row.
      glyphSelected: { backgroundColor: p.accent.default },
      labels: { flex: 1 },
    }),
    palette: p,
    iconSizes: { md: IconSize.iconSize_20 },
  };
};

const useStyles = createStyles(getStyles);

export type PromptFilterSheetProps = {
  selected: PromptSort;
  onSelect: (sort: PromptSort) => void;
};

/**
 * How the feed is ordered.
 *
 * A sheet rather than a row of chips because the category row directly under
 * the masthead is already a row of chips — a second one would read as more
 * categories. Sorting is a different axis, so it gets a different surface.
 *
 * Choosing dismisses the sheet. A sheet with one control and a separate Apply
 * button makes the user confirm a decision they have already expressed.
 */
const PromptFilterSheetComponent = forwardRef<BottomSheetRef, PromptFilterSheetProps>(
  ({ selected, onSelect }, ref) => {
    const styles = useStyles();

    return (
      <BottomSheet ref={ref} title="Sort by" snapPoints={['62%']}>
        {FEED_SORTS.map(option => {
          const isSelected = option.sort === selected;
          return (
            <Pressable
              key={option.sort}
              onPress={() => onSelect(option.sort)}
              style={[styles.option, isSelected && styles.optionSelected]}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`${option.title}. ${option.description}`}
              testID={`sort-${option.sort}`}>
              <View style={[styles.glyph, isSelected && styles.glyphSelected]}>
                <Icon
                  name={option.icon}
                  size={styles.iconSizes.md}
                  color={isSelected ? 'onAccent' : 'secondary'}
                  strokeWidth={2}
                />
              </View>
              <View style={styles.labels}>
                <Text variant="bodyStrong">{option.title}</Text>
                <Text variant="caption" color="secondary">
                  {option.description}
                </Text>
              </View>
              {isSelected && <Icon name="check" size={styles.iconSizes.md} color="accent" strokeWidth={2.4} />}
            </Pressable>
          );
        })}
      </BottomSheet>
    );
  },
);

PromptFilterSheetComponent.displayName = 'PromptFilterSheet';
export const PromptFilterSheet = memo(PromptFilterSheetComponent);
