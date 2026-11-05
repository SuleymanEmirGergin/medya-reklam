#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(SCRIPT_DIR, '..');
const PARTIAL_DIR = path.join(ROOT_DIR, 'partials');
const PARTIAL_NAMES = ['header', 'footer', 'product-sidebar', 'float-cta'];
const HEADER_ACTIVE_HREF = new Map([
  ['index.html', 'index.html'],
  ['hakkimizda.html', 'hakkimizda.html'],
  ['sirket-politikasi.html', 'hakkimizda.html'],
  ['portfoy.html', 'portfoy.html'],
  ['iletisim.html', 'iletisim.html'],
  ['urunlerimiz.html', 'urunlerimiz.html'],
  ['rehber.html', 'rehber.html'],
]);

function normalizeNewlines(value, newline) {
  return value.replace(/\r\n|\r|\n/g, newline);
}

function detectedNewline(source) {
  return source.includes('\r\n') ? '\r\n' : '\n';
}

function readPartials() {
  return Object.fromEntries(PARTIAL_NAMES.map((name) => {
    const file = path.join(PARTIAL_DIR, `${name}.html`);
    if (!fs.existsSync(file)) {
      throw new Error(`Eksik partial dosyası: ${path.relative(ROOT_DIR, file)}`);
    }
    return [name, fs.readFileSync(file, 'utf8')];
  }));
}

function countOccurrences(source, token) {
  const matches = source.match(new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'));
  return matches ? matches.length : 0;
}

function markerSpan(source, name) {
  const open = `<!-- partial:${name} -->`;
  const close = `<!-- /partial:${name} -->`;
  const opens = countOccurrences(source, open);
  const closes = countOccurrences(source, close);
  if (opens === 0 && closes === 0) return null;
  if (opens !== 1 || closes !== 1) {
    throw new Error(`Geçersiz ${name} partial işaretleri: açılış=${opens}, kapanış=${closes}`);
  }

  const start = source.indexOf(open);
  const bodyStart = start + open.length;
  const bodyEnd = source.indexOf(close, bodyStart);
  if (bodyEnd < 0) throw new Error(`Kapanış işareti açılışın önünde: ${name}`);
  return { start, end: bodyEnd + close.length, body: source.slice(bodyStart, bodyEnd) };
}

function markerText(name, html, newline, indent = '') {
  const body = normalizeNewlines(html, newline).replace(/(?:\r\n|\r|\n)+$/g, '');
  const lines = body.split(newline);
  if (lines.length) lines[0] = `${indent}${lines[0]}`;
  return `${indent}<!-- partial:${name} -->${newline}${lines.join(newline)}${newline}${indent}<!-- /partial:${name} -->`;
}

function lineContext(source, offset) {
  const lineStart = source.lastIndexOf('\n', offset - 1) + 1;
  const prefix = source.slice(lineStart, offset);
  if (/^[\t ]*$/.test(prefix)) return { start: lineStart, indent: prefix };
  return { start: offset, indent: '' };
}

function findElementsByClass(source, tagName, className) {
  const expression = new RegExp(`<${tagName}\\b[^>]*>[\\s\\S]*?<\\/${tagName}\\s*>`, 'gi');
  const results = [];
  for (const match of source.matchAll(expression)) {
    const opening = match[0].match(new RegExp(`^<${tagName}\\b[^>]*>`, 'i'))?.[0];
    if (opening && hasClass(opening, className)) {
      results.push({ start: match.index, end: match.index + match[0].length, text: match[0] });
    }
  }
  return results;
}

function hasClass(openingTag, className) {
  const match = openingTag.match(/\bclass\s*=\s*(["'])(.*?)\1/i);
  return Boolean(match && match[2].split(/\s+/).includes(className));
}

function attribute(openingTag, name) {
  const expression = new RegExp(`(?:^|\\s)(${name})(?:\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+)))?`, 'i');
  const match = openingTag.match(expression);
  if (!match) return null;
  return {
    raw: match[0].trim(),
    value: match[2] ?? match[3] ?? match[4] ?? '',
  };
}

function normalizeHref(value) {
  return value.replace(/\\/g, '/').replace(/[?#].*$/, '').replace(/^\.\//, '').replace(/^\/+/, '');
}

function collectAriaCurrent(source) {
  const records = new Map();
  let hasAny = false;
  for (const match of source.matchAll(/<a\b[^>]*>/gi)) {
    const href = attribute(match[0], 'href');
    if (!href) continue;
    const key = normalizeHref(href.value);
    const aria = attribute(match[0], 'aria-current');
    if (aria) hasAny = true;
    const values = records.get(key) ?? [];
    values.push(aria?.raw ?? null);
    records.set(key, values);
  }
  return { records, hasAny };
}

function removeAttribute(openingTag, name) {
  const expression = new RegExp(`\\s+${name}(?:\\s*=\\s*(?:"[^"]*"|'[^']*'|[^\\s>]+))?`, 'gi');
  return openingTag.replace(expression, '');
}

function addAttribute(openingTag, rawAttribute) {
  if (!rawAttribute) return openingTag;
  return openingTag.replace(/\s*\/?>$/, (ending) => ` ${rawAttribute}${ending.trimStart()}`);
}

function applyAriaCurrent(template, sourceRegion) {
  const { records, hasAny } = collectAriaCurrent(sourceRegion);
  if (!hasAny) return template;

  const indices = new Map();
  return template.replace(/<a\b[^>]*>/gi, (openingTag) => {
    const cleanOpening = removeAttribute(openingTag, 'aria-current');
    const href = attribute(cleanOpening, 'href');
    if (!href) return cleanOpening;
    const key = normalizeHref(href.value);
    const values = records.get(key);
    if (!values) return cleanOpening;
    const index = indices.get(key) ?? 0;
    indices.set(key, index + 1);
    return addAttribute(cleanOpening, values[index] ?? null);
  });
}

function setClassToken(openingTag, token, enabled) {
  return openingTag.replace(/(\bclass\s*=\s*)(["'])(.*?)\2/i, (_whole, prefix, quote, original) => {
    const hadTrailingSpace = /\s$/.test(original);
    const tokens = original.trim().split(/\s+/).filter((value) => value && value !== token);
    let value = tokens.join(' ');
    if (enabled && !tokens.includes(token)) value = `${value}${value ? ' ' : ''}${token}`;
    else if (!enabled && hadTrailingSpace && value) value += ' ';
    return `${prefix}${quote}${value}${quote}`;
  });
}

function pageFilenameHref(value) {
  return path.posix.basename(normalizeHref(value));
}

function headerActiveHref(filename) {
  if (/^urun-.+\.html$/i.test(filename) || filename.toLowerCase() === 'urunlerimiz.html') {
    return 'urunlerimiz.html';
  }
  if (/^rehber.*\.html$/i.test(filename)) return 'rehber.html';
  if (filename.toLowerCase() === 'hakkimizda.html' || filename.toLowerCase() === 'sirket-politikasi.html') {
    return 'hakkimizda.html';
  }
  return HEADER_ACTIVE_HREF.get(filename.toLowerCase()) ?? null;
}

function updateHeader(template, filename, sourceRegion) {
  const activeHref = headerActiveHref(filename);
  const lists = findElementsByClass(template, 'ul', 'nav__menu');
  if (!lists.length) return template;

  const list = lists[0];
  const ariaAdjusted = applyAriaCurrent(template.slice(list.start, list.end), sourceRegion);
  const adjustedList = ariaAdjusted.replace(/<li\b[^>]*>[\s\S]*?<\/li>/gi, (item) => {
    const opening = item.match(/^<li\b[^>]*>/i)?.[0];
    if (!opening) return item;
    const directAnchor = item.match(/<a\b[^>]*>/i)?.[0];
    const href = directAnchor ? attribute(directAnchor, 'href') : null;
    const active = Boolean(activeHref && href && pageFilenameHref(href.value) === activeHref);
    const updatedOpening = setClassToken(opening, 'is-active', active);
    return updatedOpening + item.slice(opening.length);
  });
  return template.slice(0, list.start) + adjustedList + template.slice(list.end);
}

function updateSidebar(template, filename, sourceRegion) {
  const ariaAdjusted = applyAriaCurrent(template, sourceRegion);
  return ariaAdjusted.replace(/<a\b[^>]*>/gi, (openingTag) => {
    const href = attribute(openingTag, 'href');
    const active = Boolean(href && pageFilenameHref(href.value).toLowerCase() === filename.toLowerCase());
    return setClassToken(openingTag, 'is-active', active);
  });
}

function renderPartial(name, sourceRegion, filename, partials, newline) {
  let html = partials[name].replace(/^\uFEFF/, '').replace(/(?:\r\n|\r|\n)+$/g, '');
  if (name === 'header') html = updateHeader(html, filename, sourceRegion);
  if (name === 'product-sidebar') html = updateSidebar(html, filename, sourceRegion);
  return normalizeNewlines(html, newline);
}

function findElementBlock(source, tagName, className) {
  return findElementsByClass(source, tagName, className)[0] ?? null;
}

function syncRegion(source, name, tagName, className, filename, partials, allowInit) {
  const newline = detectedNewline(source);
  const marked = markerSpan(source, name);
  let sourceRegion = marked?.body ?? null;
  let start = marked?.start;
  let end = marked?.end;

  if (!marked) {
    if (!allowInit) return source;
    const legacy = findElementBlock(source, tagName, className);
    if (!legacy) return source;
    sourceRegion = legacy.text;
    start = legacy.start;
    end = legacy.end;
  }

  const context = lineContext(source, start);
  const rendered = renderPartial(name, sourceRegion, filename, partials, newline);
  const replacement = markerText(name, rendered, newline, context.indent);
  return source.slice(0, context.start) + replacement + source.slice(end);
}

function isProductDetail(filename) {
  return /^urun-.+\.html$/i.test(filename) && filename.toLowerCase() !== 'urunlerimiz.html';
}

function hasProductSidebar(filename) {
  return isProductDetail(filename) || filename.toLowerCase() === 'urunlerimiz.html';
}

function insertFloatAfterFooter(source, filename, partials) {
  const newline = detectedNewline(source);
  const footerMarker = markerSpan(source, 'footer');
  let position = footerMarker?.end;
  if (position == null) {
    const footer = findElementBlock(source, 'footer', 'site-footer');
    if (!footer) return source;
    position = footer.end;
  }

  if (source.startsWith(newline, position)) position += newline.length;

  const rendered = renderPartial('float-cta', '', filename, partials, newline);
  const replacement = markerText('float-cta', rendered, newline, '  ');
  const prefix = source.slice(0, position);
  const suffix = source.slice(position);
  const beforeBreak = prefix.endsWith(newline) || !prefix ? '' : newline;
  const afterBreak = suffix.startsWith(newline) || !suffix ? '' : newline;
  return `${prefix}${beforeBreak}${replacement}${afterBreak}${suffix}`;
}

function syncFloatCta(source, filename, partials, allowInit) {
  const newline = detectedNewline(source);
  const marked = markerSpan(source, 'float-cta');
  if (marked) {
    const context = lineContext(source, marked.start);
    const rendered = renderPartial('float-cta', marked.body, filename, partials, newline);
    const replacement = markerText('float-cta', rendered, newline, context.indent || '  ');
    return source.slice(0, context.start) + replacement + source.slice(marked.end);
  }
  if (!allowInit) return source;

  const waBlocks = findElementsByClass(source, 'a', 'wa-float');
  const mobileBlocks = findElementsByClass(source, 'nav', 'mobile-cta');
  if (waBlocks.length || mobileBlocks.length) {
    let prepared = source;
    if (waBlocks.length && mobileBlocks.length) {
      for (const block of mobileBlocks.slice().reverse()) {
        prepared = prepared.slice(0, block.start) + prepared.slice(block.end);
      }
    }
    const legacy = findElementBlock(prepared, 'a', 'wa-float') ?? findElementBlock(prepared, 'nav', 'mobile-cta');
    const context = lineContext(prepared, legacy.start);
    const rendered = renderPartial('float-cta', legacy.text, filename, partials, newline);
    const replacement = markerText('float-cta', rendered, newline, context.indent);
    return prepared.slice(0, context.start) + replacement + prepared.slice(legacy.end);
  }

  if (filename.toLowerCase() === '404.html' || filename.toLowerCase() === 'tesekkurler.html') return source;
  return insertFloatAfterFooter(source, filename, partials);
}

function transformHtml(source, filename, partials, allowInit) {
  let output = source;
  output = syncRegion(output, 'header', 'header', 'site-header', filename, partials, allowInit);
  output = syncRegion(output, 'footer', 'footer', 'site-footer', filename, partials, allowInit);
  if (hasProductSidebar(filename) || markerSpan(output, 'product-sidebar')) {
    output = syncRegion(output, 'product-sidebar', 'nav', 'sidebar-menu__list', filename, partials, allowInit && hasProductSidebar(filename));
  }
  output = syncFloatCta(output, filename, partials, allowInit);
  return output;
}

function publicHtmlFiles() {
  return fs.readdirSync(ROOT_DIR, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.html'))
    .map((entry) => entry.name)
    .filter((name) => name.toLowerCase() !== 'admin.html' && !/^google.*\.html$/i.test(name))
    .sort((a, b) => a.localeCompare(b));
}

function selfTest(partials) {
  const sample = [
    '<!doctype html>',
    '<header class="site-header"><ul class="nav__menu"><li class="nav__item is-active"><a class="nav__link" href="urunlerimiz.html" aria-current="page">Ürünlerimiz</a></li></ul></header>',
    '<aside><nav class="sidebar-menu__list"><a href="urun-cephe.html" class="sidebar-menu__link is-active" aria-current="page">Cephe</a></nav></aside>',
    '<footer class="site-footer"><div>Footer</div></footer>',
    '<script src="assets/main.js"></script>',
  ].join('\n');
  const first = transformHtml(sample, 'urun-cephe.html', partials, true);
  const second = transformHtml(first, 'urun-cephe.html', partials, true);

  assert.equal(second, first, 'İkinci partial senkronu içeriği değiştirmemeli');
  assert.match(first, /<li class="nav__item is-active"><a class="nav__link" href="urunlerimiz\.html" aria-current="page">/);
  assert.match(first, /href="urun-cephe\.html" class="sidebar-menu__link is-active" aria-current="page"/);
  assert.equal(countOccurrences(first, 'class="wa-float"'), 1);
  assert.equal(countOccurrences(first, 'class="mobile-cta"'), 1);
  assert.equal(countOccurrences(first, '<!-- partial:float-cta -->'), 1);
  assert.doesNotMatch(first, /^\uFEFF/);

  const crlfSample = sample.replace(/\r?\n/g, '\r\n');
  const crlfResult = transformHtml(crlfSample, 'urun-cephe.html', partials, true);
  assert.doesNotMatch(crlfResult, /(^|[^\r])\n/);
  assert.match(crlfResult, /\r\n/);
  console.log('selftest passed: aktif header/sidebar, CTA, CRLF ve idempotentlik');
}

function main() {
  const args = new Set(process.argv.slice(2));
  const allowed = new Set(['--init', '--check', '--selftest']);
  for (const arg of args) {
    if (!allowed.has(arg)) throw new Error(`Bilinmeyen seçenek: ${arg}`);
  }
  if (args.has('--init') && args.has('--check')) throw new Error('--init ve --check birlikte kullanılamaz');

  const partials = readPartials();
  if (args.has('--selftest')) {
    if (args.size !== 1) throw new Error('--selftest başka seçeneklerle birlikte kullanılamaz');
    selfTest(partials);
    return;
  }

  const checking = args.has('--check');
  const allowInit = args.has('--init') || checking;
  const changes = [];
  for (const filename of publicHtmlFiles()) {
    const fullPath = path.join(ROOT_DIR, filename);
    const original = fs.readFileSync(fullPath, 'utf8');
    const updated = transformHtml(original, filename, partials, allowInit);
    if (updated === original) continue;
    changes.push(filename);
    if (!checking) fs.writeFileSync(fullPath, updated, 'utf8');
  }

  if (checking) {
    if (changes.length) {
      console.error(`Senkronizasyon gereken dosyalar (${changes.length}):`);
      for (const filename of changes) console.error(`  ${filename}`);
      process.exitCode = 1;
      return;
    }
    console.log('Partial senkronu güncel.');
    return;
  }

  console.log(`Partial senkronu tamamlandı; değişen HTML dosyası: ${changes.length}.`);
  for (const filename of changes) console.log(`  ${filename}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
