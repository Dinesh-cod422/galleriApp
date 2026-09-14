import React, { memo, useCallback } from 'react';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from 'react-native-reanimated';

import { haptics } from '@infra/haptics/haptics';
import { Icon, IconButton } from '@ds';

import { useIsFavorite, useToggleFavorite } from '../stores/favoritesStore';

const POP_OUT = { damping: 8, stiffness: 500, mass: 0.5 };
const POP_BACK = { damping: 14, stiffness: 380, mass: 0.5 };

export type FavoriteButtonProps = {
  promptId: string;
  /** Accessible name needs the subject — "Favorite" alone says nothing in a grid. */
  promptTitle: string;
};

/**
 * The only control on a gallery tile.
 *
 * It reads its own state from the store rather than taking an `isFavorite`
 * prop, which is what keeps favouriting cheap: the selector returns one
 * boolean, so pressing this heart re-renders this button and nothing else —
 * not the tile, not its siblings, not the grid.
 */
const FavoriteButtonComponent = ({
  promptId,
  promptTitle,
}: FavoriteButtonProps): React.JSX.Element => {
  const isFavorite = useIsFavorite(promptId);
  const toggle = useToggleFavorite();
  const scale = useSharedValue(1);

  // The spring is driven from a shared value inside a worklet, so the pop runs
  // on the UI thread and survives a mid-scroll tap without dropping frames.
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const onPress = useCallback(() => {
    scale.value = withSequence(withSpring(1.25, POP_OUT), withSpring(1, POP_BACK));
    haptics.trigger('selection');
    toggle(promptId);
  }, [promptId, scale, toggle]);

  return (
    <IconButton
      variant="overlay"
      onPress={onPress}
      accessibilityLabel={
        isFavorite ? `Remove ${promptTitle} from favorites` : `Add ${promptTitle} to favorites`
      }
      testID={`favorite-${promptId}`}>
      <Animated.View style={animatedStyle}>
        <Icon
          name={isFavorite ? 'heartFilled' : 'heart'}
          size={20}
          // White, not `tertiary`: this sits on an arbitrary photograph behind
          // a scrim that is dark in both themes, so the icon cannot take its
          // colour from the theme's text ramp.
          color={isFavorite ? 'favorite' : 'onAccent'}
        />
      </Animated.View>
    </IconButton>
  );
};

export const FavoriteButton = memo(FavoriteButtonComponent);
FavoriteButton.displayName = 'FavoriteButton';
