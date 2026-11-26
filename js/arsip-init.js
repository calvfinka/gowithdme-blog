/* Klien Supabase untuk halaman Arsip (hanya baca, tanpa sesi login). Pengganti js/supa.js di situs utama, yang membawa banyak hal lain. */
if(/\.html$/.test(location.pathname))history.replaceState(null,"",location.pathname.replace(/index\.html$/,"").replace(/\.html$/,"")+location.search+location.hash);
(function(){
  var C=window.IB_CONFIG||{};
  window.sb=(window.supabase&&C.SUPABASE_URL&&C.SUPABASE_ANON_KEY)
    ?window.supabase.createClient(C.SUPABASE_URL,C.SUPABASE_ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}}):null;
})();
