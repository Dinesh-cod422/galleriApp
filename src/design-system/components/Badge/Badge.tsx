import React, { memo } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Icon, type IconName } from '../../icons/Icon';
import { type AppTheme } from '../../theme/theme';
import { type Responsive } from '../../theme/responsive';
import { createStyles } from '../../theme/createStyles';
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

const getStyles = (appTheme: AppTheme, responsive: Responsive) => {
  const { HScale, IconSize, VScale } = responsive;
  const p = appTheme.colors;

  return {
    ...StyleSheet.create({
      root: {
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        gap: HScale.Width_5,
        alignSelf: 'flex-start' as const,
        paddingHorizontal: HScale.Width_14,
        paddingVertical: VScale.Height_5,
        borderRadius: 999,
      },
      neutralBg: { backgroundColor: p.bg.subtle },
      accentBg: { backgroundColor: p.accent.subtle },
      successBg: { backgroundColor: p.bg.subtle },
      dangerBg: { backgroundColor: p.bg.subtle },
      featuredBg: { backgroundColor: p.tag.featured.bg },
      trendingBg: { backgroundColor: p.tag.trending.bg },
      freshBg: { backgroundColor: p.tag.fresh.bg },

      // Tone is carried by the label colour. The two status tones share the
      // neutral background on purpose — a filled red pill reads as an error,
      // which is louder than a badge should ever be.
      neutralText: { color: p.text.secondary },
      accentText: { color: p.accent.onSubtle },
      successText: { color: p.status.success },
      dangerText: { color: p.status.danger },
      featuredText: { color: p.tag.featured.fg },
      trendingText: { color: p.tag.trending.fg },
      freshText: { color: p.tag.fresh.fg },

      // Only the editorial tags carry a separate mark colour; the rest inherit the
      // label's, which `??` below resolves.
      featuredIcon: { color: p.tag.featured.icon },
      trendingIcon: { color: p.tag.trending.icon },
      freshIcon: { color: p.tag.fresh.icon },
      neutralIcon: { color: undefined as string | undefined },
      accentIcon: { color: undefined as string | undefined },
      successIcon: { color: undefined as string | undefined },
      dangerIcon: { color: undefined as string | undefined },
    }),
    palette: p,
    iconSizes: { xs: IconSize.iconSize_16 },
  };
};

const useStyles = createStyles(getStyles);

const BadgeComponent = ({
  label,
  tone = 'neutral',
  icon,
  style,
}: {
  label: string;
  tone?: BadgeTone;
  /**
   * An optional mark before the label. A status tag laid over a photograph is
   * read at a glance and often at an angle — the glyph carries it before the
   * word is legible. It takes the label's colour, so tone stays the one place
   * the pairing is decided.
   */
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
}): React.JSX.Element => {
  const styles = useStyles();
  const textStyle = styles[`${tone}Text`];
  const markColor = styles[`${tone}Icon`].color ?? textStyle.color;

  return (
    <View style={[styles.root, styles[`${tone}Bg`], style]}>
      {icon !== undefined && <Icon name={icon} size={styles.iconSizes.xs} tint={markColor} strokeWidth={2} />}
      <Text variant="label" style={textStyle} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
};

export const Badge = memo(BadgeComponent);
Badge.displayName = 'Badge';
