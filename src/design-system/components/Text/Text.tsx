import React, { memo } from 'react';
import { Text as RNText, type StyleProp, type TextProps as RNTextProps, type TextStyle } from 'react-native';

import { createStyles } from '../../theme/createStyles';
import { type Responsive } from '../../theme/responsive';
import { type AppTheme } from '../../theme/theme';
import { buildType, MAX_FONT_SCALE, type TextVariant } from '../../theme/typography';

/**
 * The ramp is built ONCE per (mode, window) and shared by every <Text> in the
 * tree — which, on a wall of prompt cards, is a few hundred of them.
 */
const getStyles = (appTheme: AppTheme, responsive: Responsive) => ({
  type: buildType(responsive),
  palette: appTheme.colors,
});
const useStyles = createStyles(getStyles);

/**
 * The ONLY text primitive in the app.
 *
 * Screens choose a semantic variant ("title", "caption"), never a font size.
 * That is what makes the tablet type scale a one-line change in the theme
 * instead of a search-and-replace across every screen.
 */
export type TextColorToken =
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'inverse'
  | 'onAccent'
  | 'danger'
  | 'accent';

export type AppTextProps = Omit<RNTextProps, 'style'> & {
  variant?: TextVariant;
  color?: TextColorToken;
  align?: TextStyle['textAlign'];
  style?: StyleProp<TextStyle>;
  children?: React.ReactNode;
};

const TextComponent = ({
  variant = 'body',
  color = 'primary',
  align,
  style,
  children,
  ...rest
}: AppTextProps): React.JSX.Element => {
  const styles = useStyles();
  const resolvedColor =
    color === 'accent' ? styles.palette.accent.ink : styles.palette.text[color];

  return (
    <RNText
      // Keeps an OS huge-text setting from breaking card layouts while still
      // honouring it. See MAX_FONT_SCALE — the same ceiling SearchField uses.
      maxFontSizeMultiplier={MAX_FONT_SCALE}
      {...rest}
      style={[styles.type[variant], { color: resolvedColor, textAlign: align }, style]}>
      {children}
    </RNText>
  );
};

export const Text = memo(TextComponent);
Text.displayName = 'Text';
