import { getFirestoreClient, collections } from './firebaseClient';

export type ConnectionReport = {
  readonly ok: boolean;
  readonly promptCount: number;
  readonly categoryCount: number;
  readonly sampleTitle: string | null;
  readonly fromCache: boolean;
  readonly error: string | null;
};

/**
 * A real read against the real project, used by the dev Kitchen Sink to prove
 * the native wiring works. Uses only single-field queries so it succeeds even
 * before the composite indexes finish building.
 */
export const checkFirestoreConnection = async (): Promise<ConnectionReport> => {
  try {
    const db = getFirestoreClient();

    const prompts = await db
      .collection(collections.prompts)
      .where('status', '==', 'published')
      .limit(1)
      .get();

    // The status filter is REQUIRED, not cosmetic: Firestore allows a query
    // only if the rules can guarantee every matched document is readable.
    // An unfiltered count() over `prompts` is denied, because drafts are not
    // world-readable.
    const [promptCount, categoryCount] = await Promise.all([
      db.collection(collections.prompts).where('status', '==', 'published').count().get(),
      db.collection(collections.categories).count().get(),
    ]);

    const first = prompts.docs[0];
    return {
      ok: true,
      promptCount: promptCount.data().count,
      categoryCount: categoryCount.data().count,
      sampleTitle: first ? (first.get('title') as string) : null,
      fromCache: prompts.metadata.fromCache,
      error: null,
    };
  } catch (error) {
    return {
      ok: false,
      promptCount: 0,
      categoryCount: 0,
      sampleTitle: null,
      fromCache: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
};
