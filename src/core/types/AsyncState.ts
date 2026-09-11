import { type AppError } from '@core/errors/AppError';

/**
 * The five states every screen must handle. Modelled as a union so a screen's
 * `switch` is exhaustive — forgetting `empty` becomes a compile error, not a
 * blank screen in production.
 */
export type AsyncState<T> =
  | { readonly status: 'loading' }
  | { readonly status: 'error'; readonly error: AppError; readonly retry: () => void }
  | { readonly status: 'empty' }
  | { readonly status: 'success'; readonly data: T };
