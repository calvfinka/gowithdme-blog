-- GoWithDME: tag artikel blog (maks. 8 tag per tulisan, opsional). Jalankan di Supabase > SQL Editor.
-- Prasyarat: schema_blog.sql sudah dijalankan. Aman dijalankan ulang. Tulisan lama otomatis berisi tag kosong.
alter table blog_posts add column if not exists tags text[] not null default '{}';
alter table blog_posts drop constraint if exists blog_posts_tags_check;
alter table blog_posts add constraint blog_posts_tags_check check (
  cardinality(tags) <= 8 and char_length(array_to_string(tags,'|')) <= 300);
