// node tools/chat-selftest.mjs — api/chat.js için sahte req/res + fetch stub'ı ile kontrol.
import assert from 'node:assert/strict';
import handler, { retrieve, buildSystemMessage, SYSTEM_PROMPT, _resetRateLimit } from '../api/chat.mjs';

const KEY = 'sk-test-SECRET-123';
const OK_ORIGIN = 'https://www.medya-reklam.com';
const okBody = (content = 'totem fiyatı') => ({ messages: [{ role: 'user', content }], sessionId: 'abc-123' });

async function call({ method = 'POST', origin = OK_ORIGIN, body = okBody(), ip = '1.1.1.1' } = {}) {
  const req = { method, headers: { origin, 'x-forwarded-for': ip }, body };
  const out = { headers: {} };
  const res = { setHeader: (k, v) => (out.headers[k] = v), status(c) { out.status = c; return this; }, json(p) { out.body = p; } };
  await handler(req, res);
  return out;
}

let sent;
globalThis.fetch = async (url, init) => {
  sent = { url, init, body: JSON.parse(init.body) };
  return { ok: true, json: async () => ({ choices: [{ message: { content: ' Merhaba! ' } }] }) };
};
process.env.WIRO_API_KEY = KEY;

let r = await call();
assert.equal(r.status, 200);
assert.equal(r.body.reply, 'Merhaba!');
assert.equal(r.headers['Cache-Control'], 'no-store');
assert.equal(sent.init.headers.Authorization, `Bearer ${KEY}`);
assert.equal(sent.body.session_id, 'abc-123');
assert.equal(sent.body.max_tokens, 500);
assert.ok(!JSON.stringify(sent.body).includes(KEY), 'anahtar prompta sızmış');
assert.ok(!SYSTEM_PROMPT.includes(KEY) && !buildSystemMessage('totem').includes(KEY));

_resetRateLimit();
assert.equal((await call({ body: { messages: [{ role: 'system', content: 'x' }] } })).status, 400);
assert.equal((await call({ body: okBody('a'.repeat(1001)) })).status, 400);
assert.equal((await call({ body: { messages: [{ role: 'assistant', content: 'x' }] } })).status, 400);
assert.equal((await call({ origin: 'https://evil.example' })).status, 403);
assert.equal((await call({ origin: 'http://localhost:3000' })).status, 200);
assert.equal((await call({ method: 'GET' })).status, 405);

// Wiro hatası -> 502, anahtar yanıtta yok
globalThis.fetch = async () => ({ ok: false, status: 500 });
r = await call({ ip: '2.2.2.2' });
assert.equal(r.status, 502);
assert.ok(!JSON.stringify(r.body).includes(KEY));

// Anahtar yok -> 503
delete process.env.WIRO_API_KEY;
assert.equal((await call({ ip: '3.3.3.3' })).status, 503);
process.env.WIRO_API_KEY = KEY;

// Oran sınırı: dakikada 8
_resetRateLimit();
let last;
for (let i = 0; i < 9; i++) last = await call({ ip: '9.9.9.9' });
assert.equal(last.status, 429);

// Retrieval
const urls = retrieve('totem fiyatı').map((c) => c.url);
assert.ok(urls.includes('/urun-totem.html') || urls.includes('/rehber-isikli-tabela-fiyatini-ne-belirler.html'), urls.join());
assert.ok(retrieve('Tabela izni nasıl alınır?').some((c) => c.url.includes('ruhsati')));

console.log('chat-selftest: tüm kontroller geçti');
