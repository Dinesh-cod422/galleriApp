/**
 * Local image folder -> web-ready renditions under hosting/, for Firebase Hosting.
 *
 *   node build-hosting-images.mjs --dir ~/Downloads/moments \
 *        --rename 'image_(\d+)' --to 'pr_$1'
 *   npx firebase-tools deploy --only hosting --project notesapp-ed63a
 *
 * WHY HOSTING AND NOT CLOUD STORAGE: Storage needs a bucket, and creating one
 * needs a billing account on the project. Hosting is on the free plan, serves
 * the same bytes over the same CDN, and hands back permanent public URLs. The
 * object layout below deliberately MIRRORS upload-images.mjs
 * (prompts/original, prompts/thumbnails, prompts/thumbnails@2x), so moving to
 * Storage later swaps the URL prefix and nothing else.
 *
 * Each file's NAME (after --rename) is the prompt id it belongs to.
 */
import sharp from 'sharp';
import pLimit from 'p-limit';
import { mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import { argv, exit } from 'node:process';

import { idFromFilename } from './promptDoc.mjs';

const value = (n) => { const i = argv.indexOf(`--${n}`); return i !== -1 ? argv[i + 1] : undefined; };
const home = (p) => p.replace(/^~/, process.env.HOME ?? '');

const DIR = value('dir');
const OUT = resolve(home(value('out') ?? '../../hosting'));
const SITE = value('site') ?? 'notesapp-ed63a';
const RENAME = value('rename');
const TO = value('to') ?? '';
const CLEAN = argv.includes('--clean');
const CONCURRENCY = Number(value('concurrency') ?? 6);

if (!DIR) { console.error('--dir <folder of images> is required'); exit(1); }

const SOURCE_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif', '.avif', '.tif', '.tiff']);

/** Identical to upload-images.mjs — the grid must never pull full-size files. */
const RENDITIONS = [
  { key: 'original', dir: 'prompts/original', fit: { width: 2048, height: 2048 }, quality: 82 },
  { key: 'thumb', dir: 'prompts/thumbnails', fit: { width: 400 }, quality: 75 },
  { key: 'thumb2x', dir: 'prompts/thumbnails@2x', fit: { width: 800 }, quality: 75 },
];

const transcode = (buffer, rendition) =>
  sharp(buffer)
    // rotate() first applies EXIF orientation, THEN metadata is dropped — the
    // other order bakes in a sideways image. Dropping EXIF also strips GPS,
    // which is a privacy requirement, not an optimisation.
    .rotate()
    .resize({ ...rendition.fit, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: rendition.quality })
    .toBuffer({ resolveWithObject: true });

const publicUrl = (path) => `https://${SITE}.web.app/${path}`;

const promptIdFor = (stem) => {
  const renamed = RENAME ? stem.replace(new RegExp(RENAME), TO) : stem;
  return idFromFilename(renamed);
};

/**
 * Folds extra images into the prompt they belong to.
 *
 * `pr_172_before.png` is the "before" of `pr_172`, and `pr_189_alt.png` the
 * second pose of `pr_189` — one prompt, several pictures.
 *
 * The rule is deliberately narrow: a file is a variant only when stripping a
 * trailing `_suffix` lands on an id that IS a prompt while the full id is NOT.
 * A plain `pr_bauhaus_shapes` is a prompt in its own right, so it is never
 * mistaken for a variant of `pr_bauhaus` — which a blind "split on the last
 * underscore" would get wrong.
 */
const group = (manifest, known, unknown) => {
  const out = {};
  const variants = new Map();

  for (const [id, entry] of Object.entries(manifest)) {
    if (known?.has(id) === false) {
      // Longest base first, so pr_x_y_z prefers pr_x_y over pr_x.
      let base = id;
      let parent = null;
      while (base.includes('_')) {
        base = base.slice(0, base.lastIndexOf('_'));
        if (known.has(base)) { parent = base; break; }
      }
      if (parent !== null) {
        variants.set(id, parent);
        continue;
      }
    }
    out[id] = { ...entry, images: [{ id, ...entry }] };
  }

  for (const [id, parent] of [...variants].sort()) {
    const entry = manifest[id];
    if (out[parent] === undefined) {
      // The variant exists but its prompt has no image of its own: promote it
      // rather than drop it on the floor.
      out[parent] = { ...entry, images: [] };
    }
    out[parent].images.push({ id, ...entry });
    // It resolved to a prompt after all, so retract the "no matching prompt"
    // report. findIndex can miss; splice(-1, 1) would drop an unrelated line.
    const reported = unknown.findIndex((u) => u.endsWith(`-> ${id}`));
    if (reported !== -1) unknown.splice(reported, 1);
  }

  return out;
};

const run = async () => {
  const sourceDir = home(DIR);
  const files = readdirSync(sourceDir)
    .filter((f) => SOURCE_EXT.has(extname(f).toLowerCase()))
    .filter((f) => statSync(join(sourceDir, f)).isFile())
    .sort();

  if (files.length === 0) { console.error(`No images found in ${sourceDir}`); exit(1); }

  // Ids that do not exist as prompts are reported, never guessed at — a typo'd
  // filename should surface here rather than deploy an orphaned image.
  let known = null;
  try {
    const { PROMPTS } = await import('./data.mjs');
    known = new Set(PROMPTS.map((p) => p.id));
  } catch { /* data.mjs is optional; skip the cross-check when absent. */ }

  if (CLEAN) rmSync(join(OUT, 'prompts'), { recursive: true, force: true });
  for (const r of RENDITIONS) mkdirSync(join(OUT, r.dir), { recursive: true });

  const limit = pLimit(CONCURRENCY);
  const manifest = {};
  const unknown = [];
  let bytesIn = 0;
  let bytesOut = 0;

  await Promise.all(files.map((file) => limit(async () => {
    const stem = file.slice(0, file.length - extname(file).length);
    const id = promptIdFor(stem);
    const buffer = readFileSync(join(sourceDir, file));
    bytesIn += buffer.length;
    if (known && !known.has(id)) unknown.push(`${file} -> ${id}`);

    const urls = {};
    for (const rendition of RENDITIONS) {
      const path = `${rendition.dir}/${id}.webp`;
      const { data, info } = await transcode(buffer, rendition);
      const target = join(OUT, path);
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, data);
      bytesOut += data.length;
      urls[rendition.key] = publicUrl(path);
      if (rendition.key === 'original') { urls.width = info.width; urls.height = info.height; }
    }
    manifest[id] = urls;
  })));

  const grouped = group(manifest, known, unknown);
  const ids = Object.keys(grouped).sort();
  writeFileSync(join(OUT, 'manifest.json'), `${JSON.stringify(grouped, null, 2)}\n`);

  const mb = (n) => `${(n / 1024 / 1024).toFixed(1)}MB`;
  const multi = ids.filter((id) => grouped[id].images.length > 1);
  console.log(`\n${files.length} image(s) -> ${ids.length} prompt(s) -> ${OUT}`);
  console.log(`${mb(bytesIn)} in  ->  ${mb(bytesOut)} out across ${RENDITIONS.length} renditions`);
  if (multi.length > 0) {
    console.log(`\n${multi.length} prompt(s) with more than one image:`);
    for (const id of multi) {
      console.log(`  ${id}: ${grouped[id].images.map((i) => i.id).join(', ')}`);
    }
  }
  if (unknown.length > 0) {
    console.log(`\n${unknown.length} file(s) have no matching prompt in data.mjs:`);
    for (const u of unknown) console.log(`  ${u}`);
  }
  console.log(`\nmanifest.json written. Deploy with:`);
  console.log(`  npx firebase-tools deploy --only hosting --project ${SITE}`);
};

run().catch((e) => { console.error(e); exit(1); });
