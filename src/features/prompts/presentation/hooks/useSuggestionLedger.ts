import { useCallback, useMemo, useRef, useState } from 'react';

/**
 * Stops the suggestion strips under a prompt from showing the same pictures.
 *
 * Each strip runs its own query over a different sort — most copied, most
 * shared, trending, newest — and a genuinely popular prompt tops several of
 * them at once. Every strip excluded only the prompt being viewed, so the page
 * ended up scrolling through four headings over largely the same images: four
 * sections' worth of space carrying about one section's worth of ideas.
 *
 * The ledger makes the strips aware of each other IN ORDER. A strip claims the
 * ids it is showing; every strip below it then skips those. Rank decides who
 * keeps a contested prompt, so the most relevant strip — Related, which is
 * about THIS prompt — wins it, and the ones below fill with something else.
 *
 * Ordering makes this terminate: a strip's exclusions depend only on strips
 * ABOVE it, so claims flow one way and cannot cycle.
 */
export type SuggestionLedger = {
  /** Ids already spoken for by every strip ranked above `rank`. */
  excludedFor: (rank: number) => readonly string[];
  /** Record what a strip is showing. Safe to call on every render. */
  claim: (rank: number, ids: readonly string[]) => void;
};

export const useSuggestionLedger = (): SuggestionLedger => {
  const [claims, setClaims] = useState<Readonly<Record<number, readonly string[]>>>({});
  // Mirrors `claims` so `claim` can compare against the latest value without
  // taking it as a dependency — otherwise the callback's identity would change
  // on every claim and re-trigger every strip's effect.
  const latest = useRef<Record<number, readonly string[]>>({});

  const claim = useCallback((rank: number, ids: readonly string[]) => {
    const previous = latest.current[rank];
    // Same ids in the same order means nothing to publish. Without this guard a
    // strip would set state on every render and never settle.
    if (previous !== undefined && previous.length === ids.length && previous.every((id, i) => id === ids[i])) {
      return;
    }
    latest.current = { ...latest.current, [rank]: ids };
    setClaims(latest.current);
  }, []);

  /**
   * Every rank's exclusion list, built once per change to the claims.
   *
   * Computed up front rather than on demand so that asking twice for the same
   * rank returns the SAME array. Identity matters as much as contents: this
   * value is a dependency of each strip's memo and effect, so a fresh array per
   * call would rebuild every strip's list on every render — the claim guard
   * above stops that becoming a loop, but the churn would be constant.
   *
   * There are a handful of strips, so the prefix walk is trivial.
   */
  const prefixes = useMemo(() => {
    const ranks = Object.keys(claims).map(Number);
    const highest = ranks.length === 0 ? -1 : Math.max(...ranks);

    // Dense, not just the ranks that have claimed: a strip whose own query has
    // not resolved yet still asks for its exclusions, and answering that with
    // the full union would hide the picks of strips BELOW it.
    const byRank = new Map<number, readonly string[]>();
    const running: string[] = [];
    for (let rank = 0; rank <= highest + 1; rank += 1) {
      // Everything claimed strictly above this rank, captured before this
      // rank's own ids join the running total.
      byRank.set(rank, [...running]);
      running.push(...(claims[rank] ?? []));
    }
    return { byRank, all: running as readonly string[] };
  }, [claims]);

  const excludedFor = useCallback(
    (rank: number): readonly string[] => prefixes.byRank.get(rank) ?? prefixes.all,
    [prefixes],
  );

  return useMemo(() => ({ excludedFor, claim }), [excludedFor, claim]);
};
