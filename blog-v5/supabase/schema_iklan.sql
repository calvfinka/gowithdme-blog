-- GoWithDME: lencana iklan yang diatur dari admin.gowithdme.com dan tampil di situs utama. Aman dijalankan berulang.
-- Jalankan SETELAH schema_tahap2.sql (butuh is_admin()) dan, bila dipakai, schema_rbac.sql (has_perm()).
-- Izin memakai yang sudah ada: sponsor.view (lihat) dan sponsor.manage (ubah). Tidak ada izin baru.
-- Tabel tertutup untuk aplikasi (RLS menolak semua). Pengunjung hanya membaca view ads_live dan memanggil ad_click;
-- admin hanya lewat admin_list_ads / admin_save_ad / admin_toggle_ad / admin_delete_ad.
-- Daftar tempat (slot), label, dan warna HARUS sama dengan js/ads-core.js (dicek oleh tests/ads-core.test.mjs).

create table if not exists ad_badges (
  id         uuid primary key default gen_random_uuid(),
  slot       text not null check (slot in ('home_rail','home_top','event_list','event_detail','blog_post')),
  title      text not null check (char_length(title) between 2 and 60),
  body       text check (body is null or char_length(body) <= 140),
  label      text not null default 'ad' check (label in ('ad','sponsor','partner','promo')),
  url        text not null check (url ~* '^https://[^[:space:]"''<>]+$' and char_length(url) <= 500),
  tone       text not null default 'brand' check (tone in ('brand','accent','sky','ink')),
  city       text check (city is null or char_length(city) <= 60),   -- kosong = semua kota
  weight     int  not null default 5 check (weight between 1 and 10),
  starts_on  date,
  ends_on    date,
  active     boolean not null default true,
  lead_id    uuid,                         -- lead sponsor asal (opsional, hanya catatan)
  clicks     bigint not null default 0,    -- jumlah klik (indikatif; Do Not Track dihormati di situs)
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ad_badges_dates_ok check (ends_on is null or starts_on is null or ends_on >= starts_on)
);
create index if not exists ad_badges_slot_idx on ad_badges (slot, active);

alter table ad_badges enable row level security;
drop policy if exists "admin only ad_badges" on ad_badges;
create policy "admin only ad_badges" on ad_badges for all using (false);

-- Yang dilihat pengunjung: hanya iklan aktif yang sedang masa tayang (hari ini menurut WIB), tanpa kolom internal.
create or replace view ads_live as
select id, slot, title, body, label, url, tone, city, weight, starts_on, ends_on
from ad_badges
where active
  and (starts_on is null or starts_on <= (now() at time zone 'Asia/Jakarta')::date)
  and (ends_on   is null or ends_on   >= (now() at time zone 'Asia/Jakarta')::date);
grant select on ads_live to anon, authenticated;

-- Pemeriksa izin: pakai has_perm() bila schema_rbac.sql sudah dipasang, jika belum jatuh ke is_admin().
create or replace function _ad_can(p text) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare r boolean;
begin
  if to_regprocedure('has_perm(text)') is not null then
    execute 'select has_perm($1)' into r using p;
    return coalesce(r, false);
  end if;
  return is_admin();
end $$;
revoke all on function _ad_can(text) from public, anon, authenticated;

create or replace function admin_list_ads() returns setof ad_badges
language plpgsql stable security definer set search_path = public as $$
begin
  if not _ad_can('sponsor.view') then raise exception 'Hanya admin.'; end if;
  return query select * from ad_badges order by active desc, created_at desc limit 500;
end $$;

-- p_id null = buat baru, terisi = ubah. Mengembalikan id.
create or replace function admin_save_ad(
  p_id uuid, p_slot text, p_title text, p_body text, p_label text, p_url text, p_tone text,
  p_city text, p_weight int, p_starts date, p_ends date, p_active boolean, p_lead uuid default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_title text := trim(coalesce(p_title, ''));
  v_body  text := nullif(trim(coalesce(p_body, '')), '');
  v_url   text := trim(coalesce(p_url, ''));
  v_city  text := nullif(trim(coalesce(p_city, '')), '');
  v_id    uuid;
begin
  if not _ad_can('sponsor.manage') then raise exception 'Hanya admin.'; end if;
  if p_slot not in ('home_rail','home_top','event_list','event_detail','blog_post') then raise exception 'Tempat pemasangan tidak dikenal'; end if;
  if char_length(v_title) < 2 or char_length(v_title) > 60 then raise exception 'Judul 2 sampai 60 karakter'; end if;
  if v_body is not null and char_length(v_body) > 140 then raise exception 'Teks pendukung maksimal 140 karakter'; end if;
  if p_label not in ('ad','sponsor','partner','promo') then raise exception 'Label tidak dikenal'; end if;
  if v_url !~* '^https://[^[:space:]"''<>]+$' or char_length(v_url) > 500 then raise exception 'Tautan harus diawali https://'; end if;
  if p_tone not in ('brand','accent','sky','ink') then raise exception 'Warna tidak dikenal'; end if;
  if v_city is not null and char_length(v_city) > 60 then raise exception 'Nama kota terlalu panjang'; end if;
  if p_weight is null or p_weight < 1 or p_weight > 10 then raise exception 'Bobot 1 sampai 10'; end if;
  if p_starts is not null and p_ends is not null and p_ends < p_starts then raise exception 'Tanggal akhir sebelum tanggal mulai'; end if;

  if p_id is null then
    insert into ad_badges(slot, title, body, label, url, tone, city, weight, starts_on, ends_on, active, lead_id, created_by)
    values (p_slot, v_title, v_body, p_label, v_url, p_tone, v_city, p_weight, p_starts, p_ends, coalesce(p_active, true), p_lead, auth.uid())
    returning id into v_id;
  else
    update ad_badges
       set slot = p_slot, title = v_title, body = v_body, label = p_label, url = v_url, tone = p_tone, city = v_city,
           weight = p_weight, starts_on = p_starts, ends_on = p_ends, active = coalesce(p_active, true),
           lead_id = coalesce(p_lead, lead_id), updated_at = now()
     where id = p_id
    returning id into v_id;
    if v_id is null then raise exception 'Lencana tidak ditemukan'; end if;
  end if;
  return v_id;
end $$;

create or replace function admin_toggle_ad(p_id uuid, p_active boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not _ad_can('sponsor.manage') then raise exception 'Hanya admin.'; end if;
  update ad_badges set active = coalesce(p_active, false), updated_at = now() where id = p_id;
  if not found then raise exception 'Lencana tidak ditemukan'; end if;
end $$;

create or replace function admin_delete_ad(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not _ad_can('sponsor.manage') then raise exception 'Hanya admin.'; end if;
  delete from ad_badges where id = p_id;
  if not found then raise exception 'Lencana tidak ditemukan'; end if;
end $$;

-- Pengunjung: hitung satu klik. Hanya menambah angka, tidak menyimpan data pengunjung.
create or replace function ad_click(p_id uuid) returns void
language sql security definer set search_path = public as $$
  update ad_badges set clicks = clicks + 1 where id = p_id and active;
$$;

revoke all on function admin_list_ads(), admin_save_ad(uuid, text, text, text, text, text, text, text, int, date, date, boolean, uuid),
  admin_toggle_ad(uuid, boolean), admin_delete_ad(uuid), ad_click(uuid) from public, anon;
grant execute on function admin_list_ads(), admin_save_ad(uuid, text, text, text, text, text, text, text, int, date, date, boolean, uuid),
  admin_toggle_ad(uuid, boolean), admin_delete_ad(uuid) to authenticated;
grant execute on function ad_click(uuid) to anon, authenticated;
