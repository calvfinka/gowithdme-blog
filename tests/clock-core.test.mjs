import test from "node:test";
import assert from "node:assert/strict";
await import("../js/clock-core.js");
const C = globalThis.IB_ClockCore;
const T = new Date("2026-11-22T05:37:45Z"); // 12:37:45 WIB

test("WIB: tanggal Indonesia dan jam 24 jam", () => {
  const r = C.format(T, "Asia/Jakarta");
  assert.equal(r.date, "Minggu, 22 November 2026");
  assert.equal(r.time, "12:37:45");
  assert.equal(r.zone, "WIB");
  assert.equal(r.iso, "2026-11-22");
});
test("WITA dan WIT bergeser, tanggal ikut berganti lewat tengah malam", () => {
  assert.equal(C.format(T, "Asia/Makassar").time, "13:37:45");
  assert.equal(C.format(T, "Asia/Makassar").zone, "WITA");
  const late = new Date("2026-11-22T16:30:00Z");
  const r = C.format(late, "Asia/Jayapura");
  assert.equal(r.zone, "WIT");
  assert.equal(r.iso, "2026-11-23");
  assert.equal(r.time, "01:30:00");
});
test("zona luar Indonesia memakai selisih GMT", () => {
  assert.match(C.format(T, "Asia/Tokyo").zone, /GMT\+9/);
});
test("zona rusak atau tanggal rusak jatuh ke Asia/Jakarta", () => {
  assert.equal(C.format(T, "Bukan/Zona").zone, "WIB");
  assert.equal(C.format(new Date("x"), "Asia/Jakarta").zone, "WIB");
});
test("jam tengah malam tampil 00, bukan 24", () => {
  assert.equal(C.format(new Date("2026-11-21T17:00:00Z"), "Asia/Jakarta").time, "00:00:00");
});
test("jeda ke detik berikutnya selalu antara 1 dan 1005 ms", () => {
  const a = C.untilNextSecond(new Date("2026-01-01T00:00:00.000Z"));
  const b = C.untilNextSecond(new Date("2026-01-01T00:00:00.999Z"));
  assert.ok(a <= 1005 && a > 900);
  assert.ok(b >= 1 && b <= 10);
});
