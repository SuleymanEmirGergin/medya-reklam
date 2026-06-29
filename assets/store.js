/* ==========================================================================
   Medya Reklam — İçerik Veri Katmanı (Store)
   --------------------------------------------------------------------------
   Bu dosya, portföy sayfasının ve admin panelinin OKUDUĞU/YAZDIĞI tek
   içerik kaynağıdır. Şu an veriler tarayıcıda (localStorage) tutulur.

   >>> SUPABASE'E GEÇİŞ <<<
   Sayfaların hiçbirine dokunmadan, SADECE aşağıdaki 4 fonksiyonun içini
   değiştirerek canlı veritabanına geçebilirsin:
       Store.getContent()      -> SELECT ile tüm içeriği çek
       Store.saveContent(c)    -> UPSERT/DELETE ile kaydet
       Store.resetToDefaults() -> (opsiyonel) tohum veriyi geri yükle
   Fonksiyonlar zaten `async` (Promise döndürüyor); admin.js ve portfoy.html
   hep `await Store...` ile çağırıyor. Yani imza aynı kaldığı sürece
   çağrı yapan hiçbir kodu değiştirmen GEREKMEZ.

   Supabase örnek iskeleti (yorum satırı olarak en altta verildi).
   ========================================================================== */
(function (global) {
  'use strict';

  var LS_KEY = 'MEDYA_CONTENT_V1';

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
    'lightbox-ddiamond.jpg','lightbox-ddiamond-2.jpg','pano-petrol-ofisi.jpg','spor-araba.jpg'
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
        { id: 'g22', image: 'assets/img/arac-aktas-vinc-2.jpg',           title: 'Atölyede Uygulama',  subtitle: 'Araç Giydirme',        category: 'arac' }
      ],
      videos: [
        { id: 'v1', src: 'assets/video/video-1.mp4', title: 'Eminol Catering', subtitle: 'Araç Giydirme' },
        { id: 'v2', src: 'assets/video/video-2.mp4', title: 'Petrol Ofisi F1', subtitle: 'Araç Giydirme Tasarım' },
        { id: 'v3', src: 'assets/video/video-3.mp4', title: 'İç Mekan Neon',   subtitle: 'Işıklı Harf Tabela' },
        { id: 'v4', src: 'assets/video/video-4.mp4', title: 'Petrol Ofisi F1', subtitle: 'Tasarım Render' }
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
     PUBLIC API  (Supabase'e geçerken yalnızca buranın İÇİNİ değiştir)
     ====================================================================== */

  // Tüm içeriği oku.  Supabase: her tablodan SELECT yapıp aynı şekli döndür.
  function getContent() {
    try {
      var raw = global.localStorage.getItem(LS_KEY);
      return Promise.resolve(merge(raw ? JSON.parse(raw) : null));
    } catch (e) {
      return Promise.resolve(defaults());
    }
  }

  // Tüm içeriği kaydet.  Supabase: ilgili tablolara UPSERT + silinenler için DELETE.
  function saveContent(content) {
    try {
      global.localStorage.setItem(LS_KEY, JSON.stringify(content));
      return Promise.resolve(true);
    } catch (e) {
      return Promise.reject(e);
    }
  }

  // Tohum veriye dön (her şeyi sıfırla).
  function resetToDefaults() {
    try {
      global.localStorage.removeItem(LS_KEY);
      return Promise.resolve(defaults());
    } catch (e) {
      return Promise.resolve(defaults());
    }
  }

  /* ---- Kolaylık: dışa/içe aktarma (Supabase öncesi yedek için) --------- */
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
    importJSON: importJSON
  };

  /* ======================================================================
     SUPABASE İSKELETİ (hazır olduğunda yukarıdaki 3 fonksiyonun yerine koy)
     ----------------------------------------------------------------------
     1) <head>'e ekle:
        <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
     2) Bu dosyanın başında istemciyi oluştur:
        var sb = supabase.createClient('https://XXX.supabase.co', 'PUBLISHABLE_KEY');
     3) Önerilen tablolar: site_settings, stats, gallery, videos, testimonials
        (her birinde sort_order sütunu; gallery için image, title, subtitle, category).

     async function getContent() {
       var [site, stats, gallery, videos, testimonials] = await Promise.all([
         sb.from('site_settings').select('*').single(),
         sb.from('stats').select('*').order('sort_order'),
         sb.from('gallery').select('*').order('sort_order'),
         sb.from('videos').select('*').order('sort_order'),
         sb.from('testimonials').select('*').order('sort_order')
       ]);
       return {
         site: site.data || defaults().site,
         stats: stats.data || [],
         gallery: gallery.data || [],
         videos: videos.data || [],
         testimonials: testimonials.data || []
       };
     }

     async function saveContent(c) {
       // sort_order'ı diziye göre yeniden numarala, sonra her tabloya upsert et:
       c.gallery.forEach((r,i)=>r.sort_order=i);
       await sb.from('gallery').upsert(c.gallery);
       // ... diğer tablolar için de aynısı ...
       // (silinenleri yakalamak için: önce mevcut id'leri çek, c'de olmayanları DELETE et)
     }

     NOT: Yazma işlemleri (saveContent) sadece giriş yapmış admin için çalışmalı.
     Bunu Supabase Auth + Row Level Security (RLS) ile sağla:
       - gallery vb. tablolara herkese SELECT izni,
       - INSERT/UPDATE/DELETE yalnızca authenticated kullanıcıya.
     ====================================================================== */

})(window);
