(function(){
  var C = window.IB_CONFIG || {};
  var URL = (C.SUPABASE_URL || "").replace(/\/+$/, "");
  var KEY = C.SUPABASE_ANON_KEY || "";
  if (!URL || !KEY) return;

  var CATS = {"berita":"Berita","opini":"Opini & Cerita","gaya-hidup":"Gaya Hidup","hiburan":"Hiburan","wisata":"Wisata","teknologi":"Teknologi","tips":"Tips & Panduan","panduan-konser":"Panduan Konser","tips-gunung":"Tips Gunung","review":"Review","komunitas":"Komunitas"};
  var MON = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];
  function esc(s){return String(s).replace(/[&<>"']/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#x27;"}[c]})}
  function fd(s){if(!s)return"";var d=new Date(s);return isNaN(d)?"":d.getDate()+" "+MON[d.getMonth()]+" "+d.getFullYear()}
  function inl(t){return t.replace(/\*\*(.+?)\*\*/g,"<strong>$1</strong>").replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,'<a href="$2" rel="noopener nofollow">$1</a>')}
  function t2h(b){var out=[],para=[],lst=[];
    function fp(){if(para.length){out.push("<p>"+para.map(function(x){return inl(esc(x))}).join("<br>")+"</p>");para=[]}}
    function fl(){if(lst.length){out.push("<ul>"+lst.map(function(x){return"<li>"+inl(esc(x))+"</li>"}).join("")+"</ul>");lst=[]}}
    b.replace(/\r\n?/g,"\n").split("\n").forEach(function(line){
      if(!line.trim()){fp();fl()}
      else if(line.indexOf("## ")===0){fp();fl();out.push("<h2>"+inl(esc(line.slice(3).trim()))+"</h2>")}
      else if(line.indexOf("### ")===0){fp();fl();out.push("<h3>"+inl(esc(line.slice(4).trim()))+"</h3>")}
      else if(line.indexOf("- ")===0){fp();lst.push(line.slice(2).trim())}
      else{fl();para.push(line.trim())}});
    fp();fl();return out.join("")}
  var OK={P:1,BR:1,H2:1,H3:1,H4:1,UL:1,OL:1,LI:1,STRONG:1,B:1,EM:1,I:1,U:1,A:1,BLOCKQUOTE:1,CODE:1,PRE:1,HR:1,TABLE:1,THEAD:1,TBODY:1,TR:1,TH:1,TD:1},
      DROP={SCRIPT:1,STYLE:1,IFRAME:1,OBJECT:1,EMBED:1,TEMPLATE:1,NOSCRIPT:1,SVG:1,MATH:1,FORM:1,TEXTAREA:1,SELECT:1,BUTTON:1,HEAD:1,TITLE:1};
  function safeHref(v){v=String(v||"").replace(/[\x00-\x20]+/g,"");return/^(https?:\/\/|mailto:|\/|#|\.\/|\.\.\/)/i.test(v)?v:""}
  /* tulisan lama memuat tautan /blog/..., https://gowithdme.com/blog/... dan /id/...: arahkan ke alamat baru (sama dengan fix_href di tools/blog.py) */
  function fixHref(v){
    var m=v.match(/^(https?:\/\/(?:www\.)?gowithdme\.com)?\/blog(?:\/(.*))?$/i);
    if(m){var rest=(m[2]||"").replace(/\.html(?=$|[?#])/,"");return(m[1]?location.origin:"")+"/"+rest}
    if(v.charAt(0)==="/"&&v.charAt(1)!=="/")return"https://gowithdme.com"+v;
    return v}
  function walk(n){if(n.nodeType===3)return esc(n.nodeValue);if(n.nodeType!==1)return"";var t=n.tagName;if(DROP[t])return"";
    var inner=[].map.call(n.childNodes,walk).join("");if(!OK[t])return inner;t=t.toLowerCase();
    if(t==="br"||t==="hr")return"<"+t+">";
    if(t==="a"){var h=fixHref(safeHref(n.getAttribute("href")));return h?'<a href="'+esc(h)+'" rel="noopener nofollow">'+inner+"</a>":"<a>"+inner+"</a>"}
    return"<"+t+">"+inner+"</"+t+">"}
  function renderBody(body,isHtml){return isHtml?walk(new DOMParser().parseFromString("<body>"+body+"</body>","text/html").body):t2h(body)}
  function plainOf(h){var d=document.createElement("div");d.innerHTML=h;return(d.textContent||"").replace(/\s+/g," ").trim()}
  function nk(t){return String(t).toLowerCase().replace(/\W+/g,"")}
  function dropTitle(h,title){
    if(!title)return h;
    var m=h.match(/^\s*<p>([\s\S]*?)<br>/);
    if(m&&nk(plainOf(m[1]))===nk(title))return"<p>"+h.slice(m[0].length);
    m=h.match(/^\s*<(p|h2|h3)>([\s\S]*?)<\/\1>/);
    if(m&&nk(plainOf(m[2]))===nk(title))return h.slice(m[0].length).replace(/^\s+/,"");
    m=h.match(/^\s*([^<]+)/);
    if(m&&nk(plainOf(m[1]))===nk(title))return h.slice(m[0].length);
    return h}
  var KW=/\s*<p>\s*(?:<(?:em|i)>\s*)?Kata kunci\s*:\s*([\s\S]*?)(?:<\/(?:em|i)>\s*)?<\/p>\s*$/i;
  function prep(body,isHtml,title){
    var h=dropTitle(renderBody(body,isHtml),title),kw=[],m=h.match(KW);
    if(m){h=h.slice(0,m.index);kw=plainOf(m[1]).split(",").map(function(k){return k.replace(/^[\s.]+|[\s.]+$/g,"")}).filter(function(k){return k.length>1&&k.length<=60}).slice(0,8)}
    return{html:h,kw:kw}}
  function mergeTags(tags, kw){
    var out = [], seen = {};
    (tags || []).concat(kw || []).forEach(function(t){ t = String(t).replace(/\s+/g, " ").trim(); var k = t.toLowerCase(); if (t.length > 1 && t.length <= 60 && !seen[k]) { seen[k] = 1; out.push(t); } });
    return out.slice(0, 8);
  }
  function trimEx(t,n){n=n||155;if(t.length<=n)return t;var cut=t.slice(0,n),m,last=-1,re=/[.!?](?=\s|$)/g;
    while((m=re.exec(cut)))last=m.index+1;
    if(last>=90)return cut.slice(0,last);
    return cut.slice(0,cut.lastIndexOf(" ")).replace(/[,.;:\-\s]+$/,"")+"…"}
  function snippet(body,isHtml,title){return trimEx(plainOf(prep(body,isHtml,title).html))}

  if (document.getElementById("blArt") && !location.search) return; /* artikel statis: tidak perlu cek tulisan baru */
  var shown = location.pathname + location.search;
  /* tombol Kembali dari pembaca langsung ke daftar (tanpa ini halaman tetap menampilkan tulisan). Pindah #bagian tidak memuat ulang. */
  window.addEventListener("popstate", function(){ if (location.pathname + location.search !== shown) location.reload(); });
  var ROOT = (window.GWMBlog && GWMBlog.ROOT) || (function(){var sc=document.currentScript;return sc&&sc.src?new URL("../",sc.src).href:new URL("../",location.href).href})();
  var path = location.pathname.replace(/\/+$/, "");
  var parts = path.split("/");
  /* blog.gowithdme.com: kategori ada di segmen pertama (/berita/), akar (/) = semua */
  var curCat = (parts[1] && CATS[parts[1]]) ? parts[1] : "";
  /* alamat kategori tanpa garis miring akhir (/berita) membuat tautan relatif salah: rapikan */
  if (!/\.html$/.test(path) && !/\/$/.test(location.pathname) && curCat && parts.length <= 2) {
    try { history.replaceState(null, "", location.pathname + "/" + location.search + location.hash); } catch (e) {}
  }
  function ic(n){return '<svg class="i" aria-hidden="true"><use href="#ic-'+n+'"/></svg>'}
  function mins(body,isHtml,title){return Math.max(1,Math.round(plainOf(prep(body,isHtml,title).html).split(/\s+/).length/200))}
  function ub(k){return encodeURIComponent(k)}
  function liveUrl(p){return ROOT + "?cat=" + ub(p.category) + "&post=" + ub(p.slug)}

  function openReader(p){
    var main = document.querySelector("main.bl-main");
    if (!main) return;
    var key = p.category + "/" + p.slug, url = liveUrl(p), cn = CATS[p.category] || p.category, m = mins(p.body, p.is_html, p.title), pr = prep(p.body, p.is_html, p.title);
    pr.kw = mergeTags(p.tags, pr.kw);
    document.title = p.title + " – Blog GoWithDME";
    var stat = ROOT + p.category + "/" + p.slug, ex = trimEx(plainOf(pr.html));
    function sm(sel, attr, v){ var e = document.querySelector(sel); if (e) e.setAttribute(attr, v); }
    sm('meta[name="description"]', "content", ex); sm('link[rel="canonical"]', "href", stat);
    sm('meta[property="og:title"]', "content", p.title + " – Blog GoWithDME"); sm('meta[property="og:description"]', "content", ex);
    sm('meta[property="og:url"]', "content", stat); sm('meta[property="og:type"]', "content", "article");
    document.body.classList.add("bl-reading");
    shown = location.pathname + location.search;
    var shr = [["WhatsApp","https://wa.me/?text="+encodeURIComponent(p.title+" "+url),"wa"],["Telegram","https://t.me/share/url?url="+encodeURIComponent(url)+"&text="+encodeURIComponent(p.title),"tg"],["X","https://twitter.com/intent/tweet?text="+encodeURIComponent(p.title)+"&url="+encodeURIComponent(url),"x"],["Facebook","https://www.facebook.com/sharer/sharer.php?u="+encodeURIComponent(url),"fb"]]
      .map(function(l){return '<a class="bl-sb bl-sb-'+l[2]+'" target="_blank" rel="noopener noreferrer" href="'+esc(l[1])+'">'+l[0]+'</a>'}).join("");
    main.className = "wrap bl-main bl-art-wrap";
    main.innerHTML = '<div class="bl-grid bl-grid-a"><article class="bl-art bl-c-'+esc(p.category)+'" id="blArt" data-k="'+esc(key)+'" data-title="'+esc(p.title)+'" data-url="'+esc(url)+'">' +
      '<nav class="bl-bc"><a href="'+ROOT+'">Blog</a><span>›</span><a href="'+ROOT+esc(p.category)+'/">'+esc(cn)+'</a></nav>' +
      '<a class="bl-badge" href="'+ROOT+esc(p.category)+'/">'+ic(p.category)+esc(cn)+'</a><h1>'+esc(p.title)+'</h1>' +
      '<div class="bl-by"><span class="bl-av bl-av-img"><img src="/assets/redaksi.jpg" alt="" width="40" height="40" decoding="async"></span><div><b>Redaksi GoWithDME</b><span>'+fd(p.published_at)+' · '+m+' menit baca</span></div></div>' +
      '<p class="bl-stats"><span class="bl-s bl-sv" hidden>'+ic("eye")+'<b data-v></b> dibaca</span><span class="bl-s bl-sc" hidden>'+ic("chat")+'<b data-c></b> komentar</span><span class="bl-s bl-sl" hidden>'+ic("heart")+'<b data-l></b> suka</span></p>' +
      '<div class="bl-share" role="group" aria-label="Bagikan tulisan"><span class="bl-sl-t">'+ic("share")+'Bagikan</span>'+shr+'<button type="button" class="bl-sb bl-sb-cp" data-copy>'+ic("link")+'Salin tautan</button><button type="button" class="bl-sb bl-sb-nat" data-native hidden>Lainnya…</button><span class="sp"></span><span class="bl-fs" role="group" aria-label="Ukuran teks">'+ic("type")+'<button type="button" data-fs="-1" aria-label="Kecilkan teks">A−</button><button type="button" data-fs="1" aria-label="Besarkan teks">A+</button></span></div>' +
      '<details class="bl-toc-m" id="blTocM" hidden><summary>'+ic("list")+'Daftar isi</summary><ol></ol></details>' +
      '<div class="bl-body" id="blBody">'+pr.html+'</div>' +
      (pr.kw.length?'<p class="bl-tags" aria-label="Topik terkait">'+pr.kw.map(function(k){return'<a href="'+ROOT+'?q='+encodeURIComponent(k)+'" rel="nofollow">'+esc(k)+'</a>'}).join("")+'</p>':"") +
      '<div class="bl-end"><button type="button" class="bl-like" id="blLike" aria-pressed="false">'+ic("heart")+'<span>Suka tulisan ini</span><b data-l></b></button><p>Ada yang mau ditambah atau dikoreksi? Tulis di kolom komentar di bawah.</p></div>' +
      '<section class="bl-cm" id="komentar" data-k="'+esc(key)+'"><h2 id="blCmH">Komentar <i data-c></i></h2><div id="blCmBox"><p class="bl-muted">Memuat komentar…</p></div></section>' +
      '<p class="bl-cta"><a class="btn" href="'+ROOT+'">← Kembali ke daftar blog</a></p></article>' +
      '<aside class="bl-side bl-side-a"><section class="bl-box bl-toc" id="blToc" hidden><h3>'+ic("list")+'Daftar isi</h3><ol></ol></section></aside></div>';
    if (!document.getElementById("blProg")) document.body.insertAdjacentHTML("afterbegin", '<div class="bl-prog" id="blProg" aria-hidden="true"><i></i></div>');
    if (!document.querySelector(".bl-dock")) document.body.insertAdjacentHTML("beforeend", '<div class="bl-dock off" role="toolbar" aria-label="Aksi cepat"><button type="button" id="dkLike" aria-label="Suka" aria-pressed="false">'+ic("heart")+'<b data-l></b></button><a href="#komentar" aria-label="Ke komentar">'+ic("chat")+'<b data-c></b></a><button type="button" id="dkShare" aria-label="Bagikan">'+ic("share")+'</button><button type="button" id="dkTop" aria-label="Kembali ke atas">'+ic("up")+'</button></div>');
    window.scrollTo(0, 0);
    if (window.GWMBlog) GWMBlog.initArticle(document.getElementById("blArt"));
  }

  function renderPosts(posts){
    var q = new URLSearchParams(location.search);
    var qCat = q.get("cat"), qSlug = q.get("post");
    if (qCat && qSlug) {
      var hit = posts.filter(function(x){ return x.category === qCat && x.slug === qSlug; });
      if (hit.length) { openReader(hit[0]); return; }
    }
    var main = document.querySelector("main.bl-main");
    if (!main) return;
    var list = main.querySelector("#blFeed");
    if (!list) return;
    var filtered = curCat ? posts.filter(function(x){ return x.category === curCat; }) : posts;

    var pubMap = {};
    posts.forEach(function(p){ pubMap[p.category + "/" + p.slug] = p; });
    /* tulisan yang dicabut/di-draft-kan sejak build terakhir: buang kartunya */
    [].forEach.call(list.querySelectorAll("article.bl-card"), function(card){
      var a = card.querySelector("h2 a"); if (!a) return;
      var m = (a.getAttribute("href") || "").match(/([a-z0-9-]+)\/([a-z0-9-]+)(?:\.html)?$/);
      if (m && !pubMap[m[1] + "/" + m[2]] && card.getAttribute("data-live") !== "1") card.remove();
    });

    filtered.forEach(function(p){
      var key = p.category + "/" + p.slug;
      var exists = [].some.call(list.querySelectorAll("article.bl-card"), function(c){ return c.getAttribute("data-k") === key; });
      if (exists) return;
      var u = liveUrl(p), cn = CATS[p.category] || p.category, m = mins(p.body, p.is_html, p.title);
      var art = document.createElement("article");
      art.className = "bl-card bl-c-" + p.category;
      art.setAttribute("data-k", key); art.setAttribute("data-live", "1"); art.setAttribute("data-d", (p.published_at || "").slice(0, 19));
      art.innerHTML = '<a class="bl-th" href="'+u+'" tabindex="-1" aria-hidden="true">'+ic(p.category)+'<em>'+m+' mnt</em></a>' +
        '<div class="bl-cb"><p class="bl-bd"><a class="bl-badge" href="'+ROOT+esc(p.category)+'/">'+ic(p.category)+esc(cn)+'</a><time>'+fd(p.published_at)+'</time></p>' +
        '<h2><a href="'+u+'">'+esc(p.title)+'</a></h2><p class="bl-ex">'+esc(snippet(p.body, p.is_html, p.title))+'</p>' +
        '<p class="bl-ft"><span class="bl-s">'+ic("clock")+m+' mnt baca</span><span class="bl-s bl-sv" hidden>'+ic("eye")+'<b data-v></b></span><span class="bl-s bl-sc" hidden>'+ic("chat")+'<b data-c></b></span><span class="bl-s bl-sl" hidden>'+ic("heart")+'<b data-l></b></span>' +
        '<button type="button" class="bl-ib bl-sh2" data-share="'+esc(u)+'" data-title="'+esc(p.title)+'" aria-label="Bagikan tulisan">'+ic("share")+'</button></p></div>';
      art.querySelector("h2 a").addEventListener("click", function(e){ e.preventDefault(); history.pushState(null, "", u); openReader(p); });
      art.querySelector(".bl-th").addEventListener("click", function(e){ e.preventDefault(); history.pushState(null, "", u); openReader(p); });
      var d = (p.published_at || "").slice(0, 19), before = null;
      [].some.call(list.querySelectorAll("article.bl-card"), function(c){ if ((c.getAttribute("data-d") || "") < d) { before = c; return true; } return false; });
      list.insertBefore(art, before);
    });
    var none = main.querySelector(".bl-empty"); if (none && list.querySelector("article.bl-card")) none.remove();
    if (window.GWMBlog) GWMBlog.paint();
  }

  /* Hemat egress: daftar ringan dulu (tanpa isi tulisan), lalu isi hanya untuk tulisan yang belum punya kartu statis
     (hasil build) atau yang sedang dibuka lewat ?cat=&post=. Dulu: isi 200 tulisan diunduh di setiap kunjungan. */
  var H = { "apikey": KEY, "Authorization": "Bearer " + KEY },
      BASE = URL + "/rest/v1/blog_posts?status=eq.published";
  function jget(u){ return fetch(u, { headers: H }).then(function(r){ return r.ok ? r.json() : null; }); }
  var LIST = "&order=published_at.desc&limit=200";
  jget(BASE + "&select=id,title,slug,category,is_html,published_at,tags" + LIST).then(function(r){
    return Array.isArray(r) ? r : jget(BASE + "&select=id,title,slug,category,is_html,published_at" + LIST);  /* kolom tags belum ada */
  }).then(function(meta){
    /* galat/kuota Supabase habis atau daftar kosong: biarkan kartu hasil build, jangan dikosongkan */
    if (!Array.isArray(meta) || !meta.length) return;
    var q = new URLSearchParams(location.search), qCat = q.get("cat"), qSlug = q.get("post"),
        hrefs = [].map.call(document.querySelectorAll("main.bl-main article.bl-card h2 a"), function(a){ return a.getAttribute("href") || ""; });
    var need = meta.filter(function(p){
      if (qCat && qSlug && p.category === qCat && p.slug === qSlug) return true;
      if (curCat && p.category !== curCat) return false;
      var key = p.category + "/" + p.slug;
      return !hrefs.some(function(h){ return h.indexOf(key) > -1; });
    });
    var bodies = {};
    var done = function(){
      meta.forEach(function(p){ p.body = bodies[p.id] ? bodies[p.id].body : ""; });
      renderPosts(meta);
    };
    if (!need.length) return done();
    jget(BASE + "&select=id,body&id=in.(" + need.map(function(p){ return p.id; }).join(",") + ")").then(function(rows){
      (rows || []).forEach(function(r){ bodies[r.id] = r; });
      done();
    });
  }).catch(function(){});
})();
