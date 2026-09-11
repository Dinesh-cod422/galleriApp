import React from 'react';
import { View } from 'react-native';

import { type Theme } from '../../theme/theme';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { Button } from '../Button/Button';
import { Text } from '../Text/Text';

const styleFactory = (theme: Theme) => ({
  root: {
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.xxl,
    gap: theme.spacing.sm,
  },
  icon: {
    marginBottom: theme.spacing.sm,
  },
  action: {
    marginTop: theme.spacing.base,
  },
});

export type EmptyStateProps = {
  title: string;
  description?: string;
  /** Caller supplies the icon; the design system does not choose it. */
  icon?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  testID?: string;
};

export const EmptyState = ({
  title,
  description,
  icon,
  actionLabel,
  onAction,
  testID,
}: EmptyStateProps): React.JSX.Element => {
  const styles = useThemedStyles(styleFactory);

  return (
    <View style={styles.root} testID={testID}>
      {icon != null && <View style={styles.icon}>{icon}</View>}
      <Text variant="h3" align="center">
        {title}
      </Text>
      {description != null && (
        <Text variant="body" color="secondary" align="center">
          {description}
        </Text>
      )}
      {actionLabel != null && onAction != null && (
        <Button label={actionLabel} onPress={onAction} variant="secondary" style={styles.action} />
      )}
    </View>
  );
};
