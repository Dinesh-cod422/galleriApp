/**
 * One error model for the whole app.
 *
 * A tagged union rather than an Error subclass hierarchy: screens need to
 * *branch* on failure kind (retry button or not, which copy to show), and a
 * discriminated union makes that branch exhaustive at compile time. Class
 * hierarchies give you `instanceof` chains that TypeScript cannot exhaust.
 */
export type AppErrorKind = 'network' | 'notFound' | 'validation' | 'permission' | 'unknown';

type BaseError = {
  /** Safe to show to a user. Never contains stack traces or raw payloads. */
  readonly message: string;
  /** Drives whether the UI offers a Retry affordance. */
  readonly retryable: boolean;
  /** Original throwable, for the logger only. */
  readonly cause?: unknown;
  /**
   * A remediation the *developer* performs, not the user — e.g. creating a
   * missing database index in a web console. Rendered only in `__DEV__`
   * builds, and as a tappable action rather than a URL pasted into the
   * message: these links run to hundreds of characters and are unreadable
   * and untappable as body copy.
   */
  readonly devAction?: { readonly label: string; readonly url: string };
};

export type AppError =
  | (BaseError & { readonly kind: 'network'; readonly retryable: true })
  | (BaseError & { readonly kind: 'notFound'; readonly retryable: false })
  | (BaseError & { readonly kind: 'validation'; readonly retryable: false; readonly field?: string })
  | (BaseError & { readonly kind: 'permission'; readonly retryable: false })
  | (BaseError & { readonly kind: 'unknown'; readonly retryable: true });

export const networkError = (message = 'Check your connection and try again.', cause?: unknown): AppError => ({
  kind: 'network',
  message,
  retryable: true,
  cause,
});

export const notFoundError = (message = 'We could not find what you were looking for.'): AppError => ({
  kind: 'notFound',
  message,
  retryable: false,
});

export const validationError = (message: string, field?: string): AppError => ({
  kind: 'validation',
  message,
  retryable: false,
  field,
});

export const permissionError = (message: string, cause?: unknown): AppError => ({
  kind: 'permission',
  message,
  retryable: false,
  cause,
});

export const unknownError = (message = 'Something went wrong.', cause?: unknown): AppError => ({
  kind: 'unknown',
  message,
  retryable: true,
  cause,
});

const KINDS: ReadonlySet<string> = new Set<AppErrorKind>([
  'network',
  'notFound',
  'validation',
  'permission',
  'unknown',
]);

export const isAppError = (value: unknown): value is AppError =>
  typeof value === 'object' &&
  value !== null &&
  'kind' in value &&
  typeof (value as { kind: unknown }).kind === 'string' &&
  KINDS.has((value as { kind: string }).kind);
