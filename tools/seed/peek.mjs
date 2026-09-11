import { cert, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'node:fs';
import { argv, exit } from 'node:process';
const key = JSON.parse(readFileSync(argv[2], 'utf8'));
initializeApp({ credential: cert(key), projectId: key.project_id });
const db = getFirestore();
const run = async () => {
  const d = await db.doc('prompts/pr_desert_golden_hour').get();
  const p = d.data();
  console.log('\nprompts/pr_desert_golden_hour');
  console.log('  title        ', p.title);
  console.log('  categoryName ', p.categoryName);
  console.log('  authorName   ', p.authorName);
  console.log('  status       ', p.status);
  console.log('  stats        ', JSON.stringify(p.stats));
  console.log('  flags        ', JSON.stringify(p.flags));
  console.log('  trendingScore', p.trendingScore);
  console.log('  publishedAt  ', p.publishedAt.toDate().toISOString(), '(real Timestamp:', p.publishedAt.constructor.name + ')');
  console.log('  thumbnailUrl ', p.thumbnailUrl);
  console.log('  imageUrl     ', p.imageUrl);
  console.log('  searchTokens ', p.searchTokens.join(', '));
  console.log('  metadata.model', p.metadata.model, p.metadata.modelVersion);
  console.log('  prompt chars ', p.prompt.length);

  // Single-field queries need no composite index — proves the data is queryable now.
  const cats = await db.collection('categories').orderBy('sortOrder').get();
  console.log('\ncategories:', cats.docs.map(c => `${c.get('name')}(${c.get('promptCount')})`).join(' '));
  const byStatus = await db.collection('prompts').where('status', '==', 'published').count().get();
  console.log('published prompts:', byStatus.data().count);
  exit(0);
};
run().catch(e => { console.error(e.message); exit(1); });
