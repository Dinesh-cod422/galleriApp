import React from 'react';
import { View } from 'react-native';

import { type Theme } from '../../theme/theme';
import { useThemedStyles } from '../../theme/useThemedStyles';

const styleFactory = (theme: Theme) => ({
  root: {
    height: 1,
    backgroundColor: theme.colors.border.subtle,
    width: '100%' as const,
  },
});

export const Divider = (): React.JSX.Element => {
  const styles = useThemedStyles(styleFactory);
  return <View style={styles.root} />;
};
