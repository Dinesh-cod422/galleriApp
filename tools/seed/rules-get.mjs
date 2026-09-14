import { readFileSync } from 'node:fs';
import { argv, exit } from 'node:process';
import { GoogleAuth } from 'google-auth-library';
const key = JSON.parse(readFileSync(argv[2], 'utf8'));
const P = key.project_id;
const auth = new GoogleAuth({ credentials: key, scopes: ['https://www.googleapis.com/auth/cloud-platform', 'https://www.googleapis.com/auth/firebase'] });
const run = async () => {
  const c = await auth.getClient();
  try {
    const rel = (await c.request({ url: `https://firebaserules.googleapis.com/v1/projects/${P}/releases` })).data;
    const names = (rel.releases ?? []).map(r => `${r.name.split('/').pop()} -> ${r.rulesetName.split('/').pop()}`);
    console.log('releases:', names.length ? names.join('\n          ') : '(none)');
    const fs = (rel.releases ?? []).find(r => r.name.includes('cloud.firestore'));
    if (fs) {
      const rs = (await c.request({ url: `https://firebaserules.googleapis.com/v1/${fs.rulesetName}` })).data;
      console.log('\n--- current firestore rules ---');
      for (const f of rs.source.files) console.log(f.content);
    } else console.log('\n(no firestore ruleset released)');
  } catch (e) {
    console.log('API error:', e?.response?.status, e?.response?.data?.error?.message ?? e.message);
  }
  exit(0);
};
run();
