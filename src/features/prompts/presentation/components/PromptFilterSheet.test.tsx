import React from 'react';
import { fireEvent } from '@testing-library/react-native';

import { renderWithTheme } from '../../../../test-utils/renderWithTheme';

/**
 * The real sheet is a @gorhom BottomSheetModal: it needs a provider and renders
 * nothing at all until presented, so neither the rows nor their behaviour would
 * be reachable. The wrapper is a thin themed shell — what is worth testing here
 * is the options it contains, so the shell renders its children inline.
 */
jest.mock('@ds/components/BottomSheet/BottomSheet', () => {
  const { View } = jest.requireActual('react-native');
  const React2 = jest.requireActual('react');
  return {
    BottomSheet: React2.forwardRef(
      ({ children }: { children: React.ReactNode }, _ref: unknown) =>
        React2.createElement(View, null, children),
    ),
  };
});

import { FEED_SORTS } from '../sections';
import { PromptFilterSheet } from './PromptFilterSheet';

describe('PromptFilterSheet', () => {
  it('offers every ordering the feed supports', () => {
    const { getByTestId } = renderWithTheme(
      <PromptFilterSheet selected="newest" onSelect={jest.fn()} />,
    );

    for (const option of FEED_SORTS) {
      expect(getByTestId(`sort-${option.sort}`)).toBeTruthy();
    }
  });

  it('reports the chosen ordering', () => {
    const onSelect = jest.fn();
    const { getByTestId } = renderWithTheme(
      <PromptFilterSheet selected="newest" onSelect={onSelect} />,
    );

    fireEvent.press(getByTestId('sort-mostCopied'));

    expect(onSelect).toHaveBeenCalledWith('mostCopied');
  });

  /**
   * Announced, not merely tinted: the selected row is the one piece of state
   * the sheet holds, and a colour change alone does not reach a screen reader.
   */
  it('marks the active ordering for assistive tech', () => {
    const { getByTestId } = renderWithTheme(
      <PromptFilterSheet selected="trending" onSelect={jest.fn()} />,
    );

    expect(getByTestId('sort-trending').props.accessibilityState.selected).toBe(true);
    expect(getByTestId('sort-newest').props.accessibilityState.selected).toBe(false);
  });
});
