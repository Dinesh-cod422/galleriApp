import React from 'react';
import { Linking } from 'react-native';
import { fireEvent, screen } from '@testing-library/react-native';

import {
  networkError,
  notFoundError,
  unknownError,
  validationError,
  type AppError,
} from '@core/errors/AppError';

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

  it('renders a developer remediation as a tappable action, not as body copy', () => {
    const url = 'https://console.firebase.google.com/v1/r/project/demo/firestore/indexes?create_composite=CkVwcm9q';
    const error: AppError = { ...unknownError('This query needs an index.'), devAction: { label: 'Create this index', url } };
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);

    renderWithTheme(<ErrorState error={error} />);

    // The URL must never leak into the message the user reads.
    expect(screen.queryByText(new RegExp(url.slice(0, 40)))).toBeNull();

    fireEvent.press(screen.getByTestId('error-state-dev-action'));
    expect(openURL).toHaveBeenCalledWith(url);
    openURL.mockRestore();
  });

  it('renders no developer action when the error carries none', () => {
    renderWithTheme(<ErrorState error={networkError()} onRetry={jest.fn()} />);
    expect(screen.queryByTestId('error-state-dev-action')).toBeNull();
  });
});
