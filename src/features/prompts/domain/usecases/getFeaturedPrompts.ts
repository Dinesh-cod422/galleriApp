import {
  type PromptPage,
  type PromptRepository,
} from '../repositories/PromptRepository';

/** Featured is an editorial rail: one short page, never paginated. */
const FEATURED_LIMIT = 8;

export const getFeaturedPrompts =
  (repo: PromptRepository) =>
  (): Promise<PromptPage> =>
    repo.getPrompts({ sort: 'featured', limit: FEATURED_LIMIT, cursor: null });
