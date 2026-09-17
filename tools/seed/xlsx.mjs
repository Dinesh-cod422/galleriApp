/** Minimal xlsx reader: shared strings + one sheet, into rows of cells. */
import { readFileSync } from 'node:fs';

const unescape = (s) =>
  s.replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
   .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
   .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
   .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
   .replace(/&amp;/g, '&');

export const sharedStrings = (dir) => {
  const xml = readFileSync(`${dir}/xl/sharedStrings.xml`, 'utf8');
  const out = [];
  // <si> may hold one <t> or several <r><t> runs; concatenate every <t>.
  for (const si of xml.split('<si>').slice(1)) {
    const body = si.slice(0, si.indexOf('</si>'));
    const parts = [...body.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((m) => unescape(m[1]));
    out.push(parts.join(''));
  }
  return out;
};

const colIndex = (ref) => {
  const letters = ref.replace(/\d+/g, '');
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
};

export const sheetRows = (dir, strings) => {
  const xml = readFileSync(`${dir}/xl/worksheets/sheet1.xml`, 'utf8');
  const rows = [];
  for (const chunk of xml.split('<row ').slice(1)) {
    const body = chunk.slice(0, chunk.indexOf('</row>'));
    const cells = [];
    for (const cm of body.matchAll(/<c r="([A-Z]+\d+)"([^>]*)>([\s\S]*?)<\/c>/g)) {
      const [, ref, attrs, inner] = cm;
      const type = /t="([^"]+)"/.exec(attrs)?.[1];
      let value = '';
      if (type === 's') {
        const i = /<v>(\d+)<\/v>/.exec(inner)?.[1];
        value = i === undefined ? '' : (strings[Number(i)] ?? '');
      } else if (type === 'inlineStr') {
        value = [...inner.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((m) => unescape(m[1])).join('');
      } else {
        value = unescape(/<v>([\s\S]*?)<\/v>/.exec(inner)?.[1] ?? '');
      }
      cells[colIndex(ref)] = value;
    }
    rows.push(cells);
  }
  return rows;
};
