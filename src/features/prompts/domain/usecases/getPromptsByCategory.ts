import { DEFAULT_PAGE_SIZE } from '@core/types/Paginated';
import { type CategoryId } from '@core/types/branded';

import {
  type GetPromptsParams,
  type PromptPage,
  type PromptRepository,
} from '../repositories/PromptRepository';

export const getPromptsByCategory =
  (repo: PromptRepository) =>
  (categoryId: CategoryId, params: Omit<GetPromptsParams, 'categoryId'> = {}): Promise<PromptPage> =>
    repo.getPromptsByCategory(categoryId, {
      limit: params.limit ?? DEFAULT_PAGE_SIZE,
      cursor: params.cursor ?? null,
    });
