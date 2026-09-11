/**
 * The switch that makes the Firebase migration a one-line change.
 *
 * `app/di/container.ts` reads DATA_SOURCE to decide which data source to
 * construct. Today only 'local' is constructible; adding 'firebase' later
 * means adding one branch, not touching any screen.
 */
export type DataSourceKind = 'local' | 'firebase';

export const env = {
  DATA_SOURCE: 'local' as DataSourceKind,

  /** Mock latency window (ms) so loading and skeleton states are real. */
  MOCK_LATENCY_MIN_MS: 120,
  MOCK_LATENCY_MAX_MS: 400,

  /** Dev-only: force the local data source to fail, to exercise error states. */
  SIMULATE_FAILURES: false,

  SEARCH_DEBOUNCE_MS: 300,
  SEARCH_MIN_QUERY_LENGTH: 2,
} as const;
