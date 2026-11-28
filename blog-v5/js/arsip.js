/* Halaman publik Arsip Blog: daftar (arsip?k=KOLEKSI&q=cari&p=2) dan baca (arsip?k=KOLEKSI&b=slug). Data dari tabel arsip_blog. */
(function(){
var S=ArsipSan,esc=S.esc,PER=20,Q=new URLSearchParams(location.search),k=Q.get("k")||"",b=Q.get("b")||"",q=(Q.get("q")||"").slice(0,80),l=Q.get("l")||"",pg=Math.max(1,parseInt(Q.get("p"),10)||1);
var main=document.getElementById("arMain"),MON=["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];
function fd(s){if(!s)return"";var d=new Date(s);return isNaN(d)?"":d.getDate()+" "+MON[d.getMonth()]+" "+d.getFullYear()}
function url(o){var p=new URLSearchParams();for(var x in o)if(o[x]!==""&&o[x]!=null&&!(x==="p"&&o[x]==1))p.set(x,o[x]);var s=p.toString();return"arsip"+(s?"?"+s:"")}
function fail(t){main.innerHTML='<p class="bl-empty">'+esc(t)+"</p>"}
if(!window.sb)return fail("Layanan belum siap. Muat ulang halaman.");
function cats(list){var h='<a href="arsip"'+(!k?' aria-current="page"':"")+'>Semua</a>'+list.map(function(c){return'<a href="'+url({k:c.koleksi})+'"'+(k===c.koleksi?' aria-current="page"':"")+">"+esc(c.koleksi)+" · "+c.jumlah+"</a>"}).join("");document.getElementById("arCats").innerHTML=h}
function card(r){return'<article class="bl-card"><h2><a href="'+url({k:r.koleksi,b:r.slug})+'">'+esc(r.title)+'</a></h2><p class="bl-meta"><span>'+esc(r.koleksi)+"</span>"+(r.published_at?" · "+fd(r.published_at):"")+"</p><p>"+esc(r.ringkasan||"")+"</p></article>"}
async function list(){
  document.title=(q?q+" – ":"")+"Arsip Blog – GoWithDME";
  var qq=sb.from("arsip_blog").select("title,slug,koleksi,ringkasan,published_at",{count:"exact"}).eq("jenis","post");
  if(k)qq=qq.eq("koleksi",k);if(l)qq=qq.contains("labels",[l]);
  var s=q.replace(/[,()%*\\]/g," ").trim();if(s)qq=qq.or("title.ilike.%"+s+"%,ringkasan.ilike.%"+s+"%");
  var r=await qq.order("published_at",{ascending:false,nullsFirst:false}).range((pg-1)*PER,pg*PER-1);
  if(r.error)return fail(/does not exist|schema cache/i.test(r.error.message)?"Arsip belum disiapkan.":"Gagal memuat arsip.");
  var n=r.count||0,pages=Math.max(1,Math.ceil(n/PER));
  main.innerHTML="<h1>Arsip Blog</h1><p class=\"bl-sub\">"+(k?"Koleksi "+esc(k)+". ":"")+n+" tulisan"+(l?" berlabel “"+esc(l)+"”":"")+".</p>"+
   '<form class="ar-search" method="get" action="arsip">'+(k?'<input type="hidden" name="k" value="'+esc(k)+'">':"")+'<input type="search" name="q" value="'+esc(q)+'" placeholder="Cari judul atau isi ringkas…" aria-label="Cari"><button class="btn" type="submit">Cari</button></form>'+
   (r.data&&r.data.length?'<div class="bl-list">'+r.data.map(card).join("")+"</div>":'<p class="bl-empty">Belum ada tulisan'+(q?" yang cocok":"")+".</p>")+
   (pages>1?'<div class="ar-pg">'+(pg>1?'<a class="btn ghost sm" href="'+url({k:k,q:q,l:l,p:pg-1})+'">← Baru</a>':"")+"<span>Halaman "+pg+" / "+pages+"</span>"+(pg<pages?'<a class="btn ghost sm" href="'+url({k:k,q:q,l:l,p:pg+1})+'">Lama →</a>':"")+"</div>":"")}
async function read(){
  var qq=sb.from("arsip_blog").select("title,slug,koleksi,src_id,body,labels,penulis,published_at").eq("slug",b);if(k)qq=qq.eq("koleksi",k);
  var r=await qq.limit(1);
  if(r.error)return fail("Gagal memuat tulisan.");
  var p=r.data&&r.data[0];if(!p)return fail("Tulisan tidak ditemukan.");
  document.title=p.title+" – Arsip Blog GoWithDME";
  var kr=await sb.from("arsip_komentar").select("penulis,body,published_at").eq("koleksi",p.koleksi).eq("post_src_id",p.src_id).order("published_at").limit(300);
  var ks=kr.data||[];
  main.innerHTML='<p class="bl-bc"><a href="arsip">Arsip</a> › <a href="'+url({k:p.koleksi})+'">'+esc(p.koleksi)+"</a></p><h1>"+esc(p.title)+'</h1><p class="bl-meta">'+(p.penulis?esc(p.penulis)+" · ":"")+fd(p.published_at)+"</p>"+
   (p.labels&&p.labels.length?'<div class="ar-lab">'+p.labels.map(function(x){return'<a href="'+url({k:p.koleksi,l:x})+'">'+esc(x)+"</a>"}).join("")+"</div>":"")+
   '<div class="bl-body">'+S.clean(p.body)+"</div>"+
   (ks.length?'<section class="bl-more"><h2>Komentar ('+ks.length+")</h2>"+ks.map(function(c){return'<div class="ar-kom"><b>'+esc(c.penulis||"Anonim")+"</b><span>"+fd(c.published_at)+"</span><p>"+esc(c.body)+"</p></div>"}).join("")+"</section>":"")}
sb.rpc("arsip_daftar_koleksi").then(function(r){if(!r.error)cats(r.data||[])});
(b?read():list()).catch(function(){fail("Terjadi kesalahan. Muat ulang halaman.")});
})();
