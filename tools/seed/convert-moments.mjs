/**
 * Converts the Moments Gallery export into this project's seed shape.
 *
 *   node convert-moments.mjs --in ~/Downloads/dataofMomentsGalleryApp.txt [--out data.mjs]
 *
 * Regenerate rather than hand-edit: the source export is the record of truth,
 * so a re-export can be re-converted without losing the mapping decisions below.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { argv, exit } from 'node:process';

const value = (n) => { const i = argv.indexOf(`--${n}`); return i !== -1 ? argv[i + 1] : undefined; };
const IN = value('in');
const OUT = value('out') ?? 'data.mjs';
if (!IN) { console.error('--in <export.json> is required'); exit(1); }

const source = JSON.parse(readFileSync(IN.replace(/^~/, process.env.HOME), 'utf8'));

/** Deterministic, so re-running produces identical numbers. */
const hash = (s) => {
  let h = 0;
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) % 2147483647;
  return h;
};
const pick = (seed, min, max) => min + (seed % (max - min + 1));

const slug = (s) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    // Apostrophes vanish rather than becoming separators, so
    // "Men's" slugs to "mens" and not "men-s".
    .replace(/['\u2019]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

/**
 * The export's `filter` array is a flat tag cloud — "Aesthetic" and "Cinematic"
 * sit on ~97% of records, so they describe nothing. The category is therefore
 * the MOST SPECIFIC tag present, and every tag is kept as a tag.
 * Baby folds into Kids: one record carried it.
 */
const CATEGORY_PRIORITY = [
  ['Kids', 'Kids', 'users'], ['Baby', 'Kids', 'users'],
  ['Couple', 'Couple', 'heart'], ['Love', 'Love', 'heart'],
  ['3D', '3D Render', 'cube'], ['Anime', 'Anime', 'sparkles'],
  ['Collage', 'Collage', 'grid'], ['Streetwear', 'Streetwear', 'shirt'],
  ['Vintage', 'Vintage', 'camera'],
  ["Women's", "Women's", 'user'], ["Men's", "Men's", 'user'],
  ['Artistic', 'Artistic', 'brush'], ['Fashion', 'Fashion', 'shirt'],
  ['Portrait', 'Portrait', 'user'], ['Cinematic', 'Cinematic', 'film'],
  ['Aesthetic', 'Aesthetic', 'sparkles'],
];

const categoryFor = (filters) => {
  const found = CATEGORY_PRIORITY.find(([tag]) => filters.includes(tag));
  return found ?? ['Aesthetic', 'Aesthetic', 'sparkles'];
};

/** Instagram is 4:5 by default; many prompts state their own ratio. */
const RESOLUTION = {
  '4:5': { width: 1638, height: 2048 },
  '9:16': { width: 1152, height: 2048 },
  '2:3': { width: 1365, height: 2048 },
  '3:2': { width: 2048, height: 1365 },
  '1:1': { width: 2048, height: 2048 },
  '16:9': { width: 2048, height: 1152 },
};

const aspectFrom = (prompt) => {
  const m = prompt.match(
    /(?:aspect ratio|ratio|vertical|portrait)[^.\n]{0,30}?\b(\d{1,2}:\d{1,2})\b|\b(\d{1,2}:\d{1,2})\b\s*(?:vertical|portrait|ratio|aspect|composition)/i,
  );
  const found = m ? m[1] ?? m[2] : null;
  return found && RESOLUTION[found] ? found : '4:5';
};

/** "Create an EXTREMELY ULTRA..." is truncated prompt text, not a title. */
const isPlaceholderTitle = (t) =>
  /^(create an?|ultra|without changing|reference|\[user|remove all|restore this|replace this|use the uploaded|beautiful young|a clean|an ultra)/i.test(t) ||
  /\.\.\.$/.test(t) || t.length > 70;

/** Built from the record's own tags — descriptive, never invented content. */
const titleFrom = (record, categoryName, used) => {
  const f = record.filter ?? [];
  const descriptor = ['Cinematic', 'Aesthetic', 'Artistic', 'Vintage', 'Anime', '3D'].find(t => f.includes(t));
  const subject = categoryName === 'Couple' ? 'Couple'
    : categoryName === 'Kids' ? 'Kids'
    : categoryName === "Women's" ? 'Women'
    : categoryName === "Men's" ? 'Men'
    : categoryName;
  let base = `${descriptor ? descriptor + ' ' : ''}${subject} ${f.includes('Portrait') ? 'Portrait' : 'Prompt'}`.replace(/\s+/g, ' ').trim();
  let title = base;
  let n = 2;
  while (used.has(title)) title = `${base} #${String(n++).padStart(2, '0')}`;
  used.add(title);
  return title;
};

// ─── Authors ────────────────────────────────────────────────────────────────
const DEFAULT_AUTHOR = { id: 'usr_moments_galleri', displayName: 'Moments Galleri' };
const authorMap = new Map();
for (const r of source) {
  if (!r.author) continue;
  const id = `usr_${slug(r.author).replace(/-/g, '_')}`;
  if (!authorMap.has(id)) {
    authorMap.set(id, { id, displayName: r.author, bio: 'AI prompt creator.', avatarUrl: r.avatarUrl ?? null });
  }
}
const AUTHORS = [
  { ...DEFAULT_AUTHOR, bio: 'Prompts from the Moments Gallery collection.', avatarUrl: null },
  ...authorMap.values(),
];

// ─── Categories ─────────────────────────────────────────────────────────────
const usedCats = new Map();
const promptRows = [];
const usedTitles = new Set();
let autoTitled = 0;

for (const r of source) {
  const filters = r.filter ?? [];
  const [, catName, icon] = categoryFor(filters);
  const catId = `cat_${slug(catName).replace(/-/g, '_')}`;
  if (!usedCats.has(catId)) {
    usedCats.set(catId, { id: catId, name: catName, slug: slug(catName), iconName: icon, sortOrder: usedCats.size + 1 });
  }

  const seed = hash(r.id + r.title);
  const status = r.Tstatus ?? 'Normal';
  const isFeatured = status === 'Popular';
  const isTrending = status === 'Trending';

  // Recency follows the export's own status labels.
  const daysAgo = status === 'New' ? pick(seed, 0, 9)
    : status === 'Trending' ? pick(seed, 0, 14)
    : status === 'Popular' ? pick(seed, 7, 60)
    : pick(seed, 14, 120);

  // No engagement numbers exist in the export. Derived deterministically and
  // scaled by the export's own status so the ranked sections mean something.
  const boost = isFeatured ? 2.2 : isTrending ? 1.7 : 1;
  const likes = Math.round(pick(seed, 180, 3200) * boost);
  const stats = {
    likesCount: likes,
    viewsCount: Math.round(likes * (8 + (seed % 14))),
    copiesCount: Math.round(likes * (0.18 + (seed % 20) / 100)),
    favoritesCount: Math.round(likes * (0.35 + (seed % 25) / 100)),
    sharesCount: Math.round(likes * (0.12 + (seed % 17) / 100)),
  };

  const aspectRatio = aspectFrom(r.prompt);
  const title = isPlaceholderTitle(r.title) ? (autoTitled++, titleFrom(r, catName, usedTitles)) : r.title.trim();
  if (!isPlaceholderTitle(r.title)) usedTitles.add(title);

  promptRows.push({
    id: `pr_${r.id}`,
    categoryId: catId,
    authorId: r.author ? `usr_${slug(r.author).replace(/-/g, '_')}` : DEFAULT_AUTHOR.id,
    title,
    prompt: r.prompt.trim(),
    sourceUrl: r.embedUrl ?? null,
    tags: filters.map(slug),
    metadata: {
      model: 'Unknown',
      modelVersion: '',
      style: filters[0] ?? null,
      negativePrompt: null,
      aspectRatio,
      resolution: RESOLUTION[aspectRatio],
      generationParameters: {},
    },
    stats,
    flags: { isFeatured, isTrending },
    daysAgo,
  });
}

const CATEGORIES = [...usedCats.values()];

const banner = `/**
 * GENERATED — do not edit by hand.
 *   node convert-moments.mjs --in <moments-export.json>
 *
 * Source: Moments Gallery export (${source.length} records).
 * Mapping decisions live in convert-moments.mjs.
 */\n\n`;

writeFileSync(
  OUT,
  banner +
    `export const CATEGORIES = ${JSON.stringify(CATEGORIES, null, 2)};\n\n` +
    `export const AUTHORS = ${JSON.stringify(AUTHORS, null, 2)};\n\n` +
    `export const PROMPTS = ${JSON.stringify(promptRows, null, 2)};\n`,
);

console.log(`\n${promptRows.length} prompts -> ${OUT}`);
console.log(`${CATEGORIES.length} categories, ${AUTHORS.length} authors`);
console.log(`${autoTitled} titles were auto-generated (export had truncated prompt text as the title)`);
console.log(`featured: ${promptRows.filter(p => p.flags.isFeatured).length}, trending: ${promptRows.filter(p => p.flags.isTrending).length}`);
