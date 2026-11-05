// Kök *.html -> api/_knowledge.mjs (sohbet asistanı için bilgi parçaları). --check: fark varsa exit 1.
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'api', '_knowledge.mjs');
const MAX = 900;
const SKIP = /^(admin|404|tesekkurler)\.html$|^google/;

const ENT = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&nbsp;': ' ', '&apos;': "'" };
const decode = (s) => s.replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&[a-z#0-9]+;/gi, (e) => ENT[e] ?? ' ');
const strip = (h) => decode(h.replace(/<(script|style|svg|noscript)[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();

// <table> -> "başlık: hücre; hücre" satırları
function tableToText(t) {
  const rows = [...t.matchAll(/<tr[\s\S]*?<\/tr>/gi)].map((r) => [...r[0].matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi)].map((c) => strip(c[1])));
  const cap = (t.match(/<caption[^>]*>([\s\S]*?)<\/caption>/i) || [])[1];
  const [head, ...body] = rows;
  const lines = body.map((r) => r.map((c, i) => `${head?.[i] ?? ''}: ${c}`).join('; '));
  return [cap && strip(cap), ...lines].filter(Boolean).join('\n');
}

// data-cms-body div'ini derinlik sayarak çıkar
function cmsBody(html) {
  const m = /<div[^>]*data-cms-body[^>]*>/i.exec(html);
  if (!m) return null;
  let depth = 1, i = m.index + m[0].length;
  const re = /<(\/?)div\b[^>]*>/gi;
  re.lastIndex = i;
  for (let x; (x = re.exec(html)); ) {
    depth += x[1] ? -1 : 1;
    if (!depth) return html.slice(i, x.index);
  }
  return html.slice(i);
}

function mainHtml(html) {
  const b = cmsBody(html);
  if (b) return b;
  const main = /<main[\s\S]*?<\/main>/i.exec(html)?.[0] ?? /<body[\s\S]*<\/body>/i.exec(html)?.[0] ?? html;
  return main.replace(/<(header|footer|nav)[\s\S]*?<\/\1>/gi, ' ');
}

const inlineBlocks = (h) => h.replace(/<table[\s\S]*?<\/table>/gi, (t) => `\n<p>${tableToText(t).replace(/\n/g, '</p><p>')}</p>\n`);

function splitText(text) {
  if (text.length <= MAX) return [text];
  const out = []; let cur = '';
  for (const s of text.split(/(?<=[.!?])\s+/)) {
    if (cur && (cur + ' ' + s).length > MAX) { out.push(cur); cur = ''; }
    cur = cur ? cur + ' ' + s : s;
    while (cur.length > MAX) { out.push(cur.slice(0, MAX)); cur = cur.slice(MAX); }
  }
  return cur ? [...out, cur] : out;
}

function pageChunks(file) {
  const html = readFileSync(join(ROOT, file), 'utf8');
  const title = strip(/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] ?? file).replace(/\s*[|–-]\s*Medya Reklam.*$/i, '');
  const url = '/' + file;
  let body = inlineBlocks(mainHtml(html));
  // tablolar cms-body dışındaysa ayrıca ekle
  if (cmsBody(html)) for (const t of html.match(/<table[\s\S]*?<\/table>/gi) ?? []) if (!body.includes(tableToText(t).split('\n')[0])) body += `\n<h2>Tablo</h2><p>${tableToText(t).replace(/\n/g, '</p><p>')}</p>`;
  const parts = body.split(/(?=<h2\b)/i);
  const chunks = [];
  for (const part of parts) {
    const h2 = /^<h2[^>]*>([\s\S]*?)<\/h2>/i.exec(part);
    const section = h2 ? strip(h2[1]) : 'Giriş';
    if (/^İlgili (rehber|yazı|içerik)/i.test(section)) continue;
    const rest = h2 ? part.slice(h2[0].length) : part;
    if (/sık sorulan|sss/i.test(section) && /<h3/i.test(rest)) {
      for (const qa of rest.split(/(?=<h3\b)/i)) {
        const q = /^<h3[^>]*>([\s\S]*?)<\/h3>/i.exec(qa);
        const text = q ? `${strip(q[1])} ${strip(qa.slice(q[0].length))}` : strip(qa);
        if (text) chunks.push({ url, title, section: q ? 'SSS: ' + strip(q[1]) : section, text: text.slice(0, MAX) });
      }
      continue;
    }
    const text = strip(rest.replace(/<\/(p|li|h3|tr)>/gi, '$& '));
    if (text.length < 20) continue;
    splitText(text).forEach((t) => chunks.push({ url, title, section, text: t }));
  }
  return chunks;
}

function coreChunk() {
  const md = readFileSync(join(ROOT, 'llms.txt'), 'utf8');
  const m = /## Firma bilgisi\s*([\s\S]*?)(?=\n## |$)/.exec(md);
  return { url: '/', title: 'Firma bilgisi', section: 'core', text: m ? m[1].trim() : '' };
}

const files = readdirSync(ROOT).filter((f) => f.endsWith('.html') && !SKIP.test(f)).sort();
const data = { core: coreChunk(), chunks: files.flatMap(pageChunks) };
// .mjs modülü: Vercel fonksiyonu düz import ile paketler (JSON import attribute'una gerek yok)
const json = '// Üretilmiş dosya: node tools/gen-knowledge.mjs\nexport default ' + JSON.stringify(data, null, 1) + ';\n';

if (process.argv.includes('--check')) {
  const same = existsSync(OUT) && readFileSync(OUT, 'utf8') === json;
  console.log(same ? 'api/_knowledge.mjs güncel' : 'api/_knowledge.mjs eski: node tools/gen-knowledge.mjs çalıştırın');
  process.exit(same ? 0 : 1);
}
writeFileSync(OUT, json);
console.log(`${data.chunks.length} parça, ${files.length} sayfa, ${(json.length / 1024).toFixed(1)} KB`);
