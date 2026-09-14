import { env } from '@core/config/env';
import { normalizeForSearch } from '@core/utils/text';

import {
  type PromptPage,
  type PromptRepository,
  type SearchPromptsParams,
} from '../repositories/PromptRepository';

const EMPTY: PromptPage = { items: [], nextCursor: null, fromCache: false };

/**
 * The one use case that holds a real rule: normalize the query, and refuse to
 * run below the minimum length. Enforcing it here rather than in the screen
 * means every caller gets it — and, once this is Firestore-backed, every
 * keystroke below the threshold is a billed read that never happens.
 */
export const searchPrompts =
  (repo: PromptRepository) =>
  (params: SearchPromptsParams): Promise<PromptPage> => {
    const query = normalizeForSearch(params.query);
    if (query.length < env.SEARCH_MIN_QUERY_LENGTH) {
      return Promise.resolve(EMPTY);
    }
    return repo.searchPrompts({ ...params, query });
  };
