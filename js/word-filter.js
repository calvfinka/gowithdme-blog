/* Sistem Pemblokiran Kata Terlarang (Wilayah Indonesia) — GWM
   Berjalan di browser (window.IB_WordFilter) dan Node.js (untuk unit test).
   Mendeteksi kata kasar, judi online (judol), SARA, pornografi, dan penipuan,
   termasuk variasi leetspeak / penyamaran tanda baca, serta mencatat User ID pengguna login. */
(function(root){
  "use strict";

  var STORE_WORDS = "gwm_custom_words_v1";
  var STORE_LOGS = "gwm_word_violations_v1";

  var CATEGORIES = {
    profanity: { id: "Kata Kasar & Umpatan", en: "Profanity & Insults" },
    judol:     { id: "Judi Online & Slot", en: "Online Gambling" },
    sara:      { id: "SARA & Ujaran Kebencian", en: "Hate Speech & Slurs" },
    porn:      { id: "Pornografi & Konten Eksplisit", en: "Explicit & Adult Content" },
    scam:      { id: "Penipuan & Spam Terlarang", en: "Scams & Illegal Spam" },
    custom:    { id: "Aturan Khusus Admin", en: "Admin Custom Rule" }
  };

  /* Daftar kata terlarang standar wilayah Indonesia (tanpa substring pendek yang memicu salah blokir) */
  var DEFAULT_WORDS = {
    profanity: [
      "anjing", "anjir", "anjay", "anjg", "ajg", "anjrit", "anjinglah",
      "babi", "babik", "bangsat", "bgst", "bgsd", "bangke",
      "bajingan", "brengsek", "keparat", "kampret", "kurang ajar",
      "kontol", "kntl", "memek", "mmk", "jembut", "jmbt", "peler", "pepek",
      "ngentot", "entot", "ngntt", "ngewe", "ewe",
      "jancok", "jancuk", "dancok", "cok", "cuk", "asu", "asw",
      "tolol", "goblok", "gblk", "bego", "idiot", "dongok", "dungu",
      "pecun", "lonte", "pelacur", "perek", "jablay", "puki", "pukimak",
      "kimak", "pantek", "sundala", "telaso", "tailaso", "cukimai",
      "sinting", "gelud", "bacot", "bacod", "bacotan", "cocot",
      "mampus", "modar", "setan", "iblis", "monyet", "kunyuk", "bedebah"
    ],
    judol: [
      "judol", "judi online", "slot gacor", "slot88", "gacor", "maxwin",
      "zeus slot", "olympus slot", "pragmatic play", "pg soft", "rtp slot",
      "scatter hitam", "bandar togel", "togel online", "togel sgp", "togel hk",
      "togel sdy", "toto macau", "sbobet", "casino online", "kasino online",
      "poker online", "dominoqq", "gaple online", "depo pulsa", "deposit pulsa",
      "wd cepat", "jackpot slot", "situs slot", "link gacor", "agen slot",
      "bo terpercaya", "bandar slot", "taruhan bola", "mix parlay"
    ],
    sara: [
      "kafir", "pribumi", "nonpri", "cina babi", "aseng", "kadrun", "cebong",
      "kampret politik", "bunuh saja", "bantai", "teroris", "radikal sara",
      "hina agama", "penista agama", "rasis", "dasar cina", "dasar jawa",
      "dasar batak", "dasar papua", "usir pendatang"
    ],
    porn: [
      "bokep", "bokepindo", "porno", "pornografi", "mesum", "cabul",
      "open bo", "vcs", "video call sex", "bo murah", "cewek panggilan",
      "pijat plus", "esek esek", "bugil", "telanjang", "toket", "tetek",
      "pentil", "colmek", "coli", "onani", "masturbasi", "hentai", "jav"
    ],
    scam: [
      "pinjol ilegal", "dana kaget palsu", "jasa joki pinjol", "gestun ilegal",
      "jual rekening", "sewa rekening", "beli rekening", "uang palsu",
      "upal", "narkoba", "sabu", "ganja", "ekstasi", "inex", "putaw",
      "obat aborsi", "jual obat keras", "calo tiket", "tiket palsu",
      "carding", "phishing", "hack akun", "jasa santet", "pesugihan"
    ]
  };

  /* Kata aman Indonesia yang tidak boleh salah deteksi jika dicek sebagai token biasa */
  var SAFE_ALLOWLIST = {
    "analisis": 1, "kasih": 1, "terimakasih": 1, "konten": 1, "konteks": 1,
    "kontrak": 1, "kontribusi": 1, "kampung": 1, "sampah": 1, "pantau": 1,
    "pantauan": 1, "asuransi": 1, "pelajar": 1, "pelajaran": 1, "penjelajah": 1,
    "bintang": 1, "penting": 1, "serius": 1, "masuk": 1, "kasar": 1,
    "mendaki": 1, "pendaki": 1, "pendakian": 1, "tasikmalaya": 1, "sukabumi": 1,
    "pasuruan": 1, "banyuwangi": 1, "bukittinggi": 1, "palembang": 1, "balikpapan": 1
  };

  var LEET_MAP = {
    "4": "a", "@": "a",
    "3": "e",
    "1": "i", "!": "i", "|": "i",
    "0": "o",
    "5": "s", "$": "s",
    "7": "t", "+": "t",
    "8": "b",
    "9": "g"
  };

  function safeStorageGet(key, fallback) {
    try {
      if (typeof localStorage === "undefined") return fallback;
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function safeStorageSet(key, val) {
    try {
      if (typeof localStorage === "undefined") return false;
      localStorage.setItem(key, JSON.stringify(val));
      return true;
    } catch (e) {
      return false;
    }
  }

  /* Normalisasi karakter tak terlihat, aksen, dan leetspeak */
  function normalizeBase(text) {
    var s = String(text == null ? "" : text).toLowerCase();
    try { s = s.normalize("NFKD").replace(/[\u0300-\u036f]/g, ""); } catch (e) {}
    /* Hapus zero-width characters */
    s = s.replace(/[\u200B-\u200F\uFEFF]/g, "");
    return s;
  }

  function deLeet(token) {
    var out = "";
    for (var i = 0; i < token.length; i++) {
      var ch = token.charAt(i);
      out += LEET_MAP[ch] || ch;
    }
    return out;
  }

  function collapseRepeats(s) {
    return s.replace(/(.)\1{2,}/g, "$1$1").replace(/(.)\1+/g, function(m, c) {
      return m.length >= 2 ? c : m;
    });
  }

  function buildDictionary(extraWords) {
    var dict = [];
    var seen = {};
    function add(word, category, source) {
      var w = normalizeBase(word).replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
      if (!w || w.length < 3) return;
      var key = w + "|" + category;
      if (seen[key]) return;
      seen[key] = 1;
      dict.push({
        word: w,
        compact: w.replace(/\s+/g, ""),
        category: CATEGORIES[category] ? category : "custom",
        source: source || "default",
        isPhrase: w.indexOf(" ") > -1
      });
    }
    Object.keys(DEFAULT_WORDS).forEach(function(cat) {
      DEFAULT_WORDS[cat].forEach(function(w) { add(w, cat, "default"); });
    });
    var stored = getCustomWords();
    stored.forEach(function(item) {
      if (typeof item === "string") add(item, "custom", "custom");
      else if (item && item.word) add(item.word, item.category || "custom", item.source || "custom");
    });
    if (Array.isArray(extraWords)) {
      extraWords.forEach(function(item) {
        if (typeof item === "string") add(item, "custom", "custom");
        else if (item && item.word) add(item.word, item.category || "custom", item.source || "custom");
      });
    }
    return dict;
  }

  function extractTokenForms(text) {
    var base = normalizeBase(text);
    /* Pisahkan token berdasarkan spasi atau tanda baca biasa */
    var rawTokens = base.split(/[^a-z0-9@!$+|]+/).filter(Boolean);
    var forms = [];
    rawTokens.forEach(function(tok) {
      if (SAFE_ALLOWLIST[tok]) return;
      var plain = tok.replace(/[^a-z0-9]/g, "");
      var leet = deLeet(tok).replace(/[^a-z0-9]/g, "");
      var sq = collapseRepeats(leet);
      forms.push(tok, plain, leet, sq);
    });

    /* Tangkap penyamaran satu huruf dipisah spasi/titik mis. "a.n.j.i.n.g" atau "s l o t" */
    var stripped = base.replace(/[\u200B-\u200F\uFEFF]/g, "");
    var spacedRuns = stripped.match(/(?:[a-z0-9@!$+|][\s._\-*]{1,2}){2,}[a-z0-9@!$+|]/g) || [];
    spacedRuns.forEach(function(run) {
      var glued = deLeet(run.replace(/[^a-z0-9@!$+|]/g, ""));
      if (glued.length >= 3 && !SAFE_ALLOWLIST[glued]) {
        forms.push(glued, collapseRepeats(glued));
      }
    });

    /* Buat teks bersih untuk pencocokan frasa (2+ kata) */
    var cleanSentence = rawTokens.map(function(t) { return deLeet(t).replace(/[^a-z0-9]/g, ""); }).filter(Boolean).join(" ");
    var squashedSentence = rawTokens.map(function(t) { return collapseRepeats(deLeet(t).replace(/[^a-z0-9]/g, "")); }).filter(Boolean).join(" ");

    var tokenSet = {};
    forms.forEach(function(f) { if (f && !SAFE_ALLOWLIST[f]) tokenSet[f] = 1; });
    return {
      tokenSet: tokenSet,
      cleanSentence: cleanSentence,
      squashedSentence: squashedSentence
    };
  }

  function hasWholePhrase(sentence, phrase) {
    if (!sentence || !phrase) return false;
    var escRe = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp("(?:^|\\s)" + escRe + "(?:$|\\s)").test(sentence);
  }

  function check(text, opts) {
    opts = opts || {};
    var str = String(text == null ? "" : text).trim();
    if (!str) return { ok: true, blocked: false, matches: [], categories: [] };

    var dict = buildDictionary(opts.extraWords);
    var parsed = extractTokenForms(str);
    var matches = [];
    var seenMatch = {};
    var catSet = {};

    dict.forEach(function(entry) {
      if (SAFE_ALLOWLIST[entry.word]) return;
      var matched = false;
      if (entry.isPhrase) {
        if (hasWholePhrase(parsed.cleanSentence, entry.word) ||
            hasWholePhrase(parsed.squashedSentence, entry.word) ||
            parsed.tokenSet[entry.compact]) {
          matched = true;
        }
      } else {
        if (parsed.tokenSet[entry.word] || parsed.tokenSet[collapseRepeats(entry.word)]) {
          matched = true;
        }
      }
      if (matched && !seenMatch[entry.word]) {
        seenMatch[entry.word] = 1;
        catSet[entry.category] = 1;
        matches.push({ word: entry.word, category: entry.category, source: entry.source });
      }
    });

    return {
      ok: matches.length === 0,
      blocked: matches.length > 0,
      matches: matches,
      categories: Object.keys(catSet)
    };
  }

  function maskWord(w) {
    if (!w || w.length <= 2) return "**";
    return w.charAt(0) + "*".repeat(Math.max(1, w.length - 2)) + w.charAt(w.length - 1);
  }

  function categoryLabel(cat, lang) {
    var c = CATEGORIES[cat] || CATEGORIES.custom;
    return lang === "en" ? c.en : c.id;
  }

  function formatError(res, opts) {
    opts = opts || {};
    var lang = opts.lang || (typeof window !== "undefined" && window.IB_LANG === "en" ? "en" : "id");
    var cats = (res.categories || []).map(function(c) { return categoryLabel(c, lang); });
    var catText = cats.join(", ") || categoryLabel("custom", lang);
    var masked = (res.matches || []).slice(0, 3).map(function(m) { return maskWord(m.word); }).join(", ");
    var uidTag = opts.userId ? " [ID: " + String(opts.userId).slice(0, 8).toUpperCase() + "]" : "";
    if (lang === "en") {
      return "Blocked by Indonesian content filter (" + catText + ": " + masked + "). Please use respectful language." + uidTag;
    }
    return "Diblokir filter kata terlarang Indonesia (" + catText + ": " + masked + "). Gunakan bahasa yang sopan." + uidTag;
  }

  function getCustomWords() {
    var list = safeStorageGet(STORE_WORDS, []);
    return Array.isArray(list) ? list : [];
  }

  function addCustomWord(word, category) {
    var w = normalizeBase(word).replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
    if (!w || w.length < 3) return { ok: false, error: "Minimal 3 karakter huruf/angka." };
    var cat = CATEGORIES[category] ? category : "custom";
    var cur = getCustomWords();
    if (cur.some(function(x) { return (typeof x === "string" ? x : x.word) === w; })) {
      return { ok: false, error: "Kata sudah ada di daftar blokir." };
    }
    cur.unshift({ word: w, category: cat, addedAt: new Date().toISOString() });
    safeStorageSet(STORE_WORDS, cur.slice(0, 500));
    return { ok: true, word: w, category: cat };
  }

  function removeCustomWord(word) {
    var w = normalizeBase(word).replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
    var cur = getCustomWords().filter(function(x) {
      return (typeof x === "string" ? x : x.word) !== w;
    });
    safeStorageSet(STORE_WORDS, cur);
    return cur;
  }

  function getAllWords() {
    return buildDictionary();
  }

  function getViolations() {
    var list = safeStorageGet(STORE_LOGS, []);
    return Array.isArray(list) ? list : [];
  }

  function recordViolation(details) {
    details = details || {};
    var entry = {
      id: "wv-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6),
      userId: details.userId || "anon",
      userLabel: details.userLabel || "Pengguna",
      context: details.context || "form",
      categories: details.categories || [],
      matchedWords: (details.matches || []).map(function(m) { return maskWord(m.word); }),
      excerpt: String(details.excerpt || "").slice(0, 120),
      createdAt: new Date().toISOString()
    };
    var cur = getViolations();
    cur.unshift(entry);
    safeStorageSet(STORE_LOGS, cur.slice(0, 120));

    /* Catat ke Supabase bila user sudah login dan fungsi RPC tersedia */
    try {
      if (root.sb && details.userId && details.userId !== "anon") {
        root.sb.rpc("log_word_violation", {
          p_context: entry.context,
          p_category: (entry.categories[0] || "custom"),
          p_words: entry.matchedWords.join(", "),
          p_excerpt: entry.excerpt
        }).then(function(){}, function(){});
      }
    } catch (e) {}
    return entry;
  }

  function clearViolations() {
    safeStorageSet(STORE_LOGS, []);
  }

  /* Helper utama untuk dipakai di seluruh formulir GWM */
  function enforce(text, opts) {
    opts = opts || {};
    var combined = Array.isArray(text) ? text.filter(Boolean).join(" ") : String(text == null ? "" : text);
    var res = check(combined, opts);
    if (!res.ok) {
      recordViolation({
        userId: opts.userId || "anon",
        userLabel: opts.userLabel || "Pengguna",
        context: opts.context || "input",
        categories: res.categories,
        matches: res.matches,
        excerpt: combined
      });
      res.message = formatError(res, opts);
    }
    return res;
  }

  function shortUid(uuid) {
    if (!uuid) return "GWM-GUEST";
    return "ID-" + String(uuid).replace(/-/g, "").slice(0, 8).toUpperCase();
  }

  var api = {
    CATEGORIES: CATEGORIES,
    DEFAULT_WORDS: DEFAULT_WORDS,
    SAFE_ALLOWLIST: SAFE_ALLOWLIST,
    check: check,
    enforce: enforce,
    formatError: formatError,
    categoryLabel: categoryLabel,
    maskWord: maskWord,
    shortUid: shortUid,
    getCustomWords: getCustomWords,
    addCustomWord: addCustomWord,
    removeCustomWord: removeCustomWord,
    getAllWords: getAllWords,
    getViolations: getViolations,
    recordViolation: recordViolation,
    clearViolations: clearViolations
  };

  root.IB_WordFilter = api;
})(typeof window !== "undefined" ? window : globalThis);
