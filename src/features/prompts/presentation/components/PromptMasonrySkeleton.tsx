import React, { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  Skeleton,
  createStyles,
  layoutOf,
  useResponsive,
  type AppTheme,
  type Responsive,
} from '@ds';

/**
 * Fixed, not random. A skeleton whose tile heights reshuffle on every render
 * reads as a rendering glitch, and `Math.random()` in a render is exactly the
 * kind of impurity that breaks under React's double-invoke in StrictMode.
 *
 * The spread mirrors the real aspect ratios in the feed (2:3 … 16:9) so the
 * placeholder staggers the way the loaded grid will.
 */
const TILE_ASPECTS = [0.8, 1.5, 0.67, 1, 1.78, 0.75, 1.2, 0.9] as const;

const getStyles = (_appTheme: AppTheme, responsive: Responsive) => {
  const { BORDER_RADIUS, HScale, VScale } = responsive;
  const layout = layoutOf(responsive);

  return {
    ...StyleSheet.create({
      root: {
        flexDirection: 'row' as const,
        gap: layout.gridGap,
        paddingHorizontal: layout.gutter,
      },
      column: { flex: 1, gap: layout.gridGap },
      tile: { gap: HScale.Width_9 },
      meta: { gap: HScale.Width_2, paddingHorizontal: HScale.Width_2 },
    }),
    metrics: { lineSm: VScale.Height_14, line: VScale.Height_17 },
    radii: { lg: BORDER_RADIUS.radius_41 },
  };
};

const useStyles = createStyles(getStyles);

/**
 * Loading placeholder for PromptMasonryGrid. Mirrors the tile's real layout —
 * image, title line, author line — so nothing shifts when data arrives.
 * All instances share one shimmer clock (see ShimmerProvider).
 */
const PromptMasonrySkeletonComponent = ({ columns }: { columns?: number }): React.JSX.Element => {
  const styles = useStyles();
  const { gridColumns } = useResponsive();
  const columnCount = columns ?? gridColumns;

  // Dealt round-robin, which is how the real masonry layout fills columns.
  const dealt = useMemo(() => {
    const cols: number[][] = Array.from({ length: columnCount }, () => []);
    TILE_ASPECTS.forEach((aspect, i) => {
      cols[i % columnCount]?.push(aspect);
    });
    return cols;
  }, [columnCount]);

  return (
    <View style={styles.root}>
      {dealt.map((column, columnIndex) => (
        <View key={`col-${columnIndex}`} style={styles.column}>
          {column.map((aspect, tileIndex) => (
            <View key={`tile-${columnIndex}-${tileIndex}`} style={styles.tile}>
              <View style={{ aspectRatio: aspect }}>
                <Skeleton width="100%" height="100%" borderRadius={styles.radii.lg} />
              </View>
              <View style={styles.meta}>
                <Skeleton width="85%" />
                <Skeleton height={styles.metrics.lineSm} width="55%" />
              </View>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
};

export const PromptMasonrySkeleton = memo(PromptMasonrySkeletonComponent);
PromptMasonrySkeleton.displayName = 'PromptMasonrySkeleton';
