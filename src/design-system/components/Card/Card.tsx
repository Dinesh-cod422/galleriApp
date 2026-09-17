import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { type ShadowToken } from '../../theme/shadows';
import { type AppTheme } from '../../theme/theme';
import { type Responsive } from '../../theme/responsive';
import { createStyles } from '../../theme/createStyles';

const getStyles = (appTheme: AppTheme, responsive: Responsive) => {
  const { BORDER_RADIUS } = responsive;
  const p = appTheme.colors;

  return {
    ...StyleSheet.create({
      root: {
        backgroundColor: p.bg.surface,
        borderRadius: BORDER_RADIUS.radius_41,
        borderWidth: 1,
        borderColor: p.border.subtle,
        overflow: 'hidden' as const,
      },
    }),
    palette: p,
    shadows: appTheme.shadows,
  };
};

const useStyles = createStyles(getStyles);

export type CardProps = {
  children: React.ReactNode;
  elevation?: ShadowToken;
  style?: StyleProp<ViewStyle>;
};

/**
 * A surface, nothing more. Deliberately NOT pressable: making Card handle
 * presses would push every consumer into passing through touch props it does
 * not need. Composition instead — wrap a Card in a Pressable when you need one.
 */
export const Card = ({ children, elevation = 'sm', style }: CardProps): React.JSX.Element => {
  const styles = useStyles();

  return <View style={[styles.root, styles.shadows[elevation], style]}>{children}</View>;
};
