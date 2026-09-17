import { StyleSheet } from 'react-native';
import React, { forwardRef, useCallback, useImperativeHandle, useMemo, useRef } from 'react';
import {
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetView,
} from '@gorhom/bottom-sheet';

import { type AppTheme } from '../../theme/theme';
import { type Responsive } from '../../theme/responsive';
import { createStyles } from '../../theme/createStyles';
import { Text } from '../Text/Text';
import { layoutOf } from '../../theme/layout';

const getStyles = (appTheme: AppTheme, responsive: Responsive) => {
  const { HScale, VScale } = responsive;
  const layout = layoutOf(responsive);
  const p = appTheme.colors;

  return {
    ...StyleSheet.create({
      content: {
        paddingHorizontal: layout.gutter,
        paddingBottom: VScale.Height_38,
        paddingTop: VScale.Height_9,
        gap: HScale.Width_14,
      },
      title: {
        marginBottom: VScale.Height_5,
      },
    }),
    palette: p,
  };
};

const useStyles = createStyles(getStyles);

/** The imperative surface screens get. Deliberately tiny. */
export type BottomSheetRef = {
  open: () => void;
  close: () => void;
};

export type AppBottomSheetProps = {
  children: React.ReactNode;
  title?: string;
  /** Heights the sheet snaps to, e.g. ['45%', '85%']. */
  snapPoints?: readonly string[];
  onDismiss?: () => void;
};

/**
 * Wraps @gorhom/bottom-sheet behind our own props.
 *
 * The wrapper earns its keep twice: it applies theme tokens in one place
 * (every sheet in the app looks the same), and it keeps a third-party
 * imperative API — which changed shape between major versions — out of
 * every screen that happens to show a sheet.
 */
export const BottomSheet = forwardRef<BottomSheetRef, AppBottomSheetProps>(
  ({ children, title, snapPoints = ['50%'], onDismiss }, ref) => {
    const styles = useStyles();
    const modalRef = useRef<BottomSheetModal>(null);

    useImperativeHandle(
      ref,
      () => ({
        open: () => modalRef.current?.present(),
        close: () => modalRef.current?.dismiss(),
      }),
      [],
    );

    const points = useMemo(() => [...snapPoints], [snapPoints]);

    /*
     * The scrim is the THEME's, not the library's.
     *
     * `BottomSheetBackdrop` defaults to black at the `opacity` given, which
     * ignores `bg.scrim` — so a sheet dimmed the screen identically in both
     * modes while every other overlay in the app used the token. Light mode
     * wants a softer, slightly blue-black dim (45%) and dark mode a deeper one
     * (60%), because the same dim over an already-dark canvas barely reads.
     *
     * `opacity={1}` lets the token's own alpha be the alpha; leaving the prop
     * at its default would multiply the two and halve the dim.
     */
    const backdropStyle = useMemo(
      () => ({ backgroundColor: styles.palette.bg.scrim }),
      [styles.palette.bg.scrim],
    );

    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop
          {...props}
          appearsOnIndex={0}
          disappearsOnIndex={-1}
          opacity={1}
          style={[props.style, backdropStyle]}
        />
      ),
      [backdropStyle],
    );

    return (
      <BottomSheetModal
        ref={modalRef}
        snapPoints={points}
        onDismiss={onDismiss}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: styles.palette.bg.surfaceElevated }}
        handleIndicatorStyle={{ backgroundColor: styles.palette.border.strong }}>
        <BottomSheetView style={styles.content}>
          {title != null && (
            <Text variant="h3" style={styles.title}>
              {title}
            </Text>
          )}
          {children}
        </BottomSheetView>
      </BottomSheetModal>
    );
  },
);

BottomSheet.displayName = 'BottomSheet';
