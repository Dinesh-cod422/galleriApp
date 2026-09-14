import { readFileSync } from 'node:fs';
import { argv, exit } from 'node:process';
import { GoogleAuth } from 'google-auth-library';
const key = JSON.parse(readFileSync(argv[2], 'utf8'));
const P = key.project_id;
const auth = new GoogleAuth({ credentials: key, scopes: ['https://www.googleapis.com/auth/cloud-platform'] });
const run = async () => {
  const c = await auth.getClient();
  console.log('service account:', key.client_email, '\n');
  try {
    const res = await c.request({
      url: `https://cloudresourcemanager.googleapis.com/v1/projects/${P}:getIamPolicy`,
      method: 'POST', data: {},
    });
    const mine = (res.data.bindings ?? []).filter(b =>
      (b.members ?? []).includes(`serviceAccount:${key.client_email}`));
    console.log('roles currently held:');
    for (const b of mine) console.log('  ', b.role);
    if (!mine.length) console.log('   (none found at project level)');
    const has = mine.some(b => ['roles/datastore.indexAdmin','roles/datastore.owner','roles/owner','roles/editor'].includes(b.role));
    console.log('\ncan create indexes:', has ? 'YES' : 'NO — needs roles/datastore.indexAdmin');
  } catch (e) {
    console.log('cannot read IAM policy:', e?.response?.status, e?.response?.data?.error?.message ?? e.message);
    console.log('(that itself means the account has no IAM-admin rights)');
  }
  exit(0);
};
run();
