import { createMemoryStore, type KeyValueStore } from '@infra/storage/keyValueStore';

import { createFavoritesStore } from './favoritesStore';

const STORAGE_KEY = 'favorites.v1';

/** A store whose disk contents we can inspect and corrupt. */
const seeded = (raw?: string): KeyValueStore => {
  const storage = createMemoryStore();
  if (raw !== undefined) {
    storage.set(STORAGE_KEY, raw);
  }
  return storage;
};

describe('favoritesStore', () => {
  it('adds and removes with the same call', () => {
    const store = createFavoritesStore(seeded());

    store.getState().toggle('p1');
    expect(store.getState().ids.has('p1')).toBe(true);

    store.getState().toggle('p1');
    expect(store.getState().ids.has('p1')).toBe(false);
  });

  it('writes through on every change so a cold start sees the same list', () => {
    const storage = seeded();
    const store = createFavoritesStore(storage);

    store.getState().toggle('p1');
    store.getState().toggle('p2');

    // A fresh store over the same storage — i.e. the next app launch.
    expect([...createFavoritesStore(storage).getState().ids].sort()).toEqual(['p1', 'p2']);
  });

  it('hydrates synchronously, so a favourited tile never paints empty first', () => {
    // Not awaited anywhere: the ids are present on the very first read.
    expect(createFavoritesStore(seeded('["p9"]')).getState().ids.has('p9')).toBe(true);
  });

  it('replaces the set rather than mutating it, so selectors actually fire', () => {
    const store = createFavoritesStore(seeded());
    const before = store.getState().ids;

    store.getState().toggle('p1');

    expect(store.getState().ids).not.toBe(before);
    expect(before.has('p1')).toBe(false);
  });

  it.each([
    ['malformed JSON', '{not json'],
    ['the wrong shape', '{"ids":["p1"]}'],
    ['non-string entries', '[1, null, "p1"]'],
  ])('survives %s on disk rather than crashing a cold start', (_label, raw) => {
    const ids = createFavoritesStore(seeded(raw)).getState().ids;
    expect([...ids].every(id => typeof id === 'string')).toBe(true);
  });

  it('keeps the good entries when only some are junk', () => {
    expect([...createFavoritesStore(seeded('[1, null, "p1"]')).getState().ids]).toEqual(['p1']);
  });
});
