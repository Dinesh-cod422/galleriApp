import { type AppError } from '@core/errors/AppError';

/**
 * Used ONLY where failure is an expected branch rather than an exception:
 * clipboard permission denied, a share sheet the user dismissed.
 *
 * Data fetching deliberately does NOT use Result — TanStack Query is built
 * around thrown errors, and wrapping every query would mean unwrapping a
 * Result just to re-throw it. Repositories throw AppError instead.
 */
export type Result<T, E = AppError> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });

export const err = <E>(error: E): Result<never, E> => ({ ok: false, error });
