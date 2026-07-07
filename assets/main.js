/* Eray Tabela — interactions
   Vanilla JS, no dependencies. Loaded with `defer`. */
(function () {
  'use strict';


  /* ---- Preloader Logic --------------------------------------------------- */
  document.addEventListener('DOMContentLoaded', function() {
    var preloader = document.getElementById('preloader');
    if (preloader) {
      setTimeout(function() {
        preloader.classList.add('is-hidden');
        // Remove from DOM after transition completes (500ms)
        setTimeout(function() {
          if (preloader.parentNode) preloader.parentNode.removeChild(preloader);
        }, 500);
      }, 1100); // kisa acilis — logo animasyonlari gorunecek kadar
    }
  });

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
          if (!entry.target.classList.contains('reveal-repeat')) {
            io.unobserve(entry.target);
          }
        } else {
          if (entry.target.classList.contains('reveal-repeat')) {
            entry.target.classList.remove('in');
          }
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

  /* ---- Scroll-linked Fade (Heading Texts) -------------------------------- */
  var scrollFadeEls = document.querySelectorAll('.scroll-fade-text');
  if (scrollFadeEls.length) {
    function updateScrollFades() {
      var wh = window.innerHeight;
      var fadeDistance = 300; 
      
      scrollFadeEls.forEach(function(el) {
        var rect = el.getBoundingClientRect();
        var opacity = 1;
        
        // Aşağıdan girerken
        if (rect.top > wh - fadeDistance) {
          opacity = (wh - rect.top) / fadeDistance;
        }
        // Yukarıdan çıkarken
        else if (rect.bottom < fadeDistance) {
          opacity = rect.bottom / fadeDistance;
        }

        opacity = Math.max(0, Math.min(1, opacity));
        el.style.opacity = opacity;
        
        // Soldan sağa yüklenme efekti (clip-path inset)
        var clipPercent = (1 - opacity) * 100;
        el.style.clipPath = 'inset(0 ' + clipPercent + '% 0 0)';
      });
    }
    window.addEventListener('scroll', updateScrollFades, { passive: true });
    updateScrollFades();
  }

  /* ---- Scroll Text Reveal (Gradient Fill) -------------------------------- */
  var scrollRevealEls = document.querySelectorAll('.scroll-reveal-text');
  if (scrollRevealEls.length) {
    function updateScrollReveals() {
      var wh = window.innerHeight;
      var fadeDistance = 400; // Biraz daha geniş bir alanda dolsun
      
      scrollRevealEls.forEach(function(el) {
        var rect = el.getBoundingClientRect();
        var opacity = 1;
        
        // Aşağıdan girerken
        if (rect.top > wh - fadeDistance) {
          opacity = (wh - rect.top) / fadeDistance;
        }
        // Yukarıdan çıkarken
        else if (rect.bottom < fadeDistance) {
          opacity = rect.bottom / fadeDistance;
        }

        opacity = Math.max(0, Math.min(1, opacity));
        el.style.setProperty('--reveal-pct', (opacity * 100) + '%');
      });
    }
    window.addEventListener('scroll', updateScrollReveals, { passive: true });
    updateScrollReveals();
  }

  /* ---- Statsband Scroll Animation ---------------------------------------- */
  var statsGrids = document.querySelectorAll('.statsband__grid');
  if (statsGrids.length) {
    function updateStatsAnimation() {
      var wh = window.innerHeight;
      
      statsGrids.forEach(function(grid) {
        var rect = grid.getBoundingClientRect();
        var items = grid.querySelectorAll(':scope > div');
        
        // Element is outside viewport
        if (rect.top > wh || rect.bottom < 0) {
          items.forEach(function(el) {
            el.style.opacity = 0;
            el.style.transform = 'translateY(50px)';
          });
          return;
        }

        // Calculate progress based on the STATIC parent container
        var totalDistance = wh + rect.height;
        var scrolled = wh - rect.top;
        var progress = scrolled / totalDistance; // 0 to 1
        
        var opacity = 1;
        var translateY = 0;

        // Opening phase: from progress 0.1 to 0.4 (when it comes into view from bottom)
        if (progress < 0.4) {
          var p = Math.max(0, (progress - 0.1) / 0.3); // 0 to 1
          opacity = p;
          translateY = 50 * (1 - p);
        }
        // Closing phase: from progress 0.6 to 0.9 (when it leaves from top)
        else if (progress > 0.6) {
          var p = Math.min(1, (progress - 0.6) / 0.3); // 0 to 1
          opacity = 1 - p;
          translateY = -50 * p;
        }
        
        opacity = Math.max(0, Math.min(1, opacity));
        
        items.forEach(function(el, index) {
          // Add a slight stagger effect based on index
          var staggerY = translateY;
          el.style.opacity = opacity;
          el.style.transform = 'translateY(' + staggerY + 'px)';
          el.style.setProperty('--reveal-pct', (opacity * 100) + '%');
        });
      });
    }
    window.addEventListener('scroll', updateStatsAnimation, { passive: true });
    updateStatsAnimation();
  }

  /* ---- Counters -------------------------------------------- */
  var scrollCounters = document.querySelectorAll('.scroll-counter');
  if (scrollCounters.length) {
    var countersObserver = new IntersectionObserver(function(entries, obs) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          var el = entry.target;
          var target = parseInt(el.getAttribute('data-target'), 10) || 0;
          var duration = 2000; // 2 saniye
          var startTime = null;
          
          function updateCount(timestamp) {
            if (!startTime) startTime = timestamp;
            var progress = Math.min((timestamp - startTime) / duration, 1);
            
            // easeOutExpo
            var easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
            var current = Math.floor(target * easeProgress);
            
            var formatted = current >= 1000 ? current.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") : current;
            el.innerHTML = formatted;
            
            if (progress < 1) {
              requestAnimationFrame(updateCount);
            } else {
              el.innerHTML = target >= 1000 ? target.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") : target;
            }
          }
          requestAnimationFrame(updateCount);
          obs.unobserve(el);
        }
      });
    }, { threshold: 0.1 });

    scrollCounters.forEach(function(el) {
      countersObserver.observe(el);
    });
  }

  /* ---- Hero Carousel ----------------------------------------------------- */
  var slides = document.querySelectorAll('.hero__slide');
  var dots = document.querySelectorAll('.hero__dot');
  if (slides.length > 0 && dots.length > 0) {
    var currentSlide = 0;
    var slideInterval;

    function showSlide(index) {
      slides.forEach(function(s) { s.classList.remove('is-active'); });
      dots.forEach(function(d) { d.classList.remove('is-active'); });
      slides[index].classList.add('is-active');
      dots[index].classList.add('is-active');
      currentSlide = index;
    }

    function nextSlide() {
      showSlide((currentSlide + 1) % slides.length);
    }

    function startSlideshow() {
      slideInterval = setInterval(nextSlide, 5000);
    }

    function resetSlideshow() {
      clearInterval(slideInterval);
      startSlideshow();
    }

    dots.forEach(function(dot, index) {
      dot.addEventListener('click', function() {
        showSlide(index);
        resetSlideshow();
      });
    });

    startSlideshow();
  }

  /* ---- LED Marquee scroll effect ----------------------------------------- */
  var ledTrack = document.querySelector('.ledmarquee__track');
  if (ledTrack) {
    var lastScrollY = window.scrollY;
    var targetRate = 1;
    var currentRate = 1;
    var rateAnimationActive = false;

    window.addEventListener('scroll', function () {
      var scrollY = window.scrollY;
      var deltaY = scrollY - lastScrollY;
      lastScrollY = scrollY;

      // Yukarı kaydırmak (deltaY < 0) -> Sağa hareket (negatif rate)
      // Aşağı kaydırmak (deltaY > 0) -> Sola hızlan (pozitif rate artışı)
      targetRate += deltaY * 0.05; // Hassasiyet ayarı

      if (targetRate > 25) targetRate = 25;
      if (targetRate < -25) targetRate = -25;
      
      if (!rateAnimationActive) {
        rateAnimationActive = true;
        updateRate();
      }
    }, { passive: true });

    function updateRate() {
      var animations = ledTrack.getAnimations();
      if (!animations || animations.length === 0) {
        rateAnimationActive = false;
        return;
      }
      var animation = animations[0];

      // Kaydırma bittiğinde yavaşça normal hıza (1) dön
      targetRate += (1 - targetRate) * 0.05;
      currentRate += (targetRate - currentRate) * 0.1;

      if (Math.abs(currentRate - 1) < 0.01 && Math.abs(targetRate - 1) < 0.01) {
          currentRate = 1;
          targetRate = 1;
      }

      animation.playbackRate = currentRate;
      
      if (currentRate !== 1 || targetRate !== 1) {
        requestAnimationFrame(updateRate);
      } else {
        rateAnimationActive = false;
      }
    }
  }

  /* ---- Yumuşak (soft) kaydırma — mouse tekerleği momentum efekti ---------
     Fare tekerleğiyle kaydırınca sayfa "zıplamadan" yumuşakça hedefe süzülür.
     Dokunmatik cihazlarda ve "hareketi azalt" tercihinde devre dışıdır.
     Ayar: SMOOTH küçük = daha yumuşak/uzun süzülme · STEP küçük = daha yavaş. */
  (function () {
    var fine = window.matchMedia('(pointer: fine)').matches;
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!fine || reduce) return; // dokunmatik / reduced-motion → yerel kaydırma

    var SMOOTH = 0.07;  // yumuşama katsayısı (0.06 çok yumuşak … 0.16 daha sıkı)
    var STEP   = 0.9;   // her tekerlek adımının mesafe çarpanı (<1 = daha yavaş)

    var docEl   = document.documentElement;
    var target  = window.scrollY || window.pageYOffset;
    var current = target;
    var running = false;

    function maxScroll() {
      return Math.max(0, docEl.scrollHeight - window.innerHeight);
    }
    function clamp(v) {
      var m = maxScroll();
      return v < 0 ? 0 : (v > m ? m : v);
    }

    function frame() {
      var diff = target - current;
      if (Math.abs(diff) < 0.5) {
        current = target;
        window.scrollTo({ top: current, behavior: 'instant' });
        running = false;
        return;
      }
      current += diff * SMOOTH;
      window.scrollTo({ top: current, behavior: 'instant' });
      requestAnimationFrame(frame);
    }
    function run() {
      if (!running) { running = true; requestAnimationFrame(frame); }
    }

    // İçteki kaydırılabilir alanlar (kendi scroll'u olan kutular) yerel kalsın
    function scrollableAncestor(node, dir) {
      while (node && node !== document.body && node !== docEl) {
        if (node.nodeType === 1 && node.scrollHeight > node.clientHeight) {
          var oy = getComputedStyle(node).overflowY;
          if (oy === 'auto' || oy === 'scroll') {
            if (dir < 0 && node.scrollTop > 0) return true;
            if (dir > 0 && node.scrollTop + node.clientHeight < node.scrollHeight - 1) return true;
          }
        }
        node = node.parentNode;
      }
      return false;
    }

    window.addEventListener('wheel', function (e) {
      // Zoom (Ctrl), yatay niyet, Shift+tekerlek → tarayıcıya bırak
      if (e.ctrlKey || e.shiftKey || e.defaultPrevented) return;
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      if (scrollableAncestor(e.target, e.deltaY)) return;
      if (maxScroll() <= 0) return; // kaydırılacak yer yok

      var delta = e.deltaY;
      if (e.deltaMode === 1) delta *= 40;                      // satır → px
      else if (e.deltaMode === 2) delta *= window.innerHeight; // sayfa → px

      e.preventDefault();
      if (!running) { current = target = window.scrollY || window.pageYOffset; }
      target = clamp(target + delta * STEP);
      run();
    }, { passive: false });

    // Klavye / kaydırma çubuğu / çapa linki ile kaydırınca motoru senkron tut
    window.addEventListener('scroll', function () {
      if (!running) { current = target = window.scrollY || window.pageYOffset; }
    }, { passive: true });

    window.addEventListener('resize', function () {
      target = clamp(target);
    }, { passive: true });
  })();

})();
  /* ---- About Slider ------------------------------------------------------- */
  var aboutSlider = document.getElementById('aboutSlider');
  if (aboutSlider) {
    var track = document.getElementById('aboutSliderTrack');
    var slides = aboutSlider.querySelectorAll('.about-slide');
    var dots = document.getElementById('aboutSliderDots').querySelectorAll('.about-dot');
    var currentSlide = 0;
    var sliderInterval;

    function goToSlide(index) {
      dots[currentSlide].classList.remove('is-active');
      currentSlide = index;
      dots[currentSlide].classList.add('is-active');
      track.style.transform = 'translateX(-' + (currentSlide * 100) + '%)';
    }

    function nextSlide() {
      var next = (currentSlide + 1) % slides.length;
      goToSlide(next);
    }

    function startSlider() {
      if (sliderInterval) clearInterval(sliderInterval);
      sliderInterval = setInterval(nextSlide, 4000);
    }

    dots.forEach(function (dot, index) {
      dot.addEventListener('click', function () {
        goToSlide(index);
        startSlider();
      });
    });

    startSlider();
  }

  /* ==========================================================================
     CMS: İletişim bilgileri (telefon/adres/e-posta/sosyal) — admin panelinden
     tüm sayfalara uygulanır. Hafif REST çağrısı (SDK yüklenmez); hata sayfayı bozmaz.
     ========================================================================== */
  (function () {
    var SB_URL = 'https://noazvsxbhzuohnpxllgp.supabase.co';
    var SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5vYXp2c3hiaHp1b2hucHhsbGdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3NDgwNTYsImV4cCI6MjA5ODMyNDA1Nn0.cX0cA1OIQRuclm9xBJoe0mJZXTyJMzjAkT0mieVlCEY';
    function digits(s){ return String(s == null ? '' : s).replace(/\D/g, ''); }
    function telHref(num){ var d = digits(num).replace(/^0/, ''); return d ? ('tel:+90' + d) : ''; }
    function looksLikePhone(t){ t = (t || '').trim(); return /^[\d\s()+.\-]+$/.test(t) && digits(t).length >= 7; }
    function applyContact(c){
      if(!c) return;
      try {
        Array.prototype.forEach.call(document.querySelectorAll('a[href^="tel:"]'), function(a){
          var isSecond = digits(a.getAttribute('href') || '').slice(-6) === '145264';
          var num = isSecond ? (c.phone2 || c.phone) : c.phone;
          if(!num) return;
          var h = telHref(num); if(h) a.setAttribute('href', h);
          if(looksLikePhone(a.textContent)) a.textContent = num;
        });
        if(c.email) Array.prototype.forEach.call(document.querySelectorAll('a[href^="mailto:"]'), function(a){
          a.setAttribute('href', 'mailto:' + c.email);
          if(/@/.test(a.textContent)) a.textContent = c.email;
        });
        var wa = digits(c.whatsapp) || digits(c.phone).replace(/^0/, '90');
        if(wa) Array.prototype.forEach.call(document.querySelectorAll('a[href*="wa.me/"]'), function(a){
          a.setAttribute('href', 'https://wa.me/' + wa);
        });
        if(c.instagram) Array.prototype.forEach.call(document.querySelectorAll('a[href*="instagram.com"]'), function(a){
          a.setAttribute('href', c.instagram);
        });
        if(c.address){
          var li = document.querySelector('.footer__contact li');
          if(li && li.lastChild && li.lastChild.nodeType === 3) li.lastChild.textContent = ' ' + c.address;
        }
      } catch(e){}
    }
    function applyProduct(products, pages){
      try {
        var slug = (location.pathname.split('/').pop() || '').replace(/\.html$/, '') || 'index';
        var p = (products && products[slug]) || (pages && pages[slug]);
        if(!p) return;
        Array.prototype.forEach.call(document.querySelectorAll('[data-cms-product]'), function(el){
          var k = el.getAttribute('data-cms-product');
          if(p[k] != null && p[k] !== '') el.textContent = p[k];
        });
      } catch(e){}
    }
    function run(){
      if(!document.querySelector('a[href^="tel:"], a[href^="mailto:"], .footer__contact')) return;
      try {
        fetch(SB_URL + '/rest/v1/site_content?id=eq.1&select=data', {
          headers: { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY }
        }).then(function(r){ return r.ok ? r.json() : null; })
          .then(function(rows){ var d = rows && rows[0] && rows[0].data; if(d){ applyContact(d.contact); applyProduct(d.products, d.pages); } })
          .catch(function(){});
      } catch(e){}
    }
    if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
    else run();
  })();
