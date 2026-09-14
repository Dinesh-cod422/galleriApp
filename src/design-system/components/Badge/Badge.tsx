import React, { memo } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { type Theme } from '../../theme/theme';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { Text } from '../Text/Text';

export type BadgeTone =
  | 'neutral'
  | 'accent'
  | 'success'
  | 'danger'
  // Editorial status tags. Unlike the tones above these are tinted fills: a
  // tag has to survive being laid over a photograph, and a label alone does
  // not. They stay soft — a saturated fill would compete with the image.
  | 'featured'
  | 'trending'
  | 'fresh';

const styleFactory = (theme: Theme) => ({
  root: {
    alignSelf: 'flex-start' as const,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xxs,
    borderRadius: theme.radius.pill,
  },
  neutralBg: { backgroundColor: theme.colors.bg.subtle },
  accentBg: { backgroundColor: theme.colors.accent.subtle },
  successBg: { backgroundColor: theme.colors.bg.subtle },
  dangerBg: { backgroundColor: theme.colors.bg.subtle },
  featuredBg: { backgroundColor: theme.colors.tag.featured.bg },
  trendingBg: { backgroundColor: theme.colors.tag.trending.bg },
  freshBg: { backgroundColor: theme.colors.tag.fresh.bg },

  // Tone is carried by the label colour. The two status tones share the
  // neutral background on purpose — a filled red pill reads as an error,
  // which is louder than a badge should ever be.
  neutralText: { color: theme.colors.text.secondary },
  accentText: { color: theme.colors.accent.onSubtle },
  successText: { color: theme.colors.status.success },
  dangerText: { color: theme.colors.status.danger },
  featuredText: { color: theme.colors.tag.featured.fg },
  trendingText: { color: theme.colors.tag.trending.fg },
  freshText: { color: theme.colors.tag.fresh.fg },
});

const BadgeComponent = ({
  label,
  tone = 'neutral',
  style,
}: {
  label: string;
  tone?: BadgeTone;
  style?: StyleProp<ViewStyle>;
}): React.JSX.Element => {
  const styles = useThemedStyles(styleFactory);

  return (
    <View style={[styles.root, styles[`${tone}Bg`], style]}>
      <Text variant="label" style={styles[`${tone}Text`]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
};

export const Badge = memo(BadgeComponent);
Badge.displayName = 'Badge';
