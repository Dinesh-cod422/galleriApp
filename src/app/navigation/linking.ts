import { type LinkingOptions } from '@react-navigation/native';

import { APP_SCHEME } from '@core/config/brand';

import { type PromptSort } from '@features/prompts/domain/repositories/PromptRepository';

import { type RootStackParamList } from './navigation.types';

/**
 * The app's own scheme. Always works — no server, no verification, no network.
 * It is what QR codes, other apps and local testing use.
 *
 * Re-exported rather than redefined: the value lives in `core/config/brand`
 * with the rest of the app's identity.
 */
export { APP_SCHEME };

/**
 * Domains that open the app directly (iOS Universal Links / Android App Links).
 *
 * These only take effect once the site serves the association files in
 * `hosting/.well-known/` AND the app is signed with the matching team/cert.
 * Until then the links still work — they just open the website instead, which
 * is the correct fallback and the reason https links are worth having at all:
 * a `promptkalai://` URL sent to someone without the app does nothing.
 */
export const WEB_ORIGINS = [
  'https://notesapp-ed63a.web.app',
  'https://notesapp-ed63a.firebaseapp.com',
] as const;

export const LINKING_PREFIXES = [`${APP_SCHEME}://`, ...WEB_ORIGINS];

/** Sorts a `/section/:sort` link may name, guarded because a URL is user input. */
const SORTS: readonly PromptSort[] = [
  'newest',
  'trending',
  'featured',
  'mostCopied',
  'mostShared',
];

const isSort = (value: string): value is PromptSort =>
  (SORTS as readonly string[]).includes(value);

/**
 * Deep link routing.
 *
 * Paths are the URLs a human would write — `/prompt/<id>`, `/category/<id>` —
 * rather than screen names, so the same string works as a website URL and the
 * two cannot drift apart.
 *
 * Every screen reachable by a link takes ONLY ids in its path. A title or an
 * object in a URL breaks the moment the content is renamed, and would have to
 * survive being serialised through a cold start; the screens look up whatever
 * else they need (see `CategoryScreen`).
 */
export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: LINKING_PREFIXES,
  config: {
    screens: {
      Main: {
        screens: {
          // The bare origin opens Home, so `https://…/` is a valid share URL.
          Home: '',
          Explore: 'explore',
          Favorites: 'favorites',
          Profile: 'profile',
        },
      },
      PromptDetail: {
        path: 'prompt/:promptId',
        // Ids come out of a URL percent-encoded; without this an id containing
        // a reserved character would be looked up with the escapes still in it.
        parse: { promptId: decodeURIComponent },
        stringify: { promptId: encodeURIComponent },
      },
      Category: {
        path: 'category/:categoryId',
        parse: { categoryId: decodeURIComponent },
        stringify: { categoryId: encodeURIComponent },
      },
      PromptSection: {
        path: 'section/:sort',
        parse: {
          // An unrecognised sort would otherwise reach the repository as a
          // bogus order-by and fail the query. Falling back to `newest` keeps
          // a mistyped or outdated link on a working screen.
          sort: (value: string): PromptSort => (isSort(value) ? value : 'newest'),
        },
      },
    },
  },
};

/**
 * The canonical, shareable URL for a prompt.
 *
 * https rather than `promptkalai://`, deliberately: a custom-scheme link does
 * nothing at all on a device without the app, which is most of the people a
 * link gets sent to. An https link opens the app when it is installed and the
 * website when it is not — the same string serving both.
 */
export const promptWebUrl = (promptId: string): string =>
  `${WEB_ORIGINS[0]}/prompt/${encodeURIComponent(promptId)}`;
