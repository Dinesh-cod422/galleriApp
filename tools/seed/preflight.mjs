import { cert, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'node:fs';
import { argv, exit } from 'node:process';

const key = JSON.parse(readFileSync(argv[2], 'utf8'));
initializeApp({ credential: cert(key), projectId: key.project_id });
const db = getFirestore();

const run = async () => {
  console.log(`\nExisting top-level collections in "${key.project_id}" (default database):\n`);
  const cols = await db.listCollections();
  if (cols.length === 0) {
    console.log('  (none — database is empty)');
  }
  for (const c of cols) {
    const { count } = (await c.count().get()).data();
    const mark = ['prompts', 'categories', 'users'].includes(c.id) ? '  <-- seeder writes here' : '';
    console.log(`  ${c.id.padEnd(24)} ${String(count).padStart(6)} docs${mark}`);
  }
  console.log('');
  exit(0);
};
run().catch(e => { console.error('Preflight failed:', e.message); exit(1); });
