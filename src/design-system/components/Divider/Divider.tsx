import React from 'react';
import { StyleSheet, View } from 'react-native';

import { type AppTheme } from '../../theme/theme';
import { type Responsive } from '../../theme/responsive';
import { createStyles } from '../../theme/createStyles';

const getStyles = (appTheme: AppTheme, _responsive: Responsive) => {
  const p = appTheme.colors;

  return {
    ...StyleSheet.create({
      root: {
        /*
         * A hairline, not a scaled length. A divider should be the thinnest line
         * the display can draw — `hairlineWidth` is 1 physical pixel, so 0.33dp on
         * a 3x screen. Scaling it would make the rule thicker on exactly the
         * devices that can render it finest.
         */
        height: StyleSheet.hairlineWidth,
        backgroundColor: p.border.subtle,
        width: '100%' as const,
      },
    }),
    palette: p,
  };
};

const useStyles = createStyles(getStyles);

export const Divider = (): React.JSX.Element => {
  const styles = useStyles();
  return <View style={styles.root} />;
};
