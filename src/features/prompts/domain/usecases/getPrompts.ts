import { DEFAULT_PAGE_SIZE } from '@core/types/Paginated';

import {
  type GetPromptsParams,
  type PromptPage,
  type PromptRepository,
} from '../repositories/PromptRepository';

/**
 * Plain function, not a class: it has no state, and a one-method class would be
 * ceremony. The repository arrives as an argument, so tests pass a fake with
 * zero mocking.
 */
export const getPrompts =
  (repo: PromptRepository) =>
  (params: GetPromptsParams = {}): Promise<PromptPage> =>
    repo.getPrompts({
      sort: params.sort ?? 'newest',
      limit: params.limit ?? DEFAULT_PAGE_SIZE,
      cursor: params.cursor ?? null,
      ...(params.categoryId !== undefined ? { categoryId: params.categoryId } : {}),
    });
