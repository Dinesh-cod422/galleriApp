import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

import { renderWithTheme } from '../../../../test-utils/renderWithTheme';
import { FavoriteButton } from './FavoriteButton';

// The component reads the app-wide store, so each test uses its own id rather
// than resetting global state — that also proves ids do not leak into one another.
let next = 0;
const freshId = (): string => `p-${(next += 1)}`;

describe('FavoriteButton', () => {
  it('names the action and its subject, since the tile shows no text', () => {
    const id = freshId();
    renderWithTheme(<FavoriteButton promptId={id} promptTitle="Neon rain" />);

    expect(screen.getByLabelText('Add Neon rain to favorites')).toBeTruthy();
  });

  it('flips to the removal action once favourited', () => {
    const id = freshId();
    renderWithTheme(<FavoriteButton promptId={id} promptTitle="Neon rain" />);

    fireEvent.press(screen.getByTestId(`favorite-${id}`));

    expect(screen.getByLabelText('Remove Neon rain from favorites')).toBeTruthy();
  });

  it('toggles back off on a second press', () => {
    const id = freshId();
    renderWithTheme(<FavoriteButton promptId={id} promptTitle="Neon rain" />);

    fireEvent.press(screen.getByTestId(`favorite-${id}`));
    fireEvent.press(screen.getByTestId(`favorite-${id}`));

    expect(screen.getByLabelText('Add Neon rain to favorites')).toBeTruthy();
  });

  it('confirms the press with haptics — the tile gives no other feedback', () => {
    const id = freshId();
    const trigger = ReactNativeHapticFeedback.trigger as jest.Mock;
    trigger.mockClear();

    renderWithTheme(<FavoriteButton promptId={id} promptTitle="Neon rain" />);
    fireEvent.press(screen.getByTestId(`favorite-${id}`));

    expect(trigger).toHaveBeenCalledTimes(1);
  });

  it('keeps two tiles independent', () => {
    const a = freshId();
    const b = freshId();
    renderWithTheme(
      <>
        <FavoriteButton promptId={a} promptTitle="A" />
        <FavoriteButton promptId={b} promptTitle="B" />
      </>,
    );

    fireEvent.press(screen.getByTestId(`favorite-${a}`));

    expect(screen.getByLabelText('Remove A from favorites')).toBeTruthy();
    expect(screen.getByLabelText('Add B to favorites')).toBeTruthy();
  });
});
