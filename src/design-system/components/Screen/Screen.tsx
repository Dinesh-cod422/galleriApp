import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { type Edge, SafeAreaView } from 'react-native-safe-area-context';

import { useResponsive } from '../../responsive/useResponsive';
import { AmbientBackground } from '../AmbientBackground/AmbientBackground';
import { type AppTheme } from '../../theme/theme';
import { type Responsive } from '../../theme/responsive';
import { createStyles } from '../../theme/createStyles';
import { layoutOf } from '../../theme/layout';

const getStyles = (appTheme: AppTheme, responsive: Responsive) => {
  const layout = layoutOf(responsive);
  const p = appTheme.colors;

  return {
    ...StyleSheet.create({
      safeArea: {
        flex: 1,
        backgroundColor: p.bg.canvas,
      },
      content: {
        flex: 1,
        width: '100%' as const,
        alignSelf: 'center' as const,
      },
      gutter: {
        paddingHorizontal: layout.gutter,
      },
    }),
    palette: p,
  };
};

const useStyles = createStyles(getStyles);

export type ScreenProps = {
  children: React.ReactNode;
  /** Apply the standard horizontal gutter. Off for full-bleed lists. */
  padded?: boolean;
  /**
   * The brand wash behind the content. On everywhere by default — it is what
   * stops the canvas between cards reading as flat grey chrome — and off only
   * where something else already owns the full background.
   */
  ambient?: boolean;
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
  ambient = true,
  edges = ['top'],
  style,
  testID,
}: ScreenProps): React.JSX.Element => {
  const styles = useStyles();
  const { maxContentWidth } = useResponsive();

  return (
    <SafeAreaView style={styles.safeArea} edges={edges} testID={testID}>
      {/* First child, so it paints behind everything the screen renders. */}
      {ambient && <AmbientBackground />}
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
