/* Lencana iklan di situs utama. Membaca view ads_live (Supabase REST, satu permintaan kecil, disimpan 5 menit di sessionStorage)
   lalu mengisi setiap elemen [data-ad-slot]. Tempat yang tidak punya iklan disembunyikan (kecuali kartu Beranda, yang menampilkan
   ajakan "Pasang iklan"). Diatur dari admin.gowithdme.com > Iklan & Lencana. Tanpa pustaka Supabase: cukup fetch.
   Klik dihitung lewat ad_click (anonim); Do Not Track / Global Privacy Control dihormati.  Dimatikan lewat IB_CONFIG.ADS_ENABLED=false. */
(function () {
  "use strict";
  var Core = window.IB_AdsCore, C = window.IB_CONFIG || {};
  if (!Core || !C.SUPABASE_URL || !C.SUPABASE_ANON_KEY || C.ADS_ENABLED === false) return;
  var LANG = document.documentElement.lang === "en" ? "en" : "id";
  var KEY = "gwm_ads_v1", CLK = "gwm_ads_clk", TTL = 300000, ERR_TTL = 60000, req = null;
  var FIELDS = "id,slot,title,body,label,url,tone,city,weight,starts_on,ends_on";

  function T(k, d) { try { var v = window.IB_T ? window.IB_T(k) : null; return v && v !== k ? v : d; } catch (e) { return d; } }
  function esc(s) { return Core.esc(s); }
  function cacheGet() {
    try {
      var o = JSON.parse(sessionStorage.getItem(KEY) || "null");
      if (o && Array.isArray(o.d) && Date.now() - o.t < (o.e ? ERR_TTL : TTL)) return o.d;
    } catch (e) {}
    return null;
  }
  function cacheSet(d, err) { try { sessionStorage.setItem(KEY, JSON.stringify({ t: Date.now(), d: d, e: !!err })); } catch (e) {} }

  function load() {
    var c = cacheGet();
    if (c) return Promise.resolve(c);
    if (req) return req;
    req = fetch(C.SUPABASE_URL + "/rest/v1/ads_live?select=" + FIELDS + "&limit=60", {
      headers: { apikey: C.SUPABASE_ANON_KEY, Accept: "application/json" }
    }).then(function (r) { if (!r.ok) throw new Error("ads " + r.status); return r.json(); })
      .then(function (d) { d = Array.isArray(d) ? d : []; cacheSet(d, false); return d; },
            function () { cacheSet([], true); return []; })
      .then(function (d) { req = null; return d; });
    return req;
  }

  function myCity() {
    try {
      var s = JSON.parse(localStorage.getItem("gwm_loc") || "null");
      return s && s.city && s.city !== "semua" ? String(s.city) : "";
    } catch (e) { return ""; }
  }

  /* Kartu ajakan di Beranda saat belum ada iklan: mengarah ke tab "Pasang Iklan" yang sudah ada. */
  function house(el) {
    el.innerHTML = '<h3><span>' + esc(T("rail_sponsor_h", "Partners")) + '</span></h3>' +
      '<b>' + esc(T("nv_promo", "Advertise")) + '</b>' +
      '<p>' + esc(T("promo_p", "")) + '</p>' +
      '<a class="btn pri block js-tab-link" data-ptab="promo" href="https://gowithdme.com/id/#promo">' + esc(T("nv_a_promo", "Promote")) + '</a>';
    el.setAttribute("data-ad-state", "house");
    el.hidden = false;
  }

  function fill(el, ads, city) {
    var slot = el.getAttribute("data-ad-slot"), def = Core.slot(slot);
    if (!def) return;
    var ad = Core.pick(ads, slot, { city: city || el.getAttribute("data-city") || myCity(), today: Core.todayWIB() });
    if (ad) {
      var html = Core.badgeHtml(ad, { fmt: def.fmt, lang: LANG });
      if (slot === "home_rail") html = '<h3><span>' + esc(T("rail_sponsor_h", "Partners")) + '</span></h3>' + html;
      el.innerHTML = html;
      el.setAttribute("data-ad-state", "ad");
      el.setAttribute("data-ad-id", ad.id);
      el.hidden = false;
    } else if (el.hasAttribute("data-house")) {
      house(el);
    } else {
      el.innerHTML = "";
      el.setAttribute("data-ad-state", "none");
      el.hidden = true;
    }
  }

  /* Isi semua tempat di dalam root (default: seluruh halaman). opts.city = kota konteks (mis. kota event yang dibuka). */
  function mount(root, opts) {
    var list = (root || document).querySelectorAll("[data-ad-slot]");
    if (!list.length) return Promise.resolve();
    var city = opts && opts.city;
    return load().then(function (ads) {
      [].forEach.call(list, function (el) { fill(el, ads, city); });
    });
  }

  function dnt() {
    return navigator.doNotTrack === "1" || window.doNotTrack === "1" || navigator.globalPrivacyControl === true;
  }
  function count(id) {
    if (!/^[0-9a-f-]{36}$/i.test(id || "") || dnt()) return;
    var seen = [];
    try { seen = JSON.parse(sessionStorage.getItem(CLK) || "[]"); } catch (e) {}
    if (seen.indexOf(id) > -1) return;           // satu klik per iklan per sesi
    seen.push(id);
    try { sessionStorage.setItem(CLK, JSON.stringify(seen)); } catch (e) {}
    try {
      fetch(C.SUPABASE_URL + "/rest/v1/rpc/ad_click", {
        method: "POST", keepalive: true,
        headers: { apikey: C.SUPABASE_ANON_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ p_id: id })
      }).catch(function () {});
    } catch (e) {}
  }
  function onClick(ev) {
    var a = ev.target && ev.target.closest ? ev.target.closest("a.ad-b[data-ad]") : null;
    if (a) count(a.getAttribute("data-ad"));
  }
  document.addEventListener("click", onClick, true);
  document.addEventListener("auxclick", onClick, true);

  window.IB_Ads = { mount: mount, reload: function () { try { sessionStorage.removeItem(KEY); } catch (e) {} return mount(); } };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { mount(); });
  else mount();
})();
