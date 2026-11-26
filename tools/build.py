#!/usr/bin/env python3
# Bangun blog.gowithdme.com dari data/posts.json (hasil tools/gen_blog.py).
# Keluaran di akar repo: index.html, index.json, <kategori>/*.html, sitemap.xml, robots.txt.
# Pakai:  python3 tools/gen_blog.py && python3 tools/build.py
# GWM_BLOG_SITE mengganti alamat dasar (canonical + sitemap) bila perlu menguji di alamat lain.
import json,os,sys,html
HERE=os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0,HERE)
import blog as BL
ROOT=os.path.abspath(os.path.join(HERE,".."))
BASE=os.environ.get("GWM_BLOG_SITE","https://blog.gowithdme.com").rstrip("/")
pf=ROOT+"/data/posts.json"
POSTS=json.load(open(pf,encoding="utf-8")) if os.path.exists(pf) else []
rows=[]
for u,lm in BL.build(ROOT,BASE,POSTS):
    rows.append(f"<url><loc>{html.escape(u)}</loc>"+(f"<lastmod>{lm[:10]}</lastmod>" if lm else "")+"</url>")
open(ROOT+"/sitemap.xml","w",encoding="utf-8").write('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+"".join(rows)+"</urlset>\n")
open(ROOT+"/robots.txt","w",encoding="utf-8").write(f"User-agent: *\nAllow: /\nSitemap: {BASE}/sitemap.xml\n")
print("selesai ->",BASE,"|",len(POSTS),"tulisan,",len(rows),"URL di sitemap")
