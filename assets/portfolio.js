// Moved out of portfoy.html so the CSP can forbid inline scripts.
(function () {
  'use strict';

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /* ---- Render sonrası reveal animasyonu ----
     Görüş alanındakiler hemen görünür (içerik asla gizli kalmaz),
     alttakiler scroll ile açılır. */
  function revealIn(els) {
    function show(el) { el.classList.add('in'); }
    var vh = window.innerHeight || document.documentElement.clientHeight;
    els.forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.top < vh && r.bottom > 0) show(el);
    });
    var rest = els.filter(function (el) { return !el.classList.contains('in'); });
    if ('IntersectionObserver' in window && rest.length) {
      var io = new IntersectionObserver(function (ents) {
        ents.forEach(function (e) { if (e.isIntersecting) { show(e.target); io.unobserve(e.target); } });
      }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
      rest.forEach(function (el) { io.observe(el); });
    } else {
      rest.forEach(show);
    }
  }

  function setText(id, val) { var el = document.getElementById(id); if (el && val) el.textContent = val; }

  /* ---- İçeriği store'dan üret ---- */
  function renderStats(stats) {
    var g = document.getElementById('statsGrid'); if (!g || !stats || !stats.length) return;
    g.innerHTML = stats.map(function (s) {
      return '<div><div class="n">' + esc(s.number) + (s.em ? '<em>' + esc(s.em) + '</em>' : '') +
        '</div><div class="l">' + esc(s.label) + '</div></div>';
    }).join('');
  }

  function renderGallery(items) {
    var g = document.getElementById('folioGrid'); if (!g || !items || !items.length) return;
    g.innerHTML = items.map(function (it) {
      return '<div class="folio__item reveal" data-cat="' + esc(it.category) + '">' +
        (/\.jpg$/i.test(it.image) ? '<picture><source srcset="' + esc(it.image.replace(/\.jpg$/i, '.webp')) + '" type="image/webp" /><img src="' + esc(it.image) + '" alt="' + esc(it.title) + '" loading="lazy" /></picture>' : '<img src="' + esc(it.image) + '" alt="' + esc(it.title) + '" loading="lazy" />') +
        '<div class="folio__cap"><b>' + esc(it.title) + '</b><span>' + esc(it.subtitle || '') + '</span></div></div>';
    }).join('');
  }

  var VIDEO_POSTER_WEBP = {
    'assets/img/arac-eminol-yan.jpg': 'assets/img/arac-eminol-yan.webp',
    'assets/img/video-3-poster.jpg': 'assets/img/video-3-poster.webp',
    'assets/img/f1-render.jpg': 'assets/img/f1-render.webp'
  };

  function renderVideos(vids) {
    var g = document.getElementById('videoGrid'); if (!g || !vids || !vids.length) return;
    g.innerHTML = vids.map(function (v, i) {
      var poster = VIDEO_POSTER_WEBP[v.poster] || v.poster;
      return '<div class="video-item reveal"' + (i ? ' data-delay="' + i + '"' : '') + '>' +
        '<video class="videocard" controls preload="none" playsinline' + (poster ? ' poster="' + esc(poster) + '"' : '') + '><source src="' + esc(v.src) + '" type="video/mp4" /></video>' +
        '<div class="video-caption"><h3>' + esc(v.title) + '</h3><p>' + esc(v.subtitle || '') + '</p></div></div>';
    }).join('');
  }

  function renderTestimonials(ts) {
    var g = document.getElementById('testiGrid'); if (!g || !ts || !ts.length) return;
    g.innerHTML = ts.map(function (t, i) {
      var n = Math.max(0, Math.min(5, parseInt(t.stars, 10) || 5));
      return '<figure class="testimonial reveal"' + (i ? ' data-delay="' + i + '"' : '') + '>' +
        '<div class="testimonial__stars" aria-hidden="true">' + new Array(n + 1).join('★') + '</div>' +
        '<blockquote>"' + esc(t.quote) + '"</blockquote>' +
        '<figcaption><span>' + esc(t.role || '') + '</span></figcaption></figure>';
    }).join('');
  }

  /* ---- Filtre + Lightbox (render BİTTİKTEN sonra bağlanır) ---- */
  function setupGallery() {
    var items = Array.prototype.slice.call(document.querySelectorAll('.folio__item'));
    if (!items.length) return;

    var btns = document.querySelectorAll('.folio-filter__btn');
    btns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var f = btn.getAttribute('data-filter');
        btns.forEach(function (b) { b.classList.remove('is-active'); b.setAttribute('aria-pressed', 'false'); });
        btn.classList.add('is-active');
        btn.setAttribute('aria-pressed', 'true');
        items.forEach(function (it) {
          var show = f === 'all' || it.getAttribute('data-cat') === f;
          it.classList.toggle('is-hidden', !show);
          if (show) it.classList.add('in');
        });
      });
    });

    var lb = document.createElement('div');
    lb.className = 'lightbox';
    lb.setAttribute('role', 'dialog');
    lb.setAttribute('aria-modal', 'true');
    lb.setAttribute('aria-label', 'Proje görseli');
    lb.innerHTML =
      '<button class="lightbox__close" aria-label="Kapat">&times;</button>' +
      '<button class="lightbox__nav lightbox__prev" aria-label="Önceki">&#8249;</button>' +
      '<figure class="lightbox__stage"><img alt="" /><figcaption></figcaption></figure>' +
      '<button class="lightbox__nav lightbox__next" aria-label="Sonraki">&#8250;</button>';
    document.body.appendChild(lb);
    var lbImg = lb.querySelector('img');
    var lbCap = lb.querySelector('figcaption');
    var idx = -1;
    var opener = null;
    var closeBtn = lb.querySelector('.lightbox__close');

    function shown() { return items.filter(function (it) { return !it.classList.contains('is-hidden'); }); }
    function open(list, i) {
      idx = i;
      var it = list[i];
      var img = it.querySelector('img');
      var cap = it.querySelector('.folio__cap');
      lbImg.setAttribute('src', img.getAttribute('src'));
      lbImg.setAttribute('alt', img.getAttribute('alt') || '');
      lbCap.innerHTML = cap ? cap.innerHTML : '';
      if (!lb.classList.contains('is-open')) opener = document.activeElement;
      lb.classList.add('is-open');
      document.body.style.overflow = 'hidden';
      closeBtn.focus();
    }
    function close() {
      lb.classList.remove('is-open');
      document.body.style.overflow = '';
      lbImg.removeAttribute('src');
      if (opener && opener.focus) opener.focus();
      opener = null;
    }
    function step(d) {
      var list = shown();
      if (!list.length) return;
      open(list, (idx + d + list.length) % list.length);
    }
    items.forEach(function (it) {
      var im = it.querySelector('img');
      it.setAttribute('tabindex', '0');
      it.setAttribute('role', 'button');
      it.setAttribute('aria-label', (im && im.getAttribute('alt') || 'Proje') + ' — büyüt');
      function openIt() {
        var list = shown();
        open(list, list.indexOf(it));
      }
      it.addEventListener('click', openIt);
      it.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openIt(); }
      });
    });
    lb.querySelector('.lightbox__close').addEventListener('click', close);
    lb.querySelector('.lightbox__prev').addEventListener('click', function (e) { e.stopPropagation(); step(-1); });
    lb.querySelector('.lightbox__next').addEventListener('click', function (e) { e.stopPropagation(); step(1); });
    lb.addEventListener('click', function (e) { if (e.target === lb) close(); });
    document.addEventListener('keydown', function (e) {
      if (!lb.classList.contains('is-open')) return;
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowLeft') step(-1);
      else if (e.key === 'ArrowRight') step(1);
      else if (e.key === 'Tab') {
        var f = lb.querySelectorAll('button');
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
  }

  function boot() {
    if (!window.Store) { setupGallery(); return; }
    Store.getContent().then(function (c) {
      setText('pfTitle', c.site && c.site.heroTitle);
      setText('pfDesc', c.site && c.site.heroDesc);
      renderStats(c.stats);
      renderGallery(c.gallery);
      renderVideos(c.videos);
      renderTestimonials(c.testimonials);
      revealIn(Array.prototype.slice.call(document.querySelectorAll('.reveal:not(.in)')));
      setupGallery();
    }).catch(function () { setupGallery(); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
