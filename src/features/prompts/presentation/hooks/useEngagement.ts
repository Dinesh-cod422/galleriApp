import { useCallback, useEffect, useMemo } from 'react';

import { type PromptId, promptId as toPromptId } from '@core/types/branded';
import { container } from '@app/di/container';

import { type PromptStats } from '../../domain/entities/Prompt';
import { type PromptCounter } from '../../domain/repositories/PromptRepository';
import { recordPromptEngagement } from '../../domain/usecases/recordPromptEngagement';
import { createEngagementFlusher } from '../stores/engagementFlusher';
import {
  useEngagementStore,
  usePromptDeltas,
  useRecordEngagement,
} from '../stores/engagementStore';

const repo = () => container().promptRepository;

/**
 * The shortest gap between two counted actions on the same prompt.
 *
 * Copy is a button someone can hold down. Without a floor, one finger produces
 * an unbounded count — which is both a lie about the prompt and, before the
 * flusher existed, a request per frame. Two seconds still counts a person who
 * genuinely copies twice; it does not count a person mashing.
 */
const ACTION_COOLDOWN_MS = 2_000;

/** `${promptId}:${counter}` -> when it was last counted. */
const lastCountedAt = new Map<string, number>();

/**
 * Bounded so a long session browsing thousands of prompts cannot grow this
 * map without limit. Oldest keys go first — Map iterates in insertion order.
 */
const MAX_COOLDOWN_KEYS = 1_000;

const withinCooldown = (id: string, counter: PromptCounter, now: number): boolean => {
  const key = `${id}:${counter}`;
  const previous = lastCountedAt.get(key);
  if (previous !== undefined && now - previous < ACTION_COOLDOWN_MS) {
    return true;
  }
  // Re-insert so this key moves to the end and is evicted last.
  lastCountedAt.delete(key);
  lastCountedAt.set(key, now);
  if (lastCountedAt.size > MAX_COOLDOWN_KEYS) {
    const oldest = lastCountedAt.keys().next();
    if (!oldest.done) {
      lastCountedAt.delete(oldest.value);
    }
  }
  return false;
};

/**
 * One flusher for the app. It owns the only timer that talks to Firestore about
 * engagement, which is what keeps the request rate bounded no matter how many
 * screens are recording.
 */
const flusher = createEngagementFlusher({
  read: () => useEngagementStore.getState().pending,
  send: (id, counter, amount) =>
    recordPromptEngagement(repo())(toPromptId(id), counter, amount),
  settle: (id, counter, amount) => {
    useEngagementStore.getState().settle(id, counter, amount);
  },
});

/** Tests must stop the timer, and reset the cooldown between cases. */
export const resetEngagementRateLimit = (): void => {
  lastCountedAt.clear();
  flusher.stop();
};

/**
 * Prompts whose view has already been counted in THIS app session.
 *
 * Module scope, not storage, and that is the definition of a view: opening the
 * same prompt twice in one sitting — which navigating back and forward does
 * constantly — is one view, but coming back tomorrow is a new one. Persisting
 * this would make a prompt count exactly once, ever, per install.
 */
const viewedThisSession = new Set<string>();

/** Test seam: a session marker that outlives every test would make the second
 *  test in a file silently record nothing. */
export const resetViewedThisSession = (): void => {
  viewedThisSession.clear();
};

/**
 * Records engagement: instantly on device, eventually on the server.
 *
 * The order is the point. The local ledger is written first and synchronously,
 * so the number on screen moves in the same frame as the tap. Nothing touches
 * the network here — the flusher batches a burst into one write and retries on
 * a backoff, so the cost of a tap is bounded no matter how many arrive.
 */
export const useRecordPromptEngagement = (): ((
  id: PromptId,
  counter: PromptCounter,
) => void) => {
  const record = useRecordEngagement();

  return useCallback(
    (id: PromptId, counter: PromptCounter) => {
      if (withinCooldown(id, counter, Date.now())) {
        return;
      }
      // Local first and synchronous, so the number moves this frame. The
      // network is the flusher's problem, and it batches.
      record(id, counter);
      flusher.schedule();
    },
    [record],
  );
};

/**
 * Counts one view per prompt per session, once the prompt is known to exist.
 *
 * `enabled` gates on the document having actually loaded: recording a view for
 * an id that 404s would leave a permanent delta in the ledger for a prompt no
 * server write can ever settle.
 */
export const useRecordPromptView = (id: PromptId, enabled: boolean): void => {
  const record = useRecordPromptEngagement();

  useEffect(() => {
    if (!enabled || viewedThisSession.has(id)) {
      return;
    }
    viewedThisSession.add(id);
    record(id, 'viewsCount');
  }, [enabled, id, record]);
};

/**
 * What the screen should actually show: the server's number plus anything this
 * device has counted but not yet had confirmed.
 *
 * Without this the count would be correct only until the next refetch, which
 * would quietly replace it with the server's still-unincremented value.
 */
export const useDisplayStats = (promptId: string, stats: PromptStats): PromptStats => {
  const deltas = usePromptDeltas(promptId);

  return useMemo(
    () => ({
      ...stats,
      viewsCount: stats.viewsCount + deltas.viewsCount,
      copiesCount: stats.copiesCount + deltas.copiesCount,
      sharesCount: stats.sharesCount + deltas.sharesCount,
    }),
    [stats, deltas],
  );
};
