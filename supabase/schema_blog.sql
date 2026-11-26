-- GoWithDME: Blog (tulisan teks tanpa foto, maks 15000 karakter). Jalankan di Supabase > SQL Editor.
-- Prasyarat: schema_tahap2.sql (fungsi is_admin()) sudah dijalankan. Aman dijalankan ulang.
-- Kategori = nama folder di repositori: blog/<kategori>/<alamat>.html (daftar kategori juga ada di tools/blog.py dan js/admin-blog.js).
create table if not exists blog_posts(
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 3 and 120),
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug)<=80),
  category text not null check (category in ('panduan-konser','tips-gunung','review','berita','komunitas')),
  body text not null check (char_length(body) between 1 and 15000),
  is_html boolean not null default false,
  status text not null default 'draft' check (status in ('draft','published')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(category,slug)
);
create index if not exists blog_posts_pub on blog_posts(status,published_at desc);
alter table blog_posts enable row level security;
drop policy if exists "baca blog terbit" on blog_posts;
drop policy if exists "admin kelola blog" on blog_posts;
create policy "baca blog terbit" on blog_posts for select using (status='published');
create policy "admin kelola blog" on blog_posts for all to authenticated using (is_admin()) with check (is_admin());
create or replace function blog_touch() returns trigger language plpgsql as $$ begin new.updated_at=now(); return new; end $$;
drop trigger if exists blog_touch on blog_posts;
create trigger blog_touch before update on blog_posts for each row execute function blog_touch();
