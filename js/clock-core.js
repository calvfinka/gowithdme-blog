/* Fungsi murni: tanggal dan jam untuk bilah atas halaman blog.
   Zona waktu mengikuti perangkat (WIB, WITA, WIT, atau GMT+n); cadangan Asia/Jakarta.
   Dipakai js/blog-clock.js; diuji di tests/clock-core.test.mjs. */
(function(root, factory){
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.IB_ClockCore = api;
})(typeof window !== "undefined" ? window : (typeof globalThis !== "undefined" ? globalThis : this), function(){
  var DEFAULT_TZ = "Asia/Jakarta";
  var LABEL = { "Asia/Jakarta": "WIB", "Asia/Pontianak": "WIB", "Asia/Makassar": "WITA", "Asia/Jayapura": "WIT" };
  function okTz(tz){
    if (!tz) return false;
    try { new Intl.DateTimeFormat("id-ID", { timeZone: tz }); return true; } catch (e) { return false; }
  }
  function deviceTz(){
    try { var t = new Intl.DateTimeFormat().resolvedOptions().timeZone; return okTz(t) ? t : DEFAULT_TZ; }
    catch (e) { return DEFAULT_TZ; }
  }
  function zoneLabel(tz, date){
    if (LABEL[tz]) return LABEL[tz];
    try {
      var p = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "shortOffset" }).formatToParts(date)
        .filter(function(x){ return x.type === "timeZoneName"; })[0];
      if (p && p.value) return p.value;
    } catch (e) {}
    return tz;
  }
  /* hasil: {date:"Minggu, 22 November 2026", time:"12:37:45", zone:"WIB", iso:"2026-11-22"} */
  function format(date, tz){
    date = date instanceof Date && !isNaN(date) ? date : new Date();
    tz = okTz(tz) ? tz : DEFAULT_TZ;
    var d = new Intl.DateTimeFormat("id-ID", { timeZone: tz, weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(date);
    var t = new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).format(date);
    var iso = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
    return { date: d, time: t, zone: zoneLabel(tz, date), iso: iso };
  }
  /* jeda ms sampai detik berikutnya, agar angka detik tidak telat */
  function untilNextSecond(date){
    date = date instanceof Date ? date : new Date();
    return 1000 - date.getMilliseconds() + 5;
  }
  return { format: format, deviceTz: deviceTz, untilNextSecond: untilNextSecond, DEFAULT_TZ: DEFAULT_TZ };
});
