// node ideas/_verify/tri2-math.test.js
const assert = require("assert");
const T = require("../fuji-triangle.js");

const ev = (s) => Math.log2(T.F[s.f] ** 2 * T.T[s.t]) - Math.log2(T.ISO[s.i] / 100);
const idx = (f, t, iso) => ({ f: T.F.indexOf(f), t: T.T.indexOf(t), i: T.ISO.indexOf(iso) });
const run = (anchor, key, to, extra = {}) => {
  const dr = extra.dr || "DR400";
  return T.solve(anchor, key, to, { limits: T.limits(dr), locked: extra.locked !== false, lockB: T.light(anchor), pref: extra.pref || "" });
};
let n = 0;
const test = (name, fn) => { fn(); n += 1; console.log("ok -", name); };

test("scales: 10 whole stops, 31 third-stop positions each", () => {
  for (const list of [T.F, T.T, T.ISO]) assert.strictEqual(list.length, T.STEPS + 1);
  assert.deepStrictEqual([T.F[3], T.F[27]], [1.4, 22]);
  assert.deepStrictEqual([T.T[0], T.T[T.MECH], T.T[30]], [30, 4000, 32000]);
  assert.deepStrictEqual([T.ISO[5], T.ISO[8], T.ISO[11], T.ISO[24]], [160, 320, 640, 12800]);
  // every third is within 0.15 stop of its nominal camera marking (f/1.1 and f/1.2 are the roughest roundings)
  for (const [list, stopsOf] of [[T.F, (v) => 2 * Math.log2(v)], [T.T, (v) => Math.log2(v / 30)], [T.ISO, (v) => Math.log2(v / 50)]]) {
    list.forEach((v, k) => assert.ok(Math.abs(stopsOf(v) - k / 3) < 0.15, `${v} is ${stopsOf(v)} stops, slot ${k / 3}`));
  }
});

test("+1 stop aperture -> shutter exactly -1 stop, EV equal within 1/3 stop", () => {
  const a = idx(2.8, 4000, 640);
  const r = run(a, "f", a.f + 3);
  assert.deepStrictEqual(r.s, { f: a.f + 3, t: a.t - 3, i: a.i });
  assert.strictEqual(T.T[r.s.t], 2000);
  assert.strictEqual(r.miss, 0);
  assert.ok(Math.abs(ev(r.s) - ev(a)) < 1 / 3, `${ev(r.s)} vs ${ev(a)}`);
});

test("every single-third move on any value keeps EV within 1/3 stop when not limited", () => {
  const a = idx(4, 1000, 800);
  for (const key of ["f", "t", "i"]) {
    for (let d = -6; d <= 6; d += 1) {
      const r = run(a, key, a[key] + d, { dr: "DR100" });
      if (r.miss) continue;
      assert.strictEqual(T.light(r.s), T.light(a));
      assert.ok(Math.abs(ev(r.s) - ev(a)) < 1 / 3, `${key}${d}`);
    }
  }
});

test("default compensation: aperture->shutter, shutter->aperture, ISO->shutter", () => {
  const a = idx(4, 1000, 800);
  assert.deepStrictEqual(run(a, "f", a.f - 1, { dr: "DR100" }).s, { ...a, f: a.f - 1, t: a.t + 1 });
  assert.deepStrictEqual(run(a, "t", a.t + 2, { dr: "DR100" }).s, { ...a, t: a.t + 2, f: a.f - 2 });
  assert.deepStrictEqual(run(a, "i", a.i + 3, { dr: "DR100" }).s, { ...a, i: a.i + 3, t: a.t + 3 });
  assert.deepStrictEqual(run(a, "f", a.f + 3, { dr: "DR100", pref: "i" }).s, { ...a, f: a.f + 3, i: a.i + 3 });
});

test("limit spillover: shutter hits 1/32000, spills to ISO, then reports what is left", () => {
  // Rays through the trees: f/2.8 1/16000 ISO 640 DR400. Opening to f/1.4 needs 1/64000.
  const a = idx(2.8, 16000, 640);
  const r = run(a, "f", 3, { dr: "DR400" });
  assert.strictEqual(T.T[r.s.t], 32000);
  assert.strictEqual(T.ISO[r.s.i], 640); // DR400 floor, cannot drop
  assert.strictEqual(r.miss, -3); // 1 stop over
  const r2 = run(a, "f", 3, { dr: "DR100" }); // without the DR floor ISO takes the last stop
  assert.strictEqual(T.ISO[r2.s.i], 320);
  assert.strictEqual(r2.miss, 0);
});

test("aperture limits f/1.4 and f/22; spill into ISO going slow", () => {
  const a = idx(2.8, 4000, 640);
  assert.strictEqual(T.F[run(a, "f", 0).s.f], 1.4);
  assert.strictEqual(T.F[run(a, "f", 30).s.f], 22);
  // ISO up 5 stops at f/22 1/30... shutter slowest is 1/30 on this scale; aperture takes the spill
  const b = idx(8, 60, 640);
  const r = run(b, "i", b.i + 6, { dr: "DR400" }); // +2 stops ISO: shutter 1/60 -> 1/250
  assert.strictEqual(T.T[r.s.t], 250);
  const c = idx(8, 60, 640);
  const r3 = run(c, "f", c.f + 6); // f/16 needs 1/15, below 1/30: shutter to 1/30, ISO up 1 stop
  assert.strictEqual(T.T[r3.s.t], 30);
  assert.strictEqual(T.ISO[r3.s.i], 1250);
  assert.strictEqual(r3.miss, 0);
});

test("DR floors: DR200 needs ISO >= 320, DR400 >= 640, else 160", () => {
  assert.strictEqual(T.ISO[T.limits("DR100").i[0]], 160);
  assert.strictEqual(T.ISO[T.limits("DR200").i[0]], 320);
  assert.strictEqual(T.ISO[T.limits("DR400").i[0]], 640);
  assert.strictEqual(T.ISO[T.limits("").i[0]], 160);
  const a = idx(4, 1000, 640);
  assert.strictEqual(T.ISO[run(a, "i", 0, { dr: "DR400" }).s.i], 640);
  assert.strictEqual(T.ISO[run(a, "i", 0, { dr: "DR200" }).s.i], 320);
  // ISO -> shutter compensation with no headroom: DR400 floor, ISO stays, nothing to do
  const r = run(a, "i", 0, { dr: "DR400" });
  assert.deepStrictEqual(r.s, a);
});

test("unlocked: only the moved value changes", () => {
  const a = idx(2.8, 4000, 640);
  const r = run(a, "f", a.f + 3, { locked: false });
  assert.deepStrictEqual(r.s, { ...a, f: a.f + 3 });
  assert.strictEqual(T.light(r.s) - T.light(a), -3);
});

test("drag is reversible: solving from the drag anchor returns to the original", () => {
  const a = idx(2.8, 16000, 640);
  for (const to of [0, 3, 6, 9, 12, 27]) run(a, "f", to);
  assert.deepStrictEqual(run(a, "f", a.f).s, a);
});

test("stop formatting", () => {
  assert.strictEqual(T.thirds(3, true), "+1 stop");
  assert.strictEqual(T.thirds(-2, true), "−⅔ stop");
  assert.strictEqual(T.thirds(4, true), "+1⅓ stops");
  assert.strictEqual(T.thirds(-6, true), "−2 stops");
});

test("every park shot maps onto the scale exactly", () => {
  const fs = require("fs");
  const src = fs.readFileSync(require("path").join(__dirname, "../ideas-data.js"), "utf8");
  const IDEAS = new Function(src + "; return IDEAS;")();
  for (const shot of IDEAS.shots) {
    const f = Number(shot.spec.aperture.replace("f/", ""));
    const t = Number(shot.spec.shutter.replace("1/", ""));
    const iso = Number(shot.spec.iso);
    assert.ok(T.F.includes(f) && T.T.includes(t) && T.ISO.includes(iso), shot.id);
    const lim = T.limits(shot.spec.dr);
    assert.ok(T.ISO.indexOf(iso) >= lim.i[0], `${shot.id} below DR floor`);
  }
});

console.log(`${n} passed`);
