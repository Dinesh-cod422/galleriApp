import { type PromptCounter } from '../../domain/repositories/PromptRepository';
import { type CounterDeltas } from './engagementStore';

/**
 * How long a burst is allowed to accumulate before it is sent.
 *
 * This is the single most important number here. Without it, holding down Copy
 * is one network write per tap; with it, any number of taps inside the window
 * becomes one `increment(n)`.
 */
export const FLUSH_WINDOW_MS = 2_000;

/** First retry delay after a failure; doubles up to the ceiling. */
const BASE_BACKOFF_MS = 5_000;
const MAX_BACKOFF_MS = 5 * 60_000;

/**
 * Prompts touched per run.
 *
 * A device that browsed a hundred prompts offline would otherwise come back
 * online and fire a hundred sequential writes in one go. Flushing in slices
 * keeps each run short and spreads the load.
 */
const MAX_PROMPTS_PER_RUN = 20;

const COUNTERS: readonly PromptCounter[] = ['viewsCount', 'copiesCount', 'sharesCount'];

export type FlusherDeps = {
  readonly read: () => Readonly<Record<string, CounterDeltas>>;
  readonly send: (id: string, counter: PromptCounter, amount: number) => Promise<void>;
  readonly settle: (id: string, counter: PromptCounter, amount: number) => void;
  /** Injected so tests are deterministic rather than dependent on Math.random. */
  readonly jitter?: () => number;
};

export type EngagementFlusher = {
  /** Something was recorded; make sure a flush is coming. */
  readonly schedule: () => void;
  /** Cancels any pending run. Tests must call this or the timer outlives them. */
  readonly stop: () => void;
  /** Runs immediately, ignoring the window. Exposed for tests. */
  readonly flushNow: () => Promise<void>;
};

/**
 * Sends what the ledger has accumulated, in as few writes as possible.
 *
 * Three behaviours matter, and all three are about surviving abuse rather than
 * the happy path:
 *
 *  - **Coalescing.** A hundred taps inside the window cost one request.
 *  - **Backoff.** A write that fails is retried on a doubling delay, so a
 *    refusal (today: the rules require a signed-in user) does not turn into a
 *    request loop that flattens the battery and the quota.
 *  - **Serialisation.** Writes go one at a time. Firing them in parallel is
 *    what turns a popular prompt into a contended document, where everyone's
 *    writes start failing rather than just being slow.
 */
export const createEngagementFlusher = (deps: FlusherDeps): EngagementFlusher => {
  const jitter = deps.jitter ?? Math.random;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let running = false;
  let consecutiveFailures = 0;

  const hasWork = (): boolean =>
    Object.values(deps.read()).some(deltas => COUNTERS.some(counter => deltas[counter] > 0));

  const nextDelay = (): number => {
    if (consecutiveFailures === 0) {
      return FLUSH_WINDOW_MS;
    }
    const backoff = Math.min(BASE_BACKOFF_MS * 2 ** (consecutiveFailures - 1), MAX_BACKOFF_MS);
    // Full jitter. Without it, every device that failed during the same outage
    // retries at the same instant and re-creates the outage on recovery.
    return backoff / 2 + backoff * jitter() * 0.5;
  };

  const schedule = (): void => {
    if (timer !== null || running) {
      return;
    }
    timer = setTimeout(() => {
      timer = null;
      // Failures are handled inside run(); nothing here can act on them.
      run().catch(() => undefined);
    }, nextDelay());
  };

  const run = async (): Promise<void> => {
    if (running) {
      return;
    }
    running = true;
    let anyFailed = false;

    try {
      const entries = Object.entries(deps.read()).slice(0, MAX_PROMPTS_PER_RUN);
      for (const [id, deltas] of entries) {
        for (const counter of COUNTERS) {
          const amount = deltas[counter];
          if (amount <= 0) {
            continue;
          }
          try {
            // Sequential on purpose — see the docblock.
            await deps.send(id, counter, amount);
            deps.settle(id, counter, amount);
          } catch {
            // Left in the ledger, so the next run retries it. Nothing is lost
            // and nothing is shown differently to the user.
            anyFailed = true;
          }
        }
      }
    } finally {
      running = false;
    }

    consecutiveFailures = anyFailed ? consecutiveFailures + 1 : 0;
    if (anyFailed || hasWork()) {
      schedule();
    }
  };

  return {
    schedule,
    stop: () => {
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
      consecutiveFailures = 0;
    },
    flushNow: run,
  };
};
