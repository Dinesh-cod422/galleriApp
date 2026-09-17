/**
 * Replaces every prompt's TEXT and TITLE from MomentsGallery_Cleaned.xlsx.
 *
 *   node apply-sheet-prompts.mjs --key <sa.json> --xlsx ~/Downloads/MomentsGallery_Cleaned.xlsx
 *   node apply-sheet-prompts.mjs --key ... --xlsx ... --apply
 *
 * Dry run unless `--apply` is passed, because this overwrites live documents.
 *
 * What it writes, and why each field:
 *   prompt        the sheet's text, verbatim
 *   title         a hand-written title from prompt-titles.json (the sheet's own
 *                 titles are working notes — "Couple prompts 02", "80s trend #05")
 *   titleLower    what ordering and prefix lookups read
 *   searchTokens  REBUILT from the new title, or search silently keeps matching
 *                 the old one — this is the field the Search screen queries
 *   updatedAt     so the change is visible in the data, not just in the app
 *
 * Everything else — images, category, tags, stats, flags — is left alone. Only
 * the prompt and its title come from the sheet.
 */
import { execSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { argv, exit } from 'node:process';
import { GoogleAuth } from 'google-auth-library';

import { buildSearchTokens, normalize } from './promptDoc.mjs';
import { sharedStrings, sheetRows } from './xlsx.mjs';

const value = (name) => {
  const i = argv.indexOf(`--${name}`);
  return i !== -1 ? argv[i + 1] : undefined;
};
const APPLY = argv.includes('--apply');

const keyPath = value('key');
const xlsxPath = value('xlsx');
if (!keyPath || !xlsxPath) {
  console.error('Usage: --key <serviceAccount.json> --xlsx <file.xlsx> [--apply]');
  exit(1);
}

const key = JSON.parse(readFileSync(resolve(keyPath), 'utf8'));
const TITLES = JSON.parse(
  readFileSync(new URL('./prompt-titles.json', import.meta.url), 'utf8'),
);

/** xlsx is a zip; unpack to a temp dir rather than adding a parser dependency. */
const readSheet = (path) => {
  const dir = mkdtempSync(join(tmpdir(), 'xlsx-'));
  try {
    execSync(`unzip -o -q ${JSON.stringify(resolve(path))} -d ${JSON.stringify(dir)}`);
    const rows = sheetRows(dir, sharedStrings(dir));
    const header = rows[0].map((h) => String(h ?? '').trim());
    const col = (name) => header.indexOf(name);
    const [idCol, promptCol] = [col('ID'), col('Prompt')];
    if (idCol === -1 || promptCol === -1) throw new Error('Sheet is missing ID or Prompt column');
    return rows
      .slice(1)
      .filter((r) => r && String(r[idCol] ?? '').trim() !== '')
      .map((r) => ({
        id: String(r[idCol]).trim(),
        prompt: String(r[promptCol] ?? '').replace(/\r\n/g, '\n').trim(),
      }))
      .filter((r) => r.prompt.length > 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
};

const run = async () => {
  const sheet = readSheet(xlsxPath);
  console.log(`\nSheet rows with a prompt: ${sheet.length}`);

  const auth = new GoogleAuth({
    credentials: key,
    scopes: ['https://www.googleapis.com/auth/datastore'],
  });
  const client = await auth.getClient();
  const base = `https://firestore.googleapis.com/v1/projects/${key.project_id}/databases/(default)/documents`;

  let updated = 0;
  let skipped = 0;
  const problems = [];

  for (const row of sheet) {
    const docId = `pr_${row.id}`;
    const title = TITLES[row.id];
    if (title === undefined) {
      problems.push(`${docId}: no title written for it`);
      skipped += 1;
      continue;
    }

    // Tags are NOT changed, but searchTokens are built from title + tags, so
    // the current tags have to be read back to rebuild them correctly.
    let existing;
    try {
      ({ data: existing } = await client.request({ url: `${base}/prompts/${docId}` }));
    } catch {
      problems.push(`${docId}: not in Firestore`);
      skipped += 1;
      continue;
    }

    const tags = (existing.fields?.tags?.arrayValue?.values ?? []).map((v) => v.stringValue);
    const tokens = buildSearchTokens(title, tags);

    if (!APPLY) {
      updated += 1;
      if (updated <= 5) {
        console.log(`\n  ${docId}`);
        console.log(`    title  ${existing.fields.title.stringValue}  ->  ${title}`);
        console.log(`    prompt ${(existing.fields.prompt?.stringValue ?? '').length} chars -> ${row.prompt.length} chars`);
        console.log(`    tokens ${tokens.join(', ')}`);
      }
      continue;
    }

    const fields = {
      prompt: { stringValue: row.prompt },
      title: { stringValue: title },
      titleLower: { stringValue: normalize(title) },
      searchTokens: { arrayValue: { values: tokens.map((t) => ({ stringValue: t })) } },
      updatedAt: { timestampValue: new Date().toISOString() },
    };
    const mask = Object.keys(fields)
      .map((f) => `updateMask.fieldPaths=${f}`)
      .join('&');

    await client.request({
      url: `${base}/prompts/${docId}?${mask}`,
      method: 'PATCH',
      data: { fields },
    });
    updated += 1;
    if (updated % 25 === 0) console.log(`  ${updated}/${sheet.length}`);
  }

  console.log(`\n${APPLY ? 'Updated' : 'Would update'}: ${updated}`);
  if (skipped > 0) console.log(`Skipped: ${skipped}`);
  for (const p of problems) console.log(`  ! ${p}`);
  if (!APPLY) console.log('\nDry run. Re-run with --apply to write.');
};

run().catch((error) => {
  console.error('\nFailed:', error?.response?.data?.error?.message ?? error.message);
  exit(1);
});
