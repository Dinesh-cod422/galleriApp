import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';

import { renderWithTheme } from '../../../test-utils/renderWithTheme';
import { Button } from './Button';

describe('Button', () => {
  it('renders its label and fires onPress', () => {
    const onPress = jest.fn();
    renderWithTheme(<Button label="Copy prompt" onPress={onPress} />);

    fireEvent.press(screen.getByText('Copy prompt'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not fire while loading, and hides the label for the spinner', () => {
    const onPress = jest.fn();
    renderWithTheme(<Button label="Saving" onPress={onPress} loading testID="btn" />);

    fireEvent.press(screen.getByTestId('btn'));
    expect(onPress).not.toHaveBeenCalled();
    expect(screen.queryByText('Saving')).toBeNull();
  });

  it('does not fire when disabled and reports it to assistive tech', () => {
    const onPress = jest.fn();
    renderWithTheme(<Button label="Next" onPress={onPress} disabled testID="btn" />);

    fireEvent.press(screen.getByTestId('btn'));
    expect(onPress).not.toHaveBeenCalled();
    expect(screen.getByTestId('btn')).toBeDisabled();
  });

  it('renders in dark mode without losing its label', () => {
    renderWithTheme(<Button label="Share" onPress={jest.fn()} />, { preference: 'dark' });
    expect(screen.getByText('Share')).toBeTruthy();
  });
});
