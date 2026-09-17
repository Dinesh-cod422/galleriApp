import React, { memo, useCallback, useEffect, useState } from 'react';
import { Pressable, useWindowDimensions, View, type TextLayoutEvent } from 'react-native';

import { useTheme } from '../../theme/ThemeProvider';
import { type Theme } from '../../theme/theme';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { type TextVariant } from '../../theme/typography';
import { Text, type TextColorToken } from '../Text/Text';

export type ExpandableTextProps = {
  readonly children: string;
  /** Lines shown before the toggle appears. */
  readonly numberOfLines?: number;
  readonly variant?: TextVariant;
  readonly color?: TextColorToken;
  readonly selectable?: boolean;
  readonly expandLabel?: string;
  readonly collapseLabel?: string;
  readonly testID?: string;
};

const styleFactory = (theme: Theme) => ({
  /**
   * An off-screen copy used only to count lines.
   *
   * It cannot be measured from the visible copy: once `numberOfLines` clamps
   * that one, onTextLayout reports the CLAMPED lines, so a 40-line prompt and
   * an 8-line prompt both report 7 and the toggle could never be shown
   * correctly. This copy is never clamped, so its count is the true one.
   */
  measure: {
    position: 'absolute' as const,
    left: 0,
    right: 0,
    top: 0,
    opacity: 0,
  },
  toggle: { paddingTop: theme.spacing.sm, alignSelf: 'flex-start' as const },
});

/**
 * Long text, clamped, with a toggle that appears ONLY when there is something
 * hidden. A "Show more" under a three-line prompt is a lie the user has to tap
 * to disprove.
 */
const ExpandableTextComponent = ({
  children,
  numberOfLines = 7,
  variant = 'body',
  color = 'primary',
  selectable = false,
  expandLabel = 'Show more…',
  collapseLabel = 'Show less',
  testID,
}: ExpandableTextProps): React.JSX.Element => {
  const styles = useThemedStyles(styleFactory);
  const theme = useTheme();
  const { width, fontScale } = useWindowDimensions();
  const [totalLines, setTotalLines] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(false);

  // Re-measure when anything that changes how the text wraps changes. Without
  // this a rotation, or the next prompt, would reuse a stale line count.
  useEffect(() => {
    setTotalLines(null);
    setExpanded(false);
  }, [children, width, fontScale]);

  const onTextLayout = useCallback((event: TextLayoutEvent) => {
    setTotalLines(event.nativeEvent.lines.length);
  }, []);

  const toggle = useCallback(() => {
    setExpanded(current => !current);
  }, []);

  const overflows = totalLines !== null && totalLines > numberOfLines;

  return (
    <View testID={testID}>
      {/* Clamped from the very first frame — measuring first would flash the
          full text and then collapse it. */}
      <Text
        variant={variant}
        color={color}
        selectable={selectable}
        numberOfLines={expanded ? undefined : numberOfLines}>
        {children}
      </Text>

      {totalLines === null && (
        <Text
          variant={variant}
          style={styles.measure}
          onTextLayout={onTextLayout}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants">
          {children}
        </Text>
      )}

      {overflows && (
        <Pressable
          onPress={toggle}
          style={styles.toggle}
          hitSlop={theme.spacing.sm}
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          testID={testID === undefined ? undefined : `${testID}-toggle`}>
          <Text variant="label" color="accent">
            {expanded ? collapseLabel : expandLabel}
          </Text>
        </Pressable>
      )}
    </View>
  );
};

export const ExpandableText = memo(ExpandableTextComponent);
ExpandableText.displayName = 'ExpandableText';
