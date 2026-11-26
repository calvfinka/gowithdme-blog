import test from 'node:test';
import assert from 'node:assert/strict';

const store = new Map();
globalThis.window = globalThis;
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => { store.set(k, String(v)); },
  removeItem: (k) => { store.delete(k); }
};

await import('../js/word-filter.js');
const WF = globalThis.IB_WordFilter;

test('blocks Indonesian profanity, judol, SARA, porn, and scam terms', () => {
  const cases = [
    ['Dasar anjing lo semua', 'profanity'],
    ['Ayo main slot gacor maxwin malam ini', 'judol'],
    ['Info togel sgp hari ini terpercaya', 'judol'],
    ['Open bo murah meriah area jakarta', 'porn'],
    ['Jasa joki pinjol ilegal cepat cair', 'scam'],
    ['Dasar kafir tidak pantas di sini', 'sara']
  ];
  for (const [text, expectedCat] of cases) {
    const res = WF.check(text);
    assert.equal(res.ok, false, `Expected "${text}" to be blocked`);
    assert.ok(res.categories.includes(expectedCat), `Expected category "${expectedCat}" for "${text}", got ${res.categories}`);
  }
});

test('catches obfuscated leetspeak, spaced, and repeated-character bypass attempts', () => {
  const obfuscated = [
    '4nj1ng banget sih',
    'g a c o r m4xw1n bosku',
    'a.n.j.i.n.g',
    'gaaaacooooor abisss',
    'k0nt0l lo',
    'sl0t88 g4c0r'
  ];
  for (const text of obfuscated) {
    const res = WF.check(text);
    assert.equal(res.ok, false, `Expected obfuscated "${text}" to be caught`);
  }
});

test('does not false-positive on normal Indonesian community & hiking sentences', () => {
  const cleanTexts = [
    'Analisis rute pendakian Gunung Prau via Patak Banteng untuk pemula',
    'Terima kasih banyak sudah berbagi konten tips konser',
    'Mencari teman nonton konser Hindia di Bandung minggu ini',
    'Titik kumpul di depan gerbang utama Taman Ismail Marzuki',
    'Kontrak sewa tenda dan patungan transportasi dari Kampung Rambutan',
    'Pantauan cuaca cerah berawan, jangan lupa bawa trash bag untuk sampah'
  ];
  for (const text of cleanTexts) {
    const res = WF.check(text);
    assert.equal(res.ok, true, `False positive on clean text: "${text}" (${JSON.stringify(res.matches)})`);
  }
});

test('supports custom admin word management (add, match, remove)', () => {
  store.clear();
  const added = WF.addCustomWord('calotiketnakal', 'scam');
  assert.equal(added.ok, true);
  assert.equal(WF.check('Hati-hati sama calotiketnakal di gate B').ok, false);

  WF.removeCustomWord('calotiketnakal');
  assert.equal(WF.check('Hati-hati sama calotiketnakal di gate B').ok, true);
});

test('enforce records violation tied to logged-in userId and returns user-facing message', () => {
  store.clear();
  const res = WF.enforce('Promo situs judol gacor 2026', {
    userId: 'a1b2c3d4-9999-4000-8000-111122223333',
    userLabel: 'RakaDago',
    context: 'forum_post',
    lang: 'id'
  });
  assert.equal(res.ok, false);
  assert.ok(res.message.includes('ID-A1B2C3D4') || res.message.includes('A1B2C3D4'));

  const logs = WF.getViolations();
  assert.equal(logs.length, 1);
  assert.equal(logs[0].userId, 'a1b2c3d4-9999-4000-8000-111122223333');
  assert.equal(logs[0].userLabel, 'RakaDago');
  assert.equal(logs[0].context, 'forum_post');
});

test('shortUid formats clean traceable member badge IDs', () => {
  assert.equal(WF.shortUid('123e4567-e89b-12d3-a456-426614174000'), 'ID-123E4567');
  assert.equal(WF.shortUid(null), 'GWM-GUEST');
});
