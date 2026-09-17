import React from 'react';
import { Alert } from 'react-native';
import { fireEvent } from '@testing-library/react-native';

import { renderWithTheme } from '../../../../test-utils/renderWithTheme';
import { APP_NAME } from '@core/config/brand';
import { useFavoritesStore } from '@features/favorites/presentation/stores/favoritesStore';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

import { ProfileScreen } from './ProfileScreen';

describe('ProfileScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useFavoritesStore.setState({ ids: new Set() });
  });

  it('names the app rather than an account that does not exist', () => {
    expect(renderWithTheme(<ProfileScreen />).getByText(APP_NAME)).toBeTruthy();
  });

  /**
   * The theme was switchable in code from the start but had no control
   * anywhere — this screen is the first place it is reachable.
   */
  it('offers all three theme choices and marks the active one', () => {
    // Stated explicitly: renderWithTheme defaults to 'light', not 'system'.
    const { getByTestId } = renderWithTheme(<ProfileScreen />, { preference: 'system' });

    expect(getByTestId('theme-system').props.accessibilityState.selected).toBe(true);
    expect(getByTestId('theme-light').props.accessibilityState.selected).toBe(false);
    expect(getByTestId('theme-dark').props.accessibilityState.selected).toBe(false);
  });

  it('switches the theme when a choice is pressed', () => {
    const { getByTestId } = renderWithTheme(<ProfileScreen />);

    fireEvent.press(getByTestId('theme-dark'));

    expect(getByTestId('theme-dark').props.accessibilityState.selected).toBe(true);
    expect(getByTestId('theme-system').props.accessibilityState.selected).toBe(false);
  });

  it('shows how many prompts are saved and opens the list', () => {
    useFavoritesStore.setState({ ids: new Set(['pr_1', 'pr_2']) });
    const { getByText, getByTestId } = renderWithTheme(<ProfileScreen />);

    expect(getByText('2')).toBeTruthy();
    fireEvent.press(getByTestId('profile-favorites'));

    expect(mockNavigate).toHaveBeenCalledWith('Main', { screen: 'Favorites' });
  });

  /** Nothing to clear means no reason to offer a destructive control. */
  it('hides the clear action when nothing is saved', () => {
    expect(renderWithTheme(<ProfileScreen />).queryByTestId('profile-clear-favorites')).toBeNull();
  });

  /**
   * Irreversible, and there is no server copy to restore from — so it asks
   * first rather than clearing on a single tap.
   */
  it('confirms before clearing favourites', () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    useFavoritesStore.setState({ ids: new Set(['pr_1']) });
    const { getByTestId } = renderWithTheme(<ProfileScreen />);

    fireEvent.press(getByTestId('profile-clear-favorites'));

    expect(alert).toHaveBeenCalled();
    // Still there: the confirmation has not been answered.
    expect(useFavoritesStore.getState().ids.size).toBe(1);
    alert.mockRestore();
  });

  it('clears them once the confirmation is accepted', () => {
    const alert = jest
      .spyOn(Alert, 'alert')
      .mockImplementation((_t, _m, buttons) => {
        buttons?.find(b => b.style === 'destructive')?.onPress?.();
      });
    useFavoritesStore.setState({ ids: new Set(['pr_1', 'pr_2']) });
    const { getByTestId } = renderWithTheme(<ProfileScreen />);

    fireEvent.press(getByTestId('profile-clear-favorites'));

    expect(useFavoritesStore.getState().ids.size).toBe(0);
    alert.mockRestore();
  });
});
