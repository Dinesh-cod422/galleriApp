import { Share } from 'react-native';

import { type AppError, unknownError } from '@core/errors/AppError';
import { err, ok, type Result } from '@core/result/Result';

/**
 * Dismissing the sheet is a SUCCESS, not a failure: the user saw the sheet and
 * chose not to send. Only a sheet that could not be opened is an error, and
 * collapsing the two would mean showing an error message to someone who simply
 * changed their mind.
 */
export type ShareOutcome = 'shared' | 'dismissed';

export type SharePayload = {
  readonly title: string;
  readonly message: string;
  /** iOS renders a rich preview from this; Android appends it to the message. */
  readonly url?: string;
};

export const share = async (
  payload: SharePayload,
): Promise<Result<ShareOutcome, AppError>> => {
  try {
    const result = await Share.share(
      {
        title: payload.title,
        message: payload.message,
        ...(payload.url === undefined ? {} : { url: payload.url }),
      },
      // Becomes the subject line when the target is Mail.
      { subject: payload.title },
    );
    return ok(result.action === Share.sharedAction ? 'shared' : 'dismissed');
  } catch (error) {
    return err(unknownError('Could not open the share sheet.', error));
  }
};
