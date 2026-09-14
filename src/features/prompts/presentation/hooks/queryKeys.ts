import { type CategoryId } from '@core/types/branded';

import { type PromptSort } from '../../domain/repositories/PromptRepository';

/**
 * One factory for every prompt query key. Invalidation is only safe when keys
 * are constructed in a single place — hand-written arrays drift, and a drifted
 * key silently fails to invalidate.
 */
export const promptKeys = {
  all: ['prompts'] as const,
  lists: () => [...promptKeys.all, 'list'] as const,
  /**
   * Every paginated feed, keyed by what actually varies. One key shape for
   * sort and category together — separate `feed()`/`byCategory()` builders
   * could not express "newest within Photography" without a third.
   */
  list: (sort: PromptSort, categoryId: CategoryId | null = null) =>
    [...promptKeys.lists(), sort, categoryId ?? 'all'] as const,
  /**
   * The short, non-paginated preview a detail-page section shows. Kept apart
   * from `list` so a 9-item preview never satisfies, or is overwritten by, the
   * infinite feed for the same sort.
   */
  section: (sort: PromptSort) => [...promptKeys.lists(), 'section', sort] as const,
  /**
   * "Related" is keyed by CATEGORY, not by prompt id. Two prompts in the same
   * category share one answer, so opening five photography prompts in a row
   * costs one read rather than five.
   */
  related: (categoryId: CategoryId) => [...promptKeys.lists(), 'related', categoryId] as const,
  search: (query: string) => [...promptKeys.lists(), 'search', query] as const,
  details: () => [...promptKeys.all, 'detail'] as const,
  detail: (id: string) => [...promptKeys.details(), id] as const,
};

export const categoryKeys = {
  all: ['categories'] as const,
  list: () => [...categoryKeys.all, 'list'] as const,
};
