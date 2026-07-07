# Medya Reklam — Kurumsal Web Sitesi

İstanbul / Kağıthane merkezli tabela ve reklam üretim firması **Medya Reklam** için statik web sitesi.
Işıklı harf, totem, kompozit cephe, araç giydirme ve dijital baskı çözümlerini tanıtır; işleri
portföy galerisinde sergiler ve teklif formuyla iletişim sağlar.

🌐 Yayın: **[www.medya-reklam.com](https://www.medya-reklam.com)**

## Teknoloji
- Saf **HTML + CSS + Vanilla JS** — derleme adımı yok, statik site
- Görseller WebP + JPEG (`<picture>` ile), responsive; tek font ailesi (Poppins)
- **İçerik yönetimi (CMS):** `admin.html` paneli + `assets/store.js` veri katmanı,
  **canlı Supabase** veritabanına bağlı (`site_content` tablosu). Panelden kaydedilen içerik
  tüm ziyaretçilere anında yansır. Kurulum ayrıntıları: [`SUPABASE-KURULUM.md`](SUPABASE-KURULUM.md)
- SEO: Open Graph / Twitter kartları, canonical, `sitemap.xml`, `robots.txt`,
  JSON-LD (LocalBusiness, Service, FAQPage, BlogPosting, Breadcrumb)

## Sayfa yapısı
- `index.html` — Ana sayfa (öne çıkan "işler" bölümü Supabase galerisinden beslenir)
- `urunlerimiz.html` + **27 adet** `urun-*.html` — Ürün / hizmet sayfaları
  (ışıklı harf, kutu harf, totem, cephe, araç giydirme, PPF, fuar standı, eczane tabelası…)
- `portfoy.html` — Portföy: galeri (32 iş), video ve müşteri yorumları — hepsi `store.js`'ten dinamik
- `rehber.html` + **10 adet** `rehber-*.html` — Blog / rehber yazıları
- `iletisim.html` — İletişim + teklif formu (FormSubmit → `info@medya-reklam.com`)
- `tesekkurler.html` — Form gönderimi sonrası teşekkür sayfası
- `hakkimizda.html`, `sirket-politikasi.html`, `gizlilik.html` (KVKK) — Kurumsal sayfalar
- `admin.html` — Yönetim paneli (galeri, video, yorum, istatistik ve iletişim bilgilerini düzenleme)
- `404.html` — Hata sayfası

## Klasörler
- `assets/styles.css` — Site geneli stiller
- `assets/main.js` — Site etkileşimleri (menü, galeri, form vb.)
- `assets/store.js` — İçerik veri katmanı (Supabase / localStorage)
- `assets/admin.css`, `assets/admin.js` — Yönetim paneli
- `assets/img/` — Görseller (WebP + JPEG)
- `assets/video/` — Portföy videoları

## Yönetim paneli (CMS)
`admin.html` üzerinden **giriş** yapılıp içerik düzenlenir:

- **Kimlik doğrulama:** Supabase Auth (gerçek e-posta + şifre oturumu).
- **Düzenlenebilir içerik:** portföy galerisi, videolar (kapak/poster dahil), müşteri yorumları,
  istatistik sayaçları ve iletişim bilgileri (telefon, e-posta, adres, Instagram, WhatsApp).
- **"Varsayılana Dön":** veritabanı boşsa veya sıfırlanmak istenirse mevcut site içeriği tohum
  veri olarak Supabase'e yazılır.
- **Güvenlik:** `anon` (public) anahtar herkese açıktır ve sorun değildir — yazma yetkisini Supabase
  **RLS** korur (okuma herkese açık, **yazma yalnızca giriş yapmış kullanıcıya**).
  Gizli `service_role` anahtarı ve DB şifresi **asla** repoya konmaz.
