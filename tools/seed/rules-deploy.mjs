/**
 * Publishes firestore.rules via the Firebase Rules API.
 * Prints the previous ruleset id first, so a rollback is one call away.
 */
import { readFileSync } from 'node:fs';
import { argv, exit } from 'node:process';
import { GoogleAuth } from 'google-auth-library';

const val = (n) => { const i = argv.indexOf(`--${n}`); return i !== -1 ? argv[i + 1] : undefined; };
const key = JSON.parse(readFileSync(val('key'), 'utf8'));
const P = key.project_id;
const source = readFileSync(val('rules'), 'utf8');
const API = 'https://firebaserules.googleapis.com/v1';

const auth = new GoogleAuth({
  credentials: key,
  scopes: ['https://www.googleapis.com/auth/cloud-platform', 'https://www.googleapis.com/auth/firebase'],
});

const run = async () => {
  const c = await auth.getClient();

  const before = (await c.request({ url: `${API}/projects/${P}/releases` })).data;
  const current = (before.releases ?? []).find(r => r.name.endsWith('cloud.firestore'));
  console.log('previous ruleset:', current ? current.rulesetName.split('/').pop() : '(none)');

  // Creating a ruleset compiles it; syntax errors fail here, before release.
  const ruleset = (await c.request({
    url: `${API}/projects/${P}/rulesets`,
    method: 'POST',
    data: { source: { files: [{ name: 'firestore.rules', content: source }] } },
  })).data;
  console.log('new ruleset   :', ruleset.name.split('/').pop());

  const releaseName = `projects/${P}/releases/cloud.firestore`;
  await c.request({
    url: `${API}/${releaseName}`,
    method: current ? 'PATCH' : 'POST',
    ...(current
      ? { data: { release: { name: releaseName, rulesetName: ruleset.name } } }
      : { url: `${API}/projects/${P}/releases`, data: { name: releaseName, rulesetName: ruleset.name } }),
  });
  console.log('\nRELEASED to cloud.firestore');
  exit(0);
};

run().catch(e => {
  const err = e?.response?.data?.error;
  console.error('\nDeploy failed:', err?.message ?? e.message);
  for (const d of err?.details ?? []) console.error(JSON.stringify(d, null, 2).slice(0, 1200));
  exit(1);
});
