/**
 * Downloads each prompt's post thumbnail into a local folder, named by prompt
 * id so it feeds straight into upload-images.mjs.
 *
 *   node fetch-source-images.mjs --out ./source-images [--limit 10] [--concurrency 3]
 *   node upload-images.mjs --dir ./source-images --key <sa.json> --yes
 *
 * WHY THIS EXISTS: a post permalink is a web PAGE, not an image, and the
 * `og:image` it exposes is signed and expires in a few days (`oe=` is a hex
 * unix timestamp). Writing one into Firestore gives you images that work for
 * about 96 hours and then 403 forever. The only durable fix is to fetch the
 * bytes once and rehost them in your own Storage bucket.
 *
 * Only run this against posts you own. It is deliberately slow and serial-ish:
 * hammering a public site with 195 parallel requests gets you rate-limited and
 * is rude regardless.
 */
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { argv, exit } from 'node:process';

import pLimit from 'p-limit';

import { PROMPTS } from './data.mjs';

const value = (n) => { const i = argv.indexOf(`--${n}`); return i !== -1 ? argv[i + 1] : undefined; };
const OUT = value('out') ?? './source-images';
const LIMIT = Number(value('limit') ?? PROMPTS.length);
const CONCURRENCY = Number(value('concurrency') ?? 3);
const DELAY_MS = Number(value('delay') ?? 400);

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Strip the share/tracking query (`?stkn=`, `?igsh=`, `?img_index=`) and keep
 * just the canonical permalink. With those params attached the site answers
 * with its JavaScript app shell, which carries no meta tags — verified by
 * diffing the two responses.
 */
const canonical = (url) => {
  const m = url.match(/https?:\/\/[^/]+\/(p|reel)\/([A-Za-z0-9_-]+)/);
  return m ? `https://www.instagram.com/${m[1]}/${m[2]}/` : url.split('?')[0];
};

const ogImageOf = async (rawUrl) => {
  const pageUrl = canonical(rawUrl);
  // Deliberately minimal headers. Sending `accept-language` flips the response
  // to the 620KB JavaScript app shell, which carries no meta tags at all —
  // verified by diffing responses across header combinations.
  const res = await fetch(pageUrl, { headers: { 'user-agent': UA } });
  if (!res.ok) {
    throw new Error(`page returned ${res.status}`);
  }
  const html = await res.text();
  const m = html.match(/property="og:image"\s+content="([^"]+)"/) ?? html.match(/og:image"\s*content="([^"]+)"/);
  if (!m) {
    throw new Error('no og:image (post may be private, removed, or login-walled)');
  }
  return m[1].replace(/&amp;/g, '&');
};

const run = async () => {
  mkdirSync(OUT, { recursive: true });

  const targets = PROMPTS.filter((p) => p.sourceUrl).slice(0, LIMIT);
  console.log(`\n${targets.length} prompt(s) with a source URL -> ${OUT}\n`);

  const limit = pLimit(CONCURRENCY);
  let saved = 0;
  let skipped = 0;
  const failed = [];

  await Promise.all(
    targets.map((prompt) =>
      limit(async () => {
        const dest = join(OUT, `${prompt.id}.jpg`);
        if (existsSync(dest)) {
          skipped += 1;
          return;
        }
        try {
          await sleep(DELAY_MS);
          const imageUrl = await ogImageOf(prompt.sourceUrl);
          const img = await fetch(imageUrl, { headers: { 'user-agent': UA } });
          if (!img.ok) {
            throw new Error(`image returned ${img.status}`);
          }
          writeFileSync(dest, Buffer.from(await img.arrayBuffer()));
          saved += 1;
          process.stdout.write(`  saved  ${prompt.id}\n`);
        } catch (error) {
          failed.push({ id: prompt.id, message: error.message });
        }
      }),
    ),
  );

  console.log(`\n${saved} saved, ${skipped} already present, ${failed.length} failed.`);
  if (failed.length > 0) {
    console.log('\nFailed:');
    for (const f of failed.slice(0, 10)) console.log(`  ${f.id}: ${f.message}`);
    if (failed.length > 10) console.log(`  … and ${failed.length - 10} more`);
    console.log('\nA blocked or login-walled page cannot be fetched this way.');
    console.log('Export those images from the source account directly instead.');
  }
  console.log(`\nNext: node upload-images.mjs --dir ${OUT} --key <sa.json> --yes\n`);
  exit(0);
};

run().catch((e) => { console.error('\nFetch failed:', e.message); exit(1); });
