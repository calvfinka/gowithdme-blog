-- GoWithDME: setelah blog pindah ke repo sendiri (blog.gowithdme.com), tulisan terbit/diubah harus memicu
-- workflow "Sinkron blog" di repo BLOG, bukan repo situs utama. Event tetap memicu repo situs utama.
-- Jalankan di Supabase > SQL Editor SETELAH supabase/auto_sinkron.sql (di repo situs utama) sudah pernah dijalankan.
-- Aman dijalankan ulang.
--
-- SEBELUM menjalankan:
--  1. Ganti NAMA_REPO_BLOG di bawah bila nama repo blogmu bukan 'gowithdme-blog'.
--  2. Token GitHub (fine-grained PAT, secret vault 'github_dispatch_token') harus boleh mengakses REPO BLOG juga:
--     GitHub > Settings > Developer settings > Fine-grained tokens > token itu > Repository access: tambahkan repo blog,
--     Permissions > Actions: Read and write. (Atau buat token baru yang mencakup kedua repo lalu:
--     select vault.update_secret(id, 'token_baru') from vault.secrets where name='github_dispatch_token';)

create or replace function kick_sinkron_blog() returns trigger
language plpgsql security definer set search_path = public, extensions, vault as $$
declare
  pub boolean; tok text; rid bigint;
begin
  if TG_OP = 'DELETE' then pub := (OLD.status = 'published');
  elsif TG_OP = 'INSERT' then pub := (NEW.status = 'published');
  else pub := (NEW.status = 'published' or OLD.status = 'published');
  end if;
  if not pub then return null; end if;

  -- satu panggilan per 5 detik KHUSUS tabel ini (tidak bentrok dengan pemicu event di repo situs utama)
  if exists (select 1 from sinkron_log where at > now() - interval '5 seconds' and tabel = 'blog_posts') then return null; end if;

  select decrypted_secret into tok from vault.decrypted_secrets where name = 'github_dispatch_token' limit 1;
  if tok is null then return null; end if;

  select net.http_post(
    url     := 'https://api.github.com/repos/calvfinka/gowithdme-blog/actions/workflows/sinkron.yml/dispatches',  -- NAMA_REPO_BLOG
    body    := '{"ref":"main"}'::jsonb,
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || tok,
      'Accept', 'application/vnd.github+json',
      'X-GitHub-Api-Version', '2022-11-28',
      'User-Agent', 'gwm-supabase',
      'Content-Type', 'application/json')
  ) into rid;
  insert into sinkron_log(tabel, request_id) values ('blog_posts', rid);
  return null;
exception when others then
  return null;   -- gagal memicu sinkron tidak boleh menggagalkan penyimpanan tulisan
end $$;

revoke all on function kick_sinkron_blog() from public, anon, authenticated;

drop trigger if exists kick_sinkron_blog on blog_posts;
create trigger kick_sinkron_blog after insert or update or delete on blog_posts
  for each row execute function kick_sinkron_blog();

-- Uji: simpan satu tulisan terbit di Panel Admin, lalu lihat GitHub > repo blog > Actions: "Sinkron blog" mulai dalam hitungan detik.
-- Cek riwayat:   select * from sinkron_log order by id desc limit 5;
-- Cek jawaban GitHub (204 = sukses):   select id, status_code, left(content,120) from net._http_response order by id desc limit 5;
