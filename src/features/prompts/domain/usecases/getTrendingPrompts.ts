import {
  type PromptPage,
  type PromptRepository,
} from '../repositories/PromptRepository';

const TRENDING_LIMIT = 10;

export const getTrendingPrompts =
  (repo: PromptRepository) =>
  (): Promise<PromptPage> =>
    repo.getPrompts({ sort: 'trending', limit: TRENDING_LIMIT, cursor: null });
