import { useMemo } from 'react';
import { type Responsive, useResponsiveTokens } from './responsive';
import { type AppTheme } from './theme';
import { useTheme } from './ThemeProvider';

export type StyleFactory<T> = (appTheme: AppTheme, responsive: Responsive) => T;

/**
 * Build a component's StyleSheet **once per (theme, window size)** and share the
 * result across every instance that asks for it.
 *
 * This replaces `useThemedStyles`, which memoised per component INSTANCE. The
 * difference is not academic in this app: a masonry wall renders dozens of
 * `PromptTile`s at once, and each one was building and discarding its own copy
 * of an identical sheet — then doing it again for every other tile on a theme
 * toggle or a rotation. The cache lives with the factory, so all of them now
 * share one object.
 *
 * The key is theme mode plus window size because those are the only inputs a
 * factory reads: colours come from the first, every length from the second. It
 * is bounded because a device only ever visits a handful of postures — folded,
 * unfolded, rotated — and a stale entry costs more memory than the rebuild it
 * would save.
 *
 * Declare the hook AFTER the factory it wraps; a `const` factory is in the
 * temporal dead zone until its definition is evaluated:
 *
 *     const getStyles = (appTheme: AppTheme, responsive: Responsive) => {
 *       const { FONTSIZE, HScale, VScale, BORDER_RADIUS } = responsive;
 *       return { ...StyleSheet.create({ ... }), palette: p };
 *     };
 *     const useCardStyles = createStyles(getStyles);
 */
export function createStyles<T>(factory: StyleFactory<T>): () => T {
  const cache = new Map<string, T>();

  return function useStyles(): T {
    const appTheme = useTheme();
    const responsive = useResponsiveTokens();

    const key = `${appTheme.mode}|${responsive.width}x${responsive.height}`;

    return useMemo(() => {
      const hit = cache.get(key);
      if (hit !== undefined) {
        return hit;
      }
      if (cache.size >= 4) {
        cache.clear();
      }
      const sheet = factory(appTheme, responsive);
      cache.set(key, sheet);
      return sheet;
      /*
       * `appTheme` and `responsive` are deliberately not dependencies: `key`
       * already encodes every input the factory reads, and listing the objects
       * would rebuild on each render — which is the sharing this exists for.
       */
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key]);
  };
}
