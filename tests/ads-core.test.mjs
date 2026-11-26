import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
globalThis.window = globalThis;
await import('../js/ads-core.js');
const A = globalThis.IB_AdsCore;
const sql = fs.readFileSync(new URL('../supabase/schema_iklan.sql', import.meta.url), 'utf8')
  .split('\n').filter((l) => !/^\s*--/.test(l)).join('\n');
const list = (s) => [...s.matchAll(/'([a-z_]+)'/g)].map((m) => m[1]);
const base = { slot: 'home_rail', title: 'Festival Kopi', body: '', label: 'ad', url: 'https://kopi.id/promo', tone: 'brand', weight: 5, city: '', starts_on: '', ends_on: '' };
const ad = (o) => ({ id: 'x', slot: 'home_rail', title: 'T1', label: 'ad', url: 'https://a.id', tone: 'brand', weight: 5, active: true, ...o });

test('katalog tempat, label, dan warna sama dengan SQL (isi dan urutan)', () => {
  const t = sql.match(/create table if not exists ad_badges[\s\S]*?\n\);/)[0];
  assert.deepEqual(list(t.match(/slot\s+text not null check \(slot in \(([^)]*)\)/)[1]), A.SLOTS.map((s) => s.key));
  assert.deepEqual(list(t.match(/label\s+text not null default 'ad' check \(label in \(([^)]*)\)/)[1]), Object.keys(A.LABELS));
  assert.deepEqual(list(t.match(/tone\s+text not null default 'brand' check \(tone in \(([^)]*)\)/)[1]), A.TONES.map((x) => x.key));
});
test('daftar tempat di admin_save_ad sama dengan katalog', () => {
  const f = sql.match(/function admin_save_ad[\s\S]*?end \$\$;/)[0];
  assert.deepEqual(list(f.match(/p_slot not in \(([^)]*)\)/)[1]), A.SLOTS.map((s) => s.key));
  assert.deepEqual(list(f.match(/p_label not in \(([^)]*)\)/)[1]), Object.keys(A.LABELS));
  assert.deepEqual(list(f.match(/p_tone not in \(([^)]*)\)/)[1]), A.TONES.map((x) => x.key));
});
test('izin admin memakai sponsor.view / sponsor.manage yang sudah ada (tanpa izin baru)', () => {
  const used = new Set([...sql.matchAll(/_ad_can\('([a-z_.]+)'\)/g)].map((m) => m[1]));
  assert.deepEqual([...used].sort(), ['sponsor.manage', 'sponsor.view']);
});
test('tabel tertutup untuk aplikasi, view publik tanpa kolom internal', () => {
  assert.match(sql, /alter table ad_badges enable row level security/);
  assert.match(sql, /create policy "admin only ad_badges" on ad_badges for all using \(false\)/);
  const v = sql.match(/create or replace view ads_live as\s+select ([^]*?)\s+from ad_badges/)[1];
  for (const c of ['clicks', 'created_by', 'lead_id', 'active']) assert.ok(!new RegExp('\\b' + c + '\\b').test(v), c);
  assert.match(sql, /grant execute on function ad_click\(uuid\) to anon, authenticated/);
  assert.ok(!/admin_save_ad[^;]*to anon/.test(sql));
});
test('setiap tempat punya bentuk (card/strip), nama, dan penjelasan', () => {
  A.SLOTS.forEach((s) => { assert.ok(['card', 'strip'].includes(s.fmt), s.key); assert.ok(s.name && s.page && s.desc.length > 30, s.key); });
  assert.equal(new Set(A.SLOTS.map((s) => s.key)).size, A.SLOTS.length);
});
test('safeUrl: hanya https tanpa spasi/kutip', () => {
  assert.equal(A.safeUrl('https://a.id/x?y=1'), 'https://a.id/x?y=1');
  for (const u of ['http://a.id', 'javascript:alert(1)', 'https://a.id/ b', 'https://a.id/"x', '//a.id', '', null, 'data:text/html,x']) assert.equal(A.safeUrl(u), '', String(u));
  assert.equal(A.safeUrl('https://a.id/' + 'x'.repeat(500)), '');
});
test('validate: batas judul, teks, label, warna, bobot, tanggal', () => {
  assert.equal(A.validate(base).ok, true);
  const f = (o) => A.validate({ ...base, ...o }).field;
  assert.equal(f({ slot: 'nope' }), 'slot'); assert.equal(f({ title: 'a' }), 'title'); assert.equal(f({ title: 'x'.repeat(61) }), 'title');
  assert.equal(f({ body: 'x'.repeat(141) }), 'body'); assert.equal(f({ label: 'x' }), 'label'); assert.equal(f({ url: 'http://a.id' }), 'url');
  assert.equal(f({ tone: 'pink' }), 'tone'); assert.equal(f({ weight: 0 }), 'weight'); assert.equal(f({ weight: 11 }), 'weight'); assert.equal(f({ weight: 2.5 }), 'weight');
  assert.equal(f({ starts_on: '2026-12-10', ends_on: '2026-12-01' }), 'ends_on'); assert.equal(f({ starts_on: '10/12/2026' }), 'starts_on');
  assert.equal(A.validate({ ...base, starts_on: '2026-12-01', ends_on: '2026-12-01' }).ok, true);
});
test('buildSaveArgs: kosong jadi null, angka bulat, argumen sesuai RPC', () => {
  const a = A.buildSaveArgs({ ...base, id: 'u1', title: '  Kopi  ', weight: '7', city: ' ', ends_on: '2026-12-31', active: false });
  assert.deepEqual(Object.keys(a), ['p_id', 'p_slot', 'p_title', 'p_body', 'p_label', 'p_url', 'p_tone', 'p_city', 'p_weight', 'p_starts', 'p_ends', 'p_active', 'p_lead']);
  assert.equal(a.p_title, 'Kopi'); assert.equal(a.p_weight, 7); assert.equal(a.p_city, null); assert.equal(a.p_body, null);
  assert.equal(a.p_starts, null); assert.equal(a.p_ends, '2026-12-31'); assert.equal(a.p_active, false); assert.equal(a.p_id, 'u1');
  const sig = sql.match(/function admin_save_ad\(([^)]*)\)/)[1].split(',').map((x) => x.trim().split(/\s+/)[0]);
  assert.deepEqual(sig, Object.keys(a));
});
test('statusOf: tayang, terjadwal, berakhir, nonaktif (batas inklusif)', () => {
  const t = '2026-12-05';
  assert.equal(A.statusOf(ad({}), t), 'live');
  assert.equal(A.statusOf(ad({ starts_on: '2026-12-05', ends_on: '2026-12-05' }), t), 'live');
  assert.equal(A.statusOf(ad({ starts_on: '2026-12-06' }), t), 'scheduled');
  assert.equal(A.statusOf(ad({ ends_on: '2026-12-04' }), t), 'ended');
  assert.equal(A.statusOf(ad({ active: false }), t), 'off');
});
test('pick: hanya tempat yang cocok, tayang, aman; kosong -> null', () => {
  const t = '2026-12-05', r = () => 0;
  assert.equal(A.pick([], 'home_rail', { today: t }), null);
  assert.equal(A.pick([ad({ slot: 'home_top' })], 'home_rail', { today: t, rnd: r }), null);
  assert.equal(A.pick([ad({ ends_on: '2026-12-01' })], 'home_rail', { today: t, rnd: r }), null);
  assert.equal(A.pick([ad({ url: 'javascript:1' })], 'home_rail', { today: t, rnd: r }), null);
  assert.equal(A.pick([ad({ id: 'ok' })], 'home_rail', { today: t, rnd: r }).id, 'ok');
});
test('pick: iklan kota hanya untuk kota itu; tanpa kota -> semua boleh; kota cocok berbobot 3x', () => {
  const t = '2026-12-05', all = ad({ id: 'all', weight: 5 }), bdg = ad({ id: 'bdg', city: 'Bandung', weight: 5 });
  assert.equal(A.pick([bdg], 'home_rail', { today: t, city: 'Surabaya', rnd: () => 0 }), null);
  assert.equal(A.pick([bdg], 'home_rail', { today: t, city: 'bandung', rnd: () => 0 }).id, 'bdg');
  assert.equal(A.pick([bdg], 'home_rail', { today: t, city: '', rnd: () => 0 }).id, 'bdg');
  assert.equal(A.pick([bdg], 'home_rail', { today: t, city: 'semua', rnd: () => 0 }).id, 'bdg');
  // di Bandung: all bobot 5, bdg bobot 15 -> total 20; 0.24 (4.8) jatuh ke all, 0.26 (5.2) ke bdg
  assert.equal(A.pick([all, bdg], 'home_rail', { today: t, city: 'Bandung', rnd: () => 0.24 }).id, 'all');
  assert.equal(A.pick([all, bdg], 'home_rail', { today: t, city: 'Bandung', rnd: () => 0.26 }).id, 'bdg');
  assert.equal(A.pick([all, bdg], 'home_rail', { today: t, city: 'Bandung', rnd: () => 0.999999 }).id, 'bdg');
});
test('pick: bobot mempengaruhi peluang', () => {
  const t = '2026-12-05', a = ad({ id: 'a', weight: 1 }), b = ad({ id: 'b', weight: 9 });
  let nb = 0; for (let i = 0; i < 1000; i++) if (A.pick([a, b], 'home_rail', { today: t, rnd: () => i / 1000 }).id === 'b') nb++;
  assert.equal(nb, 900);
});
test('badgeHtml: label per bahasa, escape, tautan aman, tanpa tautan -> bukan <a>', () => {
  const h = A.badgeHtml(ad({ id: 'i1', title: '<img src=x onerror=1>', body: 'a & b', label: 'sponsor', tone: 'sky', url: 'https://a.id/?x=1&y=2' }), { fmt: 'strip', lang: 'en' });
  assert.ok(h.includes('Sponsored') && h.includes('ad-b--strip') && h.includes('ad-t-sky'));
  assert.ok(!h.includes('<img') && h.includes('&lt;img') && h.includes('a &amp; b'));
  assert.ok(h.includes('rel="sponsored noopener noreferrer"') && h.includes('target="_blank"') && h.includes('data-ad="i1"'));
  assert.ok(h.includes('href="https://a.id/?x=1&amp;y=2"'));
  assert.ok(A.badgeHtml(ad({ label: 'ad' }), { lang: 'id' }).includes('>Iklan<'));
  assert.ok(A.badgeHtml(ad({}), { lang: 'xx' }).includes('>Iklan<'));
  assert.ok(!A.badgeHtml(ad({ url: 'https://a.id/"onclick="x' }), {}).includes('href'));
  const n = A.badgeHtml(ad({ url: 'http://a.id' }), {});
  assert.ok(n.startsWith('<div class="ad-b') && !n.includes('href'));
  assert.ok(A.badgeHtml(ad({ tone: 'evil" onclick="x' }), {}).includes('ad-t-brand'));
});
