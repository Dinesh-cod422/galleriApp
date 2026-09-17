/**
 * The app's identity, in one place.
 *
 * This file exists because the name had drifted into three different spellings
 * across the masthead, the launcher and the deep-link scheme. Anything a user
 * can read or type is derived from here, so a rename is one edit rather than a
 * search — and a second name cannot appear without someone hardcoding it.
 *
 * In `core` deliberately — it depends on nothing, so every layer may read it.
 */

/** As written for people: with the space. */
export const APP_NAME = 'Prompt Kalai';

/** Sits under the name in the masthead and on the splash. Not a second name. */
export const APP_TAGLINE = 'Turn Moments Into Memories';

/**
 * The custom URL scheme — `promptkalai://prompt/<id>`.
 *
 * Lowercase and unspaced because a scheme must be: RFC 3986 allows only
 * letters, digits and `+ - .`, and iOS matches it case-insensitively while
 * Android does not. Deriving it from APP_NAME at runtime would be clever and
 * wrong; it is written out so it is greppable and cannot silently change shape.
 */
export const APP_SCHEME = 'promptkalai';
