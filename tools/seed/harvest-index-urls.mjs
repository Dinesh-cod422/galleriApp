/**
 * Runs the exact query shapes PromptFirestoreDataSource issues and harvests the
 * "create this index" URL Firestore returns for each one. Authoritative: the
 * links come from the server, not from hand-encoded base64.
 *
 * Usage: node harvest-index-urls.mjs --key <service-account.json>
 */
import admin from 'firebase-admin';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const keyIdx = process.argv.indexOf('--key');
if (keyIdx === -1) {
  console.error('--key <service-account.json> is required');
  process.exit(1);
}
admin.initializeApp({ credential: admin.credential.cert(require(process.argv[keyIdx + 1])) });

const db = admin.firestore();
const { FieldPath } = admin.firestore;
const prompts = db.collection('prompts');

const SHAPES = [
  ['Home — newest feed + pagination', (q) => q.orderBy('publishedAt', 'desc')],
  ['Home — featured rail', (q) => q.where('flags.isFeatured', '==', true).orderBy('publishedAt', 'desc')],
  ['Home — trending rail', (q) => q.where('flags.isTrending', '==', true).orderBy('trendingScore', 'desc')],
  ['Section — most copied', (q) => q.orderBy('stats.copiesCount', 'desc')],
  ['Section — most shared', (q) => q.orderBy('stats.sharesCount', 'desc')],
  ['Category screen', (q) => q.where('categoryId', '==', 'photography').orderBy('publishedAt', 'desc')],
  ['Search', (q) => q.where('searchTokens', 'array-contains', 'portrait').orderBy('publishedAt', 'desc')],
];

const results = [];
for (const [name, build] of SHAPES) {
  const q = build(prompts.where('status', '==', 'published'))
    .orderBy(FieldPath.documentId(), 'desc')
    .limit(1);
  try {
    const snap = await q.get();
    results.push({ name, ok: true, count: snap.size });
  } catch (e) {
    const url = String(e.message).match(/https:\/\/console\.\S+/)?.[0]?.replace(/[.,)]+$/, '');
    results.push({ name, ok: false, code: e.code, url: url ?? null, message: e.message });
  }
}

let missing = 0;
for (const r of results) {
  if (r.ok) {
    console.log(`  OK   ${r.name} (index exists, ${r.count} row(s) matched)`);
  } else if (r.url) {
    missing += 1;
    console.log(`\n  NEEDS INDEX  ${r.name}\n  ${r.url}`);
  } else {
    console.log(`\n  FAILED  ${r.name}: [${r.code}] ${r.message}`);
  }
}
console.log(`\n${results.filter((r) => r.ok).length}/${results.length} query shapes working; ${missing} index(es) missing.`);
process.exit(0);
