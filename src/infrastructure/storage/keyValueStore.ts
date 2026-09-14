import { createMMKV } from 'react-native-mmkv';

/**
 * The narrow slice of key/value storage the app actually uses.
 *
 * Declared as a type so callers depend on the capability, not on MMKV: a store
 * takes this interface and a test hands it an in-memory object, with no native
 * module and no `jest.mock`. It also keeps MMKV's own vocabulary contained —
 * v4 renamed `delete` to `remove`, and that rename stops at this file.
 */
export type KeyValueStore = {
  getString(key: string): string | undefined;
  set(key: string, value: string): void;
  remove(key: string): void;
};

/**
 * MMKV rather than AsyncStorage, for one reason that matters here: reads are
 * SYNCHRONOUS. Favourites can be hydrated during the first render, so a
 * favourited tile never paints empty and then flips a frame later.
 */
const mmkv = createMMKV({ id: 'ai-prompt-gallery' });

export const keyValueStore: KeyValueStore = {
  getString: key => mmkv.getString(key),
  set: (key, value) => mmkv.set(key, value),
  remove: key => {
    mmkv.remove(key);
  },
};

/** In-memory implementation, for tests and for any non-persistent context. */
export const createMemoryStore = (): KeyValueStore => {
  const map = new Map<string, string>();
  return {
    getString: key => map.get(key),
    set: (key, value) => {
      map.set(key, value);
    },
    remove: key => {
      map.delete(key);
    },
  };
};
