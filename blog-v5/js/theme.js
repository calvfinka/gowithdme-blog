/* Tema terang/gelap. Dimuat di <head> supaya tidak berkedip. Pilihan diingat; awalnya mengikuti pengaturan perangkat. */
(function(){
  var K="gwm-theme",root=document.documentElement,pref=null;
  try{pref=localStorage.getItem(K)}catch(e){}
  function set(t,save){root.setAttribute("data-theme",t);if(save){try{localStorage.setItem(K,t)}catch(e){}}}
  set(pref==="dark"||pref==="light"?pref:(window.matchMedia&&matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"));
  /* belum memilih sendiri: ikut berubah bersama pengaturan perangkat (mis. jadwal gelap otomatis) */
  try{var mq=window.matchMedia("(prefers-color-scheme: dark)"),on=function(e){var saved=null;try{saved=localStorage.getItem(K)}catch(x){}if(saved!=="dark"&&saved!=="light")set(e.matches?"dark":"light")};
    if(mq.addEventListener)mq.addEventListener("change",on);else if(mq.addListener)mq.addListener(on)}catch(e){}
  document.addEventListener("DOMContentLoaded",function(){
    [].forEach.call(document.querySelectorAll("#theme,#mmTheme"),function(b){
      b.addEventListener("click",function(){set(root.getAttribute("data-theme")==="dark"?"light":"dark",true)});
    });
  });
})();
