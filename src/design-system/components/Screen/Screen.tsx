import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { type Edge, SafeAreaView } from 'react-native-safe-area-context';

import { useResponsive } from '../../responsive/useResponsive';
import { type Theme } from '../../theme/theme';
import { useThemedStyles } from '../../theme/useThemedStyles';

const styleFactory = (theme: Theme) => ({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.bg.canvas,
  },
  content: {
    flex: 1,
    width: '100%' as const,
    alignSelf: 'center' as const,
  },
  gutter: {
    paddingHorizontal: theme.layout.gutter,
  },
});

export type ScreenProps = {
  children: React.ReactNode;
  /** Apply the standard horizontal gutter. Off for full-bleed lists. */
  padded?: boolean;
  edges?: readonly Edge[];
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * Every screen's outer shell: safe area, canvas background, and — on tablets —
 * a max content width so a gallery does not stretch to 1200dp of unreadable
 * line length. Screens never re-implement any of this.
 */
export const Screen = ({
  children,
  padded = false,
  edges = ['top'],
  style,
  testID,
}: ScreenProps): React.JSX.Element => {
  const styles = useThemedStyles(styleFactory);
  const { maxContentWidth } = useResponsive();

  return (
    <SafeAreaView style={styles.safeArea} edges={edges} testID={testID}>
      <View
        style={[
          styles.content,
          Number.isFinite(maxContentWidth) && { maxWidth: maxContentWidth },
          padded && styles.gutter,
          style,
        ]}>
        {children}
      </View>
    </SafeAreaView>
  );
};
