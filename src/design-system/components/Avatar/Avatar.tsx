import React, { memo, useMemo } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { type Theme } from '../../theme/theme';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { AppImage } from '../AppImage/AppImage';
import { Text } from '../Text/Text';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg';

const SIZES: Record<AvatarSize, number> = { xs: 20, sm: 28, md: 40, lg: 64 };

const styleFactory = (theme: Theme) => ({
  root: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    overflow: 'hidden' as const,
    backgroundColor: theme.colors.bg.subtle,
  },
});

const initialsOf = (name: string): string =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part.charAt(0).toUpperCase())
    .join('');

export type AvatarProps = {
  name: string;
  uri?: string;
  size?: AvatarSize;
  style?: StyleProp<ViewStyle>;
};

const AvatarComponent = ({ name, uri, size = 'sm', style }: AvatarProps): React.JSX.Element => {
  const styles = useThemedStyles(styleFactory);
  const dimension = SIZES[size];
  // Initials are derived, not stored — but not on every render either.
  const initials = useMemo(() => initialsOf(name), [name]);

  const shape: ViewStyle = {
    width: dimension,
    height: dimension,
    borderRadius: dimension / 2,
  };

  if (uri != null && uri.length > 0) {
    return (
      <AppImage
        uri={uri}
        priority="low"
        borderRadius={dimension / 2}
        accessibilityLabel={name}
        style={[shape, style]}
      />
    );
  }

  return (
    <View style={[styles.root, shape, style]} accessibilityLabel={name}>
      <Text variant={size === 'lg' ? 'h3' : 'label'} color="secondary">
        {initials}
      </Text>
    </View>
  );
};

export const Avatar = memo(AvatarComponent);
Avatar.displayName = 'Avatar';
