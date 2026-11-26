/* Penyaring HTML Arsip Blog (dipakai admin saat impor DAN halaman publik saat tampil). Hanya tag aman; gambar hanya https. */
(function(){
var OK={P:1,BR:1,H2:1,H3:1,H4:1,UL:1,OL:1,LI:1,STRONG:1,B:1,EM:1,I:1,U:1,S:1,STRIKE:1,A:1,BLOCKQUOTE:1,CODE:1,PRE:1,HR:1,TABLE:1,THEAD:1,TBODY:1,TFOOT:1,TR:1,TH:1,TD:1,IMG:1,FIGURE:1,FIGCAPTION:1,DIV:1,SPAN:1,SUB:1,SUP:1};
var MAP={H1:"h2",H5:"h4",H6:"h4"};
var DROP={SCRIPT:1,STYLE:1,OBJECT:1,EMBED:1,TEMPLATE:1,NOSCRIPT:1,SVG:1,MATH:1,FORM:1,TEXTAREA:1,SELECT:1,BUTTON:1,HEAD:1,TITLE:1,INPUT:1,LINK:1,META:1};
function esc(s){return String(s).replace(/[&<>"']/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#x27;"}[c]})}
function href(v){v=String(v||"").replace(/[\x00-\x20]+/g,"");return/^(https?:\/\/|mailto:|\/|#|\.\/|\.\.\/)/i.test(v)?v:""}
function src(v){v=String(v||"").replace(/[\x00-\x20]+/g,"");if(/^\/\//.test(v))v="https:"+v;v=v.replace(/^http:\/\//i,"https://");return/^https:\/\//i.test(v)?v:""}
function yt(u){var m=String(u||"").match(/(?:youtube(?:-nocookie)?\.com\/(?:embed|v)\/|youtu\.be\/)([\w-]{6,15})/i);return m?m[1]:""}
function walk(n){
  if(n.nodeType===3)return esc(n.nodeValue);if(n.nodeType!==1)return"";var T=n.tagName;
  if(T==="IFRAME"){var id=yt(n.getAttribute("src"));return id?'<p><a href="https://www.youtube.com/watch?v='+id+'" rel="noopener nofollow">Tonton video di YouTube</a></p>':""}
  if(DROP[T])return"";
  var inner=[].map.call(n.childNodes,walk).join("");if(!OK[T]&&!MAP[T])return inner;
  var t=MAP[T]||T.toLowerCase();
  if(t==="br"||t==="hr")return"<"+t+">";
  if(t==="img"){var s=src(n.getAttribute("src"));return s?'<img src="'+esc(s)+'" alt="'+esc(n.getAttribute("alt")||"")+'" loading="lazy" decoding="async">':""}
  if(t==="a"){var h=href(n.getAttribute("href"));return h?'<a href="'+esc(h)+'" rel="noopener nofollow">'+inner+"</a>":inner}
  if(t==="td"||t==="th"){var a="";["colspan","rowspan"].forEach(function(k){var v=parseInt(n.getAttribute(k),10);if(v>1&&v<50)a+=" "+k+'="'+v+'"'});return"<"+t+a+">"+inner+"</"+t+">"}
  if((t==="div"||t==="span")&&!inner.trim())return"";
  return"<"+t+">"+inner+"</"+t+">"}
function clean(h){return walk(new DOMParser().parseFromString("<body>"+String(h||"")+"</body>","text/html").body)}
function plain(h){var d=new DOMParser().parseFromString("<body>"+String(h||"").replace(/<br\s*\/?>/gi,"\n").replace(/<\/(p|div|li|h\d)>/gi,"\n")+"</body>","text/html");return(d.body.textContent||"").replace(/[ \t\r\f]+/g," ").replace(/\n\s*\n\s*/g,"\n").trim()}
window.ArsipSan={clean:clean,plain:plain,esc:esc};
})();
