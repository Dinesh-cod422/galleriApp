/**
 * Runs the gallery queries from docs/FIREBASE-ARCHITECTURE.md §D against
 * whatever Firestore the environment points at.
 *
 *   node verify.mjs --key <sa.json> [--database <id>]   # real project
 *   node verify.mjs                                     # emulator (env-configured)
 *
 * Composite-index errors are reported as MISSING INDEX with the console URL
 * rather than crashing — on a real project that IS the useful output.
 */
import { cert, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'node:fs';
import { argv, env, exit } from 'node:process';

const value = (name) => {
  const i = argv.indexOf(`--${name}`);
  return i !== -1 ? argv[i + 1] : undefined;
};
const KEY_PATH = value('key');
const DATABASE_ID = value('database');

if (KEY_PATH) {
  const key = JSON.parse(readFileSync(KEY_PATH, 'utf8'));
  initializeApp({ credential: cert(key), projectId: key.project_id });
} else {
  initializeApp({ projectId: env.GCLOUD_PROJECT ?? 'demo-ai-prompt-gallery' });
}
const db = DATABASE_ID ? getFirestore(DATABASE_ID) : getFirestore();

const line = (label, v) => console.log(`  ${String(label).padEnd(34)} ${v}`);
let failures = 0;
const missingIndexes = [];

const check = (label, ok, detail) => {
  if (!ok) failures += 1;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label.padEnd(38)} ${detail ?? ''}`);
};

/** Runs a query, converting the "needs an index" error into actionable output. */
const attempt = async (label, fn) => {
  try {
    return await fn();
  } catch (error) {
    const message = error?.message ?? String(error);
    const url = message.match(/https:\/\/console\.firebase\.google\.com\S+/)?.[0];
    if (url) {
      missingIndexes.push({ label, url });
      console.log(`  INDEX  ${label.padEnd(38)} missing composite index`);
      return null;
    }
    failures += 1;
    console.log(`  ERROR  ${label.padEnd(38)} ${message.split('\n')[0]}`);
    return null;
  }
};

const encodeCursor = (sortValue, id) =>
  Buffer.from(JSON.stringify({ k: sortValue, id })).toString('base64url');
const decodeCursor = (c) => JSON.parse(Buffer.from(c, 'base64url').toString('utf8'));

const run = async () => {
  console.log('\n── Collection counts ──');
  for (const c of ['prompts', 'categories', 'users']) {
    const snap = await db.collection(c).count().get();
    line(c, snap.data().count);
  }

  console.log('\n── Q1 newest ──');
  const newest = await attempt('newest', () => db.collection('prompts')
    .where('status', '==', 'published').orderBy('publishedAt', 'desc').limit(5).get());
  if (newest) {
    newest.docs.forEach(d =>
      line(d.get('publishedAt').toDate().toISOString().slice(0, 10), d.get('title')));
    check('newest returns 5', newest.size === 5, String(newest.size));
  }

  console.log('\n── Q2 featured ──');
  const featured = await attempt('featured', () => db.collection('prompts')
    .where('status', '==', 'published').where('flags.isFeatured', '==', true)
    .orderBy('publishedAt', 'desc').limit(20).get());
  if (featured) check('featured count', featured.size === 12, `${featured.size} (expected 12)`);

  console.log('\n── Q3 trending ──');
  const trending = await attempt('trending', () => db.collection('prompts')
    .where('status', '==', 'published').where('flags.isTrending', '==', true)
    .orderBy('trendingScore', 'desc').limit(5).get());
  if (trending) {
    trending.docs.forEach(d => line(String(d.get('trendingScore')), d.get('title')));
    const s = trending.docs.map(d => d.get('trendingScore'));
    check('trending is descending', s.every((v, i) => i === 0 || s[i - 1] >= v), s.join(','));
  }

  console.log('\n── Q4 category ──');
  const byCat = await attempt('category', () => db.collection('prompts')
    .where('status', '==', 'published').where('categoryId', '==', 'cat_fantasy')
    .orderBy('publishedAt', 'desc').get());
  if (byCat) check('cat_fantasy count', byCat.size === 4, `${byCat.size} (expected 4)`);

  console.log('\n── Q5 token search "portrait" ──');
  const tokens = await attempt('token search', () => db.collection('prompts')
    .where('status', '==', 'published')
    .where('searchTokens', 'array-contains', 'portrait')
    .orderBy('publishedAt', 'desc').get());
  if (tokens) {
    tokens.docs.forEach(d => line('·', d.get('title')));
    check('token search finds matches', tokens.size >= 3, String(tokens.size));
  }

  console.log('\n── Q6 title prefix "c" ──');
  const prefix = await attempt('prefix search', () => db.collection('prompts')
    .where('status', '==', 'published')
    .where('titleLower', '>=', 'c').where('titleLower', '<=', 'c')
    .orderBy('titleLower').get());
  if (prefix) {
    prefix.docs.forEach(d => line('·', d.get('title')));
    check('prefix search works', prefix.size >= 2, String(prefix.size));
  }

  console.log('\n── Q7 cursor pagination (page size 12) ──');
  const seen = new Set();
  let cursor = null;
  let page = 0;
  let paginationOk = true;
  while (page < 5) {
    let q = db.collection('prompts')
      .where('status', '==', 'published')
      .orderBy('publishedAt', 'desc').orderBy('__name__', 'desc').limit(12);
    if (cursor) {
      const { k, id } = decodeCursor(cursor);
      q = q.startAfter(new Date(k), id);
    }
    const snap = await attempt(`pagination page ${page + 1}`, () => q.get());
    if (!snap) { paginationOk = false; break; }
    if (snap.empty) break;
    snap.docs.forEach(d => seen.add(d.id));
    const last = snap.docs[snap.docs.length - 1];
    page += 1;
    line(`page ${page}`, `${snap.size} docs, cumulative unique ${seen.size}`);
    if (snap.size < 12) break;
    cursor = encodeCursor(last.get('publishedAt').toDate().toISOString(), last.id);
  }
  if (paginationOk) check('pagination: 32 unique, no dupes', seen.size === 32, `${seen.size}/32`);

  if (missingIndexes.length > 0) {
    console.log('\n── MISSING COMPOSITE INDEXES ──');
    console.log('  Firestore needs these built before the query works. Open each link,');
    console.log('  click "Create index", wait ~1-2 min, then re-run this script.\n');
    for (const { label, url } of missingIndexes) console.log(`  ${label}\n    ${url}\n`);
  }

  const ok = failures === 0 && missingIndexes.length === 0;
  console.log(ok
    ? '\nALL CHECKS PASSED\n'
    : `\n${failures} failure(s), ${missingIndexes.length} missing index(es)\n`);
  exit(ok ? 0 : 1);
};

run().catch(e => { console.error('verify failed:', e.message); exit(1); });
