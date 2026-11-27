# Pembuat halaman blog statis untuk blog.gowithdme.com. Dipanggil tools/build.py.
# Keluaran: index.html, index.json, <kategori>/index.html, <kategori>/<alamat>.html (di akar repo ini).
# Semua itu HASIL BUILD: jangan edit tangan, tulis lewat Panel Admin > Blog.
import os,re,json,html as _h
from html.parser import HTMLParser
from datetime import datetime,timezone,timedelta
CATS=[("berita","Berita","Kabar dan sorotan terkini dari berbagai bidang."),
      ("opini","Opini & Cerita","Pendapat, catatan pribadi, dan cerita dari berbagai sudut pandang."),
      ("gaya-hidup","Gaya Hidup","Kebiasaan, tren, dan inspirasi untuk keseharian."),
      ("hiburan","Hiburan","Musik, film, budaya pop, dan segala yang seru."),
      ("wisata","Wisata","Destinasi, rute, dan cerita jalan-jalan."),
      ("teknologi","Teknologi","Gawai, aplikasi, internet, dan dunia digital."),
      ("tips","Tips & Panduan","Panduan praktis yang berguna sehari-hari."),
      ("panduan-konser","Panduan Konser","Panduan dan tips menonton konser dan festival."),
      ("tips-gunung","Tips Gunung","Persiapan, keselamatan, dan tips naik gunung."),
      ("review","Review","Ulasan konser, festival, produk, tempat, dan pengalaman."),
      ("komunitas","Komunitas","Cerita dan info dari komunitas GoWithDME.")]
CATNAME={c[0]:c[1] for c in CATS}
# Kelompok niche: dipakai "Jelajahi topik" dan sidebar. Kategori yang belum terdaftar di sini tetap tampil di kelompok "Lainnya".
GROUPS=[("Kabar & Opini",["berita","opini"]),("Hiburan & Gaya Hidup",["hiburan","review","gaya-hidup"]),
        ("Wisata & Petualangan",["wisata","tips-gunung"]),("Teknologi",["teknologi"]),
        ("Panduan",["tips","panduan-konser"]),("Komunitas",["komunitas"])]
VER=""  # diisi build() (cache-buster css/js)
MAIN="https://gowithdme.com"  # situs utama (event, gunung, komunitas, bantuan): tautan ke sana selalu absolut
WIB=timezone(timedelta(hours=7))
MON=["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"]
def esc(x): return _h.escape(str(x),quote=True)
def ldj(o): return '<script type="application/ld+json">'+json.dumps(o,ensure_ascii=False).replace("</","<\\/")+'</script>'
def pdate(s):
    if not s: return None
    try: return datetime.fromisoformat(s.replace("Z","+00:00")).astimezone(WIB)
    except Exception: return None
def fdate(s):
    d=pdate(s); return f"{d.day} {MON[d.month-1]} {d.year}" if d else ""
# ---- mode teks: ## judul, ### subjudul, - daftar, **tebal**, [teks](https://url), baris kosong = paragraf (HARUS sama dengan js/admin-blog.js) ----
def _inline(t):
    t=re.sub(r"\*\*(.+?)\*\*",r"<strong>\1</strong>",t)
    return re.sub(r"\[([^\]]+)\]\((https?://[^\s)]+)\)",r'<a href="\2" rel="noopener nofollow">\1</a>',t)
def text_to_html(body):
    out=[];para=[];lst=[]
    def fp():
        if para: out.append("<p>"+"<br>".join(_inline(esc(x)) for x in para)+"</p>"); para.clear()
    def fl():
        if lst: out.append("<ul>"+"".join("<li>"+_inline(esc(x))+"</li>" for x in lst)+"</ul>"); lst.clear()
    for line in body.replace("\r\n","\n").replace("\r","\n").split("\n"):
        if not line.strip(): fp();fl()
        elif line.startswith("## "): fp();fl();out.append("<h2>"+_inline(esc(line[3:].strip()))+"</h2>")
        elif line.startswith("### "): fp();fl();out.append("<h3>"+_inline(esc(line[4:].strip()))+"</h3>")
        elif line.startswith("- "): fp();lst.append(line[2:].strip())
        else: fl();para.append(line.strip())
    fp();fl();return "".join(out)
# ---- mode HTML: hanya tag aman; script/style/iframe dibuang; atribut hanya href pada <a> ----
OK={"p","br","h2","h3","h4","ul","ol","li","strong","b","em","i","u","a","blockquote","code","pre","hr","table","thead","tbody","tr","th","td"}
VOID={"br","hr"}
DROP={"script","style","iframe","object","embed","template","noscript","svg","math","form","textarea","select","button","head","title"}
def safe_href(v):
    v=re.sub(r"[\x00-\x20]+","",v or "")
    return v if re.match(r"(?i)^(https?://|mailto:|/|#|\./|\.\./)",v) else ""
class _San(HTMLParser):
    def __init__(s): super().__init__(convert_charrefs=True); s.o=[];s.stack=[];s.skip=0
    def handle_starttag(s,tag,attrs):
        if tag in DROP: s.skip+=1; return
        if s.skip or tag not in OK: return
        if tag=="a":
            h=safe_href(dict(attrs).get("href"))
            s.o.append(f'<a href="{esc(h)}" rel="noopener nofollow">' if h else "<a>"); s.stack.append(tag)
        elif tag in VOID: s.o.append(f"<{tag}>")
        else: s.o.append(f"<{tag}>"); s.stack.append(tag)
    def handle_startendtag(s,tag,attrs):
        if tag in VOID and not s.skip: s.o.append(f"<{tag}>")
    def handle_endtag(s,tag):
        if tag in DROP: s.skip=max(0,s.skip-1); return
        if s.skip or tag not in OK or tag in VOID or tag not in s.stack: return
        while s.stack:
            t=s.stack.pop(); s.o.append(f"</{t}>")
            if t==tag: break
    def handle_data(s,d):
        if not s.skip: s.o.append(esc(d))
    def result(s):
        while s.stack: s.o.append(f"</{s.stack.pop()}>")
        return "".join(s.o)
def sanitize(h):
    p=_San(); p.feed(h); p.close(); return p.result()
def _nk(t): return re.sub(r"\W+","",str(t).lower())
def drop_title(h,title):
    """Buang baris pembuka isi bila sama dengan judul (judul sudah tampil sebagai H1)."""
    m=re.match(r"\s*<p>(.*?)<br>",h,re.S)
    if m and title and _nk(plain(m.group(1)))==_nk(title): return "<p>"+h[m.end():]
    m=re.match(r"\s*<(p|h2|h3)>(.*?)</\1>",h,re.S)
    if m and title and _nk(plain(m.group(2)))==_nk(title): return h[m.end():].lstrip()
    m=re.match(r"\s*([^<]+)",h)
    if m and title and _nk(plain(m.group(1)))==_nk(title): return h[m.end():]
    return h
# ---- tautan internal di dalam isi tulisan ----
# Tulisan lama memuat tautan seperti /blog/<kategori>/<alamat>.html, https://gowithdme.com/blog/..., /blog/?cat=..&post=.. dan /id/teman.
# Sesudah blog pindah ke blog.gowithdme.com semuanya diperbaiki SAAT BUILD (isi di Supabase tidak perlu diubah).
SLUGCAT={}  # alamat -> kategori sebenarnya; diisi build()
def fix_href(v,BASE):
    v=_h.unescape(v)
    m=re.match(r"(?i)^(https?://(?:www\.)?gowithdme\.com)?/blog(?:/(.*))?$",v)
    if m:
        rest=(m.group(2) or "")
        q=re.match(r"\?cat=([^&]*)&post=([^&#]*)",rest)
        if q and q.group(2) in SLUGCAT: rest=f"{SLUGCAT[q.group(2)]}/{q.group(2)}"
        else: rest=re.sub(r"\.html(?=$|[?#])","",rest)
        return (BASE if m.group(1) else "")+"/"+rest
    if v.startswith("/") and not v.startswith("//"): return MAIN+v   # /id/teman, /en/..., /event -> situs utama
    return v
def fix_links(h,BASE):
    return re.sub(r'href="([^"]*)"',lambda m:'href="'+esc(fix_href(m.group(1),BASE))+'"',h)
def render(post,BASE="https://blog.gowithdme.com"):
    h=sanitize(post["body"]) if post.get("is_html") else text_to_html(post["body"])
    return fix_links(drop_title(h,post.get("title","")),BASE)
def srcbox(x):
    n=(x.get("source_name") or "").strip(); u=(x.get("source_url") or "").strip()
    if not (n or u): return ""
    ok=bool(re.match(r"^https?://\S+$",u))
    link=f'<a href="{esc(u)}" target="_blank" rel="noopener nofollow">{esc(n or u)}</a>' if ok else esc(n or u)
    return f'<aside class="bl-src"><b>Sumber rujukan:</b> {link}</aside>' 
def plain(h): return re.sub(r"\s+"," ",_h.unescape(re.sub(r"<[^>]+>"," ",h))).strip()
def excerpt(h,n=155):
    """Ringkasan untuk meta description: berhenti di akhir kalimat bila ada (>=90 karakter), bukan memotong di tengah."""
    t=plain(h)
    if len(t)<=n: return t
    cut=t[:n]; m=None
    for m in re.finditer(r"[.!?](?=\s|$)",cut): pass
    if m and m.end()>=90: return cut[:m.end()]
    return cut.rsplit(" ",1)[0].rstrip(",.;:- ")+"…"
_KW=re.compile(r"\s*<p>\s*(?:<(?:em|i)>\s*)?Kata kunci\s*:\s*(.*?)(?:</(?:em|i)>\s*)?</p>\s*$",re.S|re.I)
def pull_keywords(h):
    """Baris penutup 'Kata kunci: a, b, c' bukan untuk dibaca: dipindah ke meta keywords dan deretan topik. Mengembalikan (isi, [kata kunci])."""
    m=_KW.search(h)
    if not m: return h,[]
    kw=[k.strip(" .") for k in plain(m.group(1)).split(",")]
    return h[:m.start()],[k for k in kw if 1<len(k)<=60][:8]
def merge_tags(tags,kw,n=8):
    """Tag dari panel admin (kolom tags) didahulukan, lalu baris 'Kata kunci:' di isi tulisan; tanpa duplikat (huruf besar/kecil diabaikan), maks. n."""
    out=[];seen=set()
    for t in list(tags or [])+list(kw or []):
        t=re.sub(r"\s+"," ",str(t)).strip()
        if 1<len(t)<=60 and t.lower() not in seen: seen.add(t.lower()); out.append(t)
    return out[:n]
def slugify(t):
    s=re.sub(r"[^a-z0-9]+","-",t.lower()).strip("-")[:48].strip("-")
    return s or "bagian"
def add_ids(h):
    """Beri id pada <h2>/<h3> agar bisa ditautkan dan dipakai daftar isi."""
    seen={}
    def f(m):
        sid=slugify(plain(m.group(2))); n=seen.get(sid,0); seen[sid]=n+1
        return f'<h{m.group(1)} id="{sid}{"-"+str(n+1) if n else ""}">{m.group(2)}</h{m.group(1)}>'
    return re.sub(r"<h([23])>(.*?)</h\1>",f,h,flags=re.S)
# ---- ikon (sprite satu kali per halaman; dipakai juga oleh js/blog-ui.js dan js/blog-live.js) ----
_I={"eye":'<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
 "clock":'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
 "heart":'<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
 "chat":'<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
 "share":'<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/>',
 "link":'<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
 "search":'<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
 "left":'<path d="M19 12H5m7-7-7 7 7 7"/>',"right":'<path d="M5 12h14m-7-7 7 7-7 7"/>',
 "up":'<path d="m18 15-6-6-6 6"/>',"list":'<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
 "type":'<path d="M4 7V4h16v3M9 20h6M12 4v16"/>',
 "flame":'<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
 "check":'<path d="M20 6 9 17l-5-5"/>',"x":'<path d="M18 6 6 18M6 6l12 12"/>',
 "moon":'<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
 "sun":'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
 "grid":'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
 "berita":'<path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/><path d="M18 14h-8M15 18h-5M10 6h8v4h-8V6Z"/>',
 "opini":'<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
 "gaya-hidup":'<path d="M17 8h1a4 4 0 1 1 0 8h-1M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"/><path d="M6 2v2M10 2v2M14 2v2"/>',
 "hiburan":'<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
 "wisata":'<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
 "teknologi":'<rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M15 2v2M15 20v2M2 15h2M2 9h2M20 15h2M20 9h2M9 2v2M9 20v2"/>',
 "tips":'<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6M10 22h4"/>',
 "panduan-konser":'<path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M13 5v2M13 17v2M13 11v2"/>',
 "tips-gunung":'<path d="m8 3 4 8 5-5 5 15H2L8 3z"/>',
 "review":'<path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>',
 "komunitas":'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>'}
SPRITE='<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0" style="position:absolute" aria-hidden="true"><defs>'+"".join(f'<symbol id="ic-{k}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">{v}</symbol>' for k,v in _I.items())+'</defs></svg>'
def ic(n,c="i"): return f'<svg class="{c}" aria-hidden="true"><use href="#ic-{n}"/></svg>'
def mins(h): return max(1,round(len(plain(h).split())/200))
# ---- halaman ----
def head(p,title,desc,canon,BASE,extra="",otype="website"):
    v=f"?v={VER}" if VER else ""
    return f"""<!DOCTYPE html>
<html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>{esc(title)}</title><meta name="description" content="{esc(desc)}">
<link rel="canonical" href="{esc(canon)}">
<meta property="og:type" content="{otype}"><meta property="og:title" content="{esc(title)}"><meta property="og:description" content="{esc(desc)}"><meta property="og:url" content="{esc(canon)}"><meta property="og:image" content="{BASE}/assets/og-image.png"><meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#0E5A46"><link rel="icon" href="{p}assets/favicon.svg" type="image/svg+xml"><link rel="icon" href="{p}assets/favicon-32.png" sizes="32x32" type="image/png">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<script src="{p}js/theme.js"></script><link rel="stylesheet" href="{p}css/style.css"><link rel="stylesheet" href="{p}css/blog.css{v}"><link rel="stylesheet" href="{p}css/ads.css{v}">{extra}</head>"""
def top(p,cur,counts,bar=True):
    tot=sum(counts.values())
    chip=lambda href,name,icon,n,on: f'<a href="{href}"'+(' aria-current="page"' if on else '')+f'>{ic(icon)}<span>{esc(name)}</span>'+(f'<i>{n}</i>' if n else '')+'</a>'
    chips=chip(f"{p}","Semua","grid",tot,cur=="")+"".join(chip(f"{p}{k}/",n,k,counts.get(k,0),cur==k) for k,n,_ in CATS if counts.get(k,0) or cur==k)
    navbar=(f'<div class="bl-panel" id="blPanel" aria-hidden="true"><div class="wrap"><form class="bl-qs" role="search" action="#" onsubmit="return false"><label class="sr" for="blQs">Cari tulisan</label>{ic("search")}<input id="blQs" type="search" placeholder="Cari tulisan…" autocomplete="off" enterkeyhint="search" tabindex="-1"></form><nav class="bl-cats" aria-label="Kategori blog">{chips}</nav></div></div>') if bar else ""
    return f"""<body class="bl">{SPRITE}<div class="bl-clockbar" role="group" aria-label="Tanggal dan jam sekarang"><div class="wrap"><span class="bl-tick" aria-hidden="true"></span><time id="blClock" datetime=""><span data-d></span><span class="bl-ck-t"><span data-t></span> <small data-z></small></span></time></div></div><header class="bl-top"><div class="wrap"><a class="logo" href="{MAIN}/id/"><img src="{p}assets/favicon.svg" alt="" width="24" height="24">GoWithDME</a><span class="sp"></span><a class="bl-l" href="{p}">Blog</a><a class="bl-l" href="{MAIN}/id/event">Event</a><a class="bl-l" href="{MAIN}/id/gunung">Gunung</a><a class="bl-l" href="{MAIN}/id/komunitas">Komunitas</a><button type="button" class="bl-ib" id="theme" aria-label="Ganti tema terang/gelap">{ic("moon","i i-moon")}{ic("sun","i i-sun")}</button></div>{navbar}</header>"""
def foot(p):
    v=f"?v={VER}" if VER else ""
    return (f'<footer class="bl-foot wrap"><span>© GoWithDME</span><a href="{MAIN}/id/bantuan">Bantuan</a><a href="{MAIN}/id/template">Template</a><a href="{MAIN}/id/terms">Syarat</a><a href="{MAIN}/id/privacy">Privasi</a></footer>'
            f'<div class="bl-toast" id="blToast" role="status" aria-live="polite"></div><script src="{p}js/config.js"></script><script src="{p}js/ads-core.js{v}"></script><script src="{p}js/ads.js{v}"></script><script src="{p}js/word-filter.js"></script><script src="{p}js/clock-core.js{v}"></script><script src="{p}js/blog-clock.js{v}" defer></script><script src="{p}js/panel-core.js{v}"></script><script src="{p}js/blog-panel.js{v}" defer></script><script src="{p}js/blog-ui.js{v}"></script><script src="{p}js/blog-live.js{v}"></script></body></html>')
def card(p,x):
    k=f'{x["category"]}/{x["slug"]}'; url=f'{p}{k}'; c=x["category"]
    return (f'<article class="bl-card bl-c-{c}" data-k="{k}" data-d="{esc((x.get("published_at") or "")[:19])}">'
            f'<a class="bl-th" href="{url}" tabindex="-1" aria-hidden="true">{ic(c)}<em>{x["_m"]} mnt</em></a>'
            f'<div class="bl-cb"><p class="bl-bd"><a class="bl-badge" href="{p}{c}/">{ic(c)}{esc(CATNAME[c])}</a><time datetime="{esc((x.get("published_at") or "")[:10])}">{fdate(x.get("published_at"))}</time></p>'
            f'<h2><a href="{url}">{esc(x["title"])}</a></h2><p class="bl-ex">{esc(x["_ex"])}</p>'
            f'<p class="bl-ft"><span class="bl-s">{ic("clock")}{x["_m"]} mnt baca</span><span class="bl-s bl-sv" hidden>{ic("eye")}<b data-v></b></span><span class="bl-s bl-sc" hidden>{ic("chat")}<b data-c></b></span><span class="bl-s bl-sl" hidden>{ic("heart")}<b data-l></b></span>'
            f'<button type="button" class="bl-ib bl-sh2" data-share="{esc(x["_short"])}" data-title="{esc(x["title"])}" aria-label="Bagikan tulisan">{ic("share")}</button></p></div></article>')
def side_in(p,posts,counts,cur,pop=True):
    popl="".join(f'<li data-k="{x["category"]}/{x["slug"]}"><a href="{p}{x["category"]}/{x["slug"]}"><b>{esc(x["title"])}</b><span>{esc(CATNAME[x["category"]])} · <i class="bl-sv" hidden><b data-v></b> dibaca</i><i class="bl-nv">{fdate(x.get("published_at"))}</i></span></a></li>' for x in posts[:5])
    cnt=lambda k: counts.get(k,0)
    topics="".join(f'<li><a class="bl-c-{k}" href="{p}{k}/"'+(' aria-current="page"' if cur==k else '')+f'><span class="bl-dot">{ic(k)}</span>{esc(CATNAME[k])}<i>{cnt(k)}</i></a></li>' for k,_,_ in CATS if cnt(k))
    return ((f'<section class="bl-box" id="blPopular" hidden><h3>{ic("flame")}<span>Populer</span></h3><ol class="bl-rank"></ol></section>' if pop else "")
            +(f'<section class="bl-box" id="blPop"><h3>{ic("flame")}<span>Tulisan terbaru</span></h3><ol class="bl-rank">{popl}</ol></section>' if popl and pop else "")
            +(f'<section class="bl-box bl-topics-box"><h3>{ic("grid")}Topik</h3><ul class="bl-topics-l">{topics}</ul></section>' if topics else "")
            +f'<section class="bl-box bl-promo"><h3>Cari tontonan atau pendakian?</h3><p>Lihat jadwal konser, festival, dan open trip terbaru di GoWithDME.</p><a class="btn" href="{MAIN}/id/event">Lihat event</a> <a class="btn line" href="{MAIN}/id/gunung">Gunung</a></section>')
def side(p,posts,counts,cur): return '<aside class="bl-side" aria-label="Samping">'+side_in(p,posts,counts,cur)+'</aside>'
def listing(p,cur,posts,BASE,allp,counts):
    name=CATNAME.get(cur,"Blog"); desc=next((d for k,n,d in CATS if k==cur),"Cerita, kabar, dan tips seputar hiburan, wisata, petualangan, gaya hidup, teknologi, dan banyak lagi.")
    canon=f"{BASE}/"+(cur+"/" if cur else "")
    shown=posts[:30] if cur=="" else posts
    feed="".join(card(p,x) for x in shown) or '<p class="bl-empty">Belum ada tulisan di sini.</p>'
    ntopic=sum(1 for k,_,_ in CATS if counts.get(k))
    topics=""  # "Jelajahi topik" dihapus: daftar Topik di samping sudah cukup
    ld=ldj({"@context":"https://schema.org","@type":"CollectionPage","name":f"{name} – Blog GoWithDME","url":canon,"inLanguage":"id"})
    hero=(f'<header class="bl-hero bl-c-{cur or "all"}"><div><h1>{esc(name)}</h1><p class="bl-sub">{esc(desc)}</p>'
          f'<p class="bl-kpi"><span><b>{len(posts)}</b> tulisan</span>'+(f'<span><b>{ntopic}</b> topik</span>' if cur=="" else "")+'<span class="bl-sv" hidden><b data-tv></b> kali dibaca</span></p></div>'
          f'<form class="bl-q" role="search" id="blQ" action="#" onsubmit="return false"><label class="sr" for="blQi">Cari tulisan</label>{ic("search")}<input id="blQi" type="search" placeholder="Cari tulisan, topik, atau kata kunci…" autocomplete="off" enterkeyhint="search"><button type="button" class="bl-ib" id="blQx" hidden aria-label="Hapus pencarian">{ic("x")}</button></form></header>')
    bar=(f'<div class="bl-bar"><h2 class="bl-h2" id="blH">{"Tulisan terbaru" if cur=="" else "Semua tulisan"}</h2><div class="bl-seg" role="group" aria-label="Urutkan"><button type="button" class="on" data-sort="new" aria-pressed="true">Terbaru</button><button type="button" data-sort="pop" aria-pressed="false" hidden>Terpopuler</button></div></div>')
    return (head(p,f"{name} – Blog GoWithDME",desc,canon,BASE,ld)+top(p,cur,counts)+
        f'<main class="wrap bl-main">{hero}<div class="bl-pop-strip" id="blStrip" hidden></div>{topics}'
        f'<div class="bl-grid"><div class="bl-col">{bar}<div class="bl-list bl-feed" id="blFeed">{feed}</div><div class="bl-list" id="blRes" hidden></div><p class="bl-empty" id="blNone" hidden>Tidak ada tulisan yang cocok. Coba kata kunci lain.</p>'
        +(f'<p class="bl-note">Menampilkan {len(shown)} tulisan terbaru. Pilih topik di atas untuk melihat semuanya.</p>' if cur=="" and len(posts)>len(shown) else "")+
        f'</div>{side(p,allp,counts,cur)}</div></main>'+foot(p))
def sharelinks(url,title):
    u=_u(url); t=_u(title); tu=_u(title+" "+url)
    return [("WhatsApp",f"https://wa.me/?text={tu}","wa"),("Telegram",f"https://t.me/share/url?url={u}&text={t}","tg"),("X",f"https://twitter.com/intent/tweet?text={t}&url={u}","x"),("Facebook",f"https://www.facebook.com/sharer/sharer.php?u={u}","fb"),("Email",f"mailto:?subject={t}&body={tu}","em")]
from urllib.parse import quote as _q
def _u(s): return _q(s,safe="")
def article(p,x,others,BASE,prev,nxt,allp,counts):
    k=x["category"]; key=f'{k}/{x["slug"]}'; canon=x["_canon"]; ex=x["_ex"]; m=x["_m"]
    ld=ldj({"@context":"https://schema.org","@graph":[
      {"@type":"BlogPosting","headline":x["title"],"description":ex,"inLanguage":"id","articleSection":CATNAME[k],"mainEntityOfPage":canon,"url":canon,"timeRequired":f"PT{m}M","wordCount":len(plain(x["_html"]).split()),
       "datePublished":x.get("published_at"),**({"keywords":", ".join(x["_kw"])} if x.get("_kw") else {}),"dateModified":x.get("updated_at") or x.get("published_at"),
       "author":{"@type":"Organization","name":"GoWithDME","url":f"{MAIN}/id/"},
       "publisher":{"@type":"Organization","name":"GoWithDME","logo":{"@type":"ImageObject","url":f"{BASE}/assets/icon-512.png"}}},
      {"@type":"BreadcrumbList","itemListElement":[
        {"@type":"ListItem","position":1,"name":"Blog","item":f"{BASE}/"},
        {"@type":"ListItem","position":2,"name":CATNAME[k],"item":f"{BASE}/{k}/"},
        {"@type":"ListItem","position":3,"name":x["title"],"item":canon}]}]})
    shr="".join(f'<a class="bl-sb bl-sb-{c}" target="_blank" rel="noopener noreferrer" href="{esc(h)}">{n}</a>' for n,h,c in sharelinks(x["_short"],x["title"]))
    more="".join(card(p,o) for o in others)
    def pn(o,lab,cls,icon,left):
        if not o: return f'<span class="bl-pn-e {cls}"></span>'
        arrow=ic(icon)
        return f'<a class="bl-pn-a {cls}" href="{p}{o["category"]}/{o["slug"]}" rel="{"prev" if left else "next"}"><small>{arrow if left else ""}{lab}{arrow if not left else ""}</small><b>{esc(o["title"])}</b><span>{esc(CATNAME[o["category"]])}</span></a>'
    kwm=(f'<meta name="keywords" content="{esc(", ".join(x["_kw"]))}">'+"".join(f'<meta property="article:tag" content="{esc(t)}">' for t in x["_kw"])) if x.get("_kw") else ""
    tags=('<p class="bl-tags" aria-label="Topik terkait">'+"".join(f'<a href="{p}?q={_u(t)}" rel="nofollow">{esc(t)}</a>' for t in x["_kw"])+'</p>') if x.get("_kw") else ""
    return (head(p,f"{x['title']} – Blog GoWithDME",ex,canon,BASE,kwm+ld,"article")+top(p,k,counts,False)+
      f'<div class="bl-prog" id="blProg" aria-hidden="true"><i></i></div>'
      f'<main class="wrap bl-main bl-art-wrap"><div class="bl-grid bl-grid-a">'
      f'<article class="bl-art bl-c-{k}" id="blArt" data-k="{key}" data-title="{esc(x["title"])}" data-url="{esc(x["_short"])}">'
      f'<nav class="bl-bc" aria-label="Breadcrumb"><a href="{p}">Blog</a><span>›</span><a href="{p}{k}/">{esc(CATNAME[k])}</a></nav>'
      f'<a class="bl-badge" href="{p}{k}/">{ic(k)}{esc(CATNAME[k])}</a>'
      f'<h1>{esc(x["title"])}</h1>'
      f'<div class="bl-by"><span class="bl-av" aria-hidden="true">G</span><div><b>Redaksi GoWithDME</b><span><time datetime="{esc((x.get("published_at") or "")[:10])}">{fdate(x.get("published_at"))}</time> · {m} menit baca</span></div></div>'
      f'<p class="bl-stats"><span class="bl-s bl-sv" hidden>{ic("eye")}<b data-v></b> dibaca</span><span class="bl-s bl-sc" hidden>{ic("chat")}<b data-c></b> komentar</span><span class="bl-s bl-sl" hidden>{ic("heart")}<b data-l></b> suka</span></p>'
      f'<div class="bl-share" role="group" aria-label="Bagikan tulisan"><span class="bl-sl-t">{ic("share")}Bagikan</span>{shr}<button type="button" class="bl-sb bl-sb-cp" data-copy>{ic("link")}Salin tautan</button><button type="button" class="bl-sb bl-sb-nat" data-native hidden>Lainnya…</button>'
      f'<span class="sp"></span><span class="bl-fs" role="group" aria-label="Ukuran teks">{ic("type")}<button type="button" data-fs="-1" aria-label="Kecilkan teks">A−</button><button type="button" data-fs="1" aria-label="Besarkan teks">A+</button></span></div>'
      f'<details class="bl-toc-m" id="blTocM" hidden><summary>{ic("list")}Daftar isi</summary><ol></ol></details>'
      f'<div class="bl-body" id="blBody">{x["_html"]}</div>{tags}{srcbox(x)}'
      f'<div class="bl-end"><button type="button" class="bl-like" id="blLike" aria-pressed="false">{ic("heart")}<span>Suka tulisan ini</span><b data-l></b></button>'
      f'<p>Ada yang mau ditambah atau dikoreksi? Tulis di kolom komentar di bawah.</p></div>'
      f'<div class="ad-slot" data-ad-slot="blog_post" hidden></div><section class="bl-cm" id="komentar" data-k="{key}" aria-labelledby="blCmH"><h2 id="blCmH">Komentar <i data-c></i></h2><div id="blCmBox"><p class="bl-muted">Memuat komentar…</p></div></section>'
      f'<nav class="bl-pn" aria-label="Tulisan sebelum dan sesudah">{pn(prev,"Lebih lama","l","left",True)}{pn(nxt,"Lebih baru","r","right",False)}</nav>'
      +(f'<section class="bl-rel"><h2 class="bl-h2">Baca juga</h2><div class="bl-list">{more}</div></section>' if more else "")+
      f'<p class="bl-cta"><a class="btn" href="{MAIN}/id/event">Lihat event terbaru</a> <a class="btn line" href="{p}{k}/">Lebih banyak di {esc(CATNAME[k])}</a></p></article>'
      f'<aside class="bl-side bl-side-a" aria-label="Samping"><section class="bl-box bl-toc" id="blToc" hidden><h3>{ic("list")}Daftar isi</h3><ol></ol></section>{side_in(p,allp,counts,k)}</aside>'
      f'</div></main>'
      f'<div class="bl-dock" role="toolbar" aria-label="Aksi cepat"><button type="button" id="dkLike" aria-label="Suka" aria-pressed="false">{ic("heart")}<b data-l></b></button><a href="#komentar" aria-label="Ke komentar">{ic("chat")}<b data-c></b></a><button type="button" id="dkShare" aria-label="Bagikan">{ic("share")}</button><button type="button" id="dkTop" aria-label="Kembali ke atas">{ic("up")}</button></div>'+foot(p))
def shortcode(x,used):
    """Kode pendek tetap (5 huruf/angka) dari kategori/alamat; tabrakan -> perpanjang. Dipakai untuk /p/<kode>."""
    import hashlib
    key=f'{x["category"]}/{x["slug"]}'
    n=int(hashlib.sha1(key.encode()).hexdigest(),16); a="0123456789abcdefghijklmnopqrstuvwxyz"; c=""
    while n and len(c)<12: n,r=divmod(n,36); c+=a[r]
    L=5
    while c[:L] in used and used[c[:L]]!=key: L+=1
    used[c[:L]]=key; x["_code"]=c[:L]; return c[:L]
def redirect_page(url,title,desc="",base=""):
    u=esc(url); t=esc(title+" – Blog GoWithDME"); d=esc(desc); img=esc(f"{base}/assets/og-image.png")
    return (f'<!DOCTYPE html><html lang="id"><head><meta charset="utf-8"><title>{t}</title>'
            f'<meta name="description" content="{d}"><meta name="robots" content="noindex"><link rel="canonical" href="{u}">'
            f'<meta property="og:type" content="article"><meta property="og:site_name" content="Blog GoWithDME"><meta property="og:title" content="{t}">'
            f'<meta property="og:description" content="{d}"><meta property="og:url" content="{u}"><meta property="og:image" content="{img}">'
            f'<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="{t}"><meta name="twitter:description" content="{d}"><meta name="twitter:image" content="{img}">'
            f'<meta http-equiv="refresh" content="0;url={u}"><script>location.replace("{u}"+location.hash)</script></head>'
            f'<body><p><a href="{u}">{esc(title)}</a></p></body></html>')
def build(ROOT,BASE,posts):
    """Tulis index.html, index.json, <kategori>/*.html di akar repo. Mengembalikan [(url,lastmod)] untuk sitemap."""
    b=ROOT
    global VER  # cache-buster = sidik isi css/js blog: berubah hanya bila berkas itu berubah
    import hashlib
    hs=hashlib.md5()
    for f in ("css/blog.css","js/blog-ui.js","js/blog-live.js","css/ads.css","js/ads-core.js","js/ads.js"):
        try: hs.update(open(f"{ROOT}/{f}","rb").read())
        except OSError: pass
    VER=hs.hexdigest()[:10]
    # hapus hasil build lama SAJA (folder kategori + index.*); berkas lain (arsip.html, 404.html, assets/...) tidak disentuh
    for k,_,_ in CATS:
        d=f"{b}/{k}"
        if os.path.isdir(d):
            for f in os.listdir(d):
                if f.endswith(".html"): os.remove(os.path.join(d,f))
    for f in ("index.html","index.json"):
        if os.path.exists(f"{b}/{f}"): os.remove(f"{b}/{f}")
    for k,_,_ in CATS: os.makedirs(f"{b}/{k}",exist_ok=True)
    os.makedirs(f"{b}/p",exist_ok=True)
    for f in os.listdir(f"{b}/p"):
        if f.endswith(".html"): os.remove(os.path.join(f"{b}/p",f))
    SLUGCAT.clear()
    for x in posts:
        if x.get("category") in CATNAME and x.get("slug"): SLUGCAT[x["slug"]]=x["category"]
    ok=[]; used={}
    for x in posts:
        if x.get("category") not in CATNAME or not re.match(r"^[a-z0-9]+(-[a-z0-9]+)*$",x.get("slug") or "") or not x.get("title") or not x.get("body"): print("lewati tulisan tidak valid:",x.get("slug")); continue
        h,kw=pull_keywords(render(x,BASE)); x["_kw"]=merge_tags(x.get("tags"),kw); x["_html"]=add_ids(h); x["_ex"]=excerpt(x["_html"]); x["_m"]=mins(x["_html"]); x["_canon"]=f"{BASE}/{x['category']}/{x['slug']}"; x["_short"]=f"{BASE}/p/{shortcode(x,used)}"; ok.append(x)
    ok.sort(key=lambda x:x.get("published_at") or "",reverse=True)
    counts={}
    for x in ok: counts[x["category"]]=counts.get(x["category"],0)+1
    urls=[]
    for x in ok: open(f"{b}/p/{x['_code']}.html","w",encoding="utf-8").write(redirect_page(x["_canon"],x["title"],x["_ex"],BASE))
    # indeks ringan untuk pencarian, "Terpopuler", navigasi di browser, dan pencarian di situs utama (tanpa isi tulisan)
    idx={"v":1,"posts":[{"k":f'{x["category"]}/{x["slug"]}',"t":x["title"],"c":x["category"],"d":(x.get("published_at") or "")[:19],"m":x["_m"],"x":x["_ex"][:140]} for x in ok[:300]]}
    open(b+"/index.json","w",encoding="utf-8").write(json.dumps(idx,ensure_ascii=False,separators=(",",":")))
    open(b+"/index.html","w",encoding="utf-8").write(listing("./","",ok,BASE,ok,counts)); urls.append((f"{BASE}/",ok[0].get("updated_at") if ok else None))
    for k,_,_ in CATS:
        l=[x for x in ok if x["category"]==k]
        open(f"{b}/{k}/index.html","w",encoding="utf-8").write(listing("../",k,l,BASE,ok,counts)); urls.append((f"{BASE}/{k}/",l[0].get("updated_at") if l else None))
        for x in l:
            same=[o for o in l if o is not x]
            others=(same+[o for o in ok if o is not x and o["category"]!=k])[:3]
            i=ok.index(x); nxt=ok[i-1] if i>0 else None; prev=ok[i+1] if i+1<len(ok) else None
            open(f"{b}/{k}/{x['slug']}.html","w",encoding="utf-8").write(article("../",x,others,BASE,prev,nxt,ok,counts))
            urls.append((f"{BASE}/{k}/{x['slug']}",x.get("updated_at") or x.get("published_at")))
    return urls
