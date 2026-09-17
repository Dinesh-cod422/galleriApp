import React, { useCallback } from 'react';
import { StyleSheet, Linking, View } from 'react-native';

import { type AppError } from '@core/errors/AppError';
import { fireAndForget } from '@core/utils/fireAndForget';

import { type AppTheme } from '../../theme/theme';
import { type Responsive } from '../../theme/responsive';
import { createStyles } from '../../theme/createStyles';
import { Button } from '../Button/Button';
import { Text } from '../Text/Text';

const getStyles = (_appTheme: AppTheme, responsive: Responsive) => {
  const { HScale, VScale } = responsive;

  return {
    ...StyleSheet.create({
      root: {
        flex: 1,
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
        paddingHorizontal: HScale.Width_28,
        gap: HScale.Width_9,
      },
      action: {
        marginTop: VScale.Height_19,
      },
    }),
  };
};

const useStyles = createStyles(getStyles);

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
  const styles = useStyles();
  const canRetry = error.retryable && onRetry != null;

  // Dev-only, and deliberately not a `Linking.canOpenURL` round trip: an
  // https URL is always openable, and the check would only add an async hop.
  const { devAction } = error;
  const openDevAction = useCallback(() => {
    if (devAction != null) {
      fireAndForget(Linking.openURL(devAction.url));
    }
  }, [devAction]);

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
      {__DEV__ && devAction != null && (
        <Button
          label={devAction.label}
          onPress={openDevAction}
          variant="ghost"
          size="sm"
          accessibilityHint="Opens the console in your browser"
          testID="error-state-dev-action"
        />
      )}
    </View>
  );
};
