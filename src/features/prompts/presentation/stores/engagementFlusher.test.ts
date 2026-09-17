import { createEngagementFlusher, FLUSH_WINDOW_MS } from './engagementFlusher';
import { createEngagementStore } from './engagementStore';
import { createMemoryStore } from '@infra/storage/keyValueStore';

/** A ledger plus a recording server, wired exactly as the app wires them. */
const setup = (send: jest.Mock) => {
  const store = createEngagementStore(createMemoryStore());
  const flusher = createEngagementFlusher({
    read: () => store.getState().pending,
    send: (id, counter, amount) => send(id, counter, amount) as Promise<void>,
    settle: (id, counter, amount) => store.getState().settle(id, counter, amount),
    // Deterministic: full-jitter backoff would otherwise make timings random.
    jitter: () => 0,
  });
  return { store, flusher };
};

describe('engagementFlusher', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  /**
   * The headline property. This is what stops a held-down button from becoming
   * a request per frame.
   */
  it('collapses a burst of taps into a single write', async () => {
    const send = jest.fn().mockResolvedValue(undefined);
    const { store, flusher } = setup(send);

    for (let i = 0; i < 100; i += 1) {
      store.getState().record('pr_1', 'copiesCount');
      flusher.schedule();
    }
    await flusher.flushNow();

    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith('pr_1', 'copiesCount', 100);
    expect(store.getState().pending.pr_1).toBeUndefined();
    flusher.stop();
  });

  it('sends each counter separately but still one write apiece', async () => {
    const send = jest.fn().mockResolvedValue(undefined);
    const { store, flusher } = setup(send);

    store.getState().record('pr_1', 'viewsCount');
    store.getState().record('pr_1', 'copiesCount');
    store.getState().record('pr_1', 'copiesCount');
    await flusher.flushNow();

    expect(send).toHaveBeenCalledTimes(2);
    expect(send).toHaveBeenCalledWith('pr_1', 'copiesCount', 2);
    flusher.stop();
  });

  /**
   * One slow or contended document must not stop every other prompt from
   * draining, or a single bad prompt would freeze the whole ledger.
   */
  it('keeps only the failed counter pending', async () => {
    const send = jest.fn((id: string) =>
      id === 'pr_bad' ? Promise.reject(new Error('denied')) : Promise.resolve(),
    );
    const { store, flusher } = setup(send as unknown as jest.Mock);

    store.getState().record('pr_ok', 'copiesCount');
    store.getState().record('pr_bad', 'copiesCount');
    await flusher.flushNow();

    expect(store.getState().pending.pr_ok).toBeUndefined();
    expect(store.getState().pending.pr_bad?.copiesCount).toBe(1);
    flusher.stop();
  });

  /**
   * The rules reject these writes today, so "always fails" is the CURRENT
   * state, not a hypothetical. It must not become a retry loop.
   */
  it('backs off instead of hammering a server that keeps refusing', async () => {
    const attemptedAt: number[] = [];
    const send = jest.fn(() => {
      attemptedAt.push(Date.now());
      return Promise.reject(new Error('permission-denied'));
    });
    const { store, flusher } = setup(send as unknown as jest.Mock);

    store.getState().record('pr_1', 'copiesCount');
    await flusher.flushNow();

    // Retries keep failing for a simulated minute.
    await jest.advanceTimersByTimeAsync(60_000);
    flusher.stop();

    const gaps = attemptedAt.slice(1).map((at, i) => at - (attemptedAt[i] as number));
    expect(gaps.length).toBeGreaterThan(1);

    // Every retry waits longer than the last, and even the FIRST retry waits
    // longer than a normal flush would — that is what makes it a backoff and
    // not a loop.
    expect(gaps[0]).toBeGreaterThan(FLUSH_WINDOW_MS);
    expect(gaps.every((gap, i) => i === 0 || gap > (gaps[i - 1] as number))).toBe(true);

    // A whole minute of refusals costs a handful of requests, not hundreds.
    expect(send.mock.calls.length).toBeLessThan(10);
  });

  it('never runs two flushes at once', async () => {
    let inFlight = 0;
    let overlapped = false;
    const send = jest.fn(async () => {
      inFlight += 1;
      overlapped ||= inFlight > 1;
      await Promise.resolve();
      inFlight -= 1;
    });
    const { store, flusher } = setup(send);

    store.getState().record('pr_1', 'copiesCount');
    store.getState().record('pr_2', 'copiesCount');
    await Promise.all([flusher.flushNow(), flusher.flushNow()]);

    expect(overlapped).toBe(false);
    flusher.stop();
  });

  it('flushes in slices rather than one long run', async () => {
    const send = jest.fn().mockResolvedValue(undefined);
    const { store, flusher } = setup(send);

    for (let i = 0; i < 50; i += 1) {
      store.getState().record(`pr_${i}`, 'viewsCount');
    }
    await flusher.flushNow();

    expect(send).toHaveBeenCalledTimes(20);
    flusher.stop();
  });
});
