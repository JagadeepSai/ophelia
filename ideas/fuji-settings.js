(function () {
  const CSS = `
    :host { display: block; container-type: inline-size; color: #1a140f; max-width: 100%; }
    * { box-sizing: border-box; }
    .head { display: flex; align-items: center; gap: 8px; min-height: 20px; }
    .swatch { width: 12px; height: 12px; border-radius: 3px; flex: 0 0 auto; }
    .head b { font-size: 14px; font-weight: 580; letter-spacing: -0.01em; }
    .code { margin-left: auto; font-size: 12px; font-weight: 580; letter-spacing: 0.03em; color: #6b5e54; }
    .panel {
      margin-top: 8px;
      border: 1px solid #e4d9cc;
      border-radius: 12px;
      background: #fbf7f2;
      padding: 6px 8px 8px;
    }
    .exp { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; margin-top: 4px; }
    .grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; margin-top: 8px; }
    .cell {
      min-width: 0;
      min-height: 54px;
      padding: 6px 8px 7px;
      border: 1px solid #e4d9cc;
      border-radius: 8px;
      background: #f3ece3;
    }
    .lab { display: flex; align-items: baseline; gap: 4px; color: #6b5e54; font-size: 10px; line-height: 1.2; letter-spacing: 0.01em; }
    .lab i { font-style: normal; color: #a89888; font-variant-numeric: tabular-nums; }
    .cell b { display: block; margin-top: 2px; font-size: 15px; font-weight: 680; line-height: 1.15; letter-spacing: -0.02em; overflow-wrap: anywhere; }
    .cell b.shift { margin-top: 0; font-size: 13px; font-weight: 580; }
    .cell.chg { background: #f8efe9; border-color: #e4c4b8; }
    .cell.chg b { color: #9c4a32; }
    .cell.chg .lab i { color: #9c4a32; }
  `;

  const SWATCH = {
    "Classic Chrome": "#c4a574",
    "Classic Negative": "#7f8f6a",
    "Nostalgic Neg.": "#d4a07a",
    "Astia": "#e4cfc6",
    "Velvia": "#2f8a45",
    "PRO Neg. Hi": "#d5cdc4",
    "PRO Neg. Std": "#cfc6bc",
    "Eterna": "#8fa0a8",
    "Eterna Bleach Bypass": "#9aa3a0",
    "Reala Ace": "#cbb59a",
    "Acros": "#b7b7b7",
    "Monochrome": "#9c9c9c",
  };

  const EQ = { 15: 23, 16: 24, 18: 27, 23: 35, 27: 40, 33: 50, 35: 53, 45: 68, 50: 75, 56: 84, 90: 135 };

  // X-S20 IMAGE QUALITY SETTING, stills. Highlight and Shadow are the Tone Curve submenu, in that order. Clarity follows High ISO NR.
  const ROWS = [
    ["sim", "Film sim"],
    ["grain", "Grain"],
    ["chrome", "Color Chrome"],
    ["blue", "CC FX Blue"],
    ["wb", "WB"],
    ["dr", "DR"],
    ["highlight", "Highlight"],
    ["shadow", "Shadow"],
    ["color", "Color"],
    ["sharp", "Sharpness"],
    ["nr", "NR"],
    ["clarity", "Clarity"],
  ];

  function present(value) {
    return value != null && String(value).trim() !== "" && String(value) !== "undefined" && String(value) !== "null";
  }

  function esc(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function show(value) {
    return esc(String(value).trim().replace(/(^|\s)-(?=\d)/g, "$1−"));
  }

  function swatch(sim) {
    if (SWATCH[sim]) return SWATCH[sim];
    const key = Object.keys(SWATCH).find((name) => sim && String(sim).startsWith(name));
    return SWATCH[key] || "#cfc6bc";
  }

  function parseF(value) {
    if (!present(value)) return null;
    const match = String(value).trim().match(/^(?:f\s*\/?\s*)?(\d+(?:\.\d+)?)$/i);
    return match ? Number(match[1]) : null;
  }

  function parseShutter(value) {
    if (!present(value)) return null;
    const text = String(value).trim().toLowerCase().replace(/s$/, "");
    const fraction = text.match(/^1\s*\/\s*(\d+(?:\.\d+)?)$/);
    if (fraction) return 1 / Number(fraction[1]);
    const seconds = text.match(/^(\d+(?:\.\d+)?)$/);
    return seconds ? Number(seconds[1]) : null;
  }

  function parseIso(value) {
    if (typeof value === "number" && value >= 80 && value <= 51200) return value;
    if (!present(value)) return null;
    const match = String(value).trim().match(/^(?:iso\s*)?(\d{2,5})$/i);
    return match ? Number(match[1]) : null;
  }

  function parseMm(value) {
    if (!present(value)) return null;
    const match = String(value).trim().match(/^(\d+(?:\.\d+)?)\s*mm?$/i);
    return match ? Number(match[1]) : null;
  }

  function evText(f, t, iso) {
    if (!(f > 0) || !(t > 0) || !(iso > 0)) return "";
    const ev = Math.log2((f * f) / t) - Math.log2(iso / 100);
    const rounded = Math.round(ev * 10) / 10;
    return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  }

  function wbParts(raw) {
    const text = String(raw).replaceAll("−", "-").replaceAll("–", "-");
    const red = text.match(/([+-]?\d+(?:\.\d+)?)\s*(?:R\b|Red)/i);
    const blue = text.match(/([+-]?\d+(?:\.\d+)?)\s*(?:B\b|Blue)/i);
    let mode = text
      .replace(/[,+]?\s*[+-]?\d+(?:\.\d+)?\s*(?:R\b|Red|B\b|Blue)/gi, "")
      .replace(/,\s*$/g, "")
      .replace(/\s{2,}/g, " ")
      .trim();
    if (!mode) mode = text.trim();
    const sign = (n) => (n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : "0");
    const shift = red || blue
      ? `R${sign(red ? Number(red[1]) : 0)} B${sign(blue ? Number(blue[1]) : 0)}`
      : "";
    return { mode, shift };
  }

  function ecLine(data) {
    const raw = present(data.ec) ? String(data.ec).trim() : "";
    if (raw && raw.length <= 18) return `EC ${show(raw)}`;
    const note = present(data.exposure) ? String(data.exposure).trim() : "";
    if (!note || note.length > 80) return "";
    const token = "([+\\-−–]?\\s*\\d+(?:\\s+\\d+)?\\s*(?:/\\s*\\d+)?)";
    const range = note.match(new RegExp(token + "\\s+to\\s+" + token, "i"));
    if (!range) return "";
    const clean = (part) => show(part.replace(/\s+/g, " ").trim());
    return `EC ${clean(range[1])} to ${clean(range[2])}`;
  }

  function menuRows(data) {
    const rows = ROWS.slice();
    if (present(data.mono)) rows.splice(1, 0, ["mono", "Mono color"]);
    if (present(data.drp) && !/^off$/i.test(String(data.drp).trim())) {
      const at = rows.findIndex((row) => row[0] === "dr");
      rows.splice(at + 1, 0, ["drp", "D-Range"]);
    }
    return rows;
  }

  function cell(data, key, label, index) {
    const value = data[key];
    if (!present(value)) return "";
    const changed = new Set(Array.isArray(data.changed) ? data.changed : []);
    const on = changed.has(key);
    const prior = data.base && present(data.base[key]) ? data.base[key] : "";
    const tip = on && prior ? ` title="base ${show(prior)} → ${show(value)}"` : "";
    const num = index ? `<i>${index}</i>` : "";
    if (key === "wb") {
      const parts = wbParts(value);
      const shift = parts.shift ? `<b class="shift">${esc(parts.shift)}</b>` : "";
      return `<div class="cell${on ? " chg" : ""}"${tip}><div class="lab">${num}<span>${label}</span></div><b>${esc(parts.mode)}</b>${shift}</div>`;
    }
    return `<div class="cell${on ? " chg" : ""}"${tip}><div class="lab">${num}<span>${label}</span></div><b>${show(value)}</b></div>`;
  }

  function plainCell(label, value, on) {
    if (!present(value)) return "";
    return `<div class="cell${on ? " chg" : ""}"><div class="lab"><span>${label}</span></div><b>${show(value)}</b></div>`;
  }

  function focalCell(mm, raw) {
    if (mm == null) return "";
    const lens = present(raw) ? String(raw).trim().replace(/mm$/i, "") : String(mm);
    const equiv = EQ[mm] || Math.round(mm * 1.5);
    return `<div class="cell"><div class="lab"><span>Focal</span></div><b>${esc(lens)}mm</b><b class="shift">${equiv}mm eq</b></div>`;
  }

  function markup(data) {
    const f = parseF(data.aperture);
    const t = parseShutter(data.shutter);
    const iso = parseIso(data.iso);
    const mm = parseMm(data.focal);
    const light = present(data.light) ? String(data.light).trim() : "";
    const ev = evText(f, t, iso);
    const fLabel = present(data.aperture) ? String(data.aperture).trim().replace(/^f\s*\/?\s*/i, "f/") : "";
    const tLabel = present(data.shutter) ? String(data.shutter).trim() : "";
    const changed = new Set(Array.isArray(data.changed) ? data.changed : []);
    let tri = "";
    if (f != null && t != null && iso != null && window.FujiTriangle) tri = '<div class="tri"></div>';
    const exposure = [
      tri ? "" : plainCell("ISO", iso != null ? String(iso) : "", changed.has("iso")),
      plainCell("EC", ecLine(data).replace(/^EC\s/, ""), changed.has("ec")),
      focalCell(mm, data.focal),
    ].join("");
    const top = tri || exposure
      ? `<div class="panel">${tri}${exposure ? `<div class="exp">${exposure}</div>` : ""}</div>`
      : "";
    let n = 0;
    const grid = menuRows(data).map(([key, label]) => {
      if (!present(data[key])) return "";
      n += 1;
      return cell(data, key, label, n);
    }).join("");
    const sim = present(data.sim) ? String(data.sim).trim() : "";
    const code = present(data.code) ? String(data.code).trim() : "";
    const head = sim || code
      ? `<div class="head">${sim ? `<i class="swatch" style="background:${swatch(sim)}"></i><b>${esc(sim)}</b>` : ""}${code ? `<span class="code">${esc(code)}</span>` : ""}</div>`
      : "";
    if (!head && !top && !grid) return { html: "", tri: null };
    const triCss = tri ? window.FujiTriangle.css : "";
    return {
      html: `<style>${CSS}${triCss}</style>${head}${top}${grid ? `<div class="grid">${grid}</div>` : ""}`,
      tri: tri ? { f, t, iso, fLabel, tLabel, light, ev, dr: data.dr } : null,
    };
  }

  class FujiSettings extends HTMLElement {
    static get observedAttributes() { return ["data-json"]; }

    set data(value) {
      this._data = value;
      this.render();
    }

    get data() {
      return this._data;
    }

    connectedCallback() { this.render(); }

    attributeChangedCallback() { this.render(); }

    render() {
      let data = this._data;
      if (!data && this.hasAttribute("data-json")) {
        try { data = JSON.parse(this.getAttribute("data-json")); } catch (error) { data = null; }
      }
      if (!this.shadowRoot) this.attachShadow({ mode: "open" });
      const out = data ? markup(data) : { html: "", tri: null };
      this.shadowRoot.innerHTML = out.html;
      const host = out.tri && this.shadowRoot.querySelector(".tri");
      if (host) window.FujiTriangle.mount(host, out.tri);
    }
  }

  if (!customElements.get("fuji-settings")) customElements.define("fuji-settings", FujiSettings);
})();
