# Supabase Kurulumu (Canlı Yönetim Paneli)

Bu adımları yapınca admin paneli (`admin.html`) **gerçek bir giriş** (e‑posta + şifre)
ile çalışır, kaydettiğin içerik **canlı veritabanına** yazılır ve **Portföy sayfası
tüm ziyaretçilere** bu içeriği gösterir. (Şu an yapılandırılmadığı için site
`localStorage` modunda — yani değişiklikler sadece senin tarayıcında kalır.)

> Kod tarafında her şey hazır. Sen sadece aşağıdaki 5 adımı yapıp 2 değeri
> `assets/store.js`'e yapıştıracaksın. **Supabase kütüphanesi yalnızca
> yapılandırıldığında otomatik yüklenir** — boşken hiçbir ek yük gelmez.

---

## 1) Proje oluştur
- https://supabase.com → giriş yap → **New project**.
- İsim: `medya-reklam`. Bölge (Region): **Frankfurt (EU Central)** (Türkiye'ye yakın).
- Bir veritabanı şifresi belirle (bu admin girişi değil; sadece Supabase'in kendi DB şifresi).

## 2) Tabloyu + güvenlik kurallarını oluştur
- Sol menü → **SQL Editor** → **New query**.
- Projedeki **`supabase-setup.sql`** dosyasının tamamını yapıştır → **Run**.
- "Success" görmelisin (tablo `site_content` + RLS kuralları oluştu).

## 3) Admin kullanıcısını oluştur
- Sol menü → **Authentication** → **Users** → **Add user** → **Create new user**.
- E‑posta + şifre gir (panele bununla gireceksin). **"Auto Confirm User"** işaretle
  (yoksa e‑posta doğrulaması ister).
- İstersen self‑servis kaydı kapat: **Authentication → Providers → Email** →
  "Allow new users to sign up" **kapalı** (sadece senin eklediğin kullanıcı girebilsin).

## 4) URL + anahtarı kopyala
- Sol menü → **Project Settings** (dişli) → **API**.
- **Project URL** ve **`anon` `public`** anahtarını kopyala.
  - ⚠️ **`service_role`** anahtarını ASLA kullanma/koyma — o gizli, tam yetkili.

## 5) store.js'e yapıştır
`assets/store.js` dosyasının en üstündeki şu iki satırı doldur:

```js
var SUPABASE_URL = 'https://xxxxx.supabase.co';   // Project URL
var SUPABASE_KEY = 'eyJhbGciOi...';                // anon public key
```

Kaydet, deploy et (veya yerelde yenile). Bitti. ✅

---

## İlk içerik
İlk girişte veritabanı boşsa, admin panelde **"Varsayılana Dön"** (reset) dersen
mevcut site içeriği tohum veri olarak Supabase'e yazılır. Sonra düzenleyip kaydet.

## Nasıl çalışıyor / güvenlik
- `anon` anahtar herkese açıktır — **sorun değil.** Yazma yetkisini **RLS** koruyor:
  okuma herkese açık, **yazma yalnızca giriş yapmış kullanıcıya**.
- Giriş `Supabase Auth` ile (gerçek oturum). `admin.js`'teki geçici `medya2024`
  şifresi yalnızca Supabase yapılandırılmadığında devreye girer; yapılandırınca
  otomatik devre dışı kalır.
- **Görseller/videolar** kodda `assets/` içinde kalır; Supabase yalnızca
  metin/liste içeriğini tutar. İlerde istersen **Supabase Storage**'a da geçebilirsin.

## Geri dönüş
`SUPABASE_URL` / `SUPABASE_KEY`'i tekrar boşaltırsan site anında `localStorage`
moduna döner (hiçbir şey bozulmaz).

---

## Güvenlik güncellemesi (2026-09)
Yazma yetkisi artık "giriş yapmış herhangi biri" değil, **yalnızca `info@medya-reklam.com`**.

1. **SQL Editor**'da güncel `supabase-setup.sql` dosyasının **2) Row Level Security** bölümünü
   çalıştır (idempotent; eski `site_content_write` politikasını siler, insert/update politikalarını
   e-posta koşuluyla yeniden oluşturur, delete kapalı kalır):

```sql
drop policy if exists "site_content_write" on public.site_content;
drop policy if exists "site_content_insert" on public.site_content;
drop policy if exists "site_content_update" on public.site_content;
drop policy if exists "site_content_delete" on public.site_content;
create policy "site_content_insert" on public.site_content for insert to authenticated
  with check ((auth.jwt() ->> 'email') = 'info@medya-reklam.com');
create policy "site_content_update" on public.site_content for update to authenticated
  using ((auth.jwt() ->> 'email') = 'info@medya-reklam.com')
  with check ((auth.jwt() ->> 'email') = 'info@medya-reklam.com');
```

2. **Authentication > Sign In / Providers (Email)**: **"Allow new users to sign up" KAPALI** olsun
   (aksi halde herkes hesap açıp giriş yapabilir).
3. Authentication > Users: yalnızca admin kullanıcısı olsun ve e-postası **Confirmed** görünsün
   (e-posta doğrulama kapalıysa başkası bu adresle kayıt olmaya çalışabilir; sign-up kapalıyken risk yok).
