/* Inti lencana iklan (murni, tanpa DOM, bisa diuji di Node).
   Dipakai situs utama (js/ads.js) dan panel admin (validasi + pratinjau yang sama persis dengan tampilan situs).
   Katalog tempat, label, dan warna di sini HARUS sama dengan supabase/schema_iklan.sql (dicek oleh tests/ads-core.test.mjs).
   Salinan identik ada di repo admin (js/ads-core.js): ubah di satu tempat, salin ke yang lain. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.IB_AdsCore = factory();
})(typeof globalThis !== 'undefined' ? globalThis : typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* Tempat pemasangan. key = nilai di database; fmt = bentuk tampilan (card = kartu, strip = baris tipis). */
  var SLOTS = [
    { key: 'home_rail', page: 'Beranda', name: 'Kolom kanan', fmt: 'card',
      desc: 'Kartu di kolom kanan Beranda (di bawah Denyut Wilayah). Di HP tampil sebagai kartu di antara kartu Beranda. Paling terlihat oleh pengunjung baru.' },
    { key: 'home_top', page: 'Beranda', name: 'Atas daftar event', fmt: 'strip',
      desc: 'Baris tipis tepat di atas tab Event / Gunung / Blog di Beranda. Terlihat sebelum pengunjung mulai menelusuri daftar.' },
    { key: 'event_list', page: 'Halaman Event & Gunung', name: 'Atas daftar', fmt: 'strip',
      desc: 'Baris tipis di atas daftar event pada halaman Event dan Gunung. Dilihat pengunjung yang sedang mencari acara.' },
    { key: 'event_detail', page: 'Detail event', name: 'Bawah tombol aksi', fmt: 'card',
      desc: 'Kartu di jendela detail event, di bawah tombol Tiket/Bagikan. Bisa diarahkan ke kota tertentu (ikut kota event yang dibuka).' },
    { key: 'blog_post', page: 'Artikel blog', name: 'Sebelum komentar', fmt: 'strip',
      desc: 'Baris tipis di akhir artikel blog, sebelum kolom komentar. Dilihat pembaca yang sudah selesai membaca.' }
  ];

  /* Label wajib tampil agar pengunjung tahu ini iklan. Nilai database -> teks per bahasa. */
  var LABELS = {
    ad:      { id: 'Iklan',   en: 'Ad' },
    sponsor: { id: 'Sponsor', en: 'Sponsored' },
    partner: { id: 'Partner', en: 'Partner' },
    promo:   { id: 'Promo',   en: 'Promo' }
  };
  var TONES = [
    { key: 'brand',  name: 'Hijau' },
    { key: 'accent', name: 'Oranye' },
    { key: 'sky',    name: 'Biru' },
    { key: 'ink',    name: 'Hitam' }
  ];
  var LIMITS = { title: [2, 60], body: 140, url: 500, city: 60, weight: [1, 10] };

  function slotDef(key) {
    for (var i = 0; i < SLOTS.length; i++) if (SLOTS[i].key === key) return SLOTS[i];
    return null;
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function keys(list) { return list.map(function (x) { return x.key; }); }
  function labelText(key, lang) {
    var l = LABELS[key] || LABELS.ad;
    return l[lang === 'en' ? 'en' : 'id'];
  }
  /* Hanya https:// tanpa spasi. Selain itu dianggap tidak aman dan dikosongkan. */
  function safeUrl(u) {
    var s = String(u == null ? '' : u).trim();
    return /^https:\/\/[^\s"'<>]+$/i.test(s) && s.length <= LIMITS.url ? s : '';
  }
  function todayWIB(d) {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(d || new Date());
  }
  var ISO = /^\d{4}-\d{2}-\d{2}$/;

  /* Validasi isi formulir admin. Mengembalikan {ok, field, msg}. */
  function validate(f) {
    var o = f || {};
    function bad(field, msg) { return { ok: false, field: field, msg: msg }; }
    if (!slotDef(o.slot)) return bad('slot', 'Pilih tempat pemasangan.');
    var t = String(o.title || '').trim();
    if (t.length < LIMITS.title[0]) return bad('title', 'Judul minimal ' + LIMITS.title[0] + ' karakter.');
    if (t.length > LIMITS.title[1]) return bad('title', 'Judul maksimal ' + LIMITS.title[1] + ' karakter.');
    if (String(o.body || '').trim().length > LIMITS.body) return bad('body', 'Teks pendukung maksimal ' + LIMITS.body + ' karakter.');
    if (!LABELS[o.label]) return bad('label', 'Pilih label iklan.');
    if (!safeUrl(o.url)) return bad('url', 'Tautan harus diawali https:// (tanpa spasi).');
    if (keys(TONES).indexOf(o.tone) < 0) return bad('tone', 'Pilih warna.');
    if (String(o.city || '').trim().length > LIMITS.city) return bad('city', 'Nama kota terlalu panjang.');
    var w = Number(o.weight);
    if (!(w >= LIMITS.weight[0] && w <= LIMITS.weight[1]) || Math.floor(w) !== w) return bad('weight', 'Bobot harus bilangan bulat 1 sampai 10.');
    var s = o.starts_on ? String(o.starts_on) : '', e = o.ends_on ? String(o.ends_on) : '';
    if (s && !ISO.test(s)) return bad('starts_on', 'Tanggal mulai tidak valid.');
    if (e && !ISO.test(e)) return bad('ends_on', 'Tanggal akhir tidak valid.');
    if (s && e && e < s) return bad('ends_on', 'Tanggal akhir tidak boleh sebelum tanggal mulai.');
    return { ok: true, field: '', msg: '' };
  }

  /* Argumen RPC admin_save_ad dari isi formulir (sudah dirapikan). */
  function buildSaveArgs(f) {
    var o = f || {};
    function nz(v) { v = String(v == null ? '' : v).trim(); return v === '' ? null : v; }
    return {
      p_id: o.id || null,
      p_slot: o.slot,
      p_title: String(o.title || '').trim(),
      p_body: nz(o.body),
      p_label: o.label,
      p_url: String(o.url || '').trim(),
      p_tone: o.tone,
      p_city: nz(o.city),
      p_weight: Math.round(Number(o.weight)),
      p_starts: nz(o.starts_on),
      p_ends: nz(o.ends_on),
      p_active: o.active !== false,
      p_lead: o.lead_id || null
    };
  }

  /* live = sedang tayang; scheduled = belum mulai; ended = sudah lewat; off = dimatikan admin. */
  function statusOf(ad, today) {
    var t = today || todayWIB();
    if (!ad || ad.active === false) return 'off';
    if (ad.starts_on && String(ad.starts_on).slice(0, 10) > t) return 'scheduled';
    if (ad.ends_on && String(ad.ends_on).slice(0, 10) < t) return 'ended';
    return 'live';
  }
  function cityMatch(ad, city) {
    var a = String(ad && ad.city || '').trim().toLowerCase();
    if (!a) return true;                       // iklan semua kota
    var c = String(city || '').trim().toLowerCase();
    if (!c || c === 'semua') return true;      // pengunjung belum memilih kota: semua iklan boleh tampil
    return a === c;
  }

  /* Pilih satu iklan untuk satu tempat. Berbobot acak; iklan yang cocok dengan kota pengunjung bobotnya 3x.
     ctx: {city, today, rnd (fungsi 0..1, untuk uji)}. null bila tidak ada. */
  function pick(ads, slot, ctx) {
    var c = ctx || {}, rnd = c.rnd || Math.random, today = c.today || todayWIB();
    var city = String(c.city || '').trim().toLowerCase();
    var pool = (Array.isArray(ads) ? ads : []).filter(function (a) {
      return a && a.slot === slot && statusOf(a, today) === 'live' && cityMatch(a, c.city) && !!safeUrl(a.url);
    });
    if (!pool.length) return null;
    var ws = pool.map(function (a) {
      var w = Math.max(1, Math.min(10, Math.round(Number(a.weight) || 5)));
      if (city && city !== 'semua' && String(a.city || '').trim().toLowerCase() === city) w *= 3;
      return w;
    });
    var sum = ws.reduce(function (x, y) { return x + y; }, 0), r = rnd() * sum;
    for (var i = 0; i < pool.length; i++) { r -= ws[i]; if (r < 0) return pool[i]; }
    return pool[pool.length - 1];
  }

  /* Markup lencana. Dipakai situs dan pratinjau admin, jadi tampilan keduanya selalu sama. */
  function badgeHtml(ad, o) {
    var opt = o || {}, a = ad || {};
    var fmt = opt.fmt === 'strip' ? 'strip' : 'card', lang = opt.lang === 'en' ? 'en' : 'id';
    var tone = keys(TONES).indexOf(a.tone) > -1 ? a.tone : 'brand';
    var url = safeUrl(a.url), lab = labelText(a.label, lang);
    var inner = '<span class="ad-lab">' + esc(lab) + '</span>' +
      '<span class="ad-tx"><b>' + esc(a.title) + '</b>' + (a.body ? '<small>' + esc(a.body) + '</small>' : '') + '</span>' +
      '<svg class="ad-go" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
    var cls = 'ad-b ad-b--' + fmt + ' ad-t-' + tone;
    if (!url) return '<div class="' + cls + '">' + inner + '</div>';
    return '<a class="' + cls + '" href="' + esc(url) + '" target="_blank" rel="sponsored noopener noreferrer" data-ad="' +
      esc(a.id || '') + '" aria-label="' + esc(lab + ': ' + a.title) + '">' + inner + '</a>';
  }

  return {
    SLOTS: SLOTS, LABELS: LABELS, TONES: TONES, LIMITS: LIMITS,
    slot: slotDef, labelText: labelText, safeUrl: safeUrl, todayWIB: todayWIB,
    validate: validate, buildSaveArgs: buildSaveArgs, statusOf: statusOf, cityMatch: cityMatch,
    pick: pick, badgeHtml: badgeHtml, esc: esc
  };
});
