import React, { memo } from 'react';
import { Text as RNText, type StyleProp, type TextProps as RNTextProps, type TextStyle } from 'react-native';

import { useTheme } from '../../theme/ThemeProvider';
import { type TextVariant } from '../../theme/typography';

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
  const theme = useTheme();
  const resolvedColor =
    color === 'accent' ? theme.colors.accent.default : theme.colors.text[color];

  return (
    <RNText
      // `maxFontSizeMultiplier` keeps OS-level huge-text settings from breaking
      // card layouts, while still honouring accessibility scaling up to 1.4x.
      maxFontSizeMultiplier={1.4}
      {...rest}
      style={[theme.typography[variant], { color: resolvedColor, textAlign: align }, style]}>
      {children}
    </RNText>
  );
};

export const Text = memo(TextComponent);
Text.displayName = 'Text';
