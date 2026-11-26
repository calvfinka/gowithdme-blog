-- GoWithDME: sumber tulisan + hasil pemeriksa orisinalitas blog. Jalankan di Supabase > SQL Editor.
-- Prasyarat: schema_blog.sql dan schema_tahap2.sql (fungsi is_admin()) sudah dijalankan. Aman dijalankan ulang.

-- Sumber tulisan: tampil publik di akhir artikel (boleh kosong)
alter table blog_posts add column if not exists source_name text check (source_name is null or char_length(source_name)<=80);
alter table blog_posts add column if not exists source_url text check (source_url is null or (char_length(source_url)<=300 and source_url ~* '^https?://'));

-- Hasil pemeriksaan: HANYA admin yang bisa membaca atau menulis (tidak ikut terbaca publik)
create table if not exists blog_checks(
  post_id uuid primary key references blog_posts(id) on delete cascade,
  paste_pct int not null default 0 check (paste_pct between 0 and 100),
  level text not null check (level in ('rendah','sedang','tinggi')),
  flags jsonb not null default '[]'::jsonb,
  ack boolean not null default false,
  body_len int,
  checked_at timestamptz not null default now());
alter table blog_checks enable row level security;
drop policy if exists "admin kelola pemeriksaan blog" on blog_checks;
create policy "admin kelola pemeriksaan blog" on blog_checks for all to authenticated using (is_admin()) with check (is_admin());
