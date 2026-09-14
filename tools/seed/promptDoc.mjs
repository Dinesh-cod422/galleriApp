/**
 * Single source of truth for every COMPUTED field on a prompt document.
 *
 * Shared by the seeder and the image uploader: both create prompt documents,
 * and a second copy of the tokeniser is a second thing to forget to update —
 * search would then work for seeded prompts and silently not for uploaded ones.
 */

const STOP_WORDS = new Set(['a', 'an', 'the', 'in', 'on', 'at', 'of', 'and', 'with', 'to']);

export const normalize = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Title words + tags, deduped, stop-words dropped, capped at 20. */
export const buildSearchTokens = (title, tags) => {
  const fromTitle = normalize(title).split(/[^a-z0-9]+/).filter(Boolean);
  const fromTags = tags.flatMap((t) => normalize(t).split(/[^a-z0-9]+/)).filter(Boolean);
  const out = [];
  for (const token of [...fromTitle, ...fromTags]) {
    if (token.length < 2 || STOP_WORDS.has(token) || out.includes(token)) continue;
    out.push(token);
    if (out.length === 20) break;
  }
  return out;
};

/** Matches docs/FIREBASE-ARCHITECTURE.md §A.4 exactly. */
export const trendingScore = (stats, ageHours) => {
  const engagement =
    stats.likesCount + 2 * stats.favoritesCount + 3 * stats.copiesCount + 0.1 * stats.viewsCount;
  return Number((engagement / Math.pow(ageHours + 2, 1.5)).toFixed(2));
};

export const aspectToNumber = (ratio) => {
  const [w, h] = ratio.split(':').map(Number);
  return w / h;
};

/**
 * `my-cyberpunk_city 01.jpg` -> `My Cyberpunk City 01`.
 *
 * Only used when no manifest supplies a real title. It is a starting point for
 * the author to edit, not a pretence that the filename was a title.
 */
export const titleFromFilename = (stem) =>
  stem
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());

/** Firestore ids cannot contain / and must not be . or .. — keep it strict. */
export const idFromFilename = (stem) =>
  normalize(stem).replace(/[^a-z0-9_-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 120);

export const ZERO_STATS = {
  likesCount: 0,
  viewsCount: 0,
  copiesCount: 0,
  favoritesCount: 0,
  sharesCount: 0,
};
