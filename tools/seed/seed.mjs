/**
 * Firestore dummy-data seeder for the AI Prompt Gallery.
 *
 *   node seed.mjs --dry-run                        # no credentials needed
 *   node seed.mjs --key ./sa.json --yes            # real project
 *   npm run seed:emulator                          # local emulator
 *
 * Idempotent: every document has a deterministic id and is written with
 * set() (full overwrite), so re-running converges rather than duplicating.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { argv, env, exit } from 'node:process';

import { cert, initializeApp } from 'firebase-admin/app';
import { FieldValue, Timestamp, getFirestore } from 'firebase-admin/firestore';

import { AUTHORS, CATEGORIES, PROMPTS } from './data.mjs';
import { aspectToNumber, buildSearchTokens, normalize, trendingScore } from './promptDoc.mjs';

// ─── CLI ────────────────────────────────────────────────────────────────────
const flag = (name) => argv.includes(`--${name}`);
const value = (name) => {
  const i = argv.indexOf(`--${name}`);
  return i !== -1 ? argv[i + 1] : undefined;
};

const DRY_RUN = flag('dry-run');
const CONFIRMED = flag('yes');
const WITH_ENGAGEMENT = flag('with-engagement');
const KEY_PATH = value('key') ?? env.GOOGLE_APPLICATION_CREDENTIALS;
const PROJECT_ID = value('project');
const IMAGE_BASE = value('image-base') ?? 'picsum';
/** Named Firestore database, to keep seed data out of an existing default DB. */
const DATABASE_ID = value('database');

const MS_PER_DAY = 86_400_000;
const NOW = Date.now();

// ─── Derivations: see promptDoc.mjs (shared with upload-images.mjs) ────────

/**
 * Placeholder imagery. Real images arrive via the Storage upload pipeline;
 * until then picsum gives deterministic, genuinely different resolutions so
 * the thumbnail/full-res split is exercised rather than faked.
 */
const buildImageUrls = (promptDoc) => {
  const { width, height } = promptDoc.metadata.resolution;
  if (IMAGE_BASE === 'picsum') {
    const thumbW = 400;
    const thumbH = Math.round(thumbW / aspectToNumber(promptDoc.metadata.aspectRatio));
    return {
      imageUrl: `https://picsum.photos/seed/${promptDoc.id}/${width}/${height}`,
      thumbnailUrl: `https://picsum.photos/seed/${promptDoc.id}/${thumbW}/${thumbH}`,
    };
  }
  const enc = (p) => encodeURIComponent(p);
  return {
    imageUrl: `${IMAGE_BASE}/o/${enc(`prompts/original/${promptDoc.id}.webp`)}?alt=media`,
    thumbnailUrl: `${IMAGE_BASE}/o/${enc(`prompts/thumbnails/${promptDoc.id}.webp`)}?alt=media`,
  };
};

// Prefer the author's own avatar from the export; fall back to a deterministic
// placeholder so every author still renders.
const avatarUrl = (author) =>
  author.avatarUrl ?? `https://i.pravatar.cc/200?u=${author.id}`;

// ─── Document builders ──────────────────────────────────────────────────────
const categoryById = new Map(CATEGORIES.map((c) => [c.id, c]));
const authorById = new Map(AUTHORS.map((a) => [a.id, a]));

const buildPromptDoc = (p) => {
  const category = categoryById.get(p.categoryId);
  const author = authorById.get(p.authorId);
  if (!category) throw new Error(`Unknown categoryId ${p.categoryId} on ${p.id}`);
  if (!author) throw new Error(`Unknown authorId ${p.authorId} on ${p.id}`);

  const publishedMs = NOW - p.daysAgo * MS_PER_DAY;
  const ageHours = p.daysAgo * 24;
  const { imageUrl, thumbnailUrl } = buildImageUrls(p);

  return {
    title: p.title,
    titleLower: normalize(p.title),
    searchTokens: buildSearchTokens(p.title, p.tags),
    prompt: p.prompt,
    // Permalink to the original post. Attribution only — never an image source.
    sourceUrl: p.sourceUrl ?? null,

    imageUrl,
    thumbnailUrl,
    blurHash: null,

    categoryId: category.id,
    categoryName: category.name,
    tags: p.tags,

    authorId: author.id,
    authorName: author.displayName,
    authorAvatarUrl: avatarUrl(author),

    stats: p.stats,
    flags: p.flags,
    trendingScore: trendingScore(p.stats, ageHours),
    status: 'published',

    metadata: p.metadata,

    // Seed data backdates deliberately: serverTimestamp() would collapse all
    // 32 documents onto the same instant and make pagination untestable.
    createdAt: Timestamp.fromMillis(publishedMs - 5 * 60_000),
    updatedAt: Timestamp.fromMillis(publishedMs + 2 * MS_PER_DAY),
    publishedAt: Timestamp.fromMillis(publishedMs),
  };
};

const buildCategoryDoc = (c) => ({
  name: c.name,
  slug: c.slug,
  iconName: c.iconName,
  coverUrl: `https://picsum.photos/seed/${c.id}/800/600`,
  promptCount: PROMPTS.filter((p) => p.categoryId === c.id).length,
  sortOrder: c.sortOrder,
});

const buildUserDoc = (a) => ({
  displayName: a.displayName,
  avatarUrl: avatarUrl(a),
  bio: a.bio,
  promptCount: PROMPTS.filter((p) => p.authorId === a.id).length,
  createdAt: Timestamp.fromMillis(NOW - 180 * MS_PER_DAY),
});

// ─── Dry run ────────────────────────────────────────────────────────────────
const summarize = (prompts) => {
  const featured = prompts.filter((p) => p.flags.isFeatured).length;
  const trending = prompts.filter((p) => p.flags.isTrending).length;
  console.log(`\n  prompts      ${prompts.length}`);
  console.log(`  categories   ${CATEGORIES.length}`);
  console.log(`  users        ${AUTHORS.length}`);
  console.log(`  featured     ${featured}`);
  console.log(`  trending     ${trending}`);
  const top = [...prompts].sort((a, b) => b.trendingScore - a.trendingScore).slice(0, 5);
  console.log('\n  top 5 by trendingScore:');
  for (const p of top) console.log(`    ${String(p.trendingScore).padStart(8)}  ${p.title}`);
};

if (DRY_RUN) {
  const docs = PROMPTS.map(buildPromptDoc);
  console.log('DRY RUN — nothing will be written.\n');
  console.log('Sample document (prompts/pr_desert_golden_hour):');
  console.log(JSON.stringify(
    { ...docs[0], createdAt: '<Timestamp>', updatedAt: '<Timestamp>', publishedAt: '<Timestamp>' },
    null, 2,
  ));
  summarize(docs);
  console.log('\nValidated. Re-run with --key <service-account.json> --yes to write.');
  exit(0);
}

// ─── Credentials ────────────────────────────────────────────────────────────
const usingEmulator = Boolean(env.FIRESTORE_EMULATOR_HOST);

if (!usingEmulator && !KEY_PATH) {
  console.error(
    'No credentials.\n' +
      '  --key <path/to/service-account.json>   (or set GOOGLE_APPLICATION_CREDENTIALS)\n' +
      '  or FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 for the local emulator\n' +
      '  or --dry-run to validate without writing.',
  );
  exit(1);
}

let projectId = PROJECT_ID;
let serviceAccount = null;

if (KEY_PATH) {
  try {
    serviceAccount = JSON.parse(readFileSync(resolve(KEY_PATH), 'utf8'));
  } catch (error) {
    console.error(
      `\nCould not read "${KEY_PATH}" as JSON: ${error instanceof Error ? error.message : error}`,
    );
    exit(1);
  }
  if (typeof serviceAccount.private_key !== 'string' || typeof serviceAccount.client_email !== 'string') {
    console.error(
      `\n"${KEY_PATH}" is not a service account key.\n` +
        'Expected the JSON from Firebase Console → Project settings → Service accounts →\n' +
        '"Generate new private key" (it contains client_email and private_key).',
    );
    exit(1);
  }
  projectId = projectId ?? serviceAccount.project_id;
} else {
  projectId = projectId ?? env.GCLOUD_PROJECT ?? 'demo-ai-prompt-gallery';
}

// The destructive-write gate runs BEFORE any credential work, so the warning
// is what you see first — not a stack trace from a malformed key.
if (!usingEmulator && !CONFIRMED) {
  console.error(
    `\nAbout to write ${PROMPTS.length} prompts, ${CATEGORIES.length} categories and ` +
      `${AUTHORS.length} users to LIVE project "${projectId}"` +
      `${DATABASE_ID ? ` database "${DATABASE_ID}"` : ' (default database)'}.\n` +
      'Existing documents with the same ids will be OVERWRITTEN.\n' +
      'Re-run with --yes to confirm.',
  );
  exit(1);
}

initializeApp(
  serviceAccount ? { credential: cert(serviceAccount), projectId } : { projectId },
);

// ─── Write ──────────────────────────────────────────────────────────────────
const db = DATABASE_ID ? getFirestore(DATABASE_ID) : getFirestore();
db.settings({ ignoreUndefinedProperties: false });

/** Firestore caps a batch at 500 operations. */
const commitInBatches = async (ops, label) => {
  let written = 0;
  for (let i = 0; i < ops.length; i += 450) {
    const batch = db.batch();
    for (const op of ops.slice(i, i + 450)) batch.set(op.ref, op.data);
    await batch.commit();
    written += Math.min(450, ops.length - i);
    console.log(`  ${label}: ${written}/${ops.length}`);
  }
};

const run = async () => {
  console.log(
    `\nSeeding project "${projectId}"` +
      `${DATABASE_ID ? ` database "${DATABASE_ID}"` : ''}` +
      `${usingEmulator ? ' (EMULATOR)' : ''}…\n`,
  );

  await commitInBatches(
    CATEGORIES.map((c) => ({ ref: db.doc(`categories/${c.id}`), data: buildCategoryDoc(c) })),
    'categories',
  );
  await commitInBatches(
    AUTHORS.map((a) => ({ ref: db.doc(`users/${a.id}`), data: buildUserDoc(a) })),
    'users',
  );
  await commitInBatches(
    PROMPTS.map((p) => ({ ref: db.doc(`prompts/${p.id}`), data: buildPromptDoc(p) })),
    'prompts',
  );

  if (WITH_ENGAGEMENT) {
    // A handful of like/favorite documents so security rules and the
    // collection-group "my favorites" query have something to exercise.
    const demoUsers = AUTHORS.slice(0, 3).map((a) => a.id);
    const ops = [];
    for (const p of PROMPTS.slice(0, 12)) {
      for (const uid of demoUsers) {
        const createdAt = Timestamp.fromMillis(NOW - Math.floor(Math.random() * 10) * MS_PER_DAY);
        ops.push({
          ref: db.doc(`prompts/${p.id}/likes/${uid}`),
          data: { userId: uid, promptId: p.id, createdAt },
        });
        ops.push({
          ref: db.doc(`prompts/${p.id}/favorites/${uid}`),
          data: {
            userId: uid,
            promptId: p.id,
            promptTitle: p.title,
            promptThumbnailUrl: buildImageUrls(p).thumbnailUrl,
            createdAt,
          },
        });
      }
    }
    await commitInBatches(ops, 'engagement');
  }

  console.log(`\nDone. Verify: https://console.firebase.google.com/project/${projectId}/firestore\n`);
};

run().catch((error) => {
  console.error('\nSeed failed:', error instanceof Error ? error.message : error);
  exit(1);
});
