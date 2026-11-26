# GoWithDME Blog — blog.gowithdme.com

Blog dan Arsip Blog GoWithDME, dipisah dari repo situs utama (`gowithdme.com`). Situs statis di **GitHub Pages**; tulisan disimpan di Supabase (proyek yang sama dengan situs utama) dan dibangun menjadi HTML statis oleh GitHub Actions.

## Isi repo
```
index.html, index.json        beranda blog + indeks ringan (pencarian, Terpopuler, pencarian di situs utama)
<kategori>/index.html         daftar per kategori (berita, opini, gaya-hidup, hiburan, wisata, teknologi, tips, panduan-konser, tips-gunung, review, komunitas)
<kategori>/<alamat>.html      satu halaman per tulisan  →  blog.gowithdme.com/<kategori>/<alamat>
arsip.html                    Arsip Blog (impor Blogspot; dibaca dari tabel arsip_blog di Supabase)
sitemap.xml, robots.txt       dibuat otomatis oleh build
```
Semua file di atas (kecuali `arsip.html`) adalah HASIL BUILD: jangan edit tangan. Tulis lewat Panel Admin (`admin.gowithdme.com`) > Postingan > Blog.

Sumber: `tools/blog.py` (pembuat halaman), `tools/build.py`, `tools/gen_blog.py` (ambil tulisan dari Supabase ke `data/posts.json`), `css/`, `js/`, `assets/`.

## Cara kerja
1. Admin menerbitkan/mengubah tulisan di Supabase.
2. Pemicu database (`supabase/auto_sinkron_blog.sql`) memanggil workflow **Sinkron blog** di repo ini. Cadangan: tiap hari 04.07 WIB, atau manual (Actions > Sinkron blog > Run workflow).
3. Workflow menjalankan `gen_blog.py` + `build.py`, commit hasilnya, lalu GitHub Pages terbit (±2–4 menit).
4. Like, jumlah dibaca, dan komentar tetap hidup lewat Supabase RPC (anon key publik di `js/config.js`, dijaga RLS) tanpa perlu build ulang.

## Lokal
```
python3 tools/gen_blog.py      # opsional: ambil tulisan terbaru dari Supabase
python3 tools/build.py
python3 tools/serve.py 8000    # http://localhost:8000/  (URL bersih + 404.html seperti GitHub Pages)
npm test ; npm run lint
```
`GWM_BLOG_SITE=https://alamat-lain python3 tools/build.py` mengganti alamat dasar canonical/sitemap untuk uji di alamat lain.

## Catatan pemisahan
- Tautan ke situs utama (Event, Gunung, Komunitas, Bantuan, Syarat, Privasi) selalu absolut ke `https://gowithdme.com/...`.
- Tautan internal di dalam isi tulisan lama (`/blog/...`, `https://gowithdme.com/blog/...`, `/id/...`) diperbaiki otomatis saat build (`fix_links` di `tools/blog.py`) dan di pembaca langsung (`fixHref` di `js/blog-live.js`).
- Beda subdomain = beda origin: tema terang/gelap dan pilihan lain di `localStorage` tidak terbagi dengan situs utama. Service worker/PWA tidak dipasang di blog.
- SQL skema (`supabase/schema_blog*.sql`, `schema_arsip.sql`, `schema_iklan.sql`) hanya salinan rujukan; basis data tetap satu proyek Supabase yang sama.
