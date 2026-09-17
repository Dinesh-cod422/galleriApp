import React from 'react';
import { Text } from 'react-native';

import { renderWithTheme } from '../../../test-utils/renderWithTheme';
import { Screen } from './Screen';

describe('Screen', () => {
  /**
   * Painted here rather than by each screen: nine screens repeating the same
   * two circles is nine places for the brand wash to drift.
   */
  it('paints the ambient wash for every screen by default', () => {
    const { getByTestId } = renderWithTheme(
      <Screen>
        <Text>content</Text>
      </Screen>,
    );

    expect(getByTestId('ambient-background')).toBeTruthy();
  });

  /** It must never swallow a tap meant for the content above it. */
  it('never intercepts a touch', () => {
    const { getByTestId } = renderWithTheme(
      <Screen>
        <Text>content</Text>
      </Screen>,
    );

    expect(getByTestId('ambient-background').props.pointerEvents).toBe('none');
  });

  it('can be turned off where something else owns the background', () => {
    const { queryByTestId } = renderWithTheme(
      <Screen ambient={false}>
        <Text>content</Text>
      </Screen>,
    );

    expect(queryByTestId('ambient-background')).toBeNull();
  });

  it('still renders its children', () => {
    const { getByText } = renderWithTheme(
      <Screen>
        <Text>content</Text>
      </Screen>,
    );

    expect(getByText('content')).toBeTruthy();
  });
});
