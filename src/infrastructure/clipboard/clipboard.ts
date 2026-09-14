import Clipboard from '@react-native-clipboard/clipboard';

import { type AppError, unknownError } from '@core/errors/AppError';
import { err, ok, type Result } from '@core/result/Result';

/**
 * Returns a Result rather than throwing.
 *
 * A clipboard write failing is an expected branch — a denied permission, a
 * managed device with copy disabled — not an exception. The caller has to
 * decide what to show either way, and a Result makes forgetting that a type
 * error instead of a silent no-op.
 */
export const clipboard = {
  copy(text: string): Result<void, AppError> {
    try {
      Clipboard.setString(text);
      return ok(undefined);
    } catch (error) {
      return err(unknownError('Could not copy to the clipboard.', error));
    }
  },
};
