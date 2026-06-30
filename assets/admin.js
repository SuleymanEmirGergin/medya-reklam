/* ==========================================================================
   Medya Reklam — Admin Paneli mantığı
   Veriyi assets/store.js üzerinden okur/yazar (şimdilik localStorage).
   ========================================================================== */
(function () {
  'use strict';

  /* ---- GEÇİCİ şifre — Supabase Auth gelince kaldırılacak --------------- */
  var ADMIN_PW = 'medya2024';
  var SESSION_KEY = 'MEDYA_ADMIN_OK';

  /* ---- Bölüm tanımları -------------------------------------------------- */
  var SECTIONS = {
    gallery:      { title: 'İşler / Galeri', addLabel: 'Yeni İş',   single: 'İş' },
    stats:        { title: 'İstatistikler',  addLabel: 'Yeni Sayı', single: 'İstatistik' },
    videos:       { title: 'Videolar',       addLabel: 'Yeni Video', single: 'Video' },
    testimonials: { title: 'Yorumlar',       addLabel: 'Yeni Yorum', single: 'Yorum' },
    genel:        { title: 'Sayfa & Ayarlar', addLabel: null }
  };

  var FIELDS = {
    gallery: [
      { key: 'image',    label: 'Görsel',            type: 'image' },
      { key: 'title',    label: 'Başlık',            type: 'text', required: true, ph: 'Örn. D-Diamond' },
      { key: 'subtitle', label: 'Alt başlık (tür)',  type: 'text', ph: 'Örn. Işıklı Kutu Harf' },
      { key: 'category', label: 'Kategori',          type: 'category' }
    ],
    stats: [
      { key: 'number', label: 'Değer',           type: 'text', required: true, ph: '2.500' },
      { key: 'em',     label: 'Ek işaret (örn. +)', type: 'text', ph: '+' },
      { key: 'label',  label: 'Açıklama',         type: 'text', required: true, ph: 'tamamlanan proje' }
    ],
    videos: [
      { key: 'src',      label: 'Video dosyası / URL', type: 'text', required: true, ph: 'assets/video/video-1.mp4' },
      { key: 'title',    label: 'Başlık',              type: 'text', required: true },
      { key: 'subtitle', label: 'Alt başlık',          type: 'text' }
    ],
    testimonials: [
      { key: 'quote', label: 'Yorum metni', type: 'textarea', required: true },
      { key: 'name',  label: 'İsim',        type: 'text', required: true, ph: 'Mehmet K.' },
      { key: 'role',  label: 'Ünvan / konum', type: 'text', ph: 'Restoran Sahibi · Kağıthane' },
      { key: 'stars', label: 'Puan',        type: 'stars' }
    ]
  };

  /* ---- Durum ------------------------------------------------------------ */
  var content = null;
  var currentSection = 'gallery';
  var galleryFilter = 'all';
  var editing = { section: null, id: null };
  var dragState = { section: null, from: -1 };

  /* ---- Kısa yollar ------------------------------------------------------ */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function findIndex(arr, id) { for (var i = 0; i < arr.length; i++) if (arr[i].id === id) return i; return -1; }

  /* ======================================================================
     GİRİŞ
     ====================================================================== */
  function isAuthed() { try { return sessionStorage.getItem(SESSION_KEY) === '1'; } catch (e) { return false; } }

  function showApp() {
    $('#login').classList.add('is-hidden');
    $('#admin').hidden = false;
    if (!content) loadAndRender();
  }

  function initLogin() {
    var form = $('#loginForm'), pw = $('#pw'), err = $('#loginErr');
    var emailWrap = $('#emailField'), email = $('#email');
    var sbMode = !!(window.Store && Store.isSupabase && Store.isSupabase());
    if (sbMode && emailWrap) emailWrap.hidden = false;   // Supabase: e-posta alanını göster
    if (sbMode) { var hintEl = $('.login__hint'); if (hintEl) hintEl.hidden = true; }  // geçici şifre ipucunu gizle
    if (sbMode) {  // Supabase bağlı: "yapılacak / önizleme" metinlerini güncel durumla değiştir
      var lead = $('#loginLead'); if (lead) lead.textContent = 'E-posta ve şifrenizle giriş yapın.';
      var dbT = $('#dbCardTitle'); if (dbT) dbT.textContent = 'Veritabanı: Supabase (Canlı) ✓';
      var dbS = $('#dbCardSub'); if (dbS) dbS.textContent = 'Panel canlı Supabase veritabanına bağlı.';
      var dbN = $('#dbCardNote'); if (dbN) dbN.innerHTML = 'Kaydettiğin içerik <strong>anında tüm ziyaretçilere</strong> yansır. İlk kurulumda aşağıdaki <strong>“Varsayılana Dön”</strong> ile mevcut içeriği Supabase’e bir kez tohumla, sonra düzenle.';
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (sbMode) {
        var btn = form.querySelector('button[type="submit"]');
        if (btn) btn.disabled = true;
        Store.signIn((email && email.value || '').trim(), pw.value)
          .then(function () { err.classList.remove('show'); showApp(); })
          .catch(function () { err.classList.add('show'); pw.value = ''; pw.focus(); })
          .then(function () { if (btn) btn.disabled = false; });
      } else if (pw.value === ADMIN_PW) {
        try { sessionStorage.setItem(SESSION_KEY, '1'); } catch (e2) {}
        err.classList.remove('show');
        showApp();
      } else {
        err.classList.add('show'); pw.value = ''; pw.focus();
      }
    });
    $('#logout').addEventListener('click', function (e) {
      e.preventDefault();
      if (sbMode && Store.signOut) { Store.signOut().then(function () { location.reload(); }); return; }
      try { sessionStorage.removeItem(SESSION_KEY); } catch (e2) {}
      location.reload();
    });
  }

  /* ======================================================================
     YÜKLE + ÇİZ
     ====================================================================== */
  function loadAndRender() {
    Store.getContent().then(function (c) {
      content = c;
      renderAll();
    });
  }

  function save(msg) {
    return Store.saveContent(content).then(function () {
      if (msg) toast(msg, 'ok');
    }).catch(function () { toast('Kaydedilemedi', 'err'); });
  }

  function renderAll() {
    renderGalleryFilter();
    renderSection('gallery');
    renderSection('stats');
    renderSection('videos');
    renderSection('testimonials');
    renderHero();
  }

  /* ---- Galeri kategori filtresi ---------------------------------------- */
  function renderGalleryFilter() {
    var wrap = $('#galleryFilter');
    var cats = [{ value: 'all', label: 'Tümü' }].concat(Store.CATEGORIES);
    wrap.innerHTML = cats.map(function (c) {
      return '<button class="chip' + (galleryFilter === c.value ? ' is-active' : '') +
        '" data-f="' + esc(c.value) + '">' + esc(c.label) + '</button>';
    }).join('');
    $all('.chip', wrap).forEach(function (b) {
      b.addEventListener('click', function () {
        galleryFilter = b.getAttribute('data-f');
        renderGalleryFilter();
        renderSection('gallery');
      });
    });
  }

  /* ---- Bölüm listesi ---------------------------------------------------- */
  function renderSection(section) {
    var list = $('#' + section + 'List');
    var count = $('#' + section + 'Count');
    var items = content[section] || [];

    var visible = items;
    if (section === 'gallery' && galleryFilter !== 'all') {
      visible = items.filter(function (it) { return it.category === galleryFilter; });
    }

    if (count) {
      count.textContent = section === 'gallery' && galleryFilter !== 'all'
        ? visible.length + ' / ' + items.length + ' kayıt'
        : items.length + ' kayıt';
    }

    if (!visible.length) {
      list.innerHTML = emptyState(section);
      return;
    }

    list.innerHTML = '';
    visible.forEach(function (item) {
      var realIndex = findIndex(items, item.id);
      list.appendChild(rowEl(section, item, realIndex, items.length));
    });
  }

  function emptyState(section) {
    var locked = section === 'gallery' && galleryFilter !== 'all';
    return '<div class="empty">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>' +
      (locked ? 'Bu kategoride kayıt yok.' : 'Henüz kayıt yok. Sağ üstten ekleyebilirsin.') +
      '</div>';
  }

  /* ---- Tek satır -------------------------------------------------------- */
  function rowEl(section, item, index, total) {
    var row = document.createElement('div');
    row.className = 'adm-row';
    row.setAttribute('draggable', section === 'gallery' && galleryFilter !== 'all' ? 'false' : 'true');
    row.dataset.index = index;
    row.dataset.id = item.id;

    var moveLocked = section === 'gallery' && galleryFilter !== 'all';

    // 1) Taşı
    var move = '<div class="adm-move">' +
      '<button data-move="up" ' + (index === 0 || moveLocked ? 'disabled' : '') + ' aria-label="Yukarı"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="m6 15 6-6 6 6"/></svg></button>' +
      '<button data-move="down" ' + (index === total - 1 || moveLocked ? 'disabled' : '') + ' aria-label="Aşağı"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="m6 9 6 6 6-6"/></svg></button>' +
      '</div>';

    // 2) Medya / rozet
    var media = '';
    if (section === 'gallery') {
      media = '<img class="adm-thumb" src="' + esc(item.image) + '" alt="" loading="lazy" onerror="this.style.opacity=0.25" />';
    } else if (section === 'videos') {
      media = '<div class="adm-thumb adm-thumb--video"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m10 8 6 4-6 4z"/><rect x="3" y="4" width="18" height="16" rx="2"/></svg></div>';
    } else if (section === 'stats') {
      media = '<div class="adm-thumb adm-thumb--video" style="font-family:var(--serif);font-size:1.25rem;color:var(--ink);font-weight:600;">' + esc(item.number) + '<em style="color:var(--accent);font-style:normal;">' + esc(item.em || '') + '</em></div>';
    } else { // testimonials → baş harfler
      var initials = (item.name || '?').trim().split(/\s+/).map(function (w) { return w.charAt(0); }).join('').slice(0, 2).toUpperCase();
      media = '<div class="adm-thumb adm-thumb--video" style="font-family:var(--serif);font-size:1.2rem;color:var(--ink);">' + esc(initials) + '</div>';
    }

    // 3) Gövde
    var body = '<div class="adm-body">';
    if (section === 'gallery' || section === 'videos') {
      body += '<b>' + esc(item.title) + '</b><span>' + esc(item.subtitle || '') + '</span>';
    } else if (section === 'stats') {
      body += '<b>' + esc(item.number) + esc(item.em || '') + '</b><span>' + esc(item.label) + '</span>';
    } else {
      body += '<div class="quote">' + esc(item.quote) + '</div><span>' + esc(item.name) + (item.role ? ' — ' + esc(item.role) : '') + '</span>';
    }
    body += '</div>';

    // 4) Meta
    var meta = '<span>';
    if (section === 'gallery') meta = '<span class="adm-cat">' + esc(Store.catLabel(item.category)) + '</span>';
    else if (section === 'testimonials') {
      var n = Math.max(0, Math.min(5, parseInt(item.stars, 10) || 0));
      meta = '<span class="adm-stars">' + new Array(n + 1).join('★') + '</span>';
    } else meta += '</span>';

    // 5) Aksiyonlar
    var acts = '<div class="adm-acts">' +
      '<button class="icon-btn" data-act="edit" aria-label="Düzenle"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z"/></svg></button>' +
      '<button class="icon-btn icon-btn--danger" data-act="del" aria-label="Sil"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg></button>' +
      '</div>';

    row.innerHTML = move + media + body + meta + acts;

    // olaylar
    row.querySelector('[data-act="edit"]').addEventListener('click', function () { openEditor(section, item.id); });
    row.querySelector('[data-act="del"]').addEventListener('click', function () { delItem(section, item.id); });
    var up = row.querySelector('[data-move="up"]'), down = row.querySelector('[data-move="down"]');
    if (up) up.addEventListener('click', function () { moveItem(section, index, -1); });
    if (down) down.addEventListener('click', function () { moveItem(section, index, 1); });

    attachDrag(row, section);
    return row;
  }

  /* ---- Sürükle-bırak ---------------------------------------------------- */
  function attachDrag(row, section) {
    row.addEventListener('dragstart', function () {
      dragState.section = section; dragState.from = parseInt(row.dataset.index, 10);
      row.classList.add('is-dragging');
    });
    row.addEventListener('dragend', function () {
      row.classList.remove('is-dragging');
      $all('.drop-target').forEach(function (r) { r.classList.remove('drop-target'); });
    });
    row.addEventListener('dragover', function (e) {
      if (dragState.section !== section) return;
      e.preventDefault();
      row.classList.add('drop-target');
    });
    row.addEventListener('dragleave', function () { row.classList.remove('drop-target'); });
    row.addEventListener('drop', function (e) {
      if (dragState.section !== section) return;
      e.preventDefault();
      var to = parseInt(row.dataset.index, 10);
      reorder(section, dragState.from, to);
    });
  }

  function reorder(section, from, to) {
    if (from === to || from < 0 || to < 0) return;
    var arr = content[section];
    var moved = arr.splice(from, 1)[0];
    arr.splice(to, 0, moved);
    save('Sıralama güncellendi');
    renderSection(section);
  }

  function moveItem(section, index, dir) {
    var to = index + dir;
    var arr = content[section];
    if (to < 0 || to >= arr.length) return;
    var tmp = arr[index]; arr[index] = arr[to]; arr[to] = tmp;
    save();
    renderSection(section);
  }

  function delItem(section, id) {
    var arr = content[section];
    var i = findIndex(arr, id);
    if (i < 0) return;
    var name = arr[i].title || arr[i].name || arr[i].label || 'kayıt';
    if (!confirm('"' + name + '" silinsin mi? Bu işlem geri alınamaz.')) return;
    arr.splice(i, 1);
    save('Silindi');
    renderSection(section);
  }

  /* ======================================================================
     ÇEKMECE (ekle / düzenle)
     ====================================================================== */
  function openEditor(section, id) {
    editing.section = section;
    editing.id = id;
    var isNew = !id;
    var arr = content[section] || [];
    var item = isNew ? {} : arr[findIndex(arr, id)] || {};

    $('#drawerTitle').textContent = (isNew ? 'Yeni ' : '') + SECTIONS[section].single + (isNew ? '' : ' · Düzenle');
    var form = $('#drawerForm');
    form.innerHTML = FIELDS[section].map(function (f) { return fieldHTML(f, item[f.key]); }).join('');
    wireFieldWidgets(form);

    $('#drawer').classList.add('is-open');
    var first = form.querySelector('input,textarea,select');
    if (first) setTimeout(function () { first.focus(); }, 320);
  }

  function closeDrawer() {
    $('#drawer').classList.remove('is-open');
    editing.section = null; editing.id = null;
  }

  function fieldHTML(f, value) {
    value = value == null ? '' : value;
    if (f.type === 'text' || f.type === 'number') {
      return field(f.label,
        '<input type="' + (f.type === 'number' ? 'number' : 'text') + '" name="' + f.key + '" value="' + esc(value) + '"' +
        (f.ph ? ' placeholder="' + esc(f.ph) + '"' : '') + ' />');
    }
    if (f.type === 'textarea') {
      return field(f.label, '<textarea name="' + f.key + '" style="min-height:110px;">' + esc(value) + '</textarea>');
    }
    if (f.type === 'category') {
      var opts = Store.CATEGORIES.map(function (c) {
        return '<option value="' + esc(c.value) + '"' + (value === c.value ? ' selected' : '') + '>' + esc(c.label) + '</option>';
      }).join('');
      return field(f.label, '<select name="' + f.key + '">' + opts + '</select>');
    }
    if (f.type === 'stars') {
      var n = parseInt(value, 10); if (!(n >= 1 && n <= 5)) n = 5;
      var stars = '';
      for (var i = 1; i <= 5; i++) stars += '<button type="button" class="starbtn" data-v="' + i + '" style="font-size:1.6rem;line-height:1;color:' + (i <= n ? '#E3AD2E' : 'var(--line)') + ';padding:0 2px;">★</button>';
      return field(f.label, '<div class="stars-pick" style="display:flex;gap:2px;">' + stars + '</div><input type="hidden" name="stars" value="' + n + '" />');
    }
    if (f.type === 'image') {
      var opts2 = '<option value="">— Hazır görsel seç —</option>' + Store.KNOWN_IMAGES.map(function (p) {
        return '<option value="' + esc(p) + '"' + (value === p ? ' selected' : '') + '>' + esc(p.replace('assets/img/', '')) + '</option>';
      }).join('');
      var hasImg = value ? ' style="background-image:url(\'' + String(value).replace(/'/g, '%27') + '\')"' : '';
      return field(f.label,
        '<div class="imgpick">' +
          '<div class="imgpick__preview" id="imgPreview"' + hasImg + '>' + (value ? '' : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>') + '</div>' +
          '<div class="imgpick__controls">' +
            '<select id="imgSelect">' + opts2 + '</select>' +
            '<div class="imgpick__or">veya</div>' +
            '<input type="text" id="imgUrl" placeholder="Görsel yolu / URL" value="' + esc(value) + '" />' +
            '<button type="button" class="btn btn--ghost btn--block file-btn">Bilgisayardan Yükle<input type="file" id="imgFile" accept="image/*" /></button>' +
          '</div>' +
        '</div>' +
        '<input type="hidden" name="image" id="imgValue" value="' + esc(value) + '" />');
    }
    return '';
  }

  function field(label, inner) {
    return '<div class="field"><label>' + esc(label) + '</label>' + inner + '</div>';
  }

  function wireFieldWidgets(form) {
    // Yıldız seçici
    $all('.stars-pick', form).forEach(function (wrap) {
      var hidden = wrap.parentNode.querySelector('input[name="stars"]');
      $all('.starbtn', wrap).forEach(function (b) {
        b.addEventListener('click', function () {
          var v = parseInt(b.getAttribute('data-v'), 10);
          hidden.value = v;
          $all('.starbtn', wrap).forEach(function (x) {
            x.style.color = parseInt(x.getAttribute('data-v'), 10) <= v ? '#E3AD2E' : 'var(--line)';
          });
        });
      });
    });

    // Görsel seçici
    var sel = $('#imgSelect', form), url = $('#imgUrl', form), file = $('#imgFile', form),
        hidden = $('#imgValue', form), prev = $('#imgPreview', form);
    if (!hidden) return;
    function setImg(v) {
      hidden.value = v || '';
      if (url) url.value = v || '';
      if (prev) {
        if (v) { prev.style.backgroundImage = "url('" + String(v).replace(/'/g, '%27') + "')"; prev.innerHTML = ''; }
        else { prev.style.backgroundImage = ''; prev.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>'; }
      }
    }
    if (sel) sel.addEventListener('change', function () { if (sel.value) setImg(sel.value); });
    if (url) url.addEventListener('input', function () { setImg(url.value); if (sel) sel.value = ''; });
    if (file) file.addEventListener('change', function () {
      var f = file.files && file.files[0];
      if (!f) return;
      if (f.size > 3 * 1024 * 1024) { toast('Görsel 3MB altında olmalı (önizleme)', 'err'); return; }
      var reader = new FileReader();
      reader.onload = function () { setImg(reader.result); if (sel) sel.value = ''; };
      reader.readAsDataURL(f);
    });
  }

  function saveDrawer() {
    var section = editing.section;
    if (!section) return;
    var form = $('#drawerForm');
    var fields = FIELDS[section];
    var obj = {};
    for (var i = 0; i < fields.length; i++) {
      var f = fields[i];
      var input = form.elements[f.key];
      var val = input ? String(input.value).trim() : '';
      if (f.required && !val) {
        toast(f.label + ' zorunlu', 'err');
        if (input && input.focus) input.focus();
        return;
      }
      obj[f.key] = (f.key === 'stars') ? (parseInt(val, 10) || 5) : val;
    }

    var arr = content[section];
    if (editing.id) {
      var idx = findIndex(arr, editing.id);
      if (idx >= 0) arr[idx] = Object.assign({}, arr[idx], obj);
    } else {
      obj.id = Store.genId();
      arr.push(obj);
    }
    save(editing.id ? 'Güncellendi' : 'Eklendi');
    renderSection(section);
    closeDrawer();
  }

  /* ======================================================================
     SAYFA BAŞLIĞI (hero)
     ====================================================================== */
  function renderHero() {
    $('#heroTitle').value = content.site.heroTitle || '';
    $('#heroDesc').value = content.site.heroDesc || '';
  }

  /* ======================================================================
     GEZİNME
     ====================================================================== */
  function setPanel(section) {
    currentSection = section;
    $all('.aside__link[data-panel]').forEach(function (a) {
      a.classList.toggle('is-active', a.getAttribute('data-panel') === section);
    });
    $all('.panel').forEach(function (p) { p.classList.remove('is-active'); });
    $('#panel-' + section).classList.add('is-active');
    $('#panelTitle').textContent = SECTIONS[section].title;

    var addBtn = $('#addBtn');
    if (SECTIONS[section].addLabel) {
      addBtn.style.display = '';
      $('#addBtnLabel').textContent = SECTIONS[section].addLabel;
    } else {
      addBtn.style.display = 'none';
    }
    $('#admin').classList.remove('nav-open');
  }

  /* ======================================================================
     YEDEK / İÇE-DIŞA AKTAR / SIFIRLA
     ====================================================================== */
  function exportContent() {
    var blob = new Blob([Store.exportJSON()], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'medya-icerik.json';
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 100);
    toast('Dışa aktarıldı', 'ok');
  }

  function importContent(file) {
    var reader = new FileReader();
    reader.onload = function () {
      Store.importJSON(reader.result).then(function (c) {
        content = c; renderAll();
        toast('İçe aktarıldı', 'ok');
      }).catch(function () { toast('Dosya okunamadı', 'err'); });
    };
    reader.readAsText(file);
  }

  function resetAll() {
    if (!confirm('Tüm içerik başlangıç haline sıfırlanacak. Emin misin?')) return;
    Store.resetToDefaults().then(function (c) {
      content = c; renderAll();
      toast('Sıfırlandı', 'ok');
    });
  }

  /* ======================================================================
     TOAST
     ====================================================================== */
  var okIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M20 6 9 17l-5-5"/></svg>';
  var errIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>';
  function toast(msg, type) {
    var t = document.createElement('div');
    t.className = 'toast toast--' + (type === 'err' ? 'err' : 'ok');
    t.innerHTML = (type === 'err' ? errIcon : okIcon) + '<span>' + esc(msg) + '</span>';
    $('#toasts').appendChild(t);
    requestAnimationFrame(function () { t.classList.add('show'); });
    setTimeout(function () {
      t.classList.remove('show');
      setTimeout(function () { t.remove(); }, 300);
    }, 2500);
  }

  /* ======================================================================
     BAŞLAT
     ====================================================================== */
  function init() {
    initLogin();

    // Gezinme
    $all('.aside__link[data-panel]').forEach(function (a) {
      a.addEventListener('click', function (e) { e.preventDefault(); setPanel(a.getAttribute('data-panel')); });
    });
    $('#burger').addEventListener('click', function () { $('#admin').classList.toggle('nav-open'); });

    // Ekle butonu
    $('#addBtn').addEventListener('click', function () {
      if (SECTIONS[currentSection].addLabel) openEditor(currentSection, null);
    });

    // Çekmece
    $('#drawerSave').addEventListener('click', saveDrawer);
    $('#drawerForm').addEventListener('submit', function (e) { e.preventDefault(); saveDrawer(); });
    $all('[data-close]').forEach(function (el) { el.addEventListener('click', closeDrawer); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeDrawer(); });

    // Hero
    $('#heroForm').addEventListener('submit', function (e) {
      e.preventDefault();
      content.site.heroTitle = $('#heroTitle').value.trim();
      content.site.heroDesc = $('#heroDesc').value.trim();
      save('Sayfa başlığı kaydedildi');
    });

    // Yedek
    $('#exportBtn').addEventListener('click', exportContent);
    $('#importFile').addEventListener('change', function () { if (this.files[0]) importContent(this.files[0]); });
    $('#resetBtn').addEventListener('click', resetAll);

    // Hash ile bölüm
    var hash = (location.hash || '').replace('#', '');
    if (hash && SECTIONS[hash]) currentSection = hash;
    setPanel(currentSection);

    if (window.Store && Store.isSupabase && Store.isSupabase()) {
      Store.hasSession().then(function (ok) {
        if (ok) showApp();
        else ($('#email') || $('#pw')).focus();
      });
    } else if (isAuthed()) {
      showApp();
    } else {
      $('#pw').focus();
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
