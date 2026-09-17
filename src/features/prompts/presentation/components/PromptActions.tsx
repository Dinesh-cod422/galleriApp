import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { fireAndForget } from '@core/utils/fireAndForget';
import { clipboard } from '@infra/clipboard/clipboard';
import { haptics } from '@infra/haptics/haptics';
import { share } from '@infra/share/share';
import { Button, Icon, Text, type AppTheme, createStyles, type Responsive } from '@ds';

/** How long the button stays in its confirmed state before reverting. */
const COPIED_RESET_MS = 2000;

const getStyles = (_appTheme: AppTheme, responsive: Responsive) => {
  const { HScale, IconSize } = responsive;

  return {
    ...StyleSheet.create({
      root: { gap: HScale.Width_9 },
      row: { flexDirection: 'row' as const, gap: HScale.Width_9 },
      grow: { flex: 1 },
    }),
    iconSizes: { sm: IconSize.iconSize_18 },
  };
};

const useStyles = createStyles(getStyles);

export type PromptActionsProps = {
  title: string;
  /** Empty while the detail is still hydrating from the list placeholder. */
  promptText: string;
  /**
   * Where the share should point — the prompt's page, not its picture.
   *
   * Sharing the raw image URL sent the recipient a JPEG with no way back to
   * the prompt it belongs to, which is the only part worth passing on. This is
   * an https link, so it opens the app for anyone who has it and the website
   * for everyone else.
   */
  shareUrl: string;
  authorName: string;
  /**
   * Fired once per SUCCESSFUL copy. Not on press: a clipboard failure is still
   * a press, and counting it would inflate the number with copies that never
   * reached the clipboard.
   */
  onCopied?: () => void;
  /**
   * Fired when the share sheet completes without error. A dismissed sheet
   * counts — see `share`, where dismissal is a success — because the user did
   * reach for share, and the platform does not tell us whether anything was
   * actually sent.
   */
  onShared?: () => void;
};

/**
 * Copy and share, the two things a prompt is actually for.
 *
 * Copy confirms in place — the button becomes "Copied" with a tick — rather
 * than via a toast. On a screen the user is already looking at, the
 * confirmation belongs on the control they just pressed; a toast would animate
 * in somewhere else and cover content.
 */
const PromptActionsComponent = ({
  title,
  promptText,
  shareUrl,
  authorName,
  onCopied,
  onShared,
}: PromptActionsProps): React.JSX.Element => {
  const styles = useStyles();
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // A pending timer outliving the screen would set state on an unmounted
  // component the moment the user navigates back within the two seconds.
  useEffect(
    () => () => {
      if (resetTimer.current !== null) {
        clearTimeout(resetTimer.current);
      }
    },
    [],
  );

  // Nothing to copy or share until the full document has arrived: the list
  // placeholder seeds `prompt` as an empty string.
  const isReady = promptText.length > 0;

  const onCopy = useCallback(() => {
    const result = clipboard.copy(promptText);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }

    setError(null);
    setCopied(true);
    haptics.trigger('success');
    onCopied?.();

    if (resetTimer.current !== null) {
      clearTimeout(resetTimer.current);
    }
    resetTimer.current = setTimeout(() => setCopied(false), COPIED_RESET_MS);
  }, [promptText, onCopied]);

  const runShare = useCallback(async () => {
    const result = await share({
      title,
      // The prompt text is the payload; the attribution keeps the author's
      // name attached to it once it leaves the app.
      message: `${title}\n\n${promptText}\n\n— ${authorName}\n${shareUrl}`,
      url: shareUrl,
    });
    // A dismissed sheet is a success — see ShareOutcome.
    setError(result.ok ? null : result.error.message);
    if (result.ok) {
      onShared?.();
    }
  }, [authorName, promptText, shareUrl, title, onShared]);

  const onShare = useCallback(() => {
    fireAndForget(runShare());
  }, [runShare]);

  return (
    <View style={styles.root}>
      <View style={styles.row}>
        <Button
          label={copied ? 'Copied' : 'Copy prompt'}
          onPress={onCopy}
          disabled={!isReady}
          style={styles.grow}
          testID="copy-prompt"
          accessibilityHint="Copies the prompt text to your clipboard"
          leading={
            <Icon name={copied ? 'check' : 'copy'} size={styles.iconSizes.sm} color="onAccent" />
          }
        />
        <Button
          label="Share"
          variant="secondary"
          onPress={onShare}
          disabled={!isReady}
          testID="share-prompt"
          accessibilityHint="Opens the system share sheet"
          leading={<Icon name="share" size={styles.iconSizes.sm} color="primary" />}
        />
      </View>

      {error !== null && (
        <Text variant="caption" color="danger" testID="prompt-actions-error">
          {error}
        </Text>
      )}
    </View>
  );
};

export const PromptActions = memo(PromptActionsComponent);
PromptActions.displayName = 'PromptActions';
