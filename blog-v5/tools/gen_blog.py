# Ambil tulisan blog terbit dari Supabase -> data/posts.json (dipakai build.py untuk membuat blog/<kategori>/<alamat>.html).
# Jalankan:  python3 tools/gen_blog.py   lalu   python3 tools/build.py
import os,re,json,urllib.request,urllib.parse,urllib.error
ROOT=os.path.join(os.path.dirname(__file__),"..")
cfg=open(ROOT+"/js/config.js",encoding="utf-8").read()
url=re.search(r'SUPABASE_URL:\s*"([^"]+)"',cfg).group(1).rstrip("/")
key=re.search(r'SUPABASE_ANON_KEY:\s*"([^"]+)"',cfg).group(1)
BASE="title,slug,category,body,is_html,published_at,updated_at"
def ambil(cols):
    q=urllib.parse.urlencode({"select":cols,"status":"eq.published","order":"published_at.desc","limit":"2000"},safe="*,")
    req=urllib.request.Request(f"{url}/rest/v1/blog_posts?{q}",headers={"apikey":key,"Authorization":"Bearer "+key})
    return json.load(urllib.request.urlopen(req,timeout=60))
rows=None
for extra in (",source_name,source_url,tags",",source_name,source_url",",tags",""):
    try: rows=ambil(BASE+extra); break
    except urllib.error.HTTPError as e:
        if e.code!=400: raise  # 400 = kolom belum ada (schema_blog_orisinalitas.sql atau schema_blog_tags.sql belum dijalankan)
if rows is None: raise SystemExit("gagal mengambil blog_posts")
os.makedirs(ROOT+"/data",exist_ok=True)
json.dump(rows,open(ROOT+"/data/posts.json","w",encoding="utf-8"),ensure_ascii=False,indent=1)
print(len(rows),"tulisan ->","data/posts.json")
