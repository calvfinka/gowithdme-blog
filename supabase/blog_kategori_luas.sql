-- GoWithDME: perluas kategori blog untuk publik. Kategori lama tetap valid. Aman dijalankan ulang.
alter table blog_posts drop constraint if exists blog_posts_category_check;
alter table blog_posts add constraint blog_posts_category_check check (category in
 ('berita','opini','gaya-hidup','hiburan','wisata','teknologi','tips','panduan-konser','tips-gunung','review','komunitas'));
