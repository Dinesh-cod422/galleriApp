/**
 * Refuses a Firebase Hosting deploy that would DELETE the live images.
 *
 * Wired as the hosting `predeploy` hook in firebase.json, so it runs whether
 * the deploy comes from a script, from CI, or from someone typing the command
 * from memory.
 *
 * Why this exists: the image renditions are no longer kept in the repo. They
 * live in the cloud, with a local archive on the Desktop. Hosting has no notion
 * of a partial upload — it replaces the whole site with whatever is in the
 * public folder — so deploying while `hosting/prompts/` is absent would take
 * 609 files off the CDN and break every image in the app and in Firestore.
 * The manifest is the record of what SHOULD be live, so it is the thing to
 * check against.
 */
import { existsSync, readFileSync } from 'node:fs';
import { argv, exit } from 'node:process';
import { fileURLToPath } from 'node:url';

const root = new URL('../../', import.meta.url);
const manifestPath = fileURLToPath(new URL('hosting/manifest.json', root));
const ARCHIVE = '~/Desktop/prompt-images/hosting-build/prompts';

if (!existsSync(manifestPath)) {
  console.error('hosting/manifest.json is missing — nothing describes what should be live.');
  console.error('Restore it before deploying, or the deploy will empty the site.');
  exit(1);
}

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const site = 'https://notesapp-ed63a.web.app/';

/** URL back to the local file the deploy would upload for it. */
const localPath = (url) =>
  url.startsWith(site) ? fileURLToPath(new URL(`hosting/${url.slice(site.length)}`, root)) : null;

/**
 * The association files must ship on EVERY deploy. Firebase auto-serves its own
 * /.well-known/assetlinks.json for the app registered in the project (a
 * different app entirely), and that generated file comes back the moment ours
 * stops being deployed — silently un-verifying every App Link.
 */
const REQUIRED = ['.well-known/assetlinks.json', '.well-known/apple-app-site-association'];
const absent = REQUIRED.filter((rel) => !existsSync(fileURLToPath(new URL(`hosting/${rel}`, root))));
if (absent.length > 0) {
  console.error(`DEPLOY BLOCKED — missing ${absent.join(', ')}`);
  console.error('Without these, Firebase falls back to its own generated file and App Links stop verifying.');
  exit(1);
}

let expected = 0;
const missing = [];
for (const entry of Object.values(manifest)) {
  for (const image of entry.images) {
    for (const url of [image.original, image.thumb, image.thumb2x]) {
      if (url === undefined) continue;
      expected += 1;
      const path = localPath(url);
      // A URL pointing somewhere other than this site is not ours to deploy.
      if (path !== null && !existsSync(path)) missing.push(url.slice(site.length));
    }
  }
}

if (missing.length > 0) {
  console.error('');
  console.error(`DEPLOY BLOCKED — ${missing.length} of ${expected} images are not in hosting/.`);
  console.error('');
  console.error('Firebase Hosting replaces the ENTIRE site with the local folder, so');
  console.error('deploying now would delete those files from the CDN and break every');
  console.error('image in the app. The renditions were moved out of the repo on purpose.');
  console.error('');
  console.error('To deploy, put them back first:');
  console.error(`  cp -R ${ARCHIVE} hosting/prompts`);
  console.error('');
  console.error('Or rebuild them from the source PNGs:');
  console.error('  node tools/seed/build-hosting-images.mjs --dir ~/Desktop/prompt-images/source-png');
  console.error('');
  console.error(`First few missing: ${missing.slice(0, 5).join(', ')}`);
  exit(1);
}

console.log(`hosting/ ready — all ${expected} images present.`);
if (argv.includes('--verbose')) console.log(`manifest: ${Object.keys(manifest).length} prompts`);
