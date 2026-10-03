(function () {
  // Every edge is the same 10 whole stops in 1/3-stop steps (31 positions), so ticks, labels and grid share one lattice.
  // Shutter 1/30–1/32000 spans the slowest shot (1/30) to the X-S20 e-shutter limit; aperture and ISO get the same span.
  const F = [1, 1.1, 1.2, 1.4, 1.6, 1.8, 2, 2.2, 2.5, 2.8, 3.2, 3.6, 4, 4.5, 5, 5.6, 6.4, 7.1, 8, 9, 10, 11, 13, 14, 16, 18, 20, 22, 25, 29, 32];
  const T = [30, 40, 50, 60, 80, 100, 125, 160, 200, 250, 320, 400, 500, 640, 800, 1000, 1250, 1600, 2000, 2500, 3200, 4000, 5000, 6400, 8000, 10000, 12800, 16000, 20000, 25600, 32000];
  const ISO = [50, 64, 80, 100, 125, 160, 200, 250, 320, 400, 500, 640, 800, 1000, 1250, 1600, 2000, 2500, 3200, 4000, 5000, 6400, 8000, 10000, 12800, 16000, 20000, 25600, 32000, 40000, 51200];
  const STEPS = 30;
  const MECH = 21; // 1/4000, last mechanical speed
  const KEYS = ["f", "t", "i"];
  const SIGN = { f: -1, t: -1, i: 1 }; // light gained per step up the scale
  const AUTO = { f: "t", t: "f", i: "t" };

  function isoFloor(dr) {
    const m = String(dr || "").match(/(\d{3})/);
    const n = m ? Number(m[1]) : 100;
    return n >= 400 ? 11 : n >= 200 ? 8 : 5; // ISO 640, 320, 160
  }

  function limits(dr) {
    return { f: [3, 27], t: [0, STEPS], i: [isoFloor(dr), 24] };
  }

  function nearest(list, value, inverse) {
    let best = 0;
    let gap = Infinity;
    list.forEach((item, k) => {
      const d = Math.abs(Math.log2(inverse ? 1 / item : item) - Math.log2(value));
      if (d < gap) { gap = d; best = k; }
    });
    return best;
  }

  const light = (s) => KEYS.reduce((sum, k) => sum + SIGN[k] * s[k], 0);
  const clampTo = (lim, k, v) => Math.max(lim[k][0], Math.min(lim[k][1], v));

  // Moves `key` to `idx` from `anchor`; with the lock on, restores the light of `lockB` with the preferred value, then the third.
  // `miss` is the light still missing in thirds: positive means under, negative over.
  function solve(anchor, key, idx, opt) {
    const lim = opt.limits;
    const s = { f: anchor.f, t: anchor.t, i: anchor.i };
    s[key] = clampTo(lim, key, idx);
    if (!opt.locked) return { s, miss: 0, by: [] };
    let need = opt.lockB - light(s);
    const first = opt.pref && opt.pref !== key ? opt.pref : AUTO[key];
    const second = KEYS.find((k) => k !== key && k !== first);
    const by = [];
    for (const c of [first, second]) {
      if (!need) break;
      const got = clampTo(lim, c, s[c] + need * SIGN[c]);
      if (got !== s[c]) by.push(c);
      need -= (got - s[c]) * SIGN[c];
      s[c] = got;
    }
    return { s, miss: need, by };
  }

  function thirds(n, unit) {
    const a = Math.abs(n);
    const whole = Math.floor(a / 3);
    const frac = ["", "⅓", "⅔"][a % 3];
    const num = `${whole || !frac ? whole : ""}${frac}`;
    const sign = n > 0 ? "+" : n < 0 ? "−" : "";
    if (!unit) return `${sign}${num}`;
    return `${sign}${num} ${a > 3 ? "stops" : "stop"}`;
  }

  const api = { F, T, ISO, STEPS, MECH, SIGN, AUTO, isoFloor, limits, nearest, light, solve, thirds };
  if (typeof module === "object" && module.exports) {
    module.exports = api;
    return;
  }

  const CSS = `
    .tri { width: 100%; max-width: 440px; margin: 0 auto; }
    .tri svg { display: block; width: 100%; height: auto; overflow: visible; font-family: inherit; -webkit-user-select: none; user-select: none; -webkit-tap-highlight-color: transparent; }
    .tri .ln { vector-effect: non-scaling-stroke; stroke-linecap: round; fill: none; }
    .tri .grid { stroke: #ece4d9; stroke-width: 1; }
    .tri .e-off { stroke: #e0d6c9; stroke-width: 1.5; }
    .tri .e-on { stroke: #968676; stroke-width: 1.5; }
    .tri .e-es { stroke-dasharray: 2.5 3; }
    .tri .tk { stroke: #968676; stroke-width: 1; }
    .tri .tk.off { stroke: #d8cdbf; }
    .tri .sl { fill: #6b5e54; font-size: 12.5px; font-weight: 420; font-variant-numeric: tabular-nums; transition: opacity 140ms ease-out; }
    .tri .pic { color: #8a7b6e; transition: opacity 140ms ease-out; }
    .tri .hid { opacity: 0; }
    .tri .ray { stroke-width: 1.25; stroke-opacity: 0.5; }
    .tri .ghost { fill: none; stroke: #9c4a32; stroke-width: 1.25; stroke-dasharray: 2 2; opacity: 0; transition: opacity 140ms ease-out; }
    .tri .ghost.on { opacity: 0.55; }
    .tri .mk { cursor: grab; outline: none; touch-action: none; }
    .tri.drag .mk, .tri.drag .trk { cursor: grabbing; }
    .tri .trk { stroke: transparent; stroke-width: 22; pointer-events: stroke; cursor: pointer; }
    .tri .hit { fill: transparent; }
    .tri .dot { stroke: #fbf7f2; stroke-width: 2; transition: r 140ms ease-out; }
    .tri .mk:hover .dot, .tri .mk.act .dot { r: 7.5; }
    .tri .ring { fill: none; stroke-width: 1.5; opacity: 0; }
    .tri .mk:focus-visible .ring { opacity: 1; }
    .tri.ptr .mk:focus-visible .ring { opacity: 0; }
    .tri .pill rect { stroke-width: 1; }
    .tri .pv { font-size: 14.5px; font-weight: 680; letter-spacing: -0.01em; font-variant-numeric: tabular-nums; }
    .tri .pd { font-size: 10px; font-weight: 580; font-variant-numeric: tabular-nums; }
    .tri .r-cur .dot { fill: #9c4a32; } .tri .r-cur .ring { stroke: #9c4a32; }
    .tri .r-cur.ray { stroke: #9c4a32; }
    .tri .r-cur rect { fill: #fbf7f2; stroke: #e6cfc4; } .tri .r-cur text { fill: #9c4a32; }
    .tri .r-user rect { fill: #f7ebe5; stroke: #dcb4a5; }
    .tri .r-comp .dot { fill: #22686b; } .tri .r-comp .ring { stroke: #22686b; }
    .tri .r-comp.ray { stroke: #22686b; stroke-opacity: 0.65; }
    .tri .r-comp rect { fill: #e7f1f0; stroke: #a9cdca; } .tri .r-comp text { fill: #1d5c5f; }
    .tri .badge rect { fill: #fbf7f2; stroke: #e0d3c4; stroke-width: 1; }
    .tri .bl { fill: #1a140f; font-size: 12.5px; font-weight: 580; }
    .tri .be { fill: #6b5e54; font-size: 11.5px; font-weight: 420; font-variant-numeric: tabular-nums; }
    .tri .bs { fill: #9c4a32; font-size: 11px; font-weight: 580; font-variant-numeric: tabular-nums; }
    .tri .bicon { color: #6b5e54; }
    .tri .chip rect { stroke-width: 1; }
    .tri .chip text { font-size: 10.5px; font-weight: 580; }
    .tri .c-es rect { fill: #f3ece3; stroke: #d6c9ba; } .tri .c-es text { fill: #5c5047; }
    .tri .c-miss rect { fill: #fbeee2; stroke: #e2b98f; } .tri .c-miss text { fill: #874a12; }
    .tri .ctl { display: flex; align-items: center; gap: 8px; margin-top: 6px; font-size: 12px; line-height: 1; color: #6b5e54; }
    .tri .seg { display: inline-flex; padding: 2px; border: 1px solid #e0d3c4; border-radius: 999px; background: #f3ece3; }
    .tri button, .tri select { font: inherit; color: inherit; }
    .tri .seg button { display: inline-flex; align-items: center; gap: 4px; height: 24px; padding: 0 10px; border: 0; border-radius: 999px; background: transparent; cursor: pointer; transition: background-color 140ms ease-out, color 140ms ease-out; }
    .tri .seg button[aria-pressed="true"] { background: #fbf7f2; color: #1a140f; font-weight: 580; box-shadow: 0 0 0 1px #e0d3c4; }
    .tri .seg svg { width: 12px; height: 12px; }
    .tri .with { display: inline-flex; align-items: center; gap: 5px; min-width: 0; transition: opacity 140ms ease-out; }
    .tri .with.off { opacity: 0.45; }
    .tri select { height: 28px; padding: 0 22px 0 9px; border: 1px solid #e0d3c4; border-radius: 999px; background: #fbf7f2 url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' fill='none' stroke='%236b5e54' stroke-width='1.4' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") no-repeat right 8px center / 9px 6px; color: #1a140f; -webkit-appearance: none; appearance: none; cursor: pointer; }
    .tri .reset { margin-left: auto; height: 28px; padding: 0 11px; border: 1px solid #e0d3c4; border-radius: 999px; background: #fbf7f2; color: #1a140f; cursor: pointer; transition: opacity 140ms ease-out; }
    .tri .reset:disabled { opacity: 0.4; cursor: default; }
    .tri button:focus-visible, .tri select:focus-visible { outline: 2px solid #9c4a32; outline-offset: 1px; }
    @container (max-width: 360px) { .tri .with > span { display: none; } }
    @media (prefers-reduced-motion: reduce) { .tri * { transition: none !important; } }
  `;

  const NS = "http://www.w3.org/2000/svg";
  const W = 400;
  const SIDE = 240;
  const AP = [200, 20];
  const BL = [AP[0] - SIDE / 2, AP[1] + (SIDE * Math.sqrt(3)) / 2];
  const BR = [AP[0] + SIDE / 2, BL[1]];
  const H = 272;
  const MID = [(AP[0] + BL[0] + BR[0]) / 3, (AP[1] + BL[1] + BR[1]) / 3];
  const GAP = 8; // perpendicular gap from an edge to anything labelling it
  const TICK = [3, 5];
  const PIC = 18;
  const COT60 = 1 / Math.sqrt(3);
  const SIN60 = Math.sqrt(3) / 2;
  const LABELED = [3, 9, 15, 21, 27];
  const r2 = (n) => Math.round(n * 100) / 100;
  const lerp = (p, q, u) => [p[0] + (q[0] - p[0]) * u, p[1] + (q[1] - p[1]) * u];

  const AXES = {
    f: { from: BL, to: AP, side: "l", list: F, text: (v) => `f/${v}`, name: "Aperture", unit: "" },
    t: { from: BR, to: AP, side: "r", list: T, text: (v) => `1/${v}`, name: "Shutter", unit: " second" },
    i: { from: BL, to: BR, side: "b", list: ISO, text: (v) => String(v), name: "ISO", unit: "" },
  };
  const pillText = (k, idx) => (k === "i" ? `ISO ${ISO[idx]}` : AXES[k].text(AXES[k].list[idx]));

  // Center of a w×h box beside the edge at u, its nearest corner exactly GAP from the edge line.
  function place(k, u, w, h) {
    const ax = AXES[k];
    const p = lerp(ax.from, ax.to, u);
    const dx = (h / 2) * COT60 + GAP / SIN60 + w / 2;
    if (ax.side === "l") return [p[0] - dx, p[1]];
    if (ax.side === "r") return [p[0] + dx, p[1]];
    return [p[0], p[1] + GAP + h / 2];
  }

  function outward(k) {
    const ax = AXES[k];
    if (ax.side === "b") return [0, 1];
    const d = [ax.to[0] - ax.from[0], ax.to[1] - ax.from[1]];
    const len = Math.hypot(d[0], d[1]);
    const n = [d[1] / len, -d[0] / len];
    return ax.side === "l" ? (n[0] < 0 ? n : [-n[0], -n[1]]) : (n[0] > 0 ? n : [-n[0], -n[1]]);
  }

  const boxAt = (c, w, h) => ({ l: c[0] - w / 2, r: c[0] + w / 2, t: c[1] - h / 2, b: c[1] + h / 2 });
  const hits = (a, b, pad) => a.l < b.r + pad && b.l < a.r + pad && a.t < b.b + pad && b.t < a.b + pad;

  function el(name, attrs, parent) {
    const node = document.createElementNS(NS, name);
    for (const key in attrs) node.setAttribute(key, attrs[key]);
    if (parent) parent.appendChild(node);
    return node;
  }

  let ctx = null;
  function textWidth(text, size, weight, family) {
    if (!ctx) ctx = document.createElement("canvas").getContext("2d");
    ctx.font = `${weight} ${size}px ${family}`;
    return ctx.measureText(text).width;
  }

  const STROKE = 'fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"';
  const PERSON = '<circle cx="9" cy="8" r="2.5" fill="currentColor"/><path d="M4.2 16.5c.6-3.4 2.4-5 4.8-5s4.2 1.6 4.8 5z" fill="currentColor"/>';
  const runner = (dx, cls) => `<g class="${cls}" transform="translate(${dx} 0)"><circle cx="10.6" cy="4.2" r="1.6" fill="currentColor"/><path d="M10 6.2 8.6 10.4M6.4 8.2l2.6-1.4 2.4 1.8M8.6 10.4l2.4 2-0.4 3.4M8.6 10.4l-2 2.2-2.2.4" ${STROKE} stroke-width="1.3"/></g>`;
  const BOKEH = [[4.2, 5.4], [13.8, 4.8], [14.6, 11.6], [3.4, 11.8]];
  const GRAIN = [[3, 3], [6, 2.6], [13, 3], [15, 5], [3.4, 6.4], [14.6, 8.6], [2.8, 10], [15.2, 12.4], [5.4, 4.6], [12.2, 5.6], [3.6, 13.6], [7.2, 3.8], [11, 2.4], [14, 14.8], [2.6, 15.6], [9.6, 13.6], [7.6, 15], [8.4, 7.4], [11.2, 9.6], [5.6, 10.8], [12.4, 14.2], [10.4, 3.6], [4.4, 8.4], [15.4, 2.6]];

  function picture(kind) {
    const frame = `<rect x="0.6" y="0.6" width="16.8" height="16.8" rx="3.4" ${STROKE}/>`;
    if (kind === "blur") return frame + BOKEH.map(([x, y]) => `<circle class="bk" cx="${x}" cy="${y}" r="2" fill="currentColor"/>`).join("") + PERSON;
    if (kind === "sharp") return frame + `<path d="M2.4 10.6 4.6 4.4 6.8 10.6zM11.2 10.6l2.2-6.2 2.2 6.2z" ${STROKE}/>` + PERSON;
    if (kind === "motion") return frame + runner(-3.4, "gh1") + runner(-1.7, "gh2") + runner(0, "") + `<path class="streak" d="" ${STROKE}/>`;
    if (kind === "frozen") return frame + runner(-1, "") + `<path d="M3 3.2v2M2 4.2h2" ${STROKE} opacity="0.7"/>`;
    if (kind === "clean") return frame + PERSON;
    return frame + PERSON + GRAIN.map(([x, y], n) => `<circle class="gr" data-n="${n}" cx="${x}" cy="${y}" r="0.75" fill="currentColor"/>`).join("");
  }

  function lightKind(name) {
    if (name === "low sun") return "low";
    if (name === "open shade" || name === "soft light") return "cloud";
    if (name === "deep shade" || name === "edge light") return "tree";
    if (name === "backlight" || name === "dappled") return "back";
    return "sun";
  }

  function lightIcon(kind) {
    const s = 'fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"';
    if (kind === "low") return `<path d="M2.5 11.5h11" ${s}/><path d="M4.5 11.5a3.5 3.5 0 0 1 7 0" ${s}/>`;
    if (kind === "cloud") return `<path d="M4.6 12h6.4a2.2 2.2 0 0 0 .2-4.4 2.8 2.8 0 0 0-5.4-.4A2 2 0 0 0 4.6 12z" ${s}/>`;
    if (kind === "tree") return `<path d="M8 2.5 4.2 10h7.6L8 2.5z" ${s}/><path d="M8 10v3.5" ${s}/>`;
    if (kind === "back") return `<circle cx="8" cy="8" r="2.3" ${s}/><path d="M8 2.2v1.6M8 12.2v1.6M2.2 8h1.6M12.2 8h1.6M4 4l1.1 1.1M10.9 10.9 12 12M12 4l-1.1 1.1M5.1 10.9 4 12" ${s}/>`;
    return `<circle cx="8" cy="8" r="2.4" ${s}/><path d="M8 1.8v1.7M8 12.5v1.7M1.8 8h1.7M12.5 8h1.7M3.4 3.4l1.2 1.2M11.4 11.4l1.2 1.2M12.6 3.4 11.4 4.6M4.6 11.4 3.4 12.6" ${s}/>`;
  }

  const LOCK = '<svg viewBox="0 0 12 12" aria-hidden="true"><rect x="2.2" y="5.2" width="7.6" height="5.4" rx="1.4" fill="currentColor"/><path d="M3.8 5.2V3.9a2.2 2.2 0 0 1 4.4 0v1.3" fill="none" stroke="currentColor" stroke-width="1.3"/></svg>';

  function mount(host, opt) {
    const lim = limits(opt.dr);
    const orig = { f: nearest(F, opt.f), t: nearest(T, opt.t, true), i: nearest(ISO, opt.iso) };
    const origTitle = { f: opt.fLabel, t: opt.tLabel, i: `ISO ${opt.iso}` };
    const ev0 = Number(opt.ev);
    const family = getComputedStyle(host).fontFamily || "sans-serif";
    const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const st = {
      v: { ...orig },
      disp: { ...orig },
      role: { f: null, t: null, i: null },
      locked: true,
      pref: "",
      lockB: light(orig),
      anchor: null,
      anchorKey: null,
      miss: 0,
    };

    host.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="group" aria-label="Exposure triangle. Drag or use arrow keys on a value."></svg>
      <div class="ctl">
        <div class="seg" role="group" aria-label="Exposure mode"><button type="button" data-mode="lock" aria-pressed="true" title="Keep this exposure; other values compensate">${LOCK}Lock</button><button type="button" data-mode="free" aria-pressed="false" title="Values move on their own; the badge shows the change">Free</button></div>
        <label class="with"><span>Compensate</span><select aria-label="Compensate with">
          <option value="">Auto</option><option value="f">Aperture</option><option value="t">Shutter</option><option value="i">ISO</option>
        </select></label>
        <button type="button" class="reset" disabled>Reset</button>
      </div>`;
    const svg = host.querySelector("svg");

    // Static layer: grid, edges, ticks, labels, pictograms.
    const gGrid = el("g", { "aria-hidden": "true" }, svg);
    for (let s = 1; s < 10; s += 1) {
      const u = s / 10;
      const segs = [[lerp(BL, AP, u), lerp(BR, AP, u)], [lerp(BL, BR, u), lerp(BR, AP, 1 - u)], [lerp(BL, BR, u), lerp(BL, AP, u)]];
      for (const [p, q] of segs) el("line", { class: "ln grid", x1: r2(p[0]), y1: r2(p[1]), x2: r2(q[0]), y2: r2(q[1]) }, gGrid);
    }
    const gScale = el("g", { "aria-hidden": "true" }, svg);
    const labels = [];
    const pics = {};
    for (const k of KEYS) {
      const ax = AXES[k];
      const n = outward(k);
      const seg = (a, b, cls) => {
        const p = lerp(ax.from, ax.to, a / STEPS);
        const q = lerp(ax.from, ax.to, b / STEPS);
        el("line", { class: `ln ${cls}`, x1: r2(p[0]), y1: r2(p[1]), x2: r2(q[0]), y2: r2(q[1]) }, gScale);
      };
      seg(0, STEPS, "e-off");
      if (k === "t") {
        seg(lim.t[0], MECH, "e-on");
        seg(MECH, lim.t[1], "e-on e-es");
      } else seg(lim[k][0], lim[k][1], "e-on");
      for (let s = 0; s <= STEPS; s += 1) {
        const p = lerp(ax.from, ax.to, s / STEPS);
        const len = s % 3 === 0 ? TICK[1] : TICK[0];
        const off = s < lim[k][0] || s > lim[k][1];
        el("line", { class: `ln tk${off ? " off" : ""}`, "data-k": k, "data-s": s, x1: r2(p[0]), y1: r2(p[1]), x2: r2(p[0] + n[0] * len), y2: r2(p[1] + n[1] * len) }, gScale);
      }
      for (const s of LABELED) {
        const text = ax.text(ax.list[s]);
        const w = textWidth(text, 12.5, 420, family);
        const h = 9;
        const c = place(k, s / STEPS, w, h);
        const anchor = ax.side === "l" ? "end" : ax.side === "r" ? "start" : "middle";
        const x = ax.side === "l" ? c[0] + w / 2 : ax.side === "r" ? c[0] - w / 2 : c[0];
        const node = el("text", { class: "sl", x: r2(x), y: r2(c[1]), "text-anchor": anchor, "dominant-baseline": "central", "data-k": k, "data-s": s }, gScale);
        node.textContent = text;
        labels.push({ node, k, s, text, h: 12.5 });
      }
    }
    const kinds = { f: ["blur", "sharp"], t: ["motion", "frozen"], i: ["clean", "noisy"] };
    const picAt = {};
    for (const k of KEYS) {
      kinds[k].forEach((kind, end) => {
        let c = place(k, end, PIC, PIC);
        // ISO pictograms stack under the corner pictograms, clear of the ISO labels.
        if (k === "i") {
          const above = picAt[end ? "motion" : "blur"];
          c = [above[0], above[1] + PIC + 4];
        }
        picAt[kind] = c;
        const g = el("g", { class: "pic", "data-kind": kind, transform: `translate(${r2(c[0] - PIC / 2)} ${r2(c[1] - PIC / 2)})` }, gScale);
        g.innerHTML = picture(kind);
        pics[kind] = { g, box: boxAt(c, PIC, PIC) };
      });
    }

    // Live layer.
    const gRays = el("g", { "aria-hidden": "true" }, svg);
    const gGhost = el("g", { "aria-hidden": "true" }, svg);
    const gTrack = el("g", {}, svg);
    const badge = el("g", { class: "badge", "aria-hidden": "true" }, svg);
    const chips = el("g", { "aria-hidden": "true" }, svg);
    const gPill = el("g", { "aria-hidden": "true" }, svg);
    const gMark = el("g", {}, svg);
    const parts = {};
    for (const k of KEYS) {
      const ax = AXES[k];
      const ray = el("line", { class: "ln ray r-cur", x2: r2(MID[0]), y2: r2(MID[1]) }, gRays);
      const o = lerp(ax.from, ax.to, orig[k] / STEPS);
      const ghost = el("circle", { class: "ghost", cx: r2(o[0]), cy: r2(o[1]), r: 6 }, gGhost);
      el("line", { class: "trk", "data-k": k, x1: ax.from[0], y1: ax.from[1], x2: ax.to[0], y2: ax.to[1] }, gTrack);
      const pill = el("g", { class: "pill r-cur" }, gPill);
      const rect = el("rect", { rx: 7 }, pill);
      const pv = el("text", { class: "pv", "text-anchor": "middle", "dominant-baseline": "central" }, pill);
      const pd = el("text", { class: "pd", "text-anchor": "middle", "dominant-baseline": "central" }, pill);
      const mk = el("g", { class: "mk r-cur", role: "slider", tabindex: "0", "data-k": k, "aria-label": ax.name, "aria-valuemin": String(ax.list[lim[k][0]]), "aria-valuemax": String(ax.list[lim[k][1]]) }, gMark);
      el("circle", { class: "hit", r: 18 }, mk);
      el("circle", { class: "ring", r: 10.5 }, mk);
      el("circle", { class: "dot", r: 6 }, mk);
      parts[k] = { ray, ghost, pill, rect, pv, pd, mk, box: null };
    }
    const badgeRect = el("rect", { rx: 9 }, badge);
    const badgeIcon = el("svg", { class: "bicon", width: 14, height: 14, viewBox: "0 0 16 16" }, badge);
    badgeIcon.innerHTML = lightIcon(lightKind(opt.light));
    const badgeLight = el("text", { class: "bl", "dominant-baseline": "central" }, badge);
    badgeLight.textContent = opt.light || "";
    const badgeEv = el("text", { class: "be", "text-anchor": "middle", "dominant-baseline": "central" }, badge);
    const badgeLock = el("svg", { class: "bicon", width: 10, height: 10, viewBox: "0 0 12 12" }, badge);
    badgeLock.innerHTML = LOCK.replace(/^<svg[^>]*>|<\/svg>$/g, "");
    const badgeSub = el("text", { class: "bs", "text-anchor": "middle", "dominant-baseline": "central" }, badge);

    const btnLock = host.querySelector('[data-mode="lock"]');
    const btnFree = host.querySelector('[data-mode="free"]');
    const select = host.querySelector("select");
    const withBox = host.querySelector(".with");
    const reset = host.querySelector(".reset");

    function deltaThirds(k) {
      return SIGN[k] * (st.v[k] - orig[k]);
    }

    function valueText(k) {
      const ax = AXES[k];
      const d = deltaThirds(k);
      const value = st.v[k] === orig[k] ? origTitle[k] : pillText(k, st.v[k]);
      const change = d ? `, ${thirds(d, true).replace(/^\+/, "").replace(/^−/, "")} ${d > 0 ? "more" : "less"} light` : "";
      const why = st.role[k] === "comp" ? ", compensating" : "";
      return `${value}${ax.unit}${change}${why}`;
    }

    // Texts, colors, badge: change only when values change.
    function paintValues() {
      for (const k of KEYS) {
        const p = parts[k];
        const role = st.role[k] === "comp" ? "r-comp" : st.role[k] === "user" ? "r-cur r-user" : "r-cur";
        p.mk.setAttribute("class", `mk ${role}${p.mk.classList.contains("act") ? " act" : ""}`);
        p.pill.setAttribute("class", `pill ${role}`);
        p.ray.setAttribute("class", `ln ray ${role.split(" ")[0]}`);
        p.ghost.classList.toggle("on", st.v[k] !== orig[k]);
        const value = st.v[k] === orig[k] ? origTitle[k] : pillText(k, st.v[k]);
        const d = deltaThirds(k);
        p.pv.textContent = value;
        p.pd.textContent = d ? thirds(d, true) : "";
        const w = Math.max(textWidth(value, 14.5, 680, family), d ? textWidth(p.pd.textContent, 10, 580, family) : 0) + 14;
        const h = d ? 34 : 22;
        p.size = [w, h];
        p.rect.setAttribute("x", r2(-w / 2));
        p.rect.setAttribute("y", r2(-h / 2));
        p.rect.setAttribute("width", r2(w));
        p.rect.setAttribute("height", h);
        p.pv.setAttribute("y", d ? -6.5 : 0.5);
        p.pd.setAttribute("y", 9);
        p.mk.setAttribute("aria-valuenow", String(AXES[k].list[st.v[k]]));
        p.mk.setAttribute("aria-valuetext", valueText(k));
      }
      const dB = light(st.v) - light(orig);
      const ev = Number.isFinite(ev0) ? ev0 - dB / 3 : null;
      const evLine = ev == null ? "" : `EV ${(Math.round(ev * 10) / 10).toFixed(1).replace(/\.0$/, "")}`;
      let sub = "";
      if (!st.locked && dB) sub = `${thirds(Math.abs(dB), true).replace(/^\+/, "")} ${dB > 0 ? "brighter" : "darker"}`;
      if (st.locked && st.lockB !== light(orig) && !st.miss) sub = `${thirds(st.lockB - light(orig), true)} vs shot`;
      badgeEv.textContent = evLine;
      badgeSub.textContent = sub;
      const lightW = opt.light ? 19 + textWidth(opt.light, 12.5, 580, family) : 0;
      const lockW = st.locked ? 14 : 0;
      const evW = evLine ? textWidth(evLine, 11.5, 420, family) + lockW : 0;
      const subW = sub ? textWidth(sub, 11, 580, family) : 0;
      const lines = [opt.light ? "l" : "", evLine ? "e" : "", sub ? "s" : ""].filter(Boolean);
      const w = Math.max(lightW, evW, subW) + 22;
      const lh = 15;
      const h = lines.length * lh + 11;
      const top = MID[1] - h / 2;
      badgeRect.setAttribute("x", r2(MID[0] - w / 2));
      badgeRect.setAttribute("y", r2(top));
      badgeRect.setAttribute("width", r2(w));
      badgeRect.setAttribute("height", h);
      badge.style.display = lines.length ? "" : "none";
      const lineY = (name) => top + 5.5 + lh * lines.indexOf(name) + lh / 2;
      if (opt.light) {
        const x0 = MID[0] - lightW / 2;
        badgeIcon.setAttribute("x", r2(x0));
        badgeIcon.setAttribute("y", r2(lineY("l") - 7));
        badgeLight.setAttribute("x", r2(x0 + 19));
        badgeLight.setAttribute("y", r2(lineY("l")));
      }
      badgeLock.style.display = st.locked && evLine ? "" : "none";
      if (evLine) {
        badgeEv.setAttribute("x", r2(MID[0] + lockW / 2));
        badgeEv.setAttribute("y", r2(lineY("e")));
        badgeLock.setAttribute("x", r2(MID[0] - evW / 2));
        badgeLock.setAttribute("y", r2(lineY("e") - 5.5));
      }
      if (sub) badgeSub.setAttribute("y", r2(lineY("s")));
      badgeSub.setAttribute("x", r2(MID[0]));

      const list = [];
      if (st.v.t > MECH) list.push(["c-es", "e-shutter"]);
      if (st.miss) list.push(["c-miss", `${thirds(Math.abs(st.miss), true).replace(/^\+/, "")} ${st.miss > 0 ? "under" : "over"}`]);
      chips.innerHTML = "";
      const widths = list.map(([, text]) => textWidth(text, 10.5, 580, family) + 16);
      let x = MID[0] - (widths.reduce((a, b) => a + b, 0) + (list.length - 1) * 6) / 2;
      const cy = MID[1] + 47;
      list.forEach(([cls, text], n) => {
        const g = el("g", { class: `chip ${cls}` }, chips);
        el("rect", { x: r2(x), y: r2(cy - 8.5), width: r2(widths[n]), height: 17, rx: 8.5 }, g);
        const t = el("text", { x: r2(x + widths[n] / 2), y: r2(cy + 0.5), "text-anchor": "middle", "dominant-baseline": "central" }, g);
        t.textContent = text;
        x += widths[n] + 6;
      });

      const changed = KEYS.some((k) => st.v[k] !== orig[k]) || !st.locked || st.pref;
      reset.disabled = !changed;
      btnLock.setAttribute("aria-pressed", String(st.locked));
      btnFree.setAttribute("aria-pressed", String(!st.locked));
      select.disabled = !st.locked;
      withBox.classList.toggle("off", !st.locked);
    }

    // Geometry from the eased positions; called every animation frame.
    function paintGeometry() {
      for (const k of KEYS) {
        const p = parts[k];
        const u = st.disp[k] / STEPS;
        const at = lerp(AXES[k].from, AXES[k].to, u);
        p.mk.setAttribute("transform", `translate(${r2(at[0])} ${r2(at[1])})`);
        p.ray.setAttribute("x1", r2(at[0]));
        p.ray.setAttribute("y1", r2(at[1]));
        const c = place(k, u, p.size[0], p.size[1]);
        p.pill.setAttribute("transform", `translate(${r2(c[0])} ${r2(c[1])})`);
        p.box = boxAt(c, p.size[0], p.size[1]);
      }
      const boxes = KEYS.map((k) => parts[k].box);
      for (const lab of labels) {
        if (!lab.box) {
          const w = textWidth(lab.text, 12.5, 420, family);
          lab.box = boxAt(place(lab.k, lab.s / STEPS, w, 9), w, lab.h);
        }
        lab.node.classList.toggle("hid", boxes.some((b) => hits(b, lab.box, 2)));
      }
      for (const kind in pics) pics[kind].g.classList.toggle("hid", boxes.some((b) => hits(b, pics[kind].box, 2)));
      // Effect pictograms follow the current values.
      const wide = 1 - st.disp.f / STEPS;
      pics.blur.g.querySelectorAll(".bk").forEach((c, n) => {
        c.setAttribute("r", r2(0.9 + wide * (n % 2 ? 2.4 : 2.9)));
        c.setAttribute("opacity", r2(0.16 + wide * 0.3));
      });
      const slow = 1 - st.disp.t / STEPS;
      const len = 0.6 + slow * 6.4;
      pics.motion.g.querySelector(".streak").setAttribute("d", `M${r2(5.6 - len)} 6.6h${r2(len)}M${r2(5.2 - len)} 9.6h${r2(len * 0.85)}M${r2(5.6 - len)} 12.6h${r2(len * 0.6)}`);
      pics.motion.g.querySelector(".gh1").setAttribute("opacity", r2(slow * 0.3));
      pics.motion.g.querySelector(".gh2").setAttribute("opacity", r2(0.1 + slow * 0.4));
      const grains = Math.round(3 + (st.disp.i / STEPS) * 21);
      pics.noisy.g.querySelectorAll(".gr").forEach((c, n) => c.setAttribute("opacity", n < grains ? 1 : 0));
    }

    let raf = 0;
    let tween = null;
    function animate(fast) {
      const dur = reduce ? 0 : fast ? 110 : 150;
      tween = { from: { ...st.disp }, start: performance.now(), dur };
      if (!raf) raf = requestAnimationFrame(step);
    }
    function step(now) {
      raf = 0;
      const e = tween.dur ? Math.min(1, (now - tween.start) / tween.dur) : 1;
      const ease = 1 - Math.pow(1 - e, 3);
      for (const k of KEYS) st.disp[k] = tween.from[k] + (st.v[k] - tween.from[k]) * ease;
      paintGeometry();
      if (e < 1) raf = requestAnimationFrame(step);
    }

    function adjust(key, idx, fast) {
      if (st.anchorKey !== key) {
        st.anchor = { ...st.v };
        st.anchorKey = key;
      }
      const res = solve(st.anchor, key, idx, { limits: lim, locked: st.locked, lockB: st.lockB, pref: st.pref });
      if (KEYS.every((k) => res.s[k] === st.v[k]) && res.miss === st.miss) return;
      const before = { ...st.v };
      st.v = res.s;
      st.miss = res.miss;
      for (const k of KEYS) {
        if (st.v[k] === orig[k]) st.role[k] = null;
        else if (k === key) st.role[k] = "user";
        else if (res.by.includes(k) || st.v[k] !== before[k]) st.role[k] = "comp";
      }
      paintValues();
      animate(fast);
    }

    function setMode(locked) {
      if (st.locked === locked) return;
      st.locked = locked;
      st.lockB = light(st.v);
      st.anchorKey = null;
      st.miss = 0;
      paintValues();
    }

    btnLock.addEventListener("click", () => setMode(true));
    btnFree.addEventListener("click", () => setMode(false));
    select.addEventListener("change", () => {
      st.pref = select.value;
      st.anchorKey = null;
      paintValues();
    });
    reset.addEventListener("click", () => {
      st.v = { ...orig };
      st.role = { f: null, t: null, i: null };
      st.locked = true;
      st.pref = "";
      select.value = "";
      st.lockB = light(orig);
      st.anchorKey = null;
      st.miss = 0;
      paintValues();
      animate(false);
    });

    // Pointer input.
    let drag = null;
    function toIndex(e, key, inv) {
      const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(inv);
      const ax = AXES[key];
      const d = [ax.to[0] - ax.from[0], ax.to[1] - ax.from[1]];
      const u = ((pt.x - ax.from[0]) * d[0] + (pt.y - ax.from[1]) * d[1]) / (d[0] * d[0] + d[1] * d[1]);
      return Math.round(Math.max(0, Math.min(1, u)) * STEPS);
    }
    function begin(e, key, target) {
      const ctm = svg.getScreenCTM();
      if (!ctm) return;
      drag = { key, id: e.pointerId, inv: ctm.inverse(), target };
      target.setPointerCapture(e.pointerId);
      host.classList.add("drag");
      parts[key].mk.classList.add("act");
      parts[key].mk.focus({ preventScroll: true });
    }
    function end() {
      if (!drag) return;
      parts[drag.key].mk.classList.remove("act");
      host.classList.remove("drag");
      drag = null;
    }
    svg.addEventListener("pointerdown", (e) => {
      if (e.button > 0) return;
      host.classList.add("ptr");
      const mk = e.target.closest(".mk");
      const trk = e.target.closest(".trk");
      if (mk) {
        e.preventDefault();
        begin(e, mk.dataset.k, mk);
      } else if (trk) {
        const key = trk.dataset.k;
        if (e.pointerType === "mouse") {
          e.preventDefault();
          begin(e, key, trk);
          adjust(key, toIndex(e, key, drag.inv), false);
        } else {
          drag = { key, id: e.pointerId, tap: [e.clientX, e.clientY], target: trk };
        }
      }
    });
    // Chrome ignores touch-action on SVG children, so a touch that starts on a marker must cancel scrolling here.
    svg.addEventListener("touchstart", (e) => {
      if (e.target.closest && e.target.closest(".mk")) e.preventDefault();
    }, { passive: false });
    svg.addEventListener("pointermove", (e) => {
      if (!drag || drag.id !== e.pointerId || drag.tap) return;
      adjust(drag.key, toIndex(e, drag.key, drag.inv), true);
    });
    svg.addEventListener("pointerup", (e) => {
      if (!drag || drag.id !== e.pointerId) return;
      if (drag.tap) {
        const moved = Math.hypot(e.clientX - drag.tap[0], e.clientY - drag.tap[1]);
        const ctm = svg.getScreenCTM();
        if (moved < 10 && ctm) adjust(drag.key, toIndex(e, drag.key, ctm.inverse()), false);
        drag = null;
        return;
      }
      end();
    });
    svg.addEventListener("pointercancel", () => { if (drag && drag.tap) drag = null; else end(); });
    svg.addEventListener("lostpointercapture", () => { if (drag && !drag.tap) end(); });

    host.addEventListener("keydown", (e) => { if (e.key === "Tab") host.classList.remove("ptr"); });
    svg.addEventListener("keydown", (e) => {
      const mk = e.target.closest && e.target.closest(".mk");
      if (!mk) return;
      const key = mk.dataset.k;
      const big = e.shiftKey ? 3 : 1;
      let next = null;
      if (e.key === "ArrowRight" || e.key === "ArrowUp") next = st.v[key] + big;
      else if (e.key === "ArrowLeft" || e.key === "ArrowDown") next = st.v[key] - big;
      else if (e.key === "PageUp") next = st.v[key] + 3;
      else if (e.key === "PageDown") next = st.v[key] - 3;
      else if (e.key === "Home") next = lim[key][0];
      else if (e.key === "End") next = lim[key][1];
      if (next == null) return;
      e.preventDefault();
      host.classList.remove("ptr");
      adjust(key, next, false);
    });

    paintValues();
    paintGeometry();
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => {
        labels.forEach((lab) => { lab.box = null; });
        paintValues();
        paintGeometry();
      });
    }
  }

  window.FujiTriangle = { css: CSS, mount, ...api };
})();
