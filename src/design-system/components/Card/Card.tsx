import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { type ShadowToken } from '../../theme/shadows';
import { type Theme } from '../../theme/theme';
import { useTheme } from '../../theme/ThemeProvider';
import { useThemedStyles } from '../../theme/useThemedStyles';

const styleFactory = (theme: Theme) => ({
  root: {
    backgroundColor: theme.colors.bg.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border.subtle,
    overflow: 'hidden' as const,
  },
});

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
  const styles = useThemedStyles(styleFactory);
  const theme = useTheme();

  return <View style={[styles.root, theme.shadows[elevation], style]}>{children}</View>;
};
