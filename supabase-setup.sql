-- ==========================================================================
--  Medya Reklam — Supabase kurulum SQL'i
--  Supabase Panel > SQL Editor'a yapistirip "Run" deyin (tek seferlik).
--  Tum site icerigi (site/stats/gallery/videos/testimonials) tek satirda,
--  JSON olarak tutulur. Basit, hizli ve store.js ile birebir uyumlu.
-- ==========================================================================

-- 1) Icerik tablosu --------------------------------------------------------
create table if not exists public.site_content (
  id          int primary key,
  data        jsonb       not null default '{}'::jsonb,
  updated_at  timestamptz default now()
);

-- baslangic satiri (id = 1). store.js bu satiri okur/gunceller.
insert into public.site_content (id, data)
values (1, '{}'::jsonb)
on conflict (id) do nothing;

-- 2) Row Level Security (RLS) ---------------------------------------------
alter table public.site_content enable row level security;

-- Herkes (ziyaretciler / anon) icerigi OKUYABILIR:
drop policy if exists "site_content_read" on public.site_content;
create policy "site_content_read"
  on public.site_content
  for select
  using (true);

-- Sadece GIRIS YAPMIS kullanici (admin) yazabilir (insert + update + delete):
drop policy if exists "site_content_write" on public.site_content;
create policy "site_content_write"
  on public.site_content
  for all
  to authenticated
  using (true)
  with check (true);

-- Bitti. Sonraki adim: Authentication > Users > "Add user" ile admin
-- e-postasi + sifresi olusturun (SUPABASE-KURULUM.md'ye bakin).
