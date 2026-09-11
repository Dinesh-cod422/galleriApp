/**
 * Cursor-based rather than offset-based, because Firestore pages by document
 * cursor (`startAfter`). Matching that shape now means the local data source
 * and the future Firestore one satisfy the identical contract.
 */
export type Page<T> = {
  readonly items: readonly T[];
  readonly nextCursor: string | null;
};

export type PageParams = {
  readonly cursor?: string | null;
  readonly limit?: number;
};

export const DEFAULT_PAGE_SIZE = 12;
