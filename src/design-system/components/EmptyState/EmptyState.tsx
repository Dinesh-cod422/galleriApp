import React from 'react';
import { StyleSheet, View } from 'react-native';

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
        paddingVertical: VScale.Height_38,
        gap: HScale.Width_9,
      },
      icon: {
        marginBottom: VScale.Height_9,
      },
      action: {
        marginTop: VScale.Height_19,
      },
    }),
  };
};

const useStyles = createStyles(getStyles);

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
  const styles = useStyles();

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
