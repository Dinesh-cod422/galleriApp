import {
  type AppError,
  networkError,
  notFoundError,
  permissionError,
  unknownError,
} from '@core/errors/AppError';

type FirebaseLikeError = { code?: unknown; message?: unknown };

const codeOf = (error: unknown): string => {
  if (typeof error === 'object' && error !== null) {
    const code = (error as FirebaseLikeError).code;
    if (typeof code === 'string') {
      return code;
    }
  }
  return '';
};

const messageOf = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/**
 * Firestore error codes -> the app's single error model.
 *
 * `failed-precondition` is called out separately because it almost always
 * means "this query needs a composite index" — an error the developer must
 * fix, not one the user can retry away.
 */
export const toFirestoreAppError = (error: unknown): AppError => {
  const code = codeOf(error);
  const message = messageOf(error);

  switch (code) {
    case 'firestore/not-found':
    case 'not-found':
      return notFoundError();

    case 'firestore/permission-denied':
    case 'permission-denied':
      return permissionError(
        'You do not have access to this content.',
        error,
      );

    case 'firestore/unavailable':
    case 'unavailable':
    case 'firestore/deadline-exceeded':
    case 'deadline-exceeded':
      return networkError();

    case 'firestore/failed-precondition':
    case 'failed-precondition': {
      // Firestore embeds a ready-made "create this index" console URL in the
      // message. It belongs in an action the developer can tap, not inlined
      // into the copy — it is ~300 characters of base64 and wraps to six
      // unreadable, unselectable lines on a phone.
      const url = message.match(/https:\/\/console\.firebase\.google\.com\S+/)?.[0];
      const devAction =
        __DEV__ && url != null ? { label: 'Create this index', url } : undefined;

      return {
        kind: 'unknown',
        message: __DEV__
          ? 'This query needs a Firestore composite index that has not been created yet.'
          : 'Something went wrong loading prompts.',
        retryable: true,
        cause: error,
        devAction,
      };
    }

    default:
      return unknownError('Something went wrong loading prompts.', error);
  }
};
