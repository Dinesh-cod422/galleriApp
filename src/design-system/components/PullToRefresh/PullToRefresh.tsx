import React from 'react';
import { RefreshControl } from 'react-native';

import { createStyles } from '../../theme/createStyles';
import { type AppTheme } from '../../theme/theme';

const getStyles = (appTheme: AppTheme) => ({ palette: appTheme.colors });
const useStyles = createStyles(getStyles);


export type PullToRefreshProps = {
  refreshing: boolean;
  onRefresh: () => void;
};

/**
 * A themed pull-to-refresh spinner.
 *
 * A component rather than a bare `RefreshControl` because the untinted default
 * is wrong in both themes: a grey system spinner is near-invisible on the dark
 * canvas and unbranded on the light one. The two tint props are not
 * interchangeable — `tintColor` drives the iOS spinner, `colors` the Android
 * one — so leaving either out themes exactly one platform.
 *
 * Returned as an element from `<ScrollView refreshControl=…>`, which is why it
 * takes no children and renders nothing of its own.
 */
export const PullToRefresh = ({
  refreshing,
  onRefresh,
}: PullToRefreshProps): React.JSX.Element => {

  const styles = useStyles();

  return (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      // The spinner is drawn on the canvas, so it takes the ink.
      tintColor={styles.palette.accent.ink}
      colors={[styles.palette.accent.ink]}
      progressBackgroundColor={styles.palette.bg.surface}
    />
  );
};
