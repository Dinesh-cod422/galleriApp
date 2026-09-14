/**
 * Is Cloud Storage provisioned on this project, and what is the bucket called?
 *   node storage-check.mjs --key <service-account.json>
 */
import { GoogleAuth } from 'google-auth-library';
import { readFileSync } from 'node:fs';
import { argv, exit } from 'node:process';

const i = argv.indexOf('--key');
if (i === -1) { console.error('--key <service-account.json> is required'); exit(1); }
const key = JSON.parse(readFileSync(argv[i + 1], 'utf8'));
const PROJECT = key.project_id;

const auth = new GoogleAuth({ credentials: key, scopes: ['https://www.googleapis.com/auth/cloud-platform'] });
const client = await auth.getClient();

const tryGet = async (label, url) => {
  try {
    const r = await client.request({ url });
    return { label, ok: true, data: r.data };
  } catch (e) {
    return { label, ok: false, status: e.response?.status, msg: e.response?.data?.error?.message ?? e.message };
  }
};

const linked = await tryGet('Firebase-linked buckets',
  `https://firebasestorage.googleapis.com/v1beta/projects/${PROJECT}/buckets`);
const gcs = await tryGet('GCS buckets',
  `https://storage.googleapis.com/storage/v1/b?project=${PROJECT}`);

for (const r of [linked, gcs]) {
  if (r.ok) {
    const names = (r.data.buckets ?? []).map(b => b.name ?? b.id);
    console.log(`\n${r.label}: ${names.length === 0 ? '(none)' : ''}`);
    for (const n of names) console.log(`  ${n}`);
  } else {
    console.log(`\n${r.label}: FAILED ${r.status ?? ''} — ${r.msg}`);
  }
}
exit(0);
