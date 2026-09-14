import { create } from 'zustand';

import { keyValueStore, type KeyValueStore } from '@infra/storage/keyValueStore';

const STORAGE_KEY = 'favorites.v1';

export type FavoritesState = {
  /**
   * A Set, not an array: every visible tile asks "am I favourited?" on every
   * render, and `includes` over a growing array turns that into O(n) per tile
   * per frame while scrolling.
   */
  readonly ids: ReadonlySet<string>;
  readonly toggle: (promptId: string) => void;
};

/** Tolerates anything on disk — corrupt storage must not crash a cold start. */
const load = (storage: KeyValueStore): ReadonlySet<string> => {
  const raw = storage.getString(STORAGE_KEY);
  if (raw == null) {
    return new Set();
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed.filter(id => typeof id === 'string') : []);
  } catch {
    return new Set();
  }
};

/**
 * Favourites are local-only and deliberately so.
 *
 * The app reads Firestore unauthenticated, so there is no user to attach a
 * server-side favourite to yet. A device-local list works today and becomes the
 * offline half of a synced list later: when auth lands, this store is seeded
 * from `prompts/{id}/favorites` and writes through to it, and no screen changes
 * because every screen already talks to the hooks below.
 *
 * Written as a factory so a test can inject storage instead of reaching for
 * `jest.mock`.
 */
export const createFavoritesStore = (storage: KeyValueStore) =>
  create<FavoritesState>()((set, get) => ({
    // Synchronous hydration — see keyValueStore: a favourited tile must never
    // paint empty and flip a frame later.
    ids: load(storage),
    toggle: (promptId: string) => {
      const next = new Set(get().ids);
      // `delete` reports whether it removed anything, which is the toggle.
      if (!next.delete(promptId)) {
        next.add(promptId);
      }
      storage.set(STORAGE_KEY, JSON.stringify([...next]));
      set({ ids: next });
    },
  }));

export const useFavoritesStore = createFavoritesStore(keyValueStore);

/**
 * Subscribes to ONE boolean, not to the set.
 *
 * Zustand compares the selector's result with Object.is, so a tile re-renders
 * only when its own favourite state flips — favouriting one prompt does not
 * touch the other tiles on screen.
 */
export const useIsFavorite = (promptId: string): boolean =>
  useFavoritesStore(state => state.ids.has(promptId));

/** Stable across renders: the action never changes identity. */
export const useToggleFavorite = (): FavoritesState['toggle'] =>
  useFavoritesStore(state => state.toggle);

export const useFavoriteCount = (): number => useFavoritesStore(state => state.ids.size);
