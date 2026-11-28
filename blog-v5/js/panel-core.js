/* Fungsi murni: kapan panel pencarian + kategori di bilah atas blog muncul.
   Muncul setelah kotak pencarian besar di judul tergulir keluar di bawah bilah atas; ada selisih (hysteresis)
   agar tidak berkedip saat posisi gulir tepat di batas. Dipakai js/blog-panel.js; diuji di tests/panel-core.test.mjs. */
(function(root, factory){
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.IB_PanelCore = api;
})(typeof window !== "undefined" ? window : (typeof globalThis !== "undefined" ? globalThis : this), function(){
  var IN = 4, OUT = 48;  /* px */
  /* anchorBottom: sisi bawah kotak pencarian besar; headBottom: sisi bawah bilah atas (keduanya relatif jendela) */
  function next(on, anchorBottom, headBottom){
    if (typeof anchorBottom !== "number" || typeof headBottom !== "number" || isNaN(anchorBottom) || isNaN(headBottom)) return !!on;
    if (!on) return anchorBottom < headBottom - IN;
    return !(anchorBottom > headBottom + OUT);
  }
  return { next: next, IN: IN, OUT: OUT };
});
