import React from 'react';
import { View } from 'react-native';

import { type AppError } from '@core/errors/AppError';

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
    gap: theme.spacing.sm,
  },
  action: {
    marginTop: theme.spacing.base,
  },
});

const TITLE_BY_KIND: Record<AppError['kind'], string> = {
  network: 'No connection',
  notFound: 'Not found',
  validation: 'Check that again',
  permission: 'Permission needed',
  unknown: 'Something went wrong',
};

export type ErrorStateProps = {
  error: AppError;
  onRetry?: () => void;
  testID?: string;
};

/**
 * Takes the AppError itself rather than a pre-formatted string, so the retry
 * affordance is driven by `error.retryable`. A "Try again" button on a 404 is
 * a dead end the user will press twice.
 */
export const ErrorState = ({ error, onRetry, testID }: ErrorStateProps): React.JSX.Element => {
  const styles = useThemedStyles(styleFactory);
  const canRetry = error.retryable && onRetry != null;

  return (
    <View style={styles.root} testID={testID} accessibilityRole="alert">
      <Text variant="h3" align="center">
        {TITLE_BY_KIND[error.kind]}
      </Text>
      <Text variant="body" color="secondary" align="center">
        {error.message}
      </Text>
      {canRetry && (
        <Button label="Try again" onPress={onRetry} variant="secondary" style={styles.action} />
      )}
    </View>
  );
};
