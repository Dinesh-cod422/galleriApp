import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';

import { networkError, notFoundError, validationError } from '@core/errors/AppError';

import { renderWithTheme } from '../../../test-utils/renderWithTheme';
import { ErrorState } from './ErrorState';

describe('ErrorState', () => {
  it('offers retry for a retryable error', () => {
    const onRetry = jest.fn();
    renderWithTheme(<ErrorState error={networkError()} onRetry={onRetry} />);

    expect(screen.getByText('No connection')).toBeTruthy();
    fireEvent.press(screen.getByText('Try again'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('hides retry for errors that retrying cannot fix', () => {
    renderWithTheme(<ErrorState error={notFoundError()} onRetry={jest.fn()} />);
    expect(screen.queryByText('Try again')).toBeNull();
  });

  it('shows the error message it was given', () => {
    renderWithTheme(<ErrorState error={validationError('Enter at least 2 characters.')} />);
    expect(screen.getByText('Enter at least 2 characters.')).toBeTruthy();
  });
});
