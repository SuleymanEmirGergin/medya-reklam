/* Medya Reklam site asistanı. Tek script etiketi yeter; CSS'i kendisi yükler.
   Uç nokta: <script src="assets/chat.js" data-endpoint="/api/chat"> (varsayılan /api/chat). */
(function () {
  'use strict';
  if (window.__mrChat) return;
  window.__mrChat = true;

  var script = document.currentScript;
  var ENDPOINT = (script && script.dataset.endpoint) || '/api/chat';
  var STORE = 'mrChat.v1';
  var MAX_SENT = 10;
  var CHIPS = ['Işıklı tabela fiyatını ne belirler?', 'Tabela izni nasıl alınır?', 'Araç giydirme süreci nasıl?'];
  var WELCOME = 'Merhaba! Tabela, kutu harf, araç giydirme ve diğer hizmetlerimiz hakkında sorularınızı yanıtlayabilirim.';
  var GENERIC_ERROR = "Şu an yanıt veremiyorum, lütfen 0532 486 82 60 veya WhatsApp'tan ulaşın.";

  var css = document.createElement('link');
  css.rel = 'stylesheet';
  css.href = (script && script.src ? script.src.replace(/chat\.js.*$/, '') : 'assets/') + 'chat.css?v=1';
  document.head.appendChild(css);

  // ---- oturum (sessionStorage; erişilemezse bellekte) ----
  var mem = null;
  function load() {
    try { return JSON.parse(sessionStorage.getItem(STORE)) || null; } catch (e) { return mem; }
  }
  function save() {
    mem = state;
    try { sessionStorage.setItem(STORE, JSON.stringify(state)); } catch (e) { /* özel mod */ }
  }
  var state = load() || { sid: uuid(), messages: [] };
  function uuid() {
    try { return crypto.randomUUID(); } catch (e) { return 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10); }
  }

  // ---- DOM yardımcıları ----
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  // Metni güvenli biçimde düğümlere çevirir: yalnızca /xxx.html, https://wa.me/.., tel: linkleri <a> olur.
  var TOKEN = /\[([^\]]+)\]\(([^)\s]+)\)|(https:\/\/wa\.me\/\d+[^\s)]*|tel:\+?\d+|\/[a-z0-9-]+\.html(?:#[\w-]+)?)/g;
  function safeHref(u) {
    if (/^\/[a-z0-9-]+\.html(#[\w-]+)?$/.test(u) || /^tel:\+?\d+$/.test(u)) return u;
    if (/^https:\/\/wa\.me\/\d+([?][^\s]*)?$/.test(u)) return u;
    return null;
  }
  function render(target, text) {
    var clean = text.replace(/\*\*/g, '');
    var last = 0, m;
    TOKEN.lastIndex = 0;
    while ((m = TOKEN.exec(clean))) {
      var href = safeHref(m[2] || m[3]);
      target.appendChild(document.createTextNode(clean.slice(last, m.index)));
      if (href) {
        var a = el('a', null, m[1] || m[3]);
        a.href = href;
        if (href.indexOf('https:') === 0) { a.target = '_blank'; a.rel = 'noopener'; }
        target.appendChild(a);
      } else {
        target.appendChild(document.createTextNode(m[0]));
      }
      last = m.index + m[0].length;
    }
    target.appendChild(document.createTextNode(clean.slice(last)));
  }

  // ---- arayüz ----
  var fab = el('button', 'mrc-fab');
  fab.type = 'button';
  fab.setAttribute('aria-haspopup', 'dialog');
  fab.setAttribute('aria-expanded', 'false');
  fab.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.3A8 8 0 1 1 21 12z"/><path d="M9 11h6M9 14h4"/></svg>';
  fab.appendChild(el('span', 'mrc-sr', 'Asistana sorun'));

  var panel = el('div', 'mrc-panel');
  panel.hidden = true;
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  panel.setAttribute('aria-labelledby', 'mrc-title');
  var head = el('div', 'mrc-head');
  var titleBox = el('div');
  var title = el('h2', 'mrc-title', 'Medya Reklam Asistanı');
  title.id = 'mrc-title';
  titleBox.appendChild(title);
  titleBox.appendChild(el('p', 'mrc-note', 'Yapay zekâ asistanı; net fiyat için keşif gerekir.'));
  var closeBtn = el('button', 'mrc-close', '×');
  closeBtn.type = 'button';
  closeBtn.setAttribute('aria-label', 'Sohbeti kapat');
  head.appendChild(titleBox);
  head.appendChild(closeBtn);

  var log = el('div', 'mrc-log');
  log.setAttribute('role', 'log');
  log.setAttribute('aria-live', 'polite');
  var form = el('form', 'mrc-form');
  var input = el('textarea', 'mrc-input');
  input.rows = 1;
  input.maxLength = 1000;
  input.placeholder = 'Sorunuzu yazın…';
  input.setAttribute('aria-label', 'Mesajınız');
  var send = el('button', 'mrc-send', 'Gönder');
  send.type = 'submit';
  form.appendChild(input);
  form.appendChild(send);
  panel.appendChild(head);
  panel.appendChild(log);
  panel.appendChild(form);
  document.body.appendChild(fab);
  document.body.appendChild(panel);

  function bubble(cls, text) {
    var b = el('div', 'mrc-msg ' + cls);
    render(b, text);
    log.appendChild(b);
    log.scrollTop = log.scrollHeight;
    return b;
  }

  function showChips() {
    var box = el('div', 'mrc-chips');
    CHIPS.forEach(function (q) {
      var c = el('button', 'mrc-chip', q);
      c.type = 'button';
      c.addEventListener('click', function () { box.remove(); ask(q); });
      box.appendChild(c);
    });
    log.appendChild(box);
  }

  function restore() {
    bubble('mrc-bot', WELCOME);
    state.messages.forEach(function (m) { bubble(m.role === 'user' ? 'mrc-user' : 'mrc-bot', m.content); });
    if (!state.messages.length) showChips();
  }

  var busy = false;
  function ask(text) {
    text = text.trim();
    if (!text || busy) return;
    busy = true;
    send.disabled = true;
    state.messages.push({ role: 'user', content: text });
    state.messages = state.messages.slice(-MAX_SENT);
    save();
    bubble('mrc-user', text);
    input.value = '';
    var wait = bubble('mrc-bot mrc-typing', 'Yazıyor');
    fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: state.messages, sessionId: state.sid })
    })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { return { ok: r.ok, d: d }; }); })
      .then(function (x) {
        wait.remove();
        if (x.ok && typeof x.d.reply === 'string') {
          state.messages.push({ role: 'assistant', content: x.d.reply });
          state.messages = state.messages.slice(-MAX_SENT);
          save();
          bubble('mrc-bot', x.d.reply);
        } else {
          state.messages.pop(); // başarısız soruyu geçmişten çıkar; yeniden denenebilir
          save();
          bubble('mrc-err', x.d.error || GENERIC_ERROR);
        }
      })
      .catch(function () {
        wait.remove();
        state.messages.pop();
        save();
        bubble('mrc-err', GENERIC_ERROR);
      })
      .then(function () { busy = false; send.disabled = false; input.focus(); });
  }

  // ---- aç/kapat + odak yönetimi ----
  function open() {
    panel.hidden = false;
    fab.setAttribute('aria-expanded', 'true');
    input.focus();
  }
  function close() {
    panel.hidden = true;
    fab.setAttribute('aria-expanded', 'false');
    fab.focus();
  }
  fab.addEventListener('click', function () { panel.hidden ? open() : close(); });
  closeBtn.addEventListener('click', close);
  form.addEventListener('submit', function (e) { e.preventDefault(); ask(input.value); });
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); ask(input.value); }
  });
  panel.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { e.stopPropagation(); close(); return; }
    if (e.key !== 'Tab') return;
    var items = panel.querySelectorAll('button:not([disabled]), textarea, a[href]');
    if (!items.length) return;
    var first = items[0], lastEl = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); lastEl.focus(); }
    else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); first.focus(); }
  });

  restore();
})();
