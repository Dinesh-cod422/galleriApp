import { create } from 'zustand';

import { keyValueStore, type KeyValueStore } from '@infra/storage/keyValueStore';

import { type PromptCounter } from '../../domain/repositories/PromptRepository';

const STORAGE_KEY = 'engagement.pending.v1';

/**
 * How many prompts may hold unsent deltas.
 *
 * The ledger only drains when the server accepts a write. If it never does —
 * offline for a week, or rules that reject the write outright — this would grow
 * without limit and be parsed on every cold start. Oldest entries are dropped
 * first, because a count the user saw move ten minutes ago matters more than
 * one from last month.
 */
const MAX_TRACKED_PROMPTS = 500;

/**
 * The most one counter may hold for a single prompt before extra taps stop
 * counting.
 *
 * Belt to the cooldown's braces. The cooldown limits how fast a counter can
 * grow; this limits how far it can grow if that ever fails — a stuck finger, a
 * repeated automation, or simply weeks offline should not produce a prompt
 * claiming four million copies, because that number is visible to everyone.
 */
const MAX_DELTA_PER_COUNTER = 1_000;

export type CounterDeltas = {
  readonly viewsCount: number;
  readonly copiesCount: number;
  readonly sharesCount: number;
};

/** One shared instance, so "no deltas" is a stable reference for selectors. */
export const NO_DELTAS: CounterDeltas = { viewsCount: 0, copiesCount: 0, sharesCount: 0 };

export type EngagementState = {
  readonly pending: Readonly<Record<string, CounterDeltas>>;
  /** The user did the thing. Shows immediately, survives a restart. */
  readonly record: (promptId: string, counter: PromptCounter) => void;
  /** The server accepted `amount`; stop counting it locally. */
  readonly settle: (promptId: string, counter: PromptCounter, amount: number) => void;
};

const isDeltas = (value: unknown): value is CounterDeltas =>
  typeof value === 'object' &&
  value !== null &&
  ['viewsCount', 'copiesCount', 'sharesCount'].every(
    key => typeof (value as Record<string, unknown>)[key] === 'number',
  );

/** Tolerates anything on disk — corrupt storage must not crash a cold start. */
const load = (storage: KeyValueStore): Record<string, CounterDeltas> => {
  const raw = storage.getString(STORAGE_KEY);
  if (raw == null) {
    return {};
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) {
      return {};
    }
    return Object.fromEntries(
      Object.entries(parsed as Record<string, unknown>).filter(([, v]) => isDeltas(v)),
    ) as Record<string, CounterDeltas>;
  } catch {
    return {};
  }
};

/**
 * Entries are dropped from the FRONT because JS objects iterate string keys in
 * insertion order, and `record` re-inserts a prompt only when it is absent —
 * so position is age.
 */
const prune = (pending: Record<string, CounterDeltas>): Record<string, CounterDeltas> => {
  const keys = Object.keys(pending);
  if (keys.length <= MAX_TRACKED_PROMPTS) {
    return pending;
  }
  const keep = keys.slice(keys.length - MAX_TRACKED_PROMPTS);
  return Object.fromEntries(keep.map(key => [key, pending[key] as CounterDeltas]));
};

const isEmpty = (deltas: CounterDeltas): boolean =>
  deltas.viewsCount === 0 && deltas.copiesCount === 0 && deltas.sharesCount === 0;

/**
 * Engagement the device has counted but the server has not confirmed.
 *
 * Why this exists at all: the displayed number has to move the instant the
 * user taps Copy, and it has to still be there after a restart. A purely
 * optimistic cache update satisfies the first and fails the second — reopening
 * the app would snap the count back and read as a bug.
 *
 * So the number on screen is always `server value + local delta`. A delta is
 * cleared only when the server confirms it, which makes this an outbox: if the
 * write is rejected today (the security rules require a signed-in user, and
 * there is no auth yet) the count still behaves correctly on device, and the
 * same entries drain the first time a write succeeds.
 *
 * Written as a factory so a test can inject storage instead of `jest.mock`.
 */
export const createEngagementStore = (storage: KeyValueStore) =>
  create<EngagementState>()((set, get) => {
    const persist = (pending: Record<string, CounterDeltas>): void => {
      storage.set(STORAGE_KEY, JSON.stringify(pending));
    };

    return {
      // Synchronous hydration: a count must not paint stale and then jump.
      pending: load(storage),

      record: (promptId, counter) => {
        const current = get().pending[promptId] ?? NO_DELTAS;
        if (current[counter] >= MAX_DELTA_PER_COUNTER) {
          // Silently ignored: the number is already absurd, and telling the
          // user their tap "failed" would be worse than quietly not counting.
          return;
        }
        const next = prune({
          ...get().pending,
          [promptId]: { ...current, [counter]: current[counter] + 1 },
        });
        persist(next);
        set({ pending: next });
      },

      settle: (promptId, counter, amount) => {
        const current = get().pending[promptId];
        if (current === undefined || amount <= 0) {
          return;
        }
        // Subtract what was actually sent, never reset to zero: the user may
        // have tapped again while the request was in flight, and that tap is
        // still unsent.
        const remaining = Math.max(0, current[counter] - amount);
        const updated = { ...current, [counter]: remaining };
        const next = { ...get().pending };
        if (isEmpty(updated)) {
          delete next[promptId];
        } else {
          next[promptId] = updated;
        }
        persist(next);
        set({ pending: next });
      },
    };
  });

export const useEngagementStore = createEngagementStore(keyValueStore);

/**
 * The whole delta object for one prompt.
 *
 * Returning the STORED object rather than a fresh one matters: Zustand compares
 * selector results with Object.is, so building `{views, copies, shares}` here
 * would be a new identity every render and re-render the screen forever.
 */
export const usePromptDeltas = (promptId: string): CounterDeltas =>
  useEngagementStore(state => state.pending[promptId] ?? NO_DELTAS);

export const useRecordEngagement = (): EngagementState['record'] =>
  useEngagementStore(state => state.record);
