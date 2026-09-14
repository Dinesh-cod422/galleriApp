import React, { memo, useMemo } from 'react';
import { View } from 'react-native';

import { Skeleton, type Theme, useResponsive, useTheme, useThemedStyles } from '@ds';

/**
 * Fixed, not random. A skeleton whose tile heights reshuffle on every render
 * reads as a rendering glitch, and `Math.random()` in a render is exactly the
 * kind of impurity that breaks under React's double-invoke in StrictMode.
 *
 * The spread mirrors the real aspect ratios in the feed (2:3 … 16:9) so the
 * placeholder staggers the way the loaded grid will.
 */
const TILE_ASPECTS = [0.8, 1.5, 0.67, 1, 1.78, 0.75, 1.2, 0.9] as const;

const styleFactory = (theme: Theme) => ({
  root: {
    flexDirection: 'row' as const,
    gap: theme.layout.gridGap,
    paddingHorizontal: theme.layout.gutter,
  },
  column: { flex: 1, gap: theme.layout.gridGap },
  tile: { gap: theme.spacing.sm },
  meta: { gap: theme.spacing.xxs, paddingHorizontal: theme.spacing.xxs },
});

/**
 * Loading placeholder for PromptMasonryGrid. Mirrors the tile's real layout —
 * image, title line, author line — so nothing shifts when data arrives.
 * All instances share one shimmer clock (see ShimmerProvider).
 */
const PromptMasonrySkeletonComponent = ({ columns }: { columns?: number }): React.JSX.Element => {
  const styles = useThemedStyles(styleFactory);
  const theme = useTheme();
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
                <Skeleton width="100%" height="100%" borderRadius={theme.radius.lg} />
              </View>
              <View style={styles.meta}>
                <Skeleton height={14} width="85%" />
                <Skeleton height={12} width="55%" />
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
