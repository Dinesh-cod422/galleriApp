/**
 * A browsable contact sheet of everything in hosting/manifest.json.
 *
 *   node build-gallery-page.mjs
 *   npx firebase-tools deploy --only hosting --project notesapp-ed63a
 *
 * Deployed at /gallery.html rather than /index.html on purpose: the root stays
 * a 404, so the whole library is not sitting at the bare domain for anyone who
 * happens to type it. The images themselves are public either way — this only
 * decides whether they are listed in one place.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { argv, exit } from 'node:process';

const value = (n) => { const i = argv.indexOf(`--${n}`); return i !== -1 ? argv[i + 1] : undefined; };
const OUT = value('out') ?? new URL('../../hosting/gallery.html', import.meta.url).pathname;

const manifest = JSON.parse(
  readFileSync(new URL('../../hosting/manifest.json', import.meta.url), 'utf8'),
);

let titles = new Map();
try {
  const { PROMPTS } = await import('./data.mjs');
  titles = new Map(PROMPTS.map((p) => [p.id, p.title]));
} catch { /* titles are a nicety; the sheet works without them. */ }

/** Titles are author-written text going into HTML. Escape, never trust. */
const escape = (s) =>
  String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const ids = Object.keys(manifest).sort((a, b) => {
  const n = (s) => Number(s.replace(/\D+/g, '')) || 0;
  return n(a) - n(b) || a.localeCompare(b);
});

const cards = [];
let imageCount = 0;
for (const id of ids) {
  for (const image of manifest[id].images) {
    imageCount += 1;
    const variant = image.id === id ? '' : `<span class="v">${escape(image.id.slice(id.length + 1))}</span>`;
    cards.push(`<figure>
  <a href="${image.original}" target="_blank" rel="noreferrer">
    <img src="${image.thumb}" width="${image.width}" height="${image.height}" loading="lazy" alt="${escape(titles.get(id) ?? id)}">
  </a>
  <figcaption>
    <b>${escape(id)}</b>${variant}
    <span class="t">${escape(titles.get(id) ?? '')}</span>
    <span class="l"><a href="${image.original}" target="_blank" rel="noreferrer">full</a> · <a href="${image.thumb}" target="_blank" rel="noreferrer">400</a> · <a href="${image.thumb2x}" target="_blank" rel="noreferrer">800</a></span>
  </figcaption>
</figure>`);
  }
}

const html = `<!doctype html>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>Moments Gallery — hosted images</title>
<style>
  :root { color-scheme: light dark; --fg:#111; --mut:#666; --bg:#fafafa; --card:#fff; --line:#e6e6e6; }
  @media (prefers-color-scheme: dark) {
    :root { --fg:#eee; --mut:#999; --bg:#111; --card:#1b1b1b; --line:#2a2a2a; }
  }
  * { box-sizing: border-box; }
  body { margin:0; padding:24px 16px 64px; background:var(--bg); color:var(--fg);
         font:15px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif; }
  header { max-width:1200px; margin:0 auto 24px; }
  h1 { font-size:22px; margin:0 0 6px; }
  p { margin:0; color:var(--mut); }
  code { background:var(--card); border:1px solid var(--line); border-radius:5px; padding:1px 5px; font-size:13px; }
  .grid { max-width:1200px; margin:0 auto; columns:220px; column-gap:14px; }
  figure { break-inside:avoid; margin:0 0 14px; background:var(--card);
           border:1px solid var(--line); border-radius:10px; overflow:hidden; }
  img { display:block; width:100%; height:auto; background:var(--line); }
  figcaption { padding:8px 10px 10px; font-size:12px; display:flex; flex-direction:column; gap:2px; }
  b { font-family:ui-monospace,SFMono-Regular,Menlo,monospace; font-size:12px; }
  .v { color:#7c3aed; font-family:ui-monospace,monospace; font-size:11px; }
  .t { color:var(--mut); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .l a { color:#7c3aed; text-decoration:none; }
  .l a:hover { text-decoration:underline; }
</style>
<header>
  <h1>Moments Gallery — hosted images</h1>
  <p>${ids.length} prompts · ${imageCount} images · tap any picture for the full-size file.</p>
  <p style="margin-top:8px">Every image has three sizes — swap the folder:
     <code>prompts/original</code> <code>prompts/thumbnails</code> <code>prompts/thumbnails@2x</code></p>
</header>
<div class="grid">
${cards.join('\n')}
</div>
`;

writeFileSync(OUT, html);
console.log(`${ids.length} prompts / ${imageCount} images -> ${OUT}`);
console.log('Deploy with:  npx firebase-tools deploy --only hosting --project notesapp-ed63a');
if (imageCount === 0) exit(1);
