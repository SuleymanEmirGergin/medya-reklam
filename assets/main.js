/* Eray Tabela — interactions
   Vanilla JS, no dependencies. Loaded with `defer`. */
(function () {
  'use strict';

  /* ---- Header: shadow/border on scroll ---------------------------------- */
  var header = document.querySelector('.site-header');
  function onScroll() {
    if (!header) return;
    header.classList.toggle('is-scrolled', window.scrollY > 8);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---- Mobile menu toggle ----------------------------------------------- */
  var toggle = document.querySelector('.nav__toggle');
  var menu = document.querySelector('.nav__menu');
  if (toggle && menu) {
    toggle.addEventListener('click', function () {
      var open = menu.classList.toggle('is-open');
      toggle.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      document.body.style.overflow = open ? 'hidden' : '';
    });
    // Close on link click (except dropdown parents)
    menu.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        menu.classList.remove('is-open');
        toggle.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      });
    });
  }

  /* ---- Mobile dropdown accordion ---------------------------------------- */
  document.querySelectorAll('.nav__item--has-drop > .nav__link').forEach(function (link) {
    link.addEventListener('click', function (e) {
      if (window.matchMedia('(max-width: 860px)').matches) {
        e.preventDefault();
        link.parentElement.classList.toggle('is-open');
      }
    });
  });

  /* ---- Scroll reveal (IntersectionObserver) ----------------------------- */
  var revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && revealEls.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('in'); });
  }

  /* ---- Accordion (policy / faq) ----------------------------------------- */
  document.querySelectorAll('.acc__head').forEach(function (head) {
    head.addEventListener('click', function () {
      var item = head.closest('.acc');
      var body = item.querySelector('.acc__body');
      var isOpen = item.classList.toggle('is-open');
      head.setAttribute('aria-expanded', String(isOpen));
      body.style.maxHeight = isOpen ? body.scrollHeight + 'px' : '0px';
    });
  });

  /* ---- Portfolio filter -------------------------------------------------- */
  var chips = document.querySelectorAll('.chip[data-filter]');
  var items = document.querySelectorAll('.folio__item[data-cat]');
  if (chips.length && items.length) {
    chips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        chips.forEach(function (c) { c.classList.remove('is-active'); });
        chip.classList.add('is-active');
        var f = chip.getAttribute('data-filter');
        items.forEach(function (it) {
          var show = f === 'all' || it.getAttribute('data-cat') === f;
          it.style.display = show ? '' : 'none';
        });
      });
    });
  }

  /* ---- Contact form → FormSubmit (AJAX, sayfada kalır) ------------------- */
  var form = document.querySelector('.form');
  if (form && form.getAttribute('action')) {
    var okMsg = form.querySelector('.form__ok');
    var errMsg = form.querySelector('.form__err');
    var submitBtn = form.querySelector('[type="submit"]');
    var btnHTML = submitBtn ? submitBtn.innerHTML : '';
    // .../formsubmit.co/EMAIL  →  .../formsubmit.co/ajax/EMAIL
    var endpoint = form.getAttribute('action').replace('formsubmit.co/', 'formsubmit.co/ajax/');

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (okMsg) okMsg.classList.remove('show');
      if (errMsg) errMsg.classList.remove('show');

      // Honeypot dolu ise sessizce çık (bot koruması)
      var honey = form.querySelector('[name="_honey"]');
      if (honey && honey.value) return;

      if (submitBtn) { submitBtn.disabled = true; submitBtn.innerHTML = 'Gönderiliyor…'; }

      fetch(endpoint, {
        method: 'POST',
        headers: { 'Accept': 'application/json' },
        body: new FormData(form)
      })
        .then(function (res) { return res.ok; })
        .then(function (ok) {
          if (ok) {
            window.location.href = 'tesekkurler.html';
          } else if (errMsg) {
            errMsg.classList.add('show');
          }
        })
        .catch(function () { if (errMsg) errMsg.classList.add('show'); })
        .finally(function () {
          if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = btnHTML; }
        });
    });
  }

  /* ---- Footer year ------------------------------------------------------- */
  var y = document.querySelector('[data-year]');
  if (y) y.textContent = new Date().getFullYear();

  /* ---- Mobil hızlı aksiyon barı (Ara · WhatsApp · Teklif) --------------- */
  (function () {
    if (document.querySelector('.mobile-cta')) return;
    var bar = document.createElement('nav');
    bar.className = 'mobile-cta';
    bar.setAttribute('aria-label', 'Hızlı işlemler');
    bar.innerHTML =
      '<a href="tel:+905324868260"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg>Ara</a>' +
      '<a class="is-wa" href="https://wa.me/905324868260" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M.06 24l1.69-6.16a11.87 11.87 0 0 1-1.59-5.95C.16 5.34 5.5 0 12.06 0a11.82 11.82 0 0 1 8.41 3.49 11.82 11.82 0 0 1 3.48 8.42c0 6.56-5.34 11.9-11.9 11.9a11.9 11.9 0 0 1-5.68-1.45L.06 24z"/></svg>WhatsApp</a>' +
      '<a class="is-primary" href="iletisim.html"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>Teklif</a>';
    document.body.appendChild(bar);
  })();

  /* ---- Çerez onayı ------------------------------------------------------- */
  (function () {
    try { if (localStorage.getItem('MEDYA_COOKIE_OK')) return; } catch (e) { return; }
    var bar = document.createElement('div');
    bar.className = 'cookie-consent';
    bar.setAttribute('role', 'dialog');
    bar.setAttribute('aria-label', 'Çerez bilgilendirmesi');
    bar.innerHTML =
      '<p>Bu sitede, hizmetin düzgün çalışması için gerekli çerezleri kullanıyoruz. Ayrıntılar için ' +
      '<a href="gizlilik.html">Gizlilik &amp; Çerez Politikası</a>.</p>' +
      '<div class="cookie-consent__actions"><button class="btn btn--primary" type="button" id="cookieOk">Anladım</button></div>';
    document.body.appendChild(bar);
    requestAnimationFrame(function () { bar.classList.add('show'); });
    document.getElementById('cookieOk').addEventListener('click', function () {
      try { localStorage.setItem('MEDYA_COOKIE_OK', '1'); } catch (e) {}
      bar.classList.remove('show');
      setTimeout(function () { if (bar.parentNode) bar.parentNode.removeChild(bar); }, 450);
    });
  })();
})();
