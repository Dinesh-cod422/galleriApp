import React from 'react';
import { Share } from 'react-native';
import { act, fireEvent, screen } from '@testing-library/react-native';
import Clipboard from '@react-native-clipboard/clipboard';

import { renderWithTheme } from '../../../../test-utils/renderWithTheme';
import { PromptActions } from './PromptActions';

const PROMPT = 'A narrow Tokyo backstreet at night after rain, 35mm';

const setup = (promptText = PROMPT) =>
  renderWithTheme(
    <PromptActions
      title="Tokyo backstreet in the rain"
      promptText={promptText}
      imageUrl="https://example.test/full.webp"
      authorName="Nora Haddad"
    />,
  );

const setString = Clipboard.setString as jest.Mock;

describe('PromptActions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('copies the prompt text itself, not the title or the attribution', () => {
    setup();

    fireEvent.press(screen.getByTestId('copy-prompt'));

    expect(setString).toHaveBeenCalledWith(PROMPT);
  });

  it('confirms on the button that was pressed, then reverts', () => {
    jest.useFakeTimers();
    try {
      setup();

      fireEvent.press(screen.getByTestId('copy-prompt'));
      expect(screen.getByText('Copied')).toBeTruthy();

      act(() => {
        jest.advanceTimersByTime(2000);
      });
      expect(screen.getByText('Copy prompt')).toBeTruthy();
    } finally {
      jest.useRealTimers();
    }
  });

  it('surfaces a clipboard failure instead of silently doing nothing', () => {
    setString.mockImplementationOnce(() => {
      throw new Error('permission denied');
    });

    setup();
    fireEvent.press(screen.getByTestId('copy-prompt'));

    expect(screen.getByTestId('prompt-actions-error')).toBeTruthy();
    expect(screen.queryByText('Copied')).toBeNull();
  });

  it('shares the prompt with its attribution and image', async () => {
    const shareSpy = jest
      .spyOn(Share, 'share')
      .mockResolvedValue({ action: Share.sharedAction, activityType: undefined });

    setup();
    await act(async () => {
      fireEvent.press(screen.getByTestId('share-prompt'));
    });

    const [content] = shareSpy.mock.calls[0] ?? [];
    expect(content?.message).toContain(PROMPT);
    expect(content?.message).toContain('Nora Haddad');
    expect(content).toMatchObject({ url: 'https://example.test/full.webp' });
    shareSpy.mockRestore();
  });

  it('treats a dismissed share sheet as success, not an error', async () => {
    const shareSpy = jest
      .spyOn(Share, 'share')
      .mockResolvedValue({ action: Share.dismissedAction, activityType: undefined });

    setup();
    await act(async () => {
      fireEvent.press(screen.getByTestId('share-prompt'));
    });

    expect(screen.queryByTestId('prompt-actions-error')).toBeNull();
    shareSpy.mockRestore();
  });

  it('reports a share sheet that could not be opened', async () => {
    const shareSpy = jest.spyOn(Share, 'share').mockRejectedValue(new Error('no activity'));

    setup();
    await act(async () => {
      fireEvent.press(screen.getByTestId('share-prompt'));
    });

    expect(screen.getByTestId('prompt-actions-error')).toBeTruthy();
    shareSpy.mockRestore();
  });

  it('stays disabled until the full prompt has arrived', () => {
    // The list placeholder seeds `prompt` as an empty string, so both actions
    // would otherwise copy or share nothing.
    setup('');

    fireEvent.press(screen.getByTestId('copy-prompt'));

    expect(setString).not.toHaveBeenCalled();
  });
});
