/**
 * Bulk image pipeline: local folder -> Firebase Storage -> Firestore URLs.
 *
 *   node upload-images.mjs --dir ./images --key <sa.json> [--yes] [--dry-run]
 *
 * Each file's NAME (without extension) is the prompt id it belongs to, so
 * `pr_tokyo_rain_night.jpg` updates `prompts/pr_tokyo_rain_night`. Files with
 * no matching document are reported, never guessed at.
 *
 * Idempotent: object paths are derived from the prompt id, so re-running
 * overwrites in place and rewrites the same URLs.
 */
import admin from 'firebase-admin';
import sharp from 'sharp';
import pLimit from 'p-limit';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, extname, join } from 'node:path';
import { argv, exit } from 'node:process';

import {
  aspectToNumber,
  buildSearchTokens,
  idFromFilename,
  normalize,
  titleFromFilename,
  ZERO_STATS,
} from './promptDoc.mjs';

const value = (n) => { const i = argv.indexOf(`--${n}`); return i !== -1 ? argv[i + 1] : undefined; };
const DIR = value('dir');
const KEY_PATH = value('key');
const BUCKET_ARG = value('bucket');
const DRY_RUN = argv.includes('--dry-run');
const CONFIRMED = argv.includes('--yes');
const CONCURRENCY = Number(value('concurrency') ?? 6);
const CREATE = argv.includes('--create');
const PUBLISH = argv.includes('--publish');
const MANIFEST = value('manifest');
const DEFAULT_CATEGORY = value('category');
const DEFAULT_AUTHOR = value('author');

/**
 * Minimal RFC4180 reader — prompt text is full of commas and quotes, so a
 * `split(',')` would shred it.
 */
const parseCsv = (text) => {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 1; } else { quoted = false; }
      } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (field !== '' || row.length > 0) { row.push(field); rows.push(row); row = []; field = ''; }
      if (c === '\r' && text[i + 1] === '\n') i += 1;
    } else field += c;
  }
  if (field !== '' || row.length > 0) { row.push(field); rows.push(row); }
  if (rows.length === 0) return [];
  const header = rows[0].map((h) => h.trim());
  return rows.slice(1).map((r) => Object.fromEntries(header.map((h, i) => [h, (r[i] ?? '').trim()])));
};

/** Keyed by the image filename OR by prompt id, whichever the author used. */
const loadManifest = (path) => {
  if (!path) return new Map();
  const raw = readFileSync(path, 'utf8');
  const rows = path.toLowerCase().endsWith('.csv') ? parseCsv(raw) : JSON.parse(raw);
  const map = new Map();
  for (const row of rows) {
    const key = row.file ?? row.filename ?? row.id;
    if (!key) continue;
    map.set(basename(String(key), extname(String(key))), row);
  }
  return map;
};

/** Real pixel dimensions -> '3:2'. The masonry layout sizes cells from this. */
const ratioString = (width, height) => {
  const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b));
  const g = gcd(width, height) || 1;
  let w = Math.round(width / g);
  let h = Math.round(height / g);
  // Keep it human: reduce anything silly like 1063:709 to a close small ratio.
  if (w > 32 || h > 32) {
    const r = width / height;
    const candidates = [[1,1],[4,3],[3,2],[16,9],[3,4],[2,3],[9,16],[5,4],[4,5],[21,9]];
    [w, h] = candidates.reduce((best, c) =>
      Math.abs(c[0] / c[1] - r) < Math.abs(best[0] / best[1] - r) ? c : best);
  }
  return `${w}:${h}`;
};

if (!DIR) { console.error('--dir <folder-of-images> is required'); exit(1); }

const SOURCE_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif', '.avif', '.tif', '.tiff']);

/**
 * Three renditions, not one.
 *
 * The grid shows dozens of tiles at once, so it must not pull full-size files:
 * at 400px wide a thumbnail is a fraction of the original's bytes, and that
 * multiplies by every visible cell. `withoutEnlargement` keeps a small source
 * from being upscaled into a blurry, LARGER file than it started as.
 */
const RENDITIONS = [
  { key: 'original', dir: 'prompts/original', fit: { width: 2048, height: 2048 }, quality: 82 },
  { key: 'thumb', dir: 'prompts/thumbnails', fit: { width: 400 }, quality: 75 },
  { key: 'thumb2x', dir: 'prompts/thumbnails@2x', fit: { width: 800 }, quality: 75 },
];

const transcode = async (buffer, rendition) =>
  sharp(buffer)
    // rotate() first applies the EXIF orientation, THEN metadata is dropped —
    // the other order bakes in a sideways image. Dropping EXIF also strips GPS
    // coordinates, which is a privacy requirement, not an optimisation.
    .rotate()
    .resize({ ...rendition.fit, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: rendition.quality })
    .toBuffer({ resolveWithObject: true });

const publicUrl = (bucket, path) =>
  `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(path)}?alt=media`;

const run = async () => {
  const files = readdirSync(DIR)
    .filter((f) => SOURCE_EXT.has(extname(f).toLowerCase()))
    .filter((f) => statSync(join(DIR, f)).isFile())
    .sort();

  if (files.length === 0) {
    console.error(`No images found in ${DIR}`);
    exit(1);
  }

  if (!KEY_PATH) {
    console.error('--key <service-account.json> is required (or use --dry-run to preview).');
    if (!DRY_RUN) exit(1);
  }

  const key = KEY_PATH ? JSON.parse(readFileSync(KEY_PATH, 'utf8')) : { project_id: 'preview' };
  const bucketName = BUCKET_ARG ?? `${key.project_id}.firebasestorage.app`;

  console.log(`\n${files.length} image(s) in ${DIR}`);
  console.log(`bucket: ${bucketName}${DRY_RUN ? '  (DRY RUN — nothing is written)' : ''}\n`);

  if (DRY_RUN) {
    for (const file of files.slice(0, 5)) {
      const id = basename(file, extname(file));
      console.log(`  ${file}  ->  prompts/{original,thumbnails,thumbnails@2x}/${id}.webp`);
    }
    if (files.length > 5) console.log(`  … and ${files.length - 5} more`);
    console.log('\nRe-run without --dry-run (and with --yes) to upload.\n');
    exit(0);
  }

  if (!CONFIRMED) {
    console.error('Refusing to write without --yes.');
    exit(1);
  }

  admin.initializeApp({ credential: admin.credential.cert(key), storageBucket: bucketName });
  const db = admin.firestore();
  const bucket = admin.storage().bucket();

  const manifest = loadManifest(MANIFEST);

  // Names are denormalised onto every prompt document (so a card needs one
  // read, not three), which means they have to be resolved from the real
  // collections rather than guessed.
  const nameOf = async (collection) => {
    const snap = await db.collection(collection).get();
    return new Map(snap.docs.map((d) => [d.id, d.data()]));
  };
  const categories = CREATE ? await nameOf('categories') : new Map();
  const authors = CREATE ? await nameOf('users') : new Map();

  if (CREATE) {
    const missing = [];
    if (DEFAULT_CATEGORY && !categories.has(DEFAULT_CATEGORY)) missing.push(`category "${DEFAULT_CATEGORY}"`);
    if (DEFAULT_AUTHOR && !authors.has(DEFAULT_AUTHOR)) missing.push(`author "${DEFAULT_AUTHOR}"`);
    if (missing.length > 0) {
      console.error(`\n${missing.join(' and ')} not found in Firestore.`);
      console.error(`categories: ${[...categories.keys()].join(', ')}`);
      console.error(`authors:    ${[...authors.keys()].slice(0, 8).join(', ')}\n`);
      exit(1);
    }
    if (!DEFAULT_CATEGORY && manifest.size === 0) {
      console.error('\n--create needs --category <id> (or a --manifest supplying categoryId per image).\n');
      exit(1);
    }
  }

  const limit = pLimit(CONCURRENCY);
  const unmatched = [];
  const failed = [];
  let uploaded = 0;
  let created = 0;

  await Promise.all(
    files.map((file) =>
      limit(async () => {
        const promptId = basename(file, extname(file));
        const ref = db.collection('prompts').doc(promptId);

        try {
          const snap = await ref.get();
          const entry = manifest.get(promptId) ?? {};
          if (!snap.exists && !CREATE) {
            unmatched.push(file);
            return;
          }

          const source = readFileSync(join(DIR, file));
          const urls = {};
          let resolution = null;

          for (const rendition of RENDITIONS) {
            const { data, info } = await transcode(source, rendition);
            const path = `${rendition.dir}/${promptId}.webp`;
            await bucket.file(path).save(data, {
              resumable: false,
              contentType: 'image/webp',
              metadata: {
                // Immutable: the path is derived from the prompt id and the
                // bytes only ever change via a re-run of this script, so a
                // year-long cache is safe and keeps repeat views free.
                cacheControl: 'public, max-age=31536000, immutable',
              },
            });
            urls[rendition.key] = publicUrl(bucketName, path);
            if (rendition.key === 'original') {
              resolution = { width: info.width, height: info.height };
            }
          }

          const now = admin.firestore.Timestamp.now();

          if (snap.exists) {
            await ref.update({
              imageUrl: urls.original,
              thumbnailUrl: urls.thumb,
              'metadata.resolution': resolution,
              'metadata.aspectRatio': ratioString(resolution.width, resolution.height),
              updatedAt: now,
            });
            uploaded += 1;
            process.stdout.write(`  linked   ${promptId} (${resolution.width}x${resolution.height})\n`);
            return;
          }

          const categoryId = entry.categoryId || DEFAULT_CATEGORY;
          const authorId = entry.authorId || DEFAULT_AUTHOR || [...authors.keys()][0];
          const category = categories.get(categoryId);
          const author = authors.get(authorId);
          if (!category || !author) {
            failed.push({ file, message: `unknown category "${categoryId}" or author "${authorId}"` });
            return;
          }

          const title = entry.title || titleFromFilename(promptId);
          const tags = entry.tags
            ? String(entry.tags).split(/[;,|]/).map((t) => t.trim()).filter(Boolean)
            : [];
          const promptText = entry.prompt || '';

          // Draft unless explicitly published. A prompt document with no prompt
          // TEXT is not a gallery entry — publishing 200 of them would fill the
          // feed with blank cards that cannot be copied or shared.
          const status = PUBLISH ? 'published' : 'draft';

          await ref.set({
            title,
            titleLower: normalize(title),
            searchTokens: buildSearchTokens(title, tags),
            prompt: promptText,
            imageUrl: urls.original,
            thumbnailUrl: urls.thumb,
            blurHash: null,
            categoryId,
            categoryName: category.name,
            tags,
            authorId,
            authorName: author.displayName ?? author.name ?? authorId,
            authorAvatarUrl: author.avatarUrl ?? null,
            stats: ZERO_STATS,
            flags: { isFeatured: false, isTrending: false },
            trendingScore: 0,
            status,
            metadata: {
              model: entry.model || 'Unknown',
              modelVersion: entry.modelVersion || '',
              negativePrompt: entry.negativePrompt || null,
              aspectRatio: ratioString(resolution.width, resolution.height),
              resolution,
              style: entry.style || null,
              generationParameters: {},
            },
            createdAt: now,
            updatedAt: now,
            publishedAt: status === 'published' ? now : null,
          });

          created += 1;
          process.stdout.write(`  created  ${promptId} (${resolution.width}x${resolution.height}, ${status})\n`);
        } catch (error) {
          failed.push({ file, message: error.message });
        }
      }),
    ),
  );

  console.log(`\n${uploaded} linked to existing prompts, ${created} created — of ${files.length} image(s).`);
  if (created > 0 && !PUBLISH) {
    console.log('Created documents are DRAFTS: they will not appear in the gallery');
    console.log('until they have prompt text and status "published".');
  }

  if (unmatched.length > 0) {
    console.log(`\n${unmatched.length} file(s) had no prompt document — nothing was guessed:`);
    for (const f of unmatched.slice(0, 10)) console.log(`  ${f}`);
    if (unmatched.length > 10) console.log(`  … and ${unmatched.length - 10} more`);
    console.log('\nName each file after its prompt id, or create the documents first.');
  }

  if (failed.length > 0) {
    console.log(`\n${failed.length} failed:`);
    for (const f of failed.slice(0, 10)) console.log(`  ${f.file}: ${f.message}`);
  }

  console.log('');
  exit(failed.length > 0 ? 1 : 0);
};

run().catch((e) => { console.error('\nUpload failed:', e.message); exit(1); });
