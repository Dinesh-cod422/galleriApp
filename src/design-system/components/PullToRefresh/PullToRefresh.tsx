import React from 'react';
import { RefreshControl, type StyleProp, type ViewStyle } from 'react-native';

import { createStyles } from '../../theme/createStyles';
import { type AppTheme } from '../../theme/theme';

const getStyles = (appTheme: AppTheme) => ({ palette: appTheme.colors });
const useStyles = createStyles(getStyles);


export type PullToRefreshProps = {
  refreshing: boolean;
  onRefresh: () => void;
  /**
   * Supplied by ScrollView on Android, never by a caller.
   *
   * `ScrollView` treats `refreshControl` differently per platform: on iOS the
   * element is rendered as a SIBLING of the content, but on Android it is
   * `cloneElement`-ed with the entire scroll view — and therefore every list
   * item — passed in as ITS children. A wrapper that drops `children` throws
   * the whole list away, which is why an un-forwarded version renders a
   * perfectly empty feed on Android while looking correct on iOS.
   */
  children?: React.ReactNode;
  /** Also injected by ScrollView on Android; it carries the list's layout. */
  style?: StyleProp<ViewStyle>;
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
 * Returned as an element from `<ScrollView refreshControl=…>`. On Android that
 * makes this component the PARENT of the scroll view, so `children` and `style`
 * must both be forwarded — see the note on `children` above.
 */
export const PullToRefresh = ({
  refreshing,
  onRefresh,
  children,
  style,
}: PullToRefreshProps): React.JSX.Element => {

  const styles = useStyles();

  return (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      style={style}
      // The spinner is drawn on the canvas, so it takes the ink.
      tintColor={styles.palette.accent.ink}
      colors={[styles.palette.accent.ink]}
      progressBackgroundColor={styles.palette.bg.surface}>
      {children}
    </RefreshControl>
  );
};
