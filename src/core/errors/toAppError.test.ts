import { isAppError, networkError, notFoundError } from './AppError';
import { toAppError } from './toAppError';

describe('toAppError', () => {
  it('passes an AppError through untouched', () => {
    const original = networkError();
    expect(toAppError(original)).toBe(original);
  });

  it('wraps a thrown Error, keeping the cause for the logger', () => {
    const cause = new Error('socket hang up');
    const result = toAppError(cause);
    expect(result.kind).toBe('unknown');
    expect(result.message).toBe('socket hang up');
    expect(result.cause).toBe(cause);
  });

  it('handles values that are not errors at all', () => {
    expect(toAppError('boom').message).toBe('boom');
    expect(toAppError(undefined).kind).toBe('unknown');
    expect(toAppError(null).retryable).toBe(true);
  });

  it('marks notFound as not retryable so the UI hides the retry button', () => {
    expect(notFoundError().retryable).toBe(false);
  });

  it('recognises its own shape', () => {
    expect(isAppError(networkError())).toBe(true);
    expect(isAppError({ kind: 'nonsense' })).toBe(false);
    expect(isAppError(null)).toBe(false);
  });
});
