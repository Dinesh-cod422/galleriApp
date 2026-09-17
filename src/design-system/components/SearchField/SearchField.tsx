import React, { memo, useCallback } from 'react';
import { StyleSheet, Pressable, TextInput, View } from 'react-native';

import { type AppTheme } from '../../theme/theme';
import { type Responsive } from '../../theme/responsive';
import { useTheme } from '../../theme/ThemeProvider';
import { createStyles } from '../../theme/createStyles';
import { Icon } from '../../icons/Icon';
import { layoutOf } from '../../theme/layout';
import { buildType, MAX_FONT_SCALE } from '../../theme/typography';

const getStyles = (appTheme: AppTheme, responsive: Responsive) => {
  const { HScale, IconSize } = responsive;
  const TYPE = buildType(responsive);
  const p = appTheme.colors;
  const layout = layoutOf(responsive);

  return {
    ...StyleSheet.create({
      root: {
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        gap: HScale.Width_9,
        backgroundColor: p.bg.subtle,
        borderRadius: 999,
        paddingHorizontal: HScale.Width_18,
        height: HScale.Width_55,
      },
      input: {
        flex: 1,
        // The field's own size, not the Text component's: a TextInput cannot take
        // a <Text> child, so the type scale has to be applied directly.
        fontSize: TYPE.body.fontSize,
        color: p.text.primary,
        // Android adds its own vertical padding that makes the row taller than the
        // 48pt it is supposed to be.
        paddingVertical: 0,
      },
      clear: {
        width: HScale.Width_32,
        height: HScale.Width_32,
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
        borderRadius: 999,
      },
    }),
    palette: p,
    iconSizes: { sm: IconSize.iconSize_18, md: IconSize.iconSize_20 },
    layout,
  };
};

const useStyles = createStyles(getStyles);

export type SearchFieldProps = {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  /** Focuses on mount — for a screen whose only purpose is to be typed into. */
  autoFocus?: boolean;
  onSubmit?: () => void;
  testID?: string;
};

/**
 * A single-line query field.
 *
 * The clear button only exists while there is something to clear: a permanent
 * one is a control that does nothing most of the time, and on a field this
 * narrow it would crowd the text it is meant to serve.
 */
const SearchFieldComponent = ({
  value,
  onChangeText,
  placeholder = 'Search prompts',
  autoFocus = false,
  onSubmit,
  testID,
}: SearchFieldProps): React.JSX.Element => {
  const styles = useStyles();
  const theme = useTheme();

  const clear = useCallback(() => {
    onChangeText('');
  }, [onChangeText]);

  return (
    <View style={styles.root}>
      <Icon name="search" size={styles.iconSizes.md} color="tertiary" strokeWidth={2} />
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={styles.palette.text.tertiary}
        // The field is a FIXED `control.xl` box with no vertical padding, so
        // unclamped OS text scaling clips the value the user is typing — and
        // left off here, the input would scale past the <Text> beside it.
        maxFontSizeMultiplier={MAX_FONT_SCALE}
        autoFocus={autoFocus}
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
        onSubmitEditing={onSubmit}
        // iOS only, and worth it: the grey field gets the keyboard that matches
        // it in dark mode instead of a white one.
        keyboardAppearance={theme.mode === 'dark' ? 'dark' : 'light'}
        accessibilityLabel={placeholder}
        testID={testID}
      />
      {value.length > 0 && (
        <Pressable
          onPress={clear}
          style={styles.clear}
          accessibilityRole="button"
          accessibilityLabel="Clear search"
          hitSlop={styles.layout.hitSlop}
          testID={testID === undefined ? undefined : `${testID}-clear`}>
          <Icon name="close" size={styles.iconSizes.sm} color="secondary" strokeWidth={2.4} />
        </Pressable>
      )}
    </View>
  );
};

export const SearchField = memo(SearchFieldComponent);
SearchField.displayName = 'SearchField';
