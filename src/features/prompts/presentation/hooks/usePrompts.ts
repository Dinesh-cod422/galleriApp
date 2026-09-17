import { useMemo } from 'react';
import { useInfiniteQuery, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';

import { env } from '@core/config/env';
import { type CategoryId, type PromptId, promptId as toPromptId } from '@core/types/branded';
import { container } from '@app/di/container';
import { getPromptById } from '../../domain/usecases/getPromptById';
import { getPrompts } from '../../domain/usecases/getPrompts';
import { getPromptsByCategory } from '../../domain/usecases/getPromptsByCategory';
import { searchPrompts } from '../../domain/usecases/searchPrompts';
import { type PromptDetail, type PromptListItem } from '../../domain/entities/Prompt';
import { type PromptPage, type PromptSort } from '../../domain/repositories/PromptRepository';
import { findCachedPrompt } from './promptPlaceholder';
import { promptKeys } from './queryKeys';

const repo = () => container().promptRepository;

/** Flattens infinite-query pages once, memoized, instead of on every render. */
const useFlatItems = (pages: readonly PromptPage[] | undefined): readonly PromptListItem[] =>
  useMemo(() => (pages ? pages.flatMap(page => [...page.items]) : []), [pages]);

/** A stable empty default, so an omitted exclusion list is not a new array
 * identity on every render (which would re-run the memos below each time). */
const EMPTY_IDS: readonly string[] = [];

export type FeedFilter = {
  readonly sort: PromptSort;
  readonly categoryId?: CategoryId | null;
};

/** How many prompts a section preview shows. */
export const SECTION_SIZE = 9;

/**
 * Headroom over `SECTION_SIZE` when fetching.
 *
 * A section drops the prompt being viewed AND anything a higher-ranked section
 * already claimed (see `useSuggestionLedger`). Fetching only one spare would
 * leave the lowest strip visibly short whenever the sorts agree with each
 * other — which, for popular prompts, is most of the time.
 */
const SECTION_OVERFETCH = SECTION_SIZE + 1;

/**
 * The endless prompt feed: one sort, optionally narrowed to one category.
 *
 * ONE hook rather than one per sort. Hooks cannot be called conditionally, so a
 * screen that switches sort or category would otherwise have to mount every
 * variant and throw all but one away — a subscription and a set of reads per
 * discarded variant. The query key still separates the caches, so switching
 * back and forth re-reads nothing.
 */
export const usePromptFeed = ({ sort, categoryId = null }: FeedFilter) => {
  const query = useInfiniteQuery({
    queryKey: promptKeys.list(sort, categoryId),
    queryFn: ({ pageParam }) =>
      categoryId === null
        ? getPrompts(repo())({ sort, cursor: pageParam })
        : getPromptsByCategory(repo())(categoryId, { sort, cursor: pageParam }),
    initialPageParam: null as string | null,
    getNextPageParam: (last: PromptPage) => last.nextCursor,
  });

  return { ...query, items: useFlatItems(query.data?.pages) };
};

export const useLatestPrompts = () => usePromptFeed({ sort: 'newest' });

/**
 * A short preview for one detail-page section.
 *
 * Deliberately a plain query, not an infinite one: a section is a fixed
 * ten-cell strip, and `useInfiniteQuery` would carry pagination machinery that
 * nothing on this screen can trigger.
 *
 * Fetches one more than it shows so that dropping the prompt the user is
 * already looking at still leaves a full row — a section that silently shrinks
 * to eight on some prompts and not others looks broken.
 */
export const useSectionPrompts = (
  sort: PromptSort,
  excludeId?: string,
  /** Ids claimed by higher-ranked sections — see `useSuggestionLedger`. */
  excludeIds: readonly string[] = EMPTY_IDS,
) => {
  const query = useQuery({
    queryKey: promptKeys.section(sort),
    queryFn: () => getPrompts(repo())({ sort, limit: SECTION_SIZE + SECTION_OVERFETCH }),
  });

  const items = useMemo(() => {
    const all = query.data?.items ?? [];
    const taken = new Set(excludeIds);
    return all
      .filter(item => item.id !== excludeId && !taken.has(item.id))
      .slice(0, SECTION_SIZE);
  }, [query.data?.items, excludeId, excludeIds]);

  return { ...query, items };
};

/**
 * "More like this": the rest of the prompt's own category.
 *
 * Category rather than tag overlap because it needs no new index and no
 * relevance scoring — Firestore cannot rank by "number of shared tags" without
 * reading every candidate. Tags would be a better signal and are the obvious
 * upgrade, but they belong behind a search service, not a client-side scan.
 *
 * Fetches one more than it shows, so removing the prompt the user is already
 * looking at still leaves a full row.
 */
export const useRelatedPrompts = (
  categoryId: CategoryId,
  excludeId: string,
  excludeIds: readonly string[] = EMPTY_IDS,
) => {
  const query = useQuery({
    queryKey: promptKeys.related(categoryId),
    queryFn: () =>
      getPromptsByCategory(repo())(categoryId, {
        limit: SECTION_SIZE + SECTION_OVERFETCH,
        cursor: null,
      }),
  });

  const items = useMemo(() => {
    const all = query.data?.items ?? [];
    const taken = new Set(excludeIds);
    return all
      .filter(item => item.id !== excludeId && !taken.has(item.id))
      .slice(0, SECTION_SIZE);
  }, [query.data?.items, excludeId, excludeIds]);

  return { ...query, items };
};

export const usePromptsByCategory = (categoryId: CategoryId) =>
  usePromptFeed({ sort: 'newest', categoryId });

/**
 * Seeds itself from the query cache rather than from a navigation param.
 *
 * Navigation carries ONLY `{ promptId }` — a prompt object in a route breaks
 * deep links and state restoration — but the tile the user just tapped is by
 * definition already cached, so the image, title, author and counts can paint
 * on the FIRST frame while the full document is still in flight.
 *
 * Read once per id: this only seeds the first paint, and recomputing it every
 * render would hand TanStack a new placeholder object each time.
 */
export const usePromptById = (id: PromptId) => {
  const client = useQueryClient();

  const placeholderData = useMemo(() => findCachedPrompt(client, id), [client, id]);

  return useQuery({
    queryKey: promptKeys.detail(id),
    queryFn: () => getPromptById(repo())(id),
    placeholderData,
  });
};

/**
 * Collapses N independent detail queries into one feed-shaped result.
 *
 * Module scope because TanStack re-runs `combine` whenever its identity
 * changes, and an inline arrow is a new identity on every render.
 */
const combineDetails = (
  results: ReadonlyArray<{
    data: PromptDetail | undefined;
    isPending: boolean;
    isError: boolean;
  }>,
): { items: readonly PromptDetail[]; isPending: boolean; isError: boolean } => ({
  items: results.flatMap(result => (result.data === undefined ? [] : [result.data])),
  // Pending only while NOTHING is showable — one slow prompt should not hide
  // the nine that already resolved.
  isPending: results.length > 0 && results.every(result => result.isPending),
  isError: results.length > 0 && results.every(result => result.isError),
});

/**
 * Several prompts by id, for a list the server cannot produce — favourites are
 * device-local, so there is no query that returns "the ones this user saved".
 *
 * Deliberately built on `promptKeys.detail`, the SAME key the detail screen
 * uses. Favouriting something you just looked at therefore costs zero extra
 * reads, and opening it afterwards is instant.
 */
export const usePromptsByIds = (ids: readonly string[]) => {
  const client = useQueryClient();

  const queries = useMemo(
    () =>
      ids.map(id => ({
        queryKey: promptKeys.detail(id),
        queryFn: () => getPromptById(repo())(toPromptId(id)),
        placeholderData: findCachedPrompt(client, id),
      })),
    [ids, client],
  );

  return useQueries({ queries, combine: combineDetails });
};

/**
 * Search results for a query, paginated.
 *
 * `enabled` is what keeps this from costing anything while the field is empty
 * or too short: the use case already refuses to run below the minimum length,
 * but an enabled query would still occupy a loading state and make the screen
 * flash a spinner between keystrokes.
 */
export const useSearchResults = (query: string) => {
  const trimmed = query.trim();
  const enabled = trimmed.length >= env.SEARCH_MIN_QUERY_LENGTH;

  const result = useInfiniteQuery({
    queryKey: promptKeys.search(trimmed),
    queryFn: ({ pageParam }) =>
      searchPrompts(repo())({ query: trimmed, cursor: pageParam as string | null }),
    initialPageParam: null as string | null,
    getNextPageParam: (last: PromptPage) => last.nextCursor,
    enabled,
    // Results for a query the user has moved on from are not worth keeping
    // warm; the next search is almost never the previous one.
    staleTime: 30_000,
  });

  const items = useFlatItems(result.data?.pages);

  return {
    items,
    enabled,
    isPending: enabled && result.isPending,
    isError: result.isError,
    error: result.error,
    hasNextPage: result.hasNextPage,
    isFetchingNextPage: result.isFetchingNextPage,
    fetchNextPage: result.fetchNextPage,
    refetch: result.refetch,
  };
};
