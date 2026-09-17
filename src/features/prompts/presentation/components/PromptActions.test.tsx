import React from 'react';
import { Share } from 'react-native';
import { act, fireEvent, screen } from '@testing-library/react-native';
import Clipboard from '@react-native-clipboard/clipboard';

import { renderWithTheme } from '../../../../test-utils/renderWithTheme';
import { PromptActions } from './PromptActions';

const PROMPT = 'A narrow Tokyo backstreet at night after rain, 35mm';

const onCopied = jest.fn();
const onShared = jest.fn();

const setup = (promptText = PROMPT) =>
  renderWithTheme(
    <PromptActions
      title="Tokyo backstreet in the rain"
      promptText={promptText}
      shareUrl="https://notesapp-ed63a.web.app/prompt/p1"
      authorName="Nora Haddad"
      onCopied={onCopied}
      onShared={onShared}
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

  it('shares a link to the prompt, with its text and attribution', async () => {
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
    // The prompt's page, not its picture: sharing the raw image left the
    // recipient with a JPEG and no way back to the prompt it belongs to.
    expect(content).toMatchObject({ url: 'https://notesapp-ed63a.web.app/prompt/p1' });
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

  describe('engagement callbacks', () => {
    it('reports a copy so it can be counted', () => {
      setup();

      fireEvent.press(screen.getByTestId('copy-prompt'));

      expect(onCopied).toHaveBeenCalledTimes(1);
    });

    /**
     * A copy that never reached the clipboard is not a copy. Counting the press
     * would inflate the number with failures the user can see did not work.
     */
    it('does not report a copy that failed', () => {
      setString.mockImplementationOnce(() => {
        throw new Error('permission denied');
      });

      setup();
      fireEvent.press(screen.getByTestId('copy-prompt'));

      expect(onCopied).not.toHaveBeenCalled();
    });

    it('reports a share once the sheet completes', async () => {
      jest
        .spyOn(Share, 'share')
        .mockResolvedValue({ action: Share.sharedAction, activityType: undefined });

      setup();
      await act(async () => {
        fireEvent.press(screen.getByTestId('share-prompt'));
      });

      expect(onShared).toHaveBeenCalledTimes(1);
    });

    it('does not report a share that could not be opened', async () => {
      jest.spyOn(Share, 'share').mockRejectedValue(new Error('no sheet'));

      setup();
      await act(async () => {
        fireEvent.press(screen.getByTestId('share-prompt'));
      });

      expect(onShared).not.toHaveBeenCalled();
    });
  });
});
