-- GoWithDME: interaksi blog = jumlah dibaca, suka, dan komentar. Jalankan di Supabase > SQL Editor.
-- Prasyarat: schema_blog.sql dan schema_tahap2.sql (fungsi is_admin()). Aman dijalankan ulang.
--
-- Prinsip privasi (sama dengan statistik situs): tanpa IP, tanpa cookie, tanpa akun.
--  * "vid" = kode acak per browser (sama dengan js/track.js). Hanya dipakai agar satu pembaca tidak dihitung berkali-kali.
--  * Log vid terkunci RLS tanpa policy; publik hanya bisa memanggil fungsi di bawah. Komentar dibaca publik lewat view tanpa vid.
--  * Satu pembaca dihitung 1x dibaca per tulisan per hari (WIB). Log harian dihapus otomatis setelah 30 hari.
-- Kunci tulisan (post_key) = "<kategori>/<alamat>", sama dengan alamat halaman blog/<kategori>/<alamat>.

create table if not exists blog_stats(
  post_key text primary key check (post_key ~ '^[a-z0-9-]+/[a-z0-9-]+$' and char_length(post_key)<=170),
  views int not null default 0,
  likes int not null default 0);
create table if not exists blog_view_log(
  post_key text not null, vid text not null,
  day date not null default ((now() at time zone 'Asia/Jakarta')::date),
  primary key(post_key,vid,day));
create table if not exists blog_like_log(post_key text not null, vid text not null, primary key(post_key,vid));
create table if not exists blog_comments(
  id uuid primary key default gen_random_uuid(),
  post_key text not null check (post_key ~ '^[a-z0-9-]+/[a-z0-9-]+$' and char_length(post_key)<=170),
  author text not null check (char_length(author) between 2 and 40),
  body text not null check (char_length(body) between 3 and 800),
  vid text not null check (char_length(vid) between 8 and 40),
  status text not null default 'published' check (status in ('published','hidden')),
  created_at timestamptz not null default now());
create index if not exists blog_comments_post on blog_comments(post_key,created_at desc);
create index if not exists blog_comments_vid on blog_comments(vid,created_at desc);

alter table blog_stats enable row level security;
alter table blog_view_log enable row level security;
alter table blog_like_log enable row level security;
alter table blog_comments enable row level security;
drop policy if exists "baca statistik blog" on blog_stats;
drop policy if exists "admin kelola komentar blog" on blog_comments;
create policy "baca statistik blog" on blog_stats for select using (true);
create policy "admin kelola komentar blog" on blog_comments for all to authenticated using (is_admin()) with check (is_admin());

-- Komentar untuk publik: hanya yang terbit, tanpa vid.
create or replace view blog_comments_public as
  select id,post_key,author,body,created_at from blog_comments where status='published';
grant select on blog_comments_public to anon,authenticated;

-- Dibaca: panggil saat artikel dibuka. Mengembalikan angka terbaru dan apakah pembaca ini sudah menyukai.
create or replace function blog_hit(p_key text,p_vid text) returns jsonb language plpgsql security definer set search_path=public as $$
declare ins int:=0;
begin
  if p_key is null or p_key !~ '^[a-z0-9-]+/[a-z0-9-]+$' or char_length(p_key)>170 then return null; end if;
  if p_vid is null or p_vid !~ '^[A-Za-z0-9]{8,40}$' then return null; end if;
  if not exists(select 1 from blog_posts where status='published' and category||'/'||slug=p_key) then return null; end if;
  insert into blog_stats(post_key) values(p_key) on conflict do nothing;
  if (select count(*) from blog_view_log where vid=p_vid and day=(now() at time zone 'Asia/Jakarta')::date)<300 then
    insert into blog_view_log(post_key,vid) values(p_key,p_vid) on conflict do nothing;
    get diagnostics ins=row_count;
    if ins>0 then update blog_stats set views=views+1 where post_key=p_key; end if;
  end if;
  if random()<0.01 then delete from blog_view_log where day<((now() at time zone 'Asia/Jakarta')::date)-30; end if;
  return (select jsonb_build_object('v',views,'l',likes,'m',exists(select 1 from blog_like_log where post_key=p_key and vid=p_vid)) from blog_stats where post_key=p_key);
end $$;

-- Suka / batal suka. p_on=true menyukai, false membatalkan.
create or replace function blog_like(p_key text,p_vid text,p_on boolean) returns jsonb language plpgsql security definer set search_path=public as $$
declare ch int:=0;
begin
  if p_key is null or p_key !~ '^[a-z0-9-]+/[a-z0-9-]+$' or char_length(p_key)>170 then return null; end if;
  if p_vid is null or p_vid !~ '^[A-Za-z0-9]{8,40}$' then return null; end if;
  if not exists(select 1 from blog_posts where status='published' and category||'/'||slug=p_key) then return null; end if;
  insert into blog_stats(post_key) values(p_key) on conflict do nothing;
  if p_on then
    insert into blog_like_log(post_key,vid) values(p_key,p_vid) on conflict do nothing;
    get diagnostics ch=row_count;
    if ch>0 then update blog_stats set likes=likes+1 where post_key=p_key; end if;
  else
    delete from blog_like_log where post_key=p_key and vid=p_vid;
    get diagnostics ch=row_count;
    if ch>0 then update blog_stats set likes=greatest(0,likes-1) where post_key=p_key; end if;
  end if;
  return (select jsonb_build_object('l',likes,'m',p_on) from blog_stats where post_key=p_key);
end $$;

-- Kirim komentar. Pesan galat ditampilkan apa adanya ke pembaca.
create or replace function blog_comment_add(p_key text,p_name text,p_body text,p_vid text) returns jsonb language plpgsql security definer set search_path=public as $$
declare nm text:=regexp_replace(trim(coalesce(p_name,'')),'\s+',' ','g'); bd text:=trim(coalesce(p_body,'')); rid uuid; ts timestamptz;
begin
  if p_key is null or p_key !~ '^[a-z0-9-]+/[a-z0-9-]+$' or char_length(p_key)>170 then raise exception 'Tulisan tidak ditemukan.'; end if;
  if p_vid is null or p_vid !~ '^[A-Za-z0-9]{8,40}$' then raise exception 'Browser tidak dikenali. Muat ulang halaman.'; end if;
  if not exists(select 1 from blog_posts where status='published' and category||'/'||slug=p_key) then raise exception 'Tulisan tidak ditemukan.'; end if;
  if char_length(nm)<2 or char_length(nm)>40 then raise exception 'Nama 2 sampai 40 karakter.'; end if;
  if char_length(bd)<3 or char_length(bd)>800 then raise exception 'Komentar 3 sampai 800 karakter.'; end if;
  if (select count(*) from regexp_matches(bd,'(https?://|www\.)','gi'))>1 then raise exception 'Maksimal 1 tautan per komentar.'; end if;
  if exists(select 1 from blog_comments where vid=p_vid and created_at>now()-interval '30 seconds') then raise exception 'Tunggu sebentar sebelum mengirim komentar lagi.'; end if;
  if (select count(*) from blog_comments where vid=p_vid and created_at>now()-interval '1 hour')>=10 then raise exception 'Terlalu banyak komentar dalam satu jam. Coba lagi nanti.'; end if;
  if exists(select 1 from blog_comments where post_key=p_key and vid=p_vid and body=bd) then raise exception 'Komentar yang sama sudah terkirim.'; end if;
  insert into blog_stats(post_key) values(p_key) on conflict do nothing;
  insert into blog_comments(post_key,author,body,vid) values(p_key,nm,bd,p_vid) returning id,created_at into rid,ts;
  return jsonb_build_object('id',rid,'author',nm,'body',bd,'created_at',ts);
end $$;

-- Ringkasan semua tulisan: kunci, dibaca, suka, jumlah komentar. Dipakai daftar blog dan "Artikel populer".
create or replace function blog_overview() returns jsonb language sql stable security definer set search_path=public as $$
  select coalesce(jsonb_agg(jsonb_build_object('k',s.post_key,'v',s.views,'l',s.likes,
    'c',(select count(*) from blog_comments c where c.post_key=s.post_key and c.status='published'))),'[]'::jsonb)
  from blog_stats s $$;

revoke all on function blog_hit(text,text),blog_like(text,text,boolean),blog_comment_add(text,text,text,text),blog_overview() from public;
grant execute on function blog_hit(text,text),blog_like(text,text,boolean),blog_comment_add(text,text,text,text),blog_overview() to anon,authenticated;
