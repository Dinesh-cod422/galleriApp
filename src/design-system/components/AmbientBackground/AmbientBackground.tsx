import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { type AppTheme } from '../../theme/theme';
import { type Responsive } from '../../theme/responsive';
import { createStyles } from '../../theme/createStyles';

const getStyles = (appTheme: AppTheme, responsive: Responsive) => {
  const { HScale } = responsive;
  const p = appTheme.colors;

  return {
    ...StyleSheet.create({
      /**
       * Two oversized, very low-alpha brand circles bled off opposite corners.
       *
       * On a wall of photographs they are invisible behind the cards and only tint
       * the canvas showing between and around them — which is the part that
       * otherwise reads as flat grey chrome under a colourful grid.
       *
       * Sized from the spacing scale rather than from the window, so they grow with
       * the device like everything else and need no measurement pass.
       */
      root: {
        position: 'absolute' as const,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
      },
      top: {
        position: 'absolute' as const,
        top: -HScale.Width_74 * 2,
        right: -HScale.Width_74 * 1.5,
        width: HScale.Width_74 * 6,
        height: HScale.Width_74 * 5.5,
        borderRadius: HScale.Width_74 * 3,
        backgroundColor: p.bg.ambientTop,
      },
      bottom: {
        position: 'absolute' as const,
        bottom: -HScale.Width_74 * 2.5,
        left: -HScale.Width_74 * 1.5,
        width: HScale.Width_74 * 6,
        height: HScale.Width_74 * 5.5,
        borderRadius: HScale.Width_74 * 3,
        backgroundColor: p.bg.ambientBottom,
      },
    }),
    palette: p,
  };
};

const useStyles = createStyles(getStyles);

export type AmbientBackgroundProps = { testID?: string };

/**
 * The app's ambient canvas wash.
 *
 * A component rather than a style each screen repeats: it is painted by
 * `Screen`, so every screen gets the same treatment from one place and a
 * future change to the brand wash is one edit rather than nine.
 */
const AmbientBackgroundComponent = ({
  testID = 'ambient-background',
}: AmbientBackgroundProps): React.JSX.Element => {
  const styles = useStyles();

  return (
    // Never in the way of a touch meant for the content above it.
    <View style={styles.root} pointerEvents="none" testID={testID}>
      <View style={styles.top} />
      <View style={styles.bottom} />
    </View>
  );
};

export const AmbientBackground = memo(AmbientBackgroundComponent);
AmbientBackground.displayName = 'AmbientBackground';
