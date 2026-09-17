import React from 'react';
import { StatusBar, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';

import { ShimmerProvider, ThemeProvider, useTheme } from '@ds';

import { QueryProvider } from './QueryProvider';
import { readThemePreference, writeThemePreference } from './themePreferenceStorage';

/**
 * The composition root's provider stack. Order is not arbitrary:
 *
 *  GestureHandlerRootView  must wrap everything that handles gestures
 *    └ SafeAreaProvider    insets must be available to the theme consumers
 *      └ ThemeProvider     everything below styles itself from this
 *        └ ShimmerProvider one skeleton clock for the whole tree
 *          └ BottomSheetModalProvider  sheets portal to here, so it sits high
 *
 *            └ QueryProvider   server state for everything below
 */
const ThemedStatusBar = (): React.JSX.Element => {
  const theme = useTheme();
  // RN 0.87 drops StatusBar's Android `backgroundColor` (edge-to-edge is the
  // default now); the canvas colour behind it comes from Screen instead.
  return <StatusBar barStyle={theme.mode === 'dark' ? 'light-content' : 'dark-content'} />;
};

const styles = StyleSheet.create({ root: { flex: 1 } });

export const AppProviders = ({ children }: { children: React.ReactNode }): React.JSX.Element => (
  <GestureHandlerRootView style={styles.root}>
    <SafeAreaProvider>
      <ThemeProvider
        initialPreference={readThemePreference()}
        onPreferenceChange={writeThemePreference}>
        <QueryProvider>
          <ShimmerProvider>
            <BottomSheetModalProvider>
              <ThemedStatusBar />
              {children}
            </BottomSheetModalProvider>
          </ShimmerProvider>
        </QueryProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  </GestureHandlerRootView>
);
