import React, { memo } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import FastImage, { type ResizeMode } from '@d11/react-native-fast-image';

import { type Theme } from '../../theme/theme';
import { useTheme } from '../../theme/ThemeProvider';
import { useThemedStyles } from '../../theme/useThemedStyles';

/**
 * The app's single image primitive.
 *
 * Wrapping the image library matters more than usual here: this is an
 * image-heavy gallery, and the choice of library (FastImage today, possibly
 * expo-image later) is exactly the kind of decision that should not be
 * duplicated across 40 call sites. Screens say "show this image at this
 * priority"; only this file knows who draws it.
 *
 * Performance notes:
 *  - FastImage keeps a native memory + disk cache, so a thumbnail already seen
 *    in a list is not re-downloaded or re-decoded on the detail screen.
 *  - `priority` lets above-the-fold imagery jump the queue while off-screen
 *    cells wait, which keeps the first paint fast on a slow connection.
 *  - The placeholder background prevents a white flash in dark mode and, with
 *    a fixed aspect ratio, removes layout shift as images resolve.
 */
export type ImagePriority = 'low' | 'normal' | 'high';

export type AppImageProps = {
  uri: string;
  /** Width / height. Fixing this is what prevents layout shift in lists. */
  aspectRatio?: number;
  priority?: ImagePriority;
  /**
   * Crossfade when the source changes. The detail screen paints a cached
   * thumbnail on the first frame and swaps the full-resolution file in moments
   * later; a hard cut between the two reads as a glitch.
   */
  transition?: 'fade' | 'none';
  resizeMode?: ResizeMode;
  borderRadius?: number;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

const styleFactory = (theme: Theme) => ({
  container: {
    overflow: 'hidden' as const,
    backgroundColor: theme.colors.bg.imagePlaceholder,
  },
  image: {
    width: '100%' as const,
    height: '100%' as const,
  },
});

const AppImageComponent = ({
  uri,
  aspectRatio,
  priority = 'normal',
  transition = 'none',
  resizeMode = 'cover',
  borderRadius,
  accessibilityLabel,
  style,
  testID,
}: AppImageProps): React.JSX.Element => {
  const styles = useThemedStyles(styleFactory);
  const theme = useTheme();

  return (
    <View
      testID={testID}
      style={[
        styles.container,
        { borderRadius: borderRadius ?? theme.radius.md },
        aspectRatio != null && { aspectRatio },
        style,
      ]}>
      <FastImage
        accessible={accessibilityLabel != null}
        accessibilityLabel={accessibilityLabel}
        style={styles.image}
        resizeMode={resizeMode}
        transition={transition}
        source={{ uri, priority, cache: 'immutable' }}
      />
    </View>
  );
};

export const AppImage = memo(AppImageComponent);
AppImage.displayName = 'AppImage';
