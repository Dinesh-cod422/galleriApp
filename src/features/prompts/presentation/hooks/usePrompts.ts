import { useMemo } from 'react';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';

import { type CategoryId, type PromptId } from '@core/types/branded';
import { container } from '@app/di/container';
import { getPromptById } from '../../domain/usecases/getPromptById';
import { getPrompts } from '../../domain/usecases/getPrompts';
import { getPromptsByCategory } from '../../domain/usecases/getPromptsByCategory';
import { type PromptListItem } from '../../domain/entities/Prompt';
import { type PromptPage, type PromptSort } from '../../domain/repositories/PromptRepository';
import { findCachedPrompt } from './promptPlaceholder';
import { promptKeys } from './queryKeys';

const repo = () => container().promptRepository;

/** Flattens infinite-query pages once, memoized, instead of on every render. */
const useFlatItems = (pages: readonly PromptPage[] | undefined): readonly PromptListItem[] =>
  useMemo(() => (pages ? pages.flatMap(page => [...page.items]) : []), [pages]);

export type FeedFilter = {
  readonly sort: PromptSort;
  readonly categoryId?: CategoryId | null;
};

/** A section preview shows nine prompts and a "Show all" cell as the tenth. */
export const SECTION_SIZE = 9;

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
export const useSectionPrompts = (sort: PromptSort, excludeId?: string) => {
  const query = useQuery({
    queryKey: promptKeys.section(sort),
    queryFn: () => getPrompts(repo())({ sort, limit: SECTION_SIZE + 1 }),
  });

  const items = useMemo(() => {
    const all = query.data?.items ?? [];
    return all.filter(item => item.id !== excludeId).slice(0, SECTION_SIZE);
  }, [query.data?.items, excludeId]);

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
export const useRelatedPrompts = (categoryId: CategoryId, excludeId: string) => {
  const query = useQuery({
    queryKey: promptKeys.related(categoryId),
    queryFn: () =>
      getPromptsByCategory(repo())(categoryId, { limit: SECTION_SIZE + 1, cursor: null }),
  });

  const items = useMemo(() => {
    const all = query.data?.items ?? [];
    return all.filter(item => item.id !== excludeId).slice(0, SECTION_SIZE);
  }, [query.data?.items, excludeId]);

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
