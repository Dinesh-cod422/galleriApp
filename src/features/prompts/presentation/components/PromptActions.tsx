import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';

import { fireAndForget } from '@core/utils/fireAndForget';
import { clipboard } from '@infra/clipboard/clipboard';
import { haptics } from '@infra/haptics/haptics';
import { share } from '@infra/share/share';
import { Button, Icon, Text, type Theme, useThemedStyles } from '@ds';

/** How long the button stays in its confirmed state before reverting. */
const COPIED_RESET_MS = 2000;

const styleFactory = (theme: Theme) => ({
  root: { gap: theme.spacing.sm },
  row: { flexDirection: 'row' as const, gap: theme.spacing.sm },
  grow: { flex: 1 },
});

export type PromptActionsProps = {
  title: string;
  /** Empty while the detail is still hydrating from the list placeholder. */
  promptText: string;
  imageUrl: string;
  authorName: string;
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
  imageUrl,
  authorName,
}: PromptActionsProps): React.JSX.Element => {
  const styles = useThemedStyles(styleFactory);
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

    if (resetTimer.current !== null) {
      clearTimeout(resetTimer.current);
    }
    resetTimer.current = setTimeout(() => setCopied(false), COPIED_RESET_MS);
  }, [promptText]);

  const runShare = useCallback(async () => {
    const result = await share({
      title,
      // The prompt text is the payload; the attribution keeps the author's
      // name attached to it once it leaves the app.
      message: `${title}\n\n${promptText}\n\n— ${authorName}`,
      url: imageUrl,
    });
    // A dismissed sheet is a success — see ShareOutcome.
    setError(result.ok ? null : result.error.message);
  }, [authorName, imageUrl, promptText, title]);

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
            <Icon name={copied ? 'check' : 'copy'} size={16} color="onAccent" />
          }
        />
        <Button
          label="Share"
          variant="secondary"
          onPress={onShare}
          disabled={!isReady}
          testID="share-prompt"
          accessibilityHint="Opens the system share sheet"
          leading={<Icon name="share" size={16} color="primary" />}
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
