import { collections, documentIdPath, getFirestoreClient } from '@infra/firebase/firebaseClient';
import type { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';

import { type PromptSort } from '../../domain/repositories/PromptRepository';
import { type PromptDto } from '../dto/PromptDto';

type Query = FirebaseFirestoreTypes.Query;
type QuerySnapshot = FirebaseFirestoreTypes.QuerySnapshot;

export type PromptQuery = {
  readonly sort: PromptSort;
  readonly categoryId?: string;
  readonly searchToken?: string;
  readonly cursor?: string | null;
  readonly limit: number;
};

export type RawPage = {
  readonly docs: ReadonlyArray<{ id: string; data: PromptDto }>;
  readonly nextCursor: string | null;
  readonly fromCache: boolean;
};

/** The sort key each mode orders by — also what the cursor encodes. */
/**
 * Field AND cursor type in one table.
 *
 * These two facts have to agree: a cursor for a timestamp sort must be decoded
 * as a Date and one for a counter as a Number, and when they were expressed as
 * two separate `sort === 'trending'` checks, adding a sort meant remembering to
 * update both. Here a new sort cannot compile without deciding both.
 */
const SORT: Record<PromptQuery['sort'], { readonly field: string; readonly numeric: boolean }> = {
  newest: { field: 'publishedAt', numeric: false },
  featured: { field: 'publishedAt', numeric: false },
  trending: { field: 'trendingScore', numeric: true },
  mostCopied: { field: 'stats.copiesCount', numeric: true },
  mostShared: { field: 'stats.sharesCount', numeric: true },
};

type CursorPayload = { k: number | string; id: string };

/**
 * `<sortValue>|<docId>`. Deliberately not base64/JSON: React Native has no
 * Buffer, and the two parts are already URL-safe — ISO timestamps and numbers
 * on one side, Firestore document ids on the other, neither of which can
 * contain a pipe.
 */
const CURSOR_SEPARATOR = '|';

const encodeCursor = (payload: CursorPayload): string =>
  `${payload.k}${CURSOR_SEPARATOR}${payload.id}`;

const decodeCursor = (cursor: string): CursorPayload | null => {
  const separator = cursor.indexOf(CURSOR_SEPARATOR);
  if (separator <= 0) {
    return null;
  }
  const key = cursor.slice(0, separator);
  const id = cursor.slice(separator + 1);
  if (id.length === 0) {
    return null;
  }
  return { k: key, id };
};

/**
 * The ONLY class that talks to Firestore.
 *
 * Cursors are VALUES, not DocumentSnapshots: `startAfter(sortValue, docId)`.
 * That keeps the Firestore type out of every layer above, and — unlike a
 * snapshot — a value cursor survives a cache rehydration and an app restart.
 * It requires an explicit `__name__` tiebreaker so the ordering is total and
 * pagination cannot drop or repeat a row.
 */
export class PromptFirestoreDataSource {
  private get db() {
    return getFirestoreClient();
  }

  async getPrompts(params: PromptQuery): Promise<RawPage> {
    const { field: sortField, numeric } = SORT[params.sort];

    // Every gallery query carries the status filter. Not optional: the security
    // rules only permit a query whose every match is guaranteed readable.
    let query: Query = this.db
      .collection(collections.prompts)
      .where('status', '==', 'published');

    if (params.sort === 'featured') {
      query = query.where('flags.isFeatured', '==', true);
    }
    if (params.sort === 'trending') {
      query = query.where('flags.isTrending', '==', true);
    }
    if (params.categoryId !== undefined) {
      query = query.where('categoryId', '==', params.categoryId);
    }
    if (params.searchToken !== undefined) {
      query = query.where('searchTokens', 'array-contains', params.searchToken);
    }

    query = query
      .orderBy(sortField, 'desc')
      .orderBy(documentIdPath(), 'desc')
      .limit(params.limit);

    if (params.cursor != null) {
      const decoded = decodeCursor(params.cursor);
      if (decoded) {
        const sortValue = numeric ? Number(decoded.k) : new Date(String(decoded.k));
        query = query.startAfter(sortValue, decoded.id);
      }
    }

    return this.toRawPage(await query.get(), params);
  }

  async getById(id: string): Promise<{ id: string; data: PromptDto } | null> {
    const snapshot = await this.db.collection(collections.prompts).doc(id).get();
    if (!snapshot.exists()) {
      return null;
    }
    return { id: snapshot.id, data: snapshot.data() as PromptDto };
  }

  private toRawPage(snapshot: QuerySnapshot, params: PromptQuery): RawPage {
    const docs = snapshot.docs.map(doc => ({
      id: doc.id,
      data: doc.data() as PromptDto,
    }));

    const last = snapshot.docs[snapshot.docs.length - 1];
    const hasMore = snapshot.size === params.limit && last !== undefined;

    let nextCursor: string | null = null;
    if (hasMore) {
      const { field: sortField, numeric } = SORT[params.sort];
      const raw: unknown = last.get(sortField);
      if (numeric) {
        nextCursor = encodeCursor({ k: typeof raw === 'number' ? raw : 0, id: last.id });
      } else {
        const ts = raw as FirebaseFirestoreTypes.Timestamp | null;
        nextCursor = encodeCursor({
          k: ts ? ts.toDate().toISOString() : new Date().toISOString(),
          id: last.id,
        });
      }
    }

    return { docs, nextCursor, fromCache: snapshot.metadata.fromCache };
  }
}
