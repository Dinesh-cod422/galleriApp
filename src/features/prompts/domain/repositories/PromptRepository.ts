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

/**
 * The counters a reader is allowed to move.
 *
 * Deliberately NOT `keyof PromptStats`: likes and favourites are membership,
 * not engagement — they move only in the same batch that writes the caller's
 * own membership document, and the security rules enforce exactly that. Typing
 * this as the three free-standing counters makes the wrong call impossible to
 * write rather than merely rejected at runtime.
 */
export type PromptCounter = 'viewsCount' | 'copiesCount' | 'sharesCount';

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
  /**
   * Adds `amount` to a single engagement counter, atomically and server-side.
   *
   * Takes an amount rather than always adding one so a burst of taps collapses
   * into ONE request. A write per tap is both a cost multiplier and, on a
   * popular prompt, a way to exceed Firestore's sustained per-document write
   * rate — at which point writes start failing for everyone, not just the
   * person tapping.
   *
   * Returns void, not the new total: the caller already showed an incremented
   * number optimistically, and a round trip that reports the authoritative
   * value would make the count visibly jump a second time.
   */
  incrementStat(id: PromptId, counter: PromptCounter, amount: number): Promise<void>;
}
