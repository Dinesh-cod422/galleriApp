/**
 * Explicitly discard a promise whose failure is already surfaced elsewhere —
 * TanStack Query puts refetch/fetchNextPage errors into query state, so there
 * is nothing useful to do with the rejection at the call site.
 *
 * Named rather than `void promise` so the intent is legible: this is a
 * deliberate discard, not a forgotten await.
 */
export const fireAndForget = (promise: Promise<unknown>): void => {
  promise.catch(() => undefined);
};
