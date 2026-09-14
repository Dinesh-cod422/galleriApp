import firestore, { type FirebaseFirestoreTypes } from '@react-native-firebase/firestore';

import { firestoreEmulator } from './devConfig';

/**
 * The ONLY module in the app allowed to import a Firebase SDK.
 *
 * Everything else reaches Firestore through a feature's data-layer
 * datasources, which import this. The ESLint layering rules already forbid
 * Firebase imports from presentation; keeping the SDK in one infrastructure
 * file is what makes that rule cheap to obey.
 */
export type Firestore = FirebaseFirestoreTypes.Module;
export type DocumentSnapshot = FirebaseFirestoreTypes.DocumentSnapshot;
export type QueryDocumentSnapshot = FirebaseFirestoreTypes.QueryDocumentSnapshot;
export type Timestamp = FirebaseFirestoreTypes.Timestamp;

let configured = false;

/**
 * Offline persistence is on by default in React Native Firebase, but the cache
 * size is not — an image-heavy gallery browsing 1000s of documents will evict
 * aggressively at the 40MB default. 100MB keeps a realistic browsing session
 * fully offline-readable.
 */
export const getFirestoreClient = (): Firestore => {
  const db = firestore();
  if (!configured) {
    // Must precede any other call on the instance. Double-guarded by __DEV__ so
    // a release build can never be pointed at a developer machine.
    if (__DEV__ && firestoreEmulator.enabled) {
      db.useEmulator(firestoreEmulator.host, firestoreEmulator.port);
    }
    db.settings({
      persistence: true,
      cacheSizeBytes: 100 * 1024 * 1024,
    });
    configured = true;
  }
  return db;
};

/**
 * The `__name__` sentinel, used as the pagination tiebreaker so value cursors
 * address a total ordering. Exposed here so the data layer never imports the
 * Firebase SDK directly.
 */
export const documentIdPath = (): FirebaseFirestoreTypes.FieldPath =>
  firestore.FieldPath.documentId();

/** Collection paths in one place, so a typo is a compile error, not an empty list. */
export const collections = {
  prompts: 'prompts',
  categories: 'categories',
  users: 'users',
  likesOf: (promptId: string) => `prompts/${promptId}/likes`,
  favoritesOf: (promptId: string) => `prompts/${promptId}/favorites`,
  commentsOf: (promptId: string) => `prompts/${promptId}/comments`,
} as const;
