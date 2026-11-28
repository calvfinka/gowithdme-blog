-- GoWithDME: Arsip Blog (impor dari Blogger/Blogspot). Aman dijalankan ulang.
-- Prasyarat: schema_tahap2.sql (fungsi is_admin()). Dijalankan otomatis oleh: bash tools/arsip_setup.sh
create table if not exists arsip_blog(
  id uuid primary key default gen_random_uuid(),
  koleksi text not null default 'ISIBLOGPINDAHANDATIBLOGSPOT' check (char_length(koleksi) between 1 and 80),
  src_id text not null,                       -- id entri Blogger (kunci anti-duplikat)
  slug text not null check (char_length(slug) between 1 and 160),
  jenis text not null default 'post' check (jenis in ('post','page')),
  title text not null default '',
  body text not null default '',
  ringkasan text not null default '',
  labels text[] not null default '{}',
  penulis text,
  path_asal text,                             -- contoh: /2020/01/judul.html
  status text not null default 'published' check (status in ('draft','published')),
  published_at timestamptz,
  updated_src timestamptz,
  created_at timestamptz not null default now(),
  unique(koleksi,src_id),
  unique(koleksi,slug)
);
create index if not exists arsip_blog_list on arsip_blog(koleksi,status,published_at desc);
create index if not exists arsip_blog_judul on arsip_blog(lower(title));
create table if not exists arsip_komentar(
  id uuid primary key default gen_random_uuid(),
  koleksi text not null,
  src_id text not null,
  post_src_id text not null,
  penulis text,
  body text not null default '',
  published_at timestamptz,
  unique(koleksi,src_id)
);
create index if not exists arsip_kom_post on arsip_komentar(koleksi,post_src_id,published_at);
create table if not exists arsip_impor(
  id uuid primary key default gen_random_uuid(),
  koleksi text not null, nama_berkas text, ukuran bigint,
  jml_post int default 0, jml_halaman int default 0, jml_komentar int default 0, jml_lewat int default 0,
  created_at timestamptz not null default now()
);
alter table arsip_blog enable row level security;
alter table arsip_komentar enable row level security;
alter table arsip_impor enable row level security;
drop policy if exists "baca arsip terbit" on arsip_blog;
drop policy if exists "admin kelola arsip" on arsip_blog;
drop policy if exists "baca komentar arsip" on arsip_komentar;
drop policy if exists "admin kelola komentar arsip" on arsip_komentar;
drop policy if exists "admin kelola riwayat impor" on arsip_impor;
create policy "baca arsip terbit" on arsip_blog for select using (status='published');
create policy "admin kelola arsip" on arsip_blog for all to authenticated using (is_admin()) with check (is_admin());
create policy "baca komentar arsip" on arsip_komentar for select using (exists(select 1 from arsip_blog b where b.koleksi=arsip_komentar.koleksi and b.src_id=arsip_komentar.post_src_id and b.status='published'));
create policy "admin kelola komentar arsip" on arsip_komentar for all to authenticated using (is_admin()) with check (is_admin());
create policy "admin kelola riwayat impor" on arsip_impor for all to authenticated using (is_admin()) with check (is_admin());
-- Hapus satu koleksi sekaligus (urungkan impor)
create or replace function arsip_hapus_koleksi(k text) returns void language plpgsql security definer set search_path=public set statement_timeout='300s' as $$
begin
  if not is_admin() then raise exception 'khusus admin'; end if;
  delete from arsip_komentar where koleksi=k;
  delete from arsip_blog where koleksi=k;
  delete from arsip_impor where koleksi=k;
end $$;
revoke all on function arsip_hapus_koleksi(text) from public, anon;
grant execute on function arsip_hapus_koleksi(text) to authenticated;
-- Daftar koleksi + jumlah (untuk halaman publik dan admin)
create or replace function arsip_daftar_koleksi() returns table(koleksi text, jumlah bigint) language sql stable security definer set search_path=public as $$
  select koleksi, count(*) from arsip_blog where status='published' group by koleksi order by koleksi
$$;
grant execute on function arsip_daftar_koleksi() to anon, authenticated;
