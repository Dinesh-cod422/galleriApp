import React, { forwardRef, useCallback, useImperativeHandle, useMemo, useRef } from 'react';
import {
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetView,
} from '@gorhom/bottom-sheet';

import { type Theme } from '../../theme/theme';
import { useTheme } from '../../theme/ThemeProvider';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { Text } from '../Text/Text';

const styleFactory = (theme: Theme) => ({
  content: {
    paddingHorizontal: theme.layout.gutter,
    paddingBottom: theme.spacing.xxl,
    paddingTop: theme.spacing.sm,
    gap: theme.spacing.md,
  },
  title: {
    marginBottom: theme.spacing.xs,
  },
});

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
    const styles = useThemedStyles(styleFactory);
    const theme = useTheme();
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

    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.5} />
      ),
      [],
    );

    return (
      <BottomSheetModal
        ref={modalRef}
        snapPoints={points}
        onDismiss={onDismiss}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: theme.colors.bg.surfaceElevated }}
        handleIndicatorStyle={{ backgroundColor: theme.colors.border.strong }}>
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
