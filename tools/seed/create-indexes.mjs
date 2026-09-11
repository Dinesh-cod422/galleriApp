/**
 * Creates the composite indexes from docs/FIREBASE-ARCHITECTURE.md §D via the
 * Firestore Admin REST API.
 *
 * Deliberately NOT `firebase deploy --only firestore:indexes`: that command
 * treats the local file as the complete desired state and will DELETE indexes
 * it does not know about. This only ever adds.
 *
 *   node create-indexes.mjs --key <sa.json> [--database '(default)'] [--dry-run]
 */
import { readFileSync } from 'node:fs';
import { argv, exit } from 'node:process';
import { GoogleAuth } from 'google-auth-library';

const value = (n) => { const i = argv.indexOf(`--${n}`); return i !== -1 ? argv[i + 1] : undefined; };
const KEY_PATH = value('key');
const DATABASE_ID = value('database') ?? '(default)';
const DRY_RUN = argv.includes('--dry-run');

if (!KEY_PATH) { console.error('--key <service-account.json> is required'); exit(1); }
const key = JSON.parse(readFileSync(KEY_PATH, 'utf8'));
const PROJECT = key.project_id;

const asc = (fieldPath) => ({ fieldPath, order: 'ASCENDING' });
const desc = (fieldPath) => ({ fieldPath, order: 'DESCENDING' });
const contains = (fieldPath) => ({ fieldPath, arrayConfig: 'CONTAINS' });

/** Equality fields first, then the ordered field, then __name__. */
const INDEXES = [
  { name: 'newest + pagination', collection: 'prompts',
    fields: [asc('status'), desc('publishedAt'), desc('__name__')] },
  { name: 'featured', collection: 'prompts',
    fields: [asc('flags.isFeatured'), asc('status'), desc('publishedAt'), desc('__name__')] },
  { name: 'trending', collection: 'prompts',
    fields: [asc('flags.isTrending'), asc('status'), desc('trendingScore'), desc('__name__')] },
  { name: 'category', collection: 'prompts',
    fields: [asc('categoryId'), asc('status'), desc('publishedAt'), desc('__name__')] },
  { name: 'author profile', collection: 'prompts',
    fields: [asc('authorId'), asc('status'), desc('publishedAt'), desc('__name__')] },
  { name: 'token search', collection: 'prompts',
    fields: [contains('searchTokens'), asc('status'), desc('publishedAt'), desc('__name__')] },
  { name: 'title prefix search', collection: 'prompts',
    fields: [asc('status'), asc('titleLower'), asc('__name__')] },
  { name: 'my favorites (collection group)', collection: 'favorites', scope: 'COLLECTION_GROUP',
    fields: [asc('userId'), desc('createdAt'), desc('__name__')] },
  { name: 'my likes (collection group)', collection: 'likes', scope: 'COLLECTION_GROUP',
    fields: [asc('userId'), desc('createdAt'), desc('__name__')] },
];

const base = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/${encodeURIComponent(DATABASE_ID)}`;

const run = async () => {
  if (DRY_RUN) {
    console.log(`\nDRY RUN — would create ${INDEXES.length} indexes on "${PROJECT}":\n`);
    for (const ix of INDEXES) {
      const f = ix.fields.map(x => `${x.fieldPath} ${x.order ?? x.arrayConfig}`).join(', ');
      console.log(`  ${ix.name.padEnd(32)} [${ix.collection}] ${f}`);
    }
    exit(0);
  }

  const auth = new GoogleAuth({
    credentials: key,
    scopes: ['https://www.googleapis.com/auth/datastore'],
  });
  const client = await auth.getClient();

  console.log(`\nCreating ${INDEXES.length} composite indexes on "${PROJECT}" (${DATABASE_ID})…\n`);
  const created = [];

  for (const ix of INDEXES) {
    const url = `${base}/collectionGroups/${ix.collection}/indexes`;
    const body = {
      queryScope: ix.scope ?? 'COLLECTION',
      fields: ix.fields.filter(f => f.fieldPath !== '__name__'),
    };
    // __name__ is appended implicitly by Firestore, matching the last field's
    // direction — which is exactly what the value cursors need.
    try {
      const res = await client.request({ url, method: 'POST', data: body });
      created.push(res.data.name);
      console.log(`  CREATING  ${ix.name}`);
    } catch (error) {
      const status = error?.response?.status;
      const msg = error?.response?.data?.error?.message ?? error.message;
      if (status === 409 || /already exists/i.test(msg)) {
        console.log(`  EXISTS    ${ix.name}`);
      } else if (status === 403) {
        console.error(`\n  PERMISSION DENIED creating "${ix.name}".`);
        console.error(`  ${msg}\n`);
        console.error('  The service account needs the "Cloud Datastore Index Admin"');
        console.error(`  role: https://console.cloud.google.com/iam-admin/iam?project=${PROJECT}\n`);
        exit(1);
      } else {
        console.error(`  FAILED    ${ix.name}: ${msg}`);
      }
    }
  }

  if (created.length === 0) {
    console.log('\nNothing new to create.\n');
    exit(0);
  }

  console.log('\nWaiting for indexes to finish building…');
  const deadline = Date.now() + 10 * 60_000;
  while (Date.now() < deadline) {
    const res = await client.request({ url: `${base}/collectionGroups/-/indexes` });
    const all = res.data.indexes ?? [];
    const pending = all.filter(i => i.state && i.state !== 'READY');
    if (pending.length === 0) {
      console.log(`\nAll ${all.length} indexes READY.\n`);
      exit(0);
    }
    console.log(`  ${pending.length} still building (${pending.map(p => p.state).join(', ')})…`);
    await new Promise(r => setTimeout(r, 10_000));
  }
  console.log('\nTimed out waiting. Check the console; they usually finish shortly.\n');
  exit(1);
};

run().catch(e => { console.error('\nIndex creation failed:', e.message); exit(1); });
