import React from 'react';
import { act, fireEvent, screen } from '@testing-library/react-native';

import { renderWithTheme } from '../../../test-utils/renderWithTheme';
import { ExpandableText } from './ExpandableText';

const TEXT = 'A cinematic portrait of a couple on temple steps at golden hour.';

/**
 * onTextLayout never fires under the test renderer — there is no text engine to
 * measure with — so the measuring copy is driven directly. `lines` only needs a
 * length; the component counts entries and reads nothing else.
 */
const reportLines = (count: number): void => {
  const measuring = screen.UNSAFE_getAllByProps({ importantForAccessibility: 'no-hide-descendants' })[0];
  act(() => {
    measuring?.props.onTextLayout?.({
      nativeEvent: { lines: Array.from({ length: count }, () => ({})) },
    });
  });
};

const setup = (numberOfLines = 7) =>
  renderWithTheme(
    <ExpandableText numberOfLines={numberOfLines} testID="prompt">
      {TEXT}
    </ExpandableText>,
  );

describe('ExpandableText', () => {
  it('shows no toggle when the text fits', () => {
    setup();
    reportLines(4);

    expect(screen.queryByTestId('prompt-toggle')).toBeNull();
  });

  it('shows no toggle when the text is exactly at the limit', () => {
    setup();
    reportLines(7);

    // 7 of 7 lines are visible, so "Show more" would reveal nothing.
    expect(screen.queryByTestId('prompt-toggle')).toBeNull();
  });

  it('offers to expand once the text overflows', () => {
    setup();
    reportLines(40);

    expect(screen.getByText('Show more…')).toBeTruthy();
  });

  it('clamps to the given number of lines until expanded, then releases it', () => {
    setup();
    reportLines(40);

    const clamped = screen.getByText(TEXT);
    expect(clamped.props.numberOfLines).toBe(7);

    fireEvent.press(screen.getByTestId('prompt-toggle'));

    expect(screen.getByText(TEXT).props.numberOfLines).toBeUndefined();
    expect(screen.getByText('Show less')).toBeTruthy();
  });

  it('collapses again on a second press', () => {
    setup();
    reportLines(40);

    fireEvent.press(screen.getByTestId('prompt-toggle'));
    fireEvent.press(screen.getByTestId('prompt-toggle'));

    expect(screen.getByText(TEXT).props.numberOfLines).toBe(7);
    expect(screen.getByText('Show more…')).toBeTruthy();
  });

  it('clamps on the very first frame, before any measurement', () => {
    setup();

    // No flash of the full prompt while the measuring copy is still working.
    expect(screen.getAllByText(TEXT)[0]?.props.numberOfLines).toBe(7);
  });
});
