#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(SCRIPT_DIR, '..');
const MANIFEST_PATH = path.join(SCRIPT_DIR, 'image-dims.json');
const PARTIALS_DIR = path.join(ROOT_DIR, 'partials');

function htmlFiles() {
  const rootFiles = fs.readdirSync(ROOT_DIR, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.html'))
    .map((entry) => entry.name)
    .filter((name) => name.toLowerCase() !== 'admin.html')
    .map((name) => path.join(ROOT_DIR, name));
  const partialFiles = fs.readdirSync(PARTIALS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.html'))
    .map((entry) => path.join(PARTIALS_DIR, entry.name));
  return [...rootFiles, ...partialFiles].sort((a, b) => a.localeCompare(b));
}

function findTagEnd(source, start) {
  let quote = null;
  for (let index = start + 1; index < source.length; index += 1) {
    const character = source[index];
    if (quote) {
      if (character === quote) quote = null;
    } else if (character === '"' || character === "'") {
      quote = character;
    } else if (character === '>') {
      return index + 1;
    }
  }
  return -1;
}

function parseTag(source, start) {
  const end = findTagEnd(source, start);
  if (end < 0) return null;
  const text = source.slice(start, end);
  const match = text.match(/^<\s*(\/?)\s*([a-z][a-z0-9:-]*)\b/i);
  if (!match) return { start, end, text, name: '', closing: false, selfClosing: true };
  return {
    start,
    end,
    text,
    name: match[2].toLowerCase(),
    closing: Boolean(match[1]),
    selfClosing: /\/\s*>$/.test(text),
  };
}

function* markupTags(source) {
  const scanSource = source.replace(/(<(script|style)\b[^>]*>)([\s\S]*?)(<\/\2\s*>)/gi, (_match, open, _name, body, close) => {
    return open + body.replace(/[^\r\n]/g, ' ') + close;
  });
  let cursor = 0;
  while (cursor < scanSource.length) {
    const start = scanSource.indexOf('<', cursor);
    if (start < 0) return;
    if (scanSource.startsWith('<!--', start)) {
      const commentEnd = scanSource.indexOf('-->', start + 4);
      cursor = commentEnd < 0 ? scanSource.length : commentEnd + 3;
      continue;
    }

    const tag = parseTag(scanSource, start);
    if (!tag || !tag.name) {
      cursor = tag?.end ?? start + 1;
      continue;
    }

    if (!tag.closing && !tag.selfClosing && (tag.name === 'script' || tag.name === 'style')) {
      const closeStart = scanSource.toLowerCase().indexOf(`</${tag.name}`, tag.end);
      if (closeStart < 0) return;
      const closeTag = parseTag(scanSource, closeStart);
      cursor = closeTag?.end ?? source.length;
      continue;
    }

    yield tag;
    cursor = tag.end;
  }
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getAttribute(tag, name) {
  const escaped = escapeRegExp(name);
  const present = new RegExp(`(?:^|\\s)${escaped}(?=\\s|=|/?>)`, 'i').test(tag);
  const valueMatch = tag.match(new RegExp(`(?:^|\\s)${escaped}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i'));
  let value = valueMatch ? (valueMatch[1] ?? valueMatch[2] ?? valueMatch[3] ?? '') : null;
  if (valueMatch && valueMatch[3] && value.endsWith('/') && /\/\s*>$/.test(tag)) value = value.slice(0, -1);
  return { present, value };
}

function addAttributes(tag, attributes) {
  if (!attributes.length) return tag;
  return tag.replace(/\s*\/?>$/, (ending) => `${attributes.map(([name, value]) => ` ${name}="${value}"`).join('')}${ending}`);
}

function htmlDecode(value) {
  return value
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
}

function normalizedImagePath(src) {
  const decoded = htmlDecode(src.trim());
  if (!decoded || /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(decoded)) {
    return { key: null, reason: 'dış URL veya boş src' };
  }
  const withoutQuery = decoded.split(/[?#]/, 1)[0].replace(/\\/g, '/');
  const normalized = path.posix.normalize(withoutQuery.replace(/^\/+/, '').replace(/^(?:\.\/)+/, ''));
  if (!normalized || normalized === '.' || normalized === '..' || normalized.startsWith('../')) {
    return { key: null, reason: 'kök dışına çıkan yol' };
  }
  return { key: normalized, reason: null };
}

function main() {
  const args = new Set(process.argv.slice(2));
  for (const arg of args) {
    if (arg !== '--check') throw new Error(`Bilinmeyen seçenek: ${arg}`);
  }

  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
  const checking = args.has('--check');
  const skipped = [];
  const changedFiles = [];
  let changedImages = 0;
  let checkedImages = 0;

  for (const fullPath of htmlFiles()) {
    const original = fs.readFileSync(fullPath, 'utf8');
    const tags = [...markupTags(original)];
    let output = original;
    const edits = [];

    for (const tag of tags) {
      if (tag.closing || tag.name !== 'img') continue;
      const srcAttribute = getAttribute(tag.text, 'src');
      if (srcAttribute.value == null) {
        skipped.push(`${path.relative(ROOT_DIR, fullPath)}: <img> (src eksik)`);
        continue;
      }

      const { key, reason } = normalizedImagePath(srcAttribute.value);
      if (!key) {
        skipped.push(`${path.relative(ROOT_DIR, fullPath)}: ${srcAttribute.value} (${reason})`);
        continue;
      }

      const dimensions = manifest[key];
      if (!Array.isArray(dimensions) || dimensions.length < 2 || !dimensions.every((value) => Number.isInteger(value) && value > 0)) {
        skipped.push(`${path.relative(ROOT_DIR, fullPath)}: ${srcAttribute.value} (manifestte yok: ${key})`);
        continue;
      }

      checkedImages += 1;
      const width = getAttribute(tag.text, 'width');
      const height = getAttribute(tag.text, 'height');
      const additions = [];
      if (!width.present) additions.push(['width', dimensions[0]]);
      if (!height.present) additions.push(['height', dimensions[1]]);
      if (!additions.length) continue;

      const updatedTag = addAttributes(tag.text, additions);
      edits.push({ start: tag.start, end: tag.end, text: updatedTag });
      changedImages += 1;
    }

    for (const edit of edits.reverse()) {
      output = output.slice(0, edit.start) + edit.text + output.slice(edit.end);
    }

    if (output !== original) {
      changedFiles.push(path.relative(ROOT_DIR, fullPath));
      if (!checking) fs.writeFileSync(fullPath, output, 'utf8');
    }
  }

  console.log(`Ölçüsü denetlenen img: ${checkedImages}; boyut eklenen img: ${changedImages}; atlanan img: ${skipped.length}.`);
  if (skipped.length) {
    console.log('Atlanan görseller:');
    for (const entry of skipped) console.log(`  ${entry}`);
  }

  if (checking) {
    if (changedImages) {
      console.error(`Boyut eklenmesi gereken img bulundu (${changedImages}); değişen dosya: ${changedFiles.length}.`);
      process.exitCode = 1;
    } else {
      console.log('Görsel boyutları güncel.');
    }
    return;
  }

  console.log(`Boyut eklenen dosya: ${changedFiles.length}.`);
  for (const filename of changedFiles) console.log(`  ${filename}`);
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
