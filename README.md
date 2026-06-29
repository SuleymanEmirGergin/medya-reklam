# Medya Reklam — Kurumsal Web Sitesi

İstanbul / Kağıthane merkezli tabela ve reklam üretim firması **Medya Reklam** için statik web sitesi.
Işıklı harf, totem, kompozit cephe, araç giydirme ve dijital baskı çözümlerini tanıtır.

## Teknoloji
- Saf **HTML + CSS + Vanilla JS** (derleme adımı yok — statik site)
- Görseller WebP + JPEG (`<picture>` ile), responsive
- SEO: Open Graph/Twitter, canonical, `sitemap.xml`, `robots.txt`, JSON-LD (LocalBusiness, Service, FAQPage, BlogPosting, Breadcrumb)
- İçerik yönetimi: `admin.html` + `assets/store.js` (şu an `localStorage`; Supabase'e geçişe hazır)

## Yapı
- `index.html` — Ana sayfa
- `urunlerimiz.html`, `urun-*.html` — Ürün sayfaları
- `portfoy.html` — Portföy (galeri/video/yorumlar; `store.js`'ten dinamik)
- `rehber.html`, `rehber-*.html` — Blog / rehber yazıları
- `iletisim.html` — İletişim + teklif formu (FormSubmit)
- `hakkimizda.html`, `sirket-politikasi.html`, `gizlilik.html` (KVKK) — Kurumsal
- `404.html` — Hata sayfası
- `admin.html` — Yönetim paneli (içerik düzenleme)
- `assets/` — `styles.css`, `main.js`, `store.js`, `admin.*`, `img/`, `video/`

## Yayın (Vercel)
Statik site olduğu için derleme gerekmez. Vercel'de "Other / Static" olarak içe aktarın;
kök dizin doğrudan sunulur, `404.html` otomatik kullanılır.

## Yayın sonrası yapılacaklar
- İletişim formu: ilk gönderimde `info@medya-reklam.com` adresine gelen FormSubmit onay e-postasını tıklayın.
- `sitemap.xml`'i Google Search Console'a gönderin.
- Yayın alan adınız `www.medya-reklam.com` değilse, meta/sitemap/robots içindeki adresi güncelleyin.
- `admin.html` girişindeki geçici parola yalnızca demo amaçlıdır; gerçek güvenlik için Supabase Auth'a geçirin.
