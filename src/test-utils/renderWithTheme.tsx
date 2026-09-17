import React from 'react';
import { render, type RenderOptions, type RenderResult } from '@testing-library/react-native';
import { SafeAreaProvider, type Metrics } from 'react-native-safe-area-context';

import { ThemeProvider, type ThemePreference } from '@ds';

/**
 * A device with a notch and a gesture bar, stated rather than measured.
 *
 * `useSafeAreaInsets` THROWS without a provider, so anything that reads an
 * inset — the tab bar, the detail screen's floating controls — cannot render in
 * a test at all without this. Passing `initialMetrics` also makes the numbers
 * deterministic: the real provider resolves them asynchronously from native, so
 * a test without them would see zeros on the first frame and something else on
 * the second.
 */
const METRICS: Metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

/**
 * Every component test renders through the real ThemeProvider rather than a
 * stub theme — a token that only exists in the test double is a token that
 * breaks in the app.
 */
export const renderWithTheme = (
  ui: React.ReactElement,
  { preference = 'light', ...options }: RenderOptions & { preference?: ThemePreference } = {},
): RenderResult =>
  render(ui, {
    wrapper: ({ children }) => (
      <SafeAreaProvider initialMetrics={METRICS}>
        <ThemeProvider initialPreference={preference}>{children}</ThemeProvider>
      </SafeAreaProvider>
    ),
    ...options,
  });
