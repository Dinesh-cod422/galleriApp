import { readFileSync } from 'node:fs';
import { argv, exit } from 'node:process';
import { GoogleAuth } from 'google-auth-library';

const value = (n) => { const i = argv.indexOf(`--${n}`); return i !== -1 ? argv[i + 1] : undefined; };
const key = JSON.parse(readFileSync(value('key'), 'utf8'));
const PROJECT = key.project_id;
const API = `https://firebase.googleapis.com/v1beta1/projects/${PROJECT}`;

const auth = new GoogleAuth({
  credentials: key,
  scopes: ['https://www.googleapis.com/auth/cloud-platform', 'https://www.googleapis.com/auth/firebase'],
});

const run = async () => {
  const client = await auth.getClient();
  const probe = async (label, url) => {
    try {
      const res = await client.request({ url });
      console.log(`  OK      ${label}`);
      return res.data;
    } catch (e) {
      const s = e?.response?.status;
      const m = e?.response?.data?.error?.message ?? e.message;
      console.log(`  ${s === 403 ? 'DENIED ' : 'ERROR  '} ${label}: ${m}`);
      return null;
    }
  };

  console.log(`\nFirebase Management API access for "${PROJECT}":\n`);
  await probe('projects.get', API);
  const android = await probe('androidApps.list', `${API}/androidApps`);
  const ios = await probe('iosApps.list', `${API}/iosApps`);

  if (android) {
    console.log('\nRegistered Android apps:');
    for (const a of android.apps ?? []) console.log(`  ${a.packageName}  (${a.appId})`);
    if (!android.apps?.length) console.log('  (none)');
  }
  if (ios) {
    console.log('\nRegistered iOS apps:');
    for (const a of ios.apps ?? []) console.log(`  ${a.bundleId}  (${a.appId})`);
    if (!ios.apps?.length) console.log('  (none)');
  }
  console.log('');
  exit(0);
};
run().catch(e => { console.error(e.message); exit(1); });
