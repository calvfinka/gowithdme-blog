/* Perilaku halaman blog: jumlah dibaca, suka, komentar, bagikan, daftar isi, progres baca, pencarian, urut Terpopuler.
   Data interaksi dari Supabase (supabase/schema_blog_interaksi.sql). Bila SQL itu belum dijalankan, semua angka dan komentar disembunyikan
   dan halaman tetap berfungsi sebagai blog biasa. Tanpa cookie/IP; kode acak per browser sama dengan js/track.js. */
(function(){
var C=window.IB_CONFIG||{},SU=(C.SUPABASE_URL||"").replace(/\/+$/,""),SK=C.SUPABASE_ANON_KEY||"";
var script=document.currentScript,ROOT=script&&script.src?new URL("../",script.src).href:new URL("../",location.href).href;
var CN={"berita":"Berita","opini":"Opini & Cerita","gaya-hidup":"Gaya Hidup","hiburan":"Hiburan","wisata":"Wisata","teknologi":"Teknologi","tips":"Tips & Panduan","panduan-konser":"Panduan Konser","tips-gunung":"Tips Gunung","review":"Review","komunitas":"Komunitas"};
var MON=["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];
function $(s,r){return(r||document).querySelector(s)}function $$(s,r){return[].slice.call((r||document).querySelectorAll(s))}
function own(sel,r){return $$(sel,r).filter(function(e){return!e.closest(".bl-card,.bl-side,.bl-pop-strip")})}
function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})}
function ic(n){return'<svg class="i" aria-hidden="true"><use href="#ic-'+n+'"/></svg>'}
function fd(s){if(!s)return"";var d=new Date(s);return isNaN(d)?"":d.getDate()+" "+MON[d.getMonth()]+" "+d.getFullYear()}
function nf(n){n=+n||0;return n>=1e6?(n/1e6).toFixed(1).replace(/\.0$/,"")+" jt":n>=1e4?Math.round(n/1e3)+" rb":n>=1e3?(n/1e3).toFixed(1).replace(".",",").replace(/,0$/,"")+" rb":String(n)}
function ago(ts){var s=(Date.now()-new Date(ts).getTime())/1000;if(isNaN(s))return"";if(s<60)return"baru saja";if(s<3600)return Math.floor(s/60)+" menit lalu";if(s<86400)return Math.floor(s/3600)+" jam lalu";if(s<2592000)return Math.floor(s/86400)+" hari lalu";return fd(ts)}
var tt;function toast(m){var t=$("#blToast");if(!t)return;t.textContent=m;t.classList.add("on");clearTimeout(tt);tt=setTimeout(function(){t.classList.remove("on")},2200)}
/* ---- pembaca (kode acak per browser, bersama dengan js/track.js) ---- */
function vid(){var v="";try{v=localStorage.getItem("gwm_vid")||"";if(!/^[A-Za-z0-9]{16,40}$/.test(v)){var a=new Uint8Array(12);crypto.getRandomValues(a);v=[].map.call(a,function(b){return("0"+b.toString(16)).slice(-2)}).join("");localStorage.setItem("gwm_vid",v)}}catch(e){return""}return v}
var MINV=20; /* angka "dibaca" baru tampil setelah cukup besar; "Terpopuler" butuh minimal 3 tulisan yang lolos */
var local=/^(localhost|127\.|0\.0\.0\.0|\[::1\])/.test(location.hostname)||location.protocol==="file:";
var dnt=navigator.doNotTrack==="1"||window.doNotTrack==="1"||navigator.globalPrivacyControl;
function rpc(fn,args){
  if(!SU||!SK)return Promise.reject(new Error("off"));
  return fetch(SU+"/rest/v1/rpc/"+fn,{method:"POST",headers:{"Content-Type":"application/json",apikey:SK,Authorization:"Bearer "+SK},body:JSON.stringify(args||{})})
   .then(function(r){return r.json().then(function(j){if(!r.ok)throw new Error(j&&j.message||"gagal");return j})})}
/* ---- statistik semua tulisan ---- */
var STATS=null,IDX=null,statsP=null;
function loadStats(){
  if(statsP)return statsP;
  statsP=new Promise(function(res){
    try{var c=JSON.parse(sessionStorage.getItem("gwm_blstat")||"null");if(c&&Date.now()-c.t<120000){STATS=c.d;return res(STATS)}}catch(e){}
    rpc("blog_overview").then(function(rows){
      if(!Array.isArray(rows))return res(null);
      var m={};rows.forEach(function(r){m[r.k]={v:+r.v||0,l:+r.l||0,c:+r.c||0}});STATS=m;
      try{sessionStorage.setItem("gwm_blstat",JSON.stringify({t:Date.now(),d:m}))}catch(e){}res(m)
    }).catch(function(){res(null)})});
  return statsP}
function loadIdx(){return IDX||(IDX=fetch(ROOT+"index.json").then(function(r){return r.ok?r.json():{posts:[]}}).then(function(j){return j.posts||[]}).catch(function(){return[]}))}
function setStat(el,key,S){
  var s=S&&S[key];if(!s)return;
  [["v","bl-sv","data-v"],["c","bl-sc","data-c"],["l","bl-sl","data-l"]].forEach(function(p){
    $$("["+p[2]+"]",el).forEach(function(b){var n=s[p[0]];b.textContent=nf(n);var wrap=b.closest("."+p[1]);if(wrap)wrap.hidden=p[0]==="v"?n<MINV:!n})})}
function paint(S){
  if(!S)return;
  $$("article.bl-card[data-k]").forEach(function(c){setStat(c,c.getAttribute("data-k"),S)});
  var tot=0;Object.keys(S).forEach(function(k){tot+=S[k].v});
  $$("[data-tv]").forEach(function(b){b.textContent=nf(tot);b.parentNode.hidden=tot<MINV});
  var sort=$('[data-sort="pop"]');if(sort)sort.hidden=!Object.keys(S).some(function(k){return S[k].v>=MINV})}
function popHead(ol){var sec=ol&&ol.closest("section"),sp=sec&&$("h3 span",sec);if(sp)sp.textContent="Terpopuler"}
/* ---- bagikan ---- */
function clip(text){
  if(navigator.clipboard&&window.isSecureContext)return navigator.clipboard.writeText(text).then(function(){toast("Tautan disalin")},function(){fb()});
  fb();function fb(){var t=document.createElement("textarea");t.value=text;t.style.cssText="position:fixed;opacity:0";document.body.appendChild(t);t.select();try{document.execCommand("copy");toast("Tautan disalin")}catch(e){toast("Salin manual: "+text)}t.remove()}}
function share(d){
  if(navigator.share){return navigator.share({title:d.title,text:d.title,url:d.url}).catch(function(e){if(!e||e.name!=="AbortError")clip(d.url)})}
  clip(d.url)}
document.addEventListener("click",function(e){
  var b=e.target.closest("[data-share]");
  if(b){e.preventDefault();share({title:b.getAttribute("data-title")||document.title,url:b.getAttribute("data-share")});return}
  b=e.target.closest("[data-copy]");if(b){var a=$("#blArt");clip(a?a.getAttribute("data-url"):location.href.split("#")[0]);return}
  b=e.target.closest("[data-native]");if(b){var a2=$("#blArt");share({title:a2.getAttribute("data-title"),url:a2.getAttribute("data-url")});return}
});
/* ---- tema ---- */
/* tombol #theme ditangani js/theme.js */
/* ---- daftar (beranda blog / kategori) ---- */
function initList(){
  var feed=$("#blFeed");if(!feed)return;
  var cards=function(){return $$("article.bl-card",feed)};
  /* urut */
  var seg=$(".bl-seg");
  if(seg)seg.addEventListener("click",function(e){
    var b=e.target.closest("button[data-sort]");if(!b)return;
    $$("button",seg).forEach(function(x){var on=x===b;x.classList.toggle("on",on);x.setAttribute("aria-pressed",on)});
    var mode=b.getAttribute("data-sort"),L=cards();
    L.sort(function(a,b2){
      if(mode==="pop"){var va=(STATS&&STATS[a.getAttribute("data-k")]||{v:0}).v,vb=(STATS&&STATS[b2.getAttribute("data-k")]||{v:0}).v;if(vb!==va)return vb-va}
      return(b2.getAttribute("data-d")||"").localeCompare(a.getAttribute("data-d")||"")});
    L.forEach(function(c){feed.appendChild(c)});
    var h=$("#blH");if(h){if(!h.getAttribute("data-t0"))h.setAttribute("data-t0",h.textContent);h.textContent=mode==="pop"?"Paling banyak dibaca":h.getAttribute("data-t0")}});
  /* cari: seluruh blog lewat index.json */
  var q=$("#blQi"),x=$("#blQx"),res=$("#blRes"),none=$("#blNone"),bar=$(".bl-bar"),tp=$(".bl-tp"),timer;
  function hl(t,w){if(!w.length)return esc(t);var s=esc(t);w.forEach(function(k){s=s.replace(new RegExp("("+k.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+")","ig"),'<mark class="bl-hl">$1</mark>')});return s}
  function run(){
    var raw=q.value.trim().toLowerCase();x.hidden=!raw;
    if(!raw){feed.hidden=false;res.hidden=true;none.hidden=true;if(bar)bar.hidden=false;if(tp)tp.hidden=false;return}
    var words=raw.split(/\s+/).filter(function(w){return w.length>1});
    loadIdx().then(function(L){
      var hits=L.filter(function(p){var h=(p.t+" "+p.x+" "+(CN[p.c]||"")).toLowerCase();return words.every(function(w){return h.indexOf(w)>-1})});
      var cur=$('.bl-cats a[aria-current]'),inCat=/^\/[a-z-]+\/$/.test(location.pathname);
      if(inCat){var seg2=location.pathname.replace(/\/+$/,"").split("/").pop();hits=hits.filter(function(p){return p.c===seg2})}
      feed.hidden=true;if(bar)bar.hidden=true;if(tp)tp.hidden=true;res.hidden=false;none.hidden=!!hits.length;
      res.innerHTML=hits.slice(0,40).map(function(p){var u=ROOT+p.k,s=STATS&&STATS[p.k];
        return'<article class="bl-card bl-c-'+esc(p.c)+'" data-k="'+esc(p.k)+'"><a class="bl-th" href="'+u+'" tabindex="-1" aria-hidden="true">'+ic(p.c)+'<em>'+p.m+' mnt</em></a><div class="bl-cb"><p class="bl-bd"><span class="bl-badge">'+ic(p.c)+esc(CN[p.c]||p.c)+'</span><time>'+fd(p.d)+'</time></p><h2><a href="'+u+'">'+hl(p.t,words)+'</a></h2><p class="bl-ex">'+hl(p.x,words)+'</p><p class="bl-ft"><span class="bl-s">'+ic("clock")+p.m+' mnt baca</span>'+(s?'<span class="bl-s">'+ic("eye")+'<b>'+nf(s.v)+'</b></span>':"")+'</p></div></article>'}).join("")})}
  if(q){q.addEventListener("input",function(){clearTimeout(timer);timer=setTimeout(run,160)});
    x.addEventListener("click",function(){q.value="";run();q.focus()});
    var pre=new URLSearchParams(location.search).get("q");if(pre){q.value=pre;run()}
    document.addEventListener("keydown",function(e){if(e.key==="/"&&!/input|textarea/i.test((e.target.tagName||""))){e.preventDefault();q.focus()}})}
  /* populer: skor = dibaca + 3 x suka + 2 x komentar; tampil mulai dari 1 tulisan yang punya skor. Sidebar (#blPopular) dan strip di HP (#blStrip). */
  Promise.all([loadStats(),loadIdx()]).then(function(r){
    var S=r[0],L=r[1];paint(S);if(!S||!L.length)return;
    var sc=function(k){var s=S[k];return s?s.v+3*s.l+2*s.c:0};
    var pop=L.filter(function(p){return sc(p.k)>0}).sort(function(a,b){return sc(b.k)-sc(a.k)||b.d.localeCompare(a.d)}).slice(0,5);
    if(!pop.length)return;
    var note=function(p){var s=S[p.k];return s.v>=MINV?' · <i><b>'+nf(s.v)+'</b> dibaca</i>':(s.l?' · <i><b>'+nf(s.l)+'</b> suka</i>':"")};
    var box=$("#blPopular"),ol=box&&$(".bl-rank",box);
    if(ol){ol.innerHTML=pop.map(function(p){return'<li data-k="'+esc(p.k)+'"><a href="'+ROOT+p.k+'"><b>'+esc(p.t)+'</b><span>'+esc(CN[p.c]||p.c)+note(p)+'</span></a></li>'}).join("");box.hidden=false}
    var strip=$("#blStrip");
    if(strip&&pop.length>=2&&!/^\/[a-z-]+\/$/.test(location.pathname)){strip.hidden=false;
      strip.innerHTML=pop.map(function(p){return'<a class="bl-c-'+esc(p.c)+'" href="'+ROOT+p.k+'"><small>'+ic("flame")+'Populer</small><b>'+esc(p.t)+'</b><span>'+esc(CN[p.c]||p.c)+' · '+p.m+' mnt</span></a>'}).join("")}})}
/* ---- artikel ---- */
function initArticle(root){
  root=root||$("#blArt");if(!root)return;
  var key=root.getAttribute("data-k"),body=$("#blBody",root)||$(".bl-body",root);
  if(!key||!body||root.__init)return;root.__init=1;
  /* daftar isi */
  var hs=$$("h2,h3",body);
  hs.forEach(function(h,i){if(!h.id)h.id=(h.textContent||"bagian").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,48)+(i?"-"+i:"")});
  if(hs.length>=2){
    var li=hs.map(function(h){return'<li class="'+(h.tagName==="H3"?"l3":"l2")+'"><a href="#'+h.id+'">'+esc(h.textContent)+'</a></li>'}).join("");
    var tb=$("#blToc"),tm=$("#blTocM");
    if(tb){$("ol",tb).innerHTML=li;tb.hidden=false}if(tm){$("ol",tm).innerHTML=li;tm.hidden=false;tm.addEventListener("click",function(e){if(e.target.closest("a"))tm.open=false})}
    var links=$$("#blToc a");
    function spy(){var y=window.scrollY+110,cur=null;hs.forEach(function(h){if(h.getBoundingClientRect().top+window.scrollY<=y)cur=h.id});links.forEach(function(a){a.classList.toggle("on",a.getAttribute("href")==="#"+cur)})}
    window.addEventListener("scroll",spy,{passive:true});spy()}
  /* progres + dock */
  var bar=$("#blProg i"),dock=$(".bl-dock"),tick=false;
  function onS(){if(tick)return;tick=true;requestAnimationFrame(function(){tick=false;
    var r=body.getBoundingClientRect(),tot=r.height-window.innerHeight*.5,pos=Math.min(1,Math.max(0,(-r.top+window.innerHeight*.25)/Math.max(1,tot)));
    if(bar)bar.style.width=(pos*100).toFixed(1)+"%";
    var y=window.scrollY;if(dock)dock.classList.toggle("off",y<200)})}
  window.addEventListener("scroll",onS,{passive:true});onS();
  var fsb=$("#dkTop");if(fsb)fsb.addEventListener("click",function(){window.scrollTo({top:0,behavior:"smooth"})});
  var dks=$("#dkShare");if(dks)dks.addEventListener("click",function(){share({title:root.getAttribute("data-title"),url:root.getAttribute("data-url")})});
  var nat=$("[data-native]");if(nat&&navigator.share){nat.hidden=false;var shr=nat.closest(".bl-share");if(shr)shr.classList.add("has-native")}
  /* ukuran teks */
  var fs=1;try{fs=+localStorage.getItem("gwm_blfs")||1}catch(e){}
  function setFs(v){fs=Math.min(1.3,Math.max(.85,v));body.style.setProperty("--fs",fs);try{localStorage.setItem("gwm_blfs",fs)}catch(e){}}
  setFs(fs);$$("[data-fs]",root).forEach(function(b){b.addEventListener("click",function(){setFs(fs+(+b.getAttribute("data-fs"))*.08)})});
  /* dibaca + suka + komentar */
  var v=vid(),liked=false,btns=[$("#blLike"),$("#dkLike")].filter(Boolean);
  function setLike(on,n){liked=on;btns.forEach(function(b){b.setAttribute("aria-pressed",on);var s=$("span",b);if(s)s.textContent=on?"Kamu menyukai ini":"Suka tulisan ini"});
    if(n!=null)own("[data-l]").forEach(function(b){b.textContent=n?nf(n):"";var w=b.closest(".bl-sl");if(w)w.hidden=!n})}
  var lk=false;try{lk=localStorage.getItem("gwm_bl_"+key)==="1"}catch(e){}if(lk)setLike(true);
  btns.forEach(function(b){b.addEventListener("click",function(){
    if(!v||!SU){toast("Suka belum tersedia");return}
    var want=!liked;setLike(want);b.classList.add("pop");setTimeout(function(){b.classList.remove("pop")},400);
    rpc("blog_like",{p_key:key,p_vid:v,p_on:want}).then(function(r){if(!r)return;setLike(!!r.m,r.l);try{localStorage.setItem("gwm_bl_"+key,r.m?"1":"0")}catch(e){}if(STATS){STATS[key]=STATS[key]||{v:0,l:0,c:0};STATS[key].l=r.l}})
     .catch(function(){setLike(!want);toast("Gagal menyimpan. Coba lagi.")})})});
  var cmBox=$("#blCmBox"),count=0;
  if(v&&!local&&!dnt){rpc("blog_hit",{p_key:key,p_vid:v}).then(function(r){if(!r)return;var S=STATS||{};S[key]=S[key]||{v:0,l:0,c:0};S[key].v=r.v;S[key].l=r.l;
      own("[data-v]").forEach(function(b){b.textContent=nf(r.v);var w=b.closest(".bl-sv");if(w)w.hidden=r.v<MINV});setLike(!!r.m,r.l);try{localStorage.setItem("gwm_bl_"+key,r.m?"1":"0")}catch(e){}}).catch(function(){})}
  loadStats().then(function(S){if(!S)return;var s=S[key]||{v:0,l:0,c:0};
    own("[data-v]").forEach(function(b){b.textContent=nf(s.v);var w=b.closest(".bl-sv");if(w)w.hidden=s.v<MINV});
    if(s.l)setLike(liked,s.l);count=s.c;setC()});
  function setC(){own("[data-c]").forEach(function(b){b.textContent=count?nf(count):"";var w=b.closest(".bl-sc");if(w)w.hidden=!count})}
  initComments(key,v,cmBox,function(n){count=n;setC()});
  /* artikel populer (sidebar): isi lewat daftar) */
  Promise.all([loadStats(),loadIdx()]).then(function(r){
    var S=r[0],L=r[1];if(!S||!L.length)return;
    var top=L.filter(function(p){return S[p.k]&&S[p.k].v>=MINV&&p.k!==key}).sort(function(a,b){return S[b.k].v-S[a.k].v}).slice(0,5),ol=$("#blPop .bl-rank");
    if(ol&&top.length>=3){popHead(ol);ol.innerHTML=top.map(function(p){return'<li data-k="'+esc(p.k)+'"><a href="'+ROOT+p.k+'"><b>'+esc(p.t)+'</b><span>'+esc(CN[p.c]||p.c)+' · <i><b>'+nf(S[p.k].v)+'</b> dibaca</i></span></a></li>'}).join("")}});
  /* Baca juga: halaman statis sudah punya; pembaca langsung (tulisan baru) dilengkapi dari index.json */
  if(!$(".bl-rel",root))loadIdx().then(function(L){
    var cat=key.split("/")[0],rest=L.filter(function(p){return p.k!==key}),
        pick=rest.filter(function(p){return p.c===cat}).concat(rest.filter(function(p){return p.c!==cat})).slice(0,3);
    if(!pick.length)return;
    var sec=document.createElement("section");sec.className="bl-rel";
    sec.innerHTML='<h2 class="bl-h2">Baca juga</h2><div class="bl-list">'+pick.map(function(p){var u=ROOT+p.k;
      return'<article class="bl-card bl-c-'+esc(p.c)+'"><a class="bl-th" href="'+u+'" tabindex="-1" aria-hidden="true">'+ic(p.c)+'<em>'+p.m+' mnt</em></a><div class="bl-cb"><p class="bl-bd"><span class="bl-badge">'+ic(p.c)+esc(CN[p.c]||p.c)+'</span><time>'+fd(p.d)+'</time></p><h2><a href="'+u+'">'+esc(p.t)+'</a></h2><p class="bl-ex">'+esc(p.x)+'</p></div></article>'}).join("")+'</div>';
    var cta=$(".bl-cta",root);if(cta)root.insertBefore(sec,cta);else root.appendChild(sec)})
}
/* ---- komentar ---- */
function initComments(key,v,box,onCount){
  if(!box)return;
  if(!SU||!SK||!v){box.innerHTML='<p class="bl-muted">Komentar belum tersedia di perangkat ini.</p>';return}
  var nm="";try{nm=localStorage.getItem("gwm_blname")||""}catch(e){}
  function item(c,fresh){var h=0,n=c.author||"?";for(var i=0;i<n.length;i++)h=(h*31+n.charCodeAt(i))%360;
    return'<li class="bl-ci'+(fresh?" new":"")+'" style="--h:'+h+'"><span class="bl-av" aria-hidden="true">'+esc(n.charAt(0).toUpperCase())+'</span><div><header><b>'+esc(n)+'</b><time datetime="'+esc(c.created_at)+'">'+esc(ago(c.created_at))+'</time></header><p>'+esc(c.body)+'</p></div></li>'}
  function render(list,ok){
    var t0=Date.now(),ord="new";
    box.innerHTML='<form class="bl-cf" id="blCf" novalidate><label class="sr" for="cfN">Nama</label><input type="text" id="cfN" maxlength="40" placeholder="Nama kamu" autocomplete="nickname" value="'+esc(nm)+'">'
      +'<label class="sr" for="cfB">Komentar</label><textarea id="cfB" maxlength="800" placeholder="Tulis komentar yang sopan dan membangun…"></textarea>'
      +'<input class="hp" type="text" id="cfH" tabindex="-1" autocomplete="off" aria-hidden="true"><p class="bl-cerr" id="cfE" role="alert" hidden></p><p class="bl-cnote">Tanpa email. Komentar langsung tampil, jadi jaga bahasa tetap sopan. Maksimal 1 tautan.</p>'
      +'<div class="bl-cr"><small id="cfC">0 / 800</small><button type="submit">Kirim komentar</button></div></form>'
      +(list.length>1?'<div class="bl-csort" id="cfS" role="group" aria-label="Urutkan komentar"><button type="button" class="on" data-o="new" aria-pressed="true">Terbaru</button><button type="button" data-o="old" aria-pressed="false">Terlama</button></div>':'')+'<ul class="bl-cl" id="blCl">'+(list.length?list.map(function(c){return item(c)}).join(""):'<li class="bl-muted" id="cfNone">Belum ada komentar. Jadilah yang pertama.</li>')+'</ul>';
    var f=$("#blCf",box),ta=$("#cfB",box),er=$("#cfE",box),ct=$("#cfC",box),sb=$("button[type=submit]",f);
    ta.addEventListener("input",function(){ct.textContent=ta.value.length+" / 800"});
    var cs=$("#cfS",box);if(cs)cs.addEventListener("click",function(e){var b=e.target.closest("button[data-o]");if(!b||b.getAttribute("data-o")===ord)return;ord=b.getAttribute("data-o");
      $$("button",cs).forEach(function(x){var on=x===b;x.classList.toggle("on",on);x.setAttribute("aria-pressed",on)});
      var ul=$("#blCl",box);[].slice.call(ul.children).reverse().forEach(function(c){ul.appendChild(c)})});
    f.addEventListener("submit",function(e){e.preventDefault();
      var n=$("#cfN",box).value.trim().replace(/\s+/g," "),b=ta.value.trim();er.hidden=true;
      function bad(m){er.textContent=m;er.hidden=false}
      if($("#cfH",box).value)return;
      if(Date.now()-t0<2500)return bad("Tunggu beberapa detik, lalu kirim lagi.");
      var last=0;try{last=+localStorage.getItem("gwm_blct")||0}catch(e){}
      var wait=30-Math.floor((Date.now()-last)/1000);if(wait>0&&wait<=30)return bad("Tunggu "+wait+" detik sebelum komentar berikutnya.");
      if(n.length<2)return bad("Isi nama minimal 2 huruf.");
      if(b.length<3)return bad("Komentar terlalu pendek.");
      var WF=window.IB_WordFilter;if(WF&&WF.check){var r=WF.check(n+" "+b);if(r&&r.blocked)return bad(WF.formatError(r))}
      sb.disabled=true;sb.textContent="Mengirim…";
      rpc("blog_comment_add",{p_key:key,p_name:n,p_body:b,p_vid:v}).then(function(c){
        try{localStorage.setItem("gwm_blname",n)}catch(e){}nm=n;ta.value="";ct.textContent="0 / 800";
        var none=$("#cfNone",box);if(none)none.remove();
        var ul=$("#blCl",box);ul.insertAdjacentHTML(ord==="new"?"afterbegin":"beforeend",item({author:c.author,body:c.body,created_at:c.created_at},true));
        try{localStorage.setItem("gwm_blct",String(Date.now()))}catch(e){}
        var nw=ord==="new"?ul.firstElementChild:ul.lastElementChild;if(nw&&nw.scrollIntoView)nw.scrollIntoView({block:"nearest",behavior:"smooth"});
        total++;onCount(total);toast("Komentar terkirim")})
       .catch(function(err){bad(err.message||"Gagal mengirim. Coba lagi.")})
       .then(function(){sb.disabled=false;sb.textContent="Kirim komentar"})})}
  var total=0;
  fetch(SU+"/rest/v1/blog_comments_public?post_key=eq."+encodeURIComponent(key)+"&select=id,author,body,created_at&order=created_at.desc&limit=100",{headers:{apikey:SK,Authorization:"Bearer "+SK}})
   .then(function(r){if(!r.ok)throw 0;return r.json()}).then(function(L){total=L.length;render(L);onCount(total)})
   .catch(function(){box.innerHTML='<p class="bl-muted">Komentar akan aktif sebentar lagi.</p>'})}
window.GWMBlog={initArticle:initArticle,paint:function(){return loadStats().then(paint)},ROOT:ROOT,CN:CN,nf:nf,esc:esc,ic:ic,fd:fd};
function boot(){initList();initArticle();if(!$("#blFeed"))loadStats().then(paint)}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
})();
