import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { APP_NAME, APP_TAGLINE } from '@core/config/brand';
import {
  BrandMark,
  Icon,
  IconButton,
  Text,
  createStyles,
  layoutOf,
  type AppTheme,
  type Responsive,
} from '@ds';

const getStyles = (appTheme: AppTheme, responsive: Responsive) => {
  const { BORDER_RADIUS, HScale, IconSize, VScale } = responsive;
  const layout = layoutOf(responsive);
  const p = appTheme.colors;

  return {
    ...StyleSheet.create({
      root: {
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        paddingHorizontal: layout.gutter,
        paddingTop: VScale.Height_9,
        paddingBottom: VScale.Height_14,
        gap: HScale.Width_14,
      },
      // No wrapper box: the mark draws its own rounded tile, so a View behind it
      // would only be a second, slightly-different rounded rectangle.
      logo: { borderRadius: BORDER_RADIUS.radius_41, overflow: 'hidden' as const },
      // Title and subtitle share a column so the two icon buttons align to the
      // block as a whole rather than to the title's baseline.
      identity: { flex: 1 },
      // A one-point optical nudge, not a spacing step: it closes the gap the
      // title's descenders open under it. Borrowed from the stroke ramp, which is
      // the only scale with a 1dp step — nothing in the LAYOUT should be 1dp.
      subtitle: { marginTop: 1 },
      actions: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: HScale.Width_9 },
      action: {
        width: HScale.Width_51,
        height: HScale.Width_51,
        borderRadius: 999,
        backgroundColor: p.bg.subtle,
      },
      // Sits on the button's edge rather than inside it: the glyph already fills
      // the circle, and a dot placed within would crowd it.
      dot: {
        position: 'absolute' as const,
        top: HScale.Width_2,
        right: HScale.Width_2,
        width: HScale.Width_12,
        height: HScale.Width_12,
        borderRadius: HScale.Width_12 / 2,
        backgroundColor: p.accent.default,
        borderWidth: 2,
        borderColor: p.bg.canvas,
      },
      actionWrap: { position: 'relative' as const },
    }),
    palette: p,
    iconSizes: { lg: IconSize.iconSize_24 },
    metrics: { w14: HScale.Width_16, w46: HScale.Width_53 },
  };
};

const useStyles = createStyles(getStyles);

export type GalleryHeaderProps = {
  onPressSearch: () => void;
  onPressFilter: () => void;
  /**
   * Marks the filter button when the feed is not in its default state.
   *
   * Without it, a sort chosen in a sheet that then closes leaves no trace: the
   * feed reorders and the control that did it looks untouched, so the change
   * reads as the app rearranging itself.
   */
  isFiltered?: boolean;
};

/**
 * The gallery's masthead: brand mark, wordmark, and the two controls that act
 * on the whole feed.
 *
 * It scrolls away with nothing — it sits above the grid, outside the scroll
 * view, because search and filter are how you steer an endless wall and both
 * have to stay reachable at any scroll depth (the same reasoning that pins the
 * category row).
 */
const GalleryHeaderComponent = ({
  onPressSearch,
  onPressFilter,
  isFiltered = false,
}: GalleryHeaderProps): React.JSX.Element => {
  const styles = useStyles();

  return (
    <View style={styles.root} testID="gallery-header">
      {/* The launcher icon's own artwork, not a stand-in. It previously drew a
          heart, which meant the mark on the home screen and the mark inside the
          app were two different logos. */}
      <View style={styles.logo}>
        <BrandMark size={styles.metrics.w46} radius={styles.metrics.w14} testID="brand-mark" />
      </View>

      <View style={styles.identity}>
        <Text variant="h2" numberOfLines={1}>
          {APP_NAME}
        </Text>
        <Text variant="caption" color="secondary" numberOfLines={1} style={styles.subtitle}>
          {APP_TAGLINE}
        </Text>
      </View>

      <View style={styles.actions}>
        <IconButton
          variant="surface"
          style={styles.action}
          onPress={onPressSearch}
          accessibilityLabel="Search prompts"
          testID="header-search">
          <Icon name="search" size={styles.iconSizes.lg} color="primary" strokeWidth={2} />
        </IconButton>
        <View style={styles.actionWrap}>
          <IconButton
            variant="surface"
            style={styles.action}
            onPress={onPressFilter}
            accessibilityLabel={isFiltered ? 'Change sorting, filters applied' : 'Sort prompts'}
            testID="header-filter">
            <Icon name="sliders" size={styles.iconSizes.lg} color="primary" strokeWidth={2} />
          </IconButton>
          {isFiltered && <View style={styles.dot} testID="header-filter-dot" />}
        </View>
      </View>
    </View>
  );
};

export const GalleryHeader = memo(GalleryHeaderComponent);
GalleryHeader.displayName = 'GalleryHeader';
