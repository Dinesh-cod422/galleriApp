import { createMemoryStore } from '@infra/storage/keyValueStore';

import { createEngagementStore } from './engagementStore';

describe('engagementStore', () => {
  it('counts each action and keeps the counters independent', () => {
    const store = createEngagementStore(createMemoryStore());

    store.getState().record('pr_1', 'copiesCount');
    store.getState().record('pr_1', 'copiesCount');
    store.getState().record('pr_1', 'sharesCount');

    expect(store.getState().pending.pr_1).toEqual({
      viewsCount: 0,
      copiesCount: 2,
      sharesCount: 1,
    });
  });

  /**
   * The whole point of the ledger: a count the user saw move must still be
   * there after the process dies, or reopening the app looks like a bug.
   */
  it('survives a restart', () => {
    const storage = createMemoryStore();
    createEngagementStore(storage).getState().record('pr_1', 'viewsCount');

    const revived = createEngagementStore(storage);

    expect(revived.getState().pending.pr_1?.viewsCount).toBe(1);
  });

  it('stops counting locally once the server confirms', () => {
    const store = createEngagementStore(createMemoryStore());
    store.getState().record('pr_1', 'copiesCount');

    store.getState().settle('pr_1', 'copiesCount', 1);

    // Fully settled prompts are dropped rather than left as a row of zeroes.
    expect(store.getState().pending.pr_1).toBeUndefined();
  });

  /**
   * A tap that lands while the previous write is in flight must not be erased
   * by that write's confirmation — settle subtracts, it does not reset.
   */
  it('keeps a tap that arrived while the write was in flight', () => {
    const store = createEngagementStore(createMemoryStore());
    store.getState().record('pr_1', 'copiesCount');
    store.getState().record('pr_1', 'copiesCount');

    store.getState().settle('pr_1', 'copiesCount', 1);

    expect(store.getState().pending.pr_1?.copiesCount).toBe(1);
  });

  it('ignores a confirmation for something it never counted', () => {
    const store = createEngagementStore(createMemoryStore());

    store.getState().settle('pr_unknown', 'viewsCount', 1);

    expect(store.getState().pending).toEqual({});
  });

  it('never counts below zero', () => {
    const store = createEngagementStore(createMemoryStore());
    store.getState().record('pr_1', 'viewsCount');

    store.getState().settle('pr_1', 'viewsCount', 5);

    expect(store.getState().pending.pr_1).toBeUndefined();
  });

  it('starts empty rather than crashing on corrupt storage', () => {
    const storage = createMemoryStore();
    storage.set('engagement.pending.v1', '{not json');

    expect(createEngagementStore(storage).getState().pending).toEqual({});
  });

  it('discards entries that are not counter shapes', () => {
    const storage = createMemoryStore();
    storage.set(
      'engagement.pending.v1',
      JSON.stringify({ pr_ok: { viewsCount: 1, copiesCount: 0, sharesCount: 0 }, pr_bad: 7 }),
    );

    const store = createEngagementStore(storage);

    expect(Object.keys(store.getState().pending)).toEqual(['pr_ok']);
  });

  /**
   * Nothing drains the ledger while writes keep failing, so the cap is what
   * stops a permanently-rejected write from growing an unbounded blob that is
   * parsed on every cold start.
   */
  it('caps how many prompts it tracks, dropping the oldest', () => {
    const store = createEngagementStore(createMemoryStore());

    for (let i = 0; i < 520; i += 1) {
      store.getState().record(`pr_${i}`, 'viewsCount');
    }

    const keys = Object.keys(store.getState().pending);
    expect(keys).toHaveLength(500);
    expect(keys).not.toContain('pr_0');
    expect(keys).toContain('pr_519');
  });

  /**
   * The cooldown in `useEngagement` is the first line of defence; this is the
   * second, for anything that bypasses it — a stuck automation, or weeks of
   * accumulation while every write is refused.
   */
  it('stops counting a single counter once it is already absurd', () => {
    const store = createEngagementStore(createMemoryStore());

    for (let i = 0; i < 1_200; i += 1) {
      store.getState().record('pr_1', 'copiesCount');
    }

    expect(store.getState().pending.pr_1?.copiesCount).toBe(1_000);
  });

  it('caps one counter without freezing the others', () => {
    const store = createEngagementStore(createMemoryStore());
    for (let i = 0; i < 1_100; i += 1) {
      store.getState().record('pr_1', 'copiesCount');
    }

    store.getState().record('pr_1', 'sharesCount');

    expect(store.getState().pending.pr_1?.sharesCount).toBe(1);
  });
});
