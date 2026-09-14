import { toFirestoreAppError } from './firestoreError';

/** Shaped like a real @react-native-firebase/firestore rejection. */
const firestoreError = (code: string, message: string): Error & { code: string } =>
  Object.assign(new Error(message), { code });

const INDEX_URL =
  'https://console.firebase.google.com/v1/r/project/demo/firestore/indexes?create_composite=Ck5wcm9qZWN0cw';

describe('toFirestoreAppError', () => {
  it('lifts the index URL out of a failed-precondition message into a dev action', () => {
    const error = toFirestoreAppError(
      firestoreError(
        'firestore/failed-precondition',
        `The query requires an index. You can create it here: ${INDEX_URL}`,
      ),
    );

    // The raw URL must not end up in the copy a human reads.
    expect(error.message).not.toContain('https://');
    expect(error.devAction).toEqual({ label: 'Create this index', url: INDEX_URL });
    // Retryable: once the index exists, the same query succeeds untouched.
    expect(error.retryable).toBe(true);
  });

  it('survives a failed-precondition that carries no URL', () => {
    const error = toFirestoreAppError(
      firestoreError('failed-precondition', 'The client is offline.'),
    );

    expect(error.devAction).toBeUndefined();
    expect(error.message).toBeTruthy();
  });

  it('maps transport failures to a retryable network error', () => {
    expect(toFirestoreAppError(firestoreError('firestore/unavailable', 'backend unreachable')))
      .toMatchObject({ kind: 'network', retryable: true });
  });

  it('maps permission-denied to a non-retryable permission error', () => {
    expect(toFirestoreAppError(firestoreError('firestore/permission-denied', 'Missing permissions')))
      .toMatchObject({ kind: 'permission', retryable: false });
  });

  it('never leaks a raw throwable message to the user', () => {
    const error = toFirestoreAppError(new Error('INTERNAL ASSERTION FAILED: b/12345'));
    expect(error.message).toBe('Something went wrong loading prompts.');
    expect(error.kind).toBe('unknown');
  });
});
