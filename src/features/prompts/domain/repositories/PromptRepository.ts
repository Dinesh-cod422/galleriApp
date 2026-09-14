import { type CategoryId, type PromptId } from '@core/types/branded';

import { type PromptDetail, type PromptListItem } from '../entities/Prompt';

/** Opaque, serializable cursor. Never a Firestore DocumentSnapshot. */
export type PromptCursor = string;

export type PromptPage = {
  readonly items: readonly PromptListItem[];
  readonly nextCursor: PromptCursor | null;
  /** True when Firestore answered from its on-device cache. */
  readonly fromCache: boolean;
};

export type PromptSort = 'newest' | 'trending' | 'featured' | 'mostCopied' | 'mostShared';

export type GetPromptsParams = {
  readonly sort?: PromptSort;
  readonly categoryId?: CategoryId;
  readonly cursor?: PromptCursor | null;
  readonly limit?: number;
};

export type SearchPromptsParams = {
  readonly query: string;
  readonly cursor?: PromptCursor | null;
  readonly limit?: number;
};

/**
 * Not one Firebase type in this file. Swapping Firestore for REST means
 * writing a second implementation; nothing above this line changes.
 */
export interface PromptRepository {
  getPrompts(params: GetPromptsParams): Promise<PromptPage>;
  getPromptById(id: PromptId): Promise<PromptDetail>;
  getPromptsByCategory(
    categoryId: CategoryId,
    params?: Omit<GetPromptsParams, 'categoryId'>,
  ): Promise<PromptPage>;
  searchPrompts(params: SearchPromptsParams): Promise<PromptPage>;
}
