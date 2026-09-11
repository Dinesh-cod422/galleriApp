import React from 'react';
import { render, type RenderOptions, type RenderResult } from '@testing-library/react-native';

import { ThemeProvider, type ThemePreference } from '@ds';

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
      <ThemeProvider initialPreference={preference}>{children}</ThemeProvider>
    ),
    ...options,
  });
