import test from "node:test";
import assert from "node:assert/strict";
await import("../js/panel-core.js");
const { next } = globalThis.IB_PanelCore;
const H = 52;

test("kotak pencarian masih terlihat: panel tetap tersembunyi", () => {
  assert.equal(next(false, 300, H), false);
  assert.equal(next(false, H + 1, H), false);
});
test("kotak sudah lewat di bawah bilah atas: panel muncul", () => {
  assert.equal(next(false, H - 10, H), true);
  assert.equal(next(false, -200, H), true);
});
test("selisih mencegah berkedip di batas", () => {
  assert.equal(next(true, H + 20, H), true);   /* belum cukup jauh kembali: tetap tampil */
  assert.equal(next(true, H + 49, H), false);  /* sudah jauh: sembunyi */
  assert.equal(next(false, H - 2, H), false);  /* belum cukup lewat: tetap sembunyi */
});
test("angka rusak mempertahankan keadaan sekarang", () => {
  assert.equal(next(true, NaN, H), true);
  assert.equal(next(false, undefined, H), false);
});
