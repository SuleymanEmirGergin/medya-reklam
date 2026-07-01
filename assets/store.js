/* ==========================================================================
   Medya Reklam — İçerik Veri Katmanı (Store)
   --------------------------------------------------------------------------
   Portföy sayfasının ve admin panelinin OKUDUĞU/YAZDIĞI tek içerik kaynağı.

   Varsayılan: tarayıcı (localStorage).
   SUPABASE_URL + SUPABASE_KEY doldurulursa OTOMATİK olarak canlı Supabase
   veritabanına geçer (kütüphane gerektiğinde dinamik yüklenir; boşken hiç
   yüklenmez, hiçbir şeyi etkilemez).  Kurulum: SUPABASE-KURULUM.md

   Çağıran kod (admin.js / portfoy.html) hep `await Store.xxx()` kullanır;
   imzalar aynı kaldığı için onlarda değişiklik gerekmez.
   ========================================================================== */
(function (global) {
  'use strict';

  var LS_KEY = 'MEDYA_CONTENT_V1';

  /* ===== SUPABASE AYARLARI =================================================
     Aktif etmek için ikisini doldur (boşsa localStorage modu sürer).
     Bu değerler herkese açıktır (anon / publishable key).
     >>> GİZLİ service_role anahtarını BURAYA KOYMA. <<< */
  var SUPABASE_URL = 'https://noazvsxbhzuohnpxllgp.supabase.co';   // örn. 'https://xxxxx.supabase.co'
  var SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5vYXp2c3hiaHp1b2hucHhsbGdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3NDgwNTYsImV4cCI6MjA5ODMyNDA1Nn0.cX0cA1OIQRuclm9xBJoe0mJZXTyJMzjAkT0mieVlCEY';   // 'anon public' / 'publishable' anahtar
  var SB_TABLE  = 'site_content';
  var SB_ROW_ID = 1;

  var _client = null;
  function client() {
    if (!SUPABASE_URL || !SUPABASE_KEY) return null;
    if (!global.supabase || !global.supabase.createClient) return null;
    if (!_client) _client = global.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    return _client;
  }
  // Supabase JS kütüphanesini (yalnızca yapılandırılmışsa) gerektiğinde yükle.
  var _libPromise = null;
  function ensureLib() {
    if (!SUPABASE_URL || !SUPABASE_KEY) return Promise.resolve(null);
    var c = client();
    if (c) return Promise.resolve(c);
    if (_libPromise) return _libPromise;
    _libPromise = new Promise(function (resolve) {
      var s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
      s.async = true;
      s.onload = function () { resolve(client()); };
      s.onerror = function () { resolve(null); };
      document.head.appendChild(s);
    });
    return _libPromise;
  }
  function isSupabase() { return !!(SUPABASE_URL && SUPABASE_KEY); }

  /* ---- Kategoriler (galeri filtresi ile birebir) ----------------------- */
  var CATEGORIES = [
    { value: 'isikli', label: 'Işıklı Harf' },
    { value: 'arac',   label: 'Araç Giydirme' },
    { value: 'cephe',  label: 'Cephe' },
    { value: 'baski',  label: 'Dijital Baskı' },
    { value: 'uretim', label: 'Üretim' }
  ];

  /* ---- Bilinen görseller (assets/img içindeki dosyalar) ---------------- */
  /* Admin'deki "hazır görsel seç" listesi için. Yeni dosya eklediğinde
     buraya da ekleyebilirsin (zorunlu değil; URL/yükleme her zaman çalışır). */
  var KNOWN_IMAGES = [
    'arac-aktas-vinc.jpg','arac-aktas-vinc-2.jpg','arac-eminol-arka.jpg','arac-eminol-yan.jpg',
    'arac-golf.jpg','arac-nurpool.jpg','arac-nurpool-2.jpg','arac-okul-tasiti.jpg',
    'arac-otobus-ozkardesler.jpg','arac-otobus-ozkardesler-2.jpg','arac-otobus-ozkardesler-arka.jpg',
    'arac-skypool.jpg','arac-skypool-2.jpg','atolye.jpg','cephe-mahir.jpg','eczane-tabela.jpg',
    'f1-arac-16.jpg','f1-render.jpg','isikli-tabela-gece.jpg','kutu-harf-bigo.jpg',
    'kutu-harf-ddiamond.jpg','kutu-harf-ddiamond-2.jpg','kutu-harf-mavi-hayal.jpg','kutu-harf-vivo.jpg',
    'lightbox-ddiamond.jpg','lightbox-ddiamond-2.jpg','pano-petrol-ofisi.jpg','spor-araba.jpg',
    'cakiroglu-tuning.jpg','sinpas-is-modern.jpg','sinpas-kizilbuk-uretim.jpg','sinpas-isikli-pano.jpg',
    'sinpas-koru-aura.jpg','sinpas-karsilama.jpg','sinpas-yapi-tasarruf.jpg','yenikoy-isikli-harf.jpg',
    'kardesler-cam-vitrin.jpg','kizilbuk-wellness.jpg'
  ].map(function (f) { return 'assets/img/' + f; });

  /* ---- TOHUM VERİ (sitenin mevcut içeriği) ----------------------------- */
  function defaults() {
    return {
      site: {
        heroTitle: 'Portföy',
        heroDesc: 'Tamamladığımız işlerden bir seçki. Her proje keşifle başladı, görsel onayla şekillendi ve kendi ekibimizin montajıyla tamamlandı.'
      },
      stats: [
        { id: 's1', number: '2.500', em: '+', label: 'tamamlanan proje' },
        { id: 's2', number: '30',    em: '+', label: 'yıl tecrübe' },
        { id: 's3', number: 'İstanbul', em: '', label: 'geneli montaj' },
        { id: 's4', number: '81',    em: '', label: 'ile teslimat imkânı' }
      ],
      gallery: [
        { id: 'g1',  image: 'assets/img/isikli-tabela-gece.jpg',          title: 'Gece Işıklı Tabela', subtitle: 'Işıklı Bayrak Tabela', category: 'isikli' },
        { id: 'g2',  image: 'assets/img/kutu-harf-ddiamond.jpg',          title: 'D-Diamond',          subtitle: 'Işıklı Kutu Harf',     category: 'isikli' },
        { id: 'g3',  image: 'assets/img/arac-otobus-ozkardesler.jpg',     title: 'Özkardeşler Otobüs', subtitle: 'Araç Giydirme',        category: 'arac' },
        { id: 'g4',  image: 'assets/img/lightbox-ddiamond-2.jpg',         title: 'Lightbox Reklam',    subtitle: 'Dijital Baskı',        category: 'baski' },
        { id: 'g5',  image: 'assets/img/eczane-tabela.jpg',               title: 'Eczane Tabela',      subtitle: 'Işıklı Kutu Harf',     category: 'isikli' },
        { id: 'g6',  image: 'assets/img/kutu-harf-vivo.jpg',              title: 'Vivo',               subtitle: 'Işıklı Kutu Harf',     category: 'isikli' },
        { id: 'g7',  image: 'assets/img/cephe-mahir.jpg',                 title: 'Lokanta Cephe',      subtitle: 'Cephe Uygulama',       category: 'cephe' },
        { id: 'g8',  image: 'assets/img/arac-golf.jpg',                   title: 'VW Golf',            subtitle: 'Özel Araç Giydirme',   category: 'arac' },
        { id: 'g9',  image: 'assets/img/kutu-harf-bigo.jpg',              title: 'BIGO',               subtitle: 'Işıklı Kutu Harf',     category: 'isikli' },
        { id: 'g10', image: 'assets/img/kutu-harf-mavi-hayal.jpg',        title: 'Mavi Hayal Travel',  subtitle: 'Kutu Harf & Cam',      category: 'isikli' },
        { id: 'g11', image: 'assets/img/arac-nurpool-2.jpg',              title: 'Nurpool',            subtitle: 'Araç Giydirme',        category: 'arac' },
        { id: 'g12', image: 'assets/img/lightbox-ddiamond.jpg',           title: 'D-Diamond Lightbox', subtitle: 'Dijital Baskı',        category: 'baski' },
        { id: 'g13', image: 'assets/img/arac-skypool-2.jpg',              title: 'Skypool',            subtitle: 'Araç Giydirme',        category: 'arac' },
        { id: 'g14', image: 'assets/img/arac-eminol-yan.jpg',             title: 'Eminol Catering',    subtitle: 'Araç Giydirme',        category: 'arac' },
        { id: 'g15', image: 'assets/img/arac-otobus-ozkardesler-arka.jpg', title: 'Otobüs Arka',       subtitle: 'Araç Giydirme',        category: 'arac' },
        { id: 'g16', image: 'assets/img/arac-aktas-vinc.jpg',             title: 'Aktaş Vinç',         subtitle: 'Araç Giydirme',        category: 'arac' },
        { id: 'g17', image: 'assets/img/arac-okul-tasiti.jpg',            title: 'Okul Taşıtı',        subtitle: 'Folyo Uygulama',       category: 'arac' },
        { id: 'g18', image: 'assets/img/pano-petrol-ofisi.jpg',           title: 'Reklam Panosu',      subtitle: 'Dijital Baskı',        category: 'baski' },
        { id: 'g19', image: 'assets/img/f1-render.jpg',                   title: 'Petrol Ofisi F1',    subtitle: 'Araç Giydirme Tasarım', category: 'arac' },
        { id: 'g20', image: 'assets/img/spor-araba.jpg',                  title: 'Spor Araç',          subtitle: 'Araç Giydirme',        category: 'arac' },
        { id: 'g21', image: 'assets/img/atolye.jpg',                      title: 'Atölyemizden',       subtitle: 'Üretim',               category: 'uretim' },
        { id: 'g22', image: 'assets/img/arac-aktas-vinc-2.jpg',           title: 'Atölyede Uygulama',  subtitle: 'Araç Giydirme',        category: 'arac' },
        { id: 'g23', image: 'assets/img/cakiroglu-tuning.jpg',            title: 'Çakıroğlu Tuning',    subtitle: 'Cephe & Kutu Harf',        category: 'cephe' },
        { id: 'g24', image: 'assets/img/sinpas-is-modern.jpg',            title: 'Sinpaş İş Modern',    subtitle: 'Işıklı Kutu Harf',         category: 'isikli' },
        { id: 'g25', image: 'assets/img/sinpas-kizilbuk-uretim.jpg',      title: 'Sinpaş Kızılbük',     subtitle: 'Işıklı Kutu Harf Üretimi', category: 'isikli' },
        { id: 'g26', image: 'assets/img/sinpas-isikli-pano.jpg',          title: 'Sinpaş Işıklı Pano',  subtitle: 'Işıklı Pano & Lightbox',   category: 'baski' },
        { id: 'g27', image: 'assets/img/sinpas-koru-aura.jpg',            title: 'Sinpaş Koru Aura',    subtitle: 'Cephe & Kutu Harf',        category: 'cephe' },
        { id: 'g28', image: 'assets/img/sinpas-karsilama.jpg',            title: 'Sinpaş Karşılama',    subtitle: 'Kurumsal İç Mekan',        category: 'cephe' },
        { id: 'g29', image: 'assets/img/sinpas-yapi-tasarruf.jpg',        title: 'Sinpaş Yapı Tasarruf',subtitle: 'Cephe Giydirme',           category: 'cephe' },
        { id: 'g30', image: 'assets/img/yenikoy-isikli-harf.jpg',         title: '464 Yeniköy',         subtitle: 'Işıklı Ferforje Harf',     category: 'isikli' },
        { id: 'g31', image: 'assets/img/kardesler-cam-vitrin.jpg',        title: 'Kardeşler Cam',       subtitle: 'Vitrin & Cam Giydirme',    category: 'baski' },
        { id: 'g32', image: 'assets/img/kizilbuk-wellness.jpg',           title: 'Kızılbük Wellness',   subtitle: 'İç Mekan Işıklı',          category: 'isikli' }
      ],
      videos: [
        { id: 'v1', src: 'assets/video/video-1.mp4', poster: 'assets/img/arac-eminol-yan.jpg', title: 'Eminol Catering', subtitle: 'Araç Giydirme' },
        { id: 'v2', src: 'assets/video/video-2.mp4', poster: 'assets/img/f1-render.jpg',       title: 'Petrol Ofisi F1', subtitle: 'Araç Giydirme Tasarım' },
        { id: 'v3', src: 'assets/video/video-3.mp4', poster: 'assets/img/arac-golf.jpg',        title: 'VW Golf',          subtitle: 'Özel Araç Giydirme' },
        { id: 'v4', src: 'assets/video/video-4.mp4', poster: 'assets/img/f1-arac-16.jpg',       title: 'Petrol Ofisi F1', subtitle: 'Tasarım Render' }
      ],
      testimonials: [
        { id: 't1', stars: 5, quote: 'Işıklı kutu harf tabelamız söz verdikleri gün, kusursuz bir montajla yerindeydi. İşçilik son derece temiz; dükkân akşamları çok daha dikkat çekici oldu.', name: 'Mehmet K.', role: 'Restoran Sahibi · Kağıthane' },
        { id: 't2', stars: 5, quote: 'Araç filomuzun tamamını giydirdiler. Renkler tasarladığımız haliyle birebir çıktı, teslim süresine de eksiksiz uydular. İletişimleri çok hızlı.', name: 'Selin A.', role: 'Lojistik Firması · İstanbul' },
        { id: 't3', stars: 5, quote: 'Cephe tabelamızı baştan aşağı yenilediler; mağaza bambaşka göründü. Keşiften teslime kadar her aşamada bilgilendirildik.', name: 'Okan T.', role: 'Eczacı · Sarıyer' }
      ]
    };
  }

  /* ---- Yardımcılar ----------------------------------------------------- */
  function clone(obj) { return JSON.parse(JSON.stringify(obj)); }

  function genId() {
    return 'x' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  // Kayıtlı içeriği tohum veriyle birleştir (yeni alanlar eklense de bozulmasın)
  function merge(saved) {
    var base = defaults();
    if (!saved || typeof saved !== 'object') return base;
    return {
      site:         Object.assign({}, base.site, saved.site || {}),
      stats:        Array.isArray(saved.stats)        ? saved.stats        : base.stats,
      gallery:      Array.isArray(saved.gallery)      ? saved.gallery      : base.gallery,
      videos:       Array.isArray(saved.videos)       ? saved.videos       : base.videos,
      testimonials: Array.isArray(saved.testimonials) ? saved.testimonials : base.testimonials
    };
  }

  /* ======================================================================
     PUBLIC API  (Supabase modunda otomatik DB; değilse localStorage)
     ====================================================================== */

  // Tüm içeriği oku.
  function getContent() {
    return ensureLib().then(function (sb) {
      if (sb) {
        return sb.from(SB_TABLE).select('data').eq('id', SB_ROW_ID).maybeSingle()
          .then(function (res) {
            if (res.error) throw res.error;
            return merge(res.data ? res.data.data : null);
          });
      }
      try {
        var raw = global.localStorage.getItem(LS_KEY);
        return merge(raw ? JSON.parse(raw) : null);
      } catch (e) { return defaults(); }
    });
  }

  // Tüm içeriği kaydet.  Supabase modunda yalnızca giriş yapmış admin yazabilir (RLS).
  function saveContent(content) {
    return ensureLib().then(function (sb) {
      if (sb) {
        return sb.from(SB_TABLE)
          .upsert({ id: SB_ROW_ID, data: content, updated_at: new Date().toISOString() })
          .then(function (res) { if (res.error) throw res.error; return true; });
      }
      global.localStorage.setItem(LS_KEY, JSON.stringify(content));
      return true;
    });
  }

  // Tohum veriye dön (her şeyi sıfırla).
  function resetToDefaults() {
    var d = defaults();
    return ensureLib().then(function (sb) {
      if (sb) {
        return sb.from(SB_TABLE)
          .upsert({ id: SB_ROW_ID, data: d, updated_at: new Date().toISOString() })
          .then(function () { return d; });
      }
      try { global.localStorage.removeItem(LS_KEY); } catch (e) {}
      return d;
    });
  }

  /* ---- Supabase Auth (admin girişi) ------------------------------------ */
  function signIn(email, password) {
    return ensureLib().then(function (sb) {
      if (!sb) throw new Error('Supabase yapılandırılmadı.');
      return sb.auth.signInWithPassword({ email: email, password: password })
        .then(function (res) { if (res.error) throw res.error; return res.data; });
    });
  }
  function signOut() {
    return ensureLib().then(function (sb) { return sb ? sb.auth.signOut() : null; });
  }
  function hasSession() {
    return ensureLib().then(function (sb) {
      if (!sb) return false;
      return sb.auth.getSession().then(function (res) { return !!(res.data && res.data.session); });
    });
  }

  /* ---- Kolaylık: dışa/içe aktarma (yedek için, localStorage) ----------- */
  function exportJSON() {
    try {
      var raw = global.localStorage.getItem(LS_KEY);
      return raw || JSON.stringify(defaults(), null, 2);
    } catch (e) { return JSON.stringify(defaults(), null, 2); }
  }

  function importJSON(str) {
    return new Promise(function (resolve, reject) {
      try {
        var obj = merge(JSON.parse(str));
        global.localStorage.setItem(LS_KEY, JSON.stringify(obj));
        resolve(obj);
      } catch (e) { reject(e); }
    });
  }

  global.Store = {
    CATEGORIES: CATEGORIES,
    KNOWN_IMAGES: KNOWN_IMAGES,
    defaults: defaults,
    clone: clone,
    genId: genId,
    catLabel: function (v) {
      for (var i = 0; i < CATEGORIES.length; i++) if (CATEGORIES[i].value === v) return CATEGORIES[i].label;
      return v || '';
    },
    getContent: getContent,
    saveContent: saveContent,
    resetToDefaults: resetToDefaults,
    exportJSON: exportJSON,
    importJSON: importJSON,
    /* Supabase */
    isSupabase: isSupabase,
    signIn: signIn,
    signOut: signOut,
    hasSession: hasSession
  };

})(window);
