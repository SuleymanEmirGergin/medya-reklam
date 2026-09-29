// Kök *.html dosyalarından sitemap.xml üretir. Kullanım: node tools/gen-sitemap.mjs [--check]
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const BASE = 'https://www.medya-reklam.com/';
const EXCLUDED = new Set(['admin.html', '404.html', 'tesekkurler.html']);
const today = new Date().toISOString().slice(0, 10);

const lastmod = (f) => {
  try {
    const d = execFileSync('git', ['log', '-1', '--format=%cs', '--', f], { cwd: root, encoding: 'utf8' }).trim();
    return d || today; // git'te yoksa bugün
  } catch { return today; }
};
const noindex = (f) =>
  /<meta[^>]+name=["']robots["'][^>]*noindex/i.test(readFileSync(join(root, f), 'utf8'));

const pages = readdirSync(root)
  .filter((f) => f.endsWith('.html') && !EXCLUDED.has(f) && !f.startsWith('google') && !noindex(f))
  .sort((a, b) => (a === 'index.html' ? -1 : b === 'index.html' ? 1 : a.localeCompare(b)));

const xml = ['<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...pages.map((f) => `  <url><loc>${BASE}${f === 'index.html' ? '' : f}</loc><lastmod>${lastmod(f)}</lastmod></url>`),
  '</urlset>', ''].join('\n');

const out = join(root, 'sitemap.xml');
if (process.argv.includes('--check')) {
  const same = existsSync(out) && readFileSync(out, 'utf8') === xml;
  console.log(same ? `OK (${pages.length} URL)` : 'sitemap.xml güncel değil: node tools/gen-sitemap.mjs');
  process.exit(same ? 0 : 1);
}
writeFileSync(out, xml);
console.log(`sitemap.xml yazıldı (${pages.length} URL)`);
