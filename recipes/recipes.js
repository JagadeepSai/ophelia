const ideaLikes = likesStore(IDEA_FAV_KEY);
const main = document.querySelector("#main");
const lede = document.querySelector("#lede");
const qEl = document.querySelector("#q");
const groupEl = document.querySelector("#f-group");
const simEl = document.querySelector("#f-sim");
const lightEl = document.querySelector("#f-light");
const legendBody = document.querySelector("#legend-body");

const params = new URLSearchParams(location.search);
const state = {
  q: params.get("q") || "",
  group: params.get("group") || "",
  sim: params.get("sim") || "",
  light: params.get("light") || "",
  by: params.get("by") === "sim" ? "sim" : "group",
  open: new Set(),
};

function esc(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function present(value) {
  if (value == null) return false;
  const text = String(value).trim();
  return text !== "" && text !== "undefined" && text !== "null";
}

const SIM_SWATCH = {
  "Classic Chrome": "#c4a574",
  "Classic Negative": "#7f8f6a",
  "Nostalgic Neg.": "#d4a07a",
  "Astia": "#e4cfc6",
  "Velvia": "#2f8a45",
  "PRO Neg. Hi": "#d5cdc4",
  "Eterna": "#8fa0a8",
  "Eterna Bleach Bypass": "#9aa3a0",
  "Acros": "#b7b7b7",
  "Monochrome": "#9c9c9c",
};

function simFamily(sim) {
  if (/^Acros/.test(sim)) return "Acros";
  if (/^Monochrome/.test(sim)) return "Monochrome";
  return sim;
}

const LIGHTS = [
  ["golden", "Golden"],
  ["backlight", "Backlight"],
  ["hard-sun", "Hard sun"],
  ["dappled", "Dappled"],
  ["shade", "Shade"],
  ["overcast", "Overcast"],
  ["night", "Night"],
  ["indoor", "Indoor"],
  ["mono", "Black and white"],
];
const CATALOG_LIGHT = {
  "sunny": "hard-sun",
  "golden-hour": "golden",
  "overcast": "overcast",
  "shade": "shade",
  "night": "night",
  "indoor": "indoor",
  "black-and-white": "mono",
};
const ROW_KEY = {
  "Film simulation": "sim",
  "White balance": "wb",
  "Dynamic range": "dr",
  "D-Range Priority": "drp",
  "Highlight": "highlight",
  "Shadow": "shadow",
  "Color": "color",
  "Sharpness": "sharp",
  "High ISO NR": "nr",
  "Clarity": "clarity",
  "Grain": "grain",
  "Color Chrome Effect": "chrome",
  "Color Chrome FX Blue": "blue",
  "Monochromatic color": "mono",
};
const DIAL_ORDER = [
  ["wb", "WB"], ["dr", "DR"], ["drp", "DR priority"], ["highlight", "Highlight"], ["shadow", "Shadow"],
  ["color", "Color"], ["sharp", "Sharpness"], ["nr", "NR"], ["clarity", "Clarity"],
  ["grain", "Grain"], ["chrome", "Color chrome"], ["blue", "FX Blue"], ["mono", "Mono color"],
];

const sets = Object.fromEntries(CATALOG.sets.map((set) => [set.id, set]));
const GROUP_CODES = { park: "PK", sunny: "SU", soft: "SF", night: "NT", street: "ST", found: "FO" };
const GROUPS = [
  { id: "park", label: "Park", note: "Shot ideas. Each frame uses one of these, with at most two dials changed." },
  ...CATALOG.sets.map((set) => ({ id: set.id, label: set.backup, note: set.condition })),
];

const parkShots = IDEAS.shots.filter((shot) => shot.group === "park");
const items = [
  ...(IDEAS.bases || []).map((base) => ({
    kind: "base",
    id: base.id,
    code: base.code,
    name: base.name,
    group: "park",
    sim: base.sim,
    look: base.look,
    dials: base,
    shots: parkShots.filter((shot) => shot.recipe === base.id),
    light: base.light || [],
  })),
  ...CATALOG.recipes.map((recipe) => {
    const dials = {};
    for (const [label, value] of recipe.settings) {
      if (ROW_KEY[label]) dials[ROW_KEY[label]] = value;
    }
    const light = recipe.tags.map((tag) => CATALOG_LIGHT[tag]).filter(Boolean);
    return {
      kind: "catalog",
      id: recipe.id,
      code: recipe.code || "",
      name: recipe.name,
      group: recipe.set,
      sim: recipe.sim,
      look: recipe.when,
      exposure: recipe.exposure || "",
      dials,
      image: recipe.images[0],
      href: `${siteUrl("")}?recipe=${encodeURIComponent(recipe.id)}`,
      shots: [],
      light,
    };
  }),
];
items.forEach((item) => {
  const shotLight = item.shots.flatMap((shot) => shot.tags);
  item.lights = new Set([...item.light, ...shotLight]);
});

function norm(text) {
  return String(text || "").toLowerCase().replaceAll("−", "-").replaceAll("–", "-");
}

function itemText(item) {
  return norm([item.name, item.code, item.sim, item.look, sets[item.group] ? sets[item.group].backup : "Park",
    ...Object.values(item.dials || {})].join(" "));
}

function shotText(shot) {
  return norm([shot.code, shot.label, shot.look, shot.mood, ...(shot.delta || []).map((d) => d.text)].join(" "));
}

function matchQ(text) {
  const words = norm(state.q).split(/\s+/).filter(Boolean);
  return words.every((word) => text.includes(word));
}

function visibleShots(item) {
  let shots = item.shots;
  if (state.light) shots = shots.filter((shot) => shot.tags.includes(state.light));
  if (state.q && !matchQ(itemText(item))) shots = shots.filter((shot) => matchQ(shotText(shot)));
  return shots;
}

function visibleItems() {
  return items.filter((item) => {
    if (state.group && item.group !== state.group) return false;
    if (state.sim && simFamily(item.sim) !== state.sim) return false;
    if (state.light && !item.lights.has(state.light)) return false;
    if (state.q) {
      if (matchQ(itemText(item))) return true;
      return item.shots.some((shot) => matchQ(shotText(shot)));
    }
    return true;
  });
}

function chip(kind, id, label, count) {
  const on = state[kind] === id;
  return `<button type="button" data-${kind}="${esc(id)}" aria-pressed="${on}">${esc(label)}${count != null ? ` <small>${count}</small>` : ""}</button>`;
}

function renderChips() {
  const groupCounts = {};
  const simCounts = {};
  const lightCounts = {};
  for (const item of items) {
    groupCounts[item.group] = (groupCounts[item.group] || 0) + 1;
    const fam = simFamily(item.sim);
    simCounts[fam] = (simCounts[fam] || 0) + 1;
    for (const light of item.lights) lightCounts[light] = (lightCounts[light] || 0) + 1;
  }
  groupEl.innerHTML = chip("group", "", "All") + GROUPS.filter((g) => groupCounts[g.id])
    .map((g) => chip("group", g.id, g.label, groupCounts[g.id])).join("");
  simEl.innerHTML = Object.keys(simCounts).sort((a, b) => simCounts[b] - simCounts[a])
    .map((sim) => chip("sim", sim, sim, simCounts[sim])).join("");
  lightEl.innerHTML = LIGHTS.filter(([id]) => lightCounts[id])
    .map(([id, label]) => chip("light", id, label)).join("");
  document.querySelectorAll("[data-by]").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.by === state.by));
  });
}

function keyLine(dials) {
  const bits = [];
  if (present(dials.wb)) bits.push(dials.wb);
  if (present(dials.dr)) bits.push(dials.dr);
  if (present(dials.drp)) bits.push(`DR-P ${dials.drp}`);
  if (present(dials.highlight) || present(dials.shadow)) {
    bits.push([present(dials.highlight) ? `H ${dials.highlight}` : "", present(dials.shadow) ? `S ${dials.shadow}` : ""].filter(Boolean).join(" "));
  }
  if (present(dials.color)) bits.push(`Color ${dials.color}`);
  if (present(dials.grain)) bits.push(dials.grain === "Off" ? "No grain" : `Grain ${dials.grain.replace(", ", " ")}`);
  if (present(dials.chrome)) bits.push(`CCE ${dials.chrome}`);
  if (present(dials.clarity)) bits.push(`Clarity ${dials.clarity}`);
  return bits.map((bit) => `<span>${esc(bit)}</span>`).join("");
}

function dialTable(dials, sim, exposureNote, code) {
  const data = {
    sim,
    code: code || "",
    wb: dials.wb,
    dr: dials.dr,
    drp: dials.drp,
    highlight: dials.highlight,
    shadow: dials.shadow,
    color: dials.color,
    sharp: dials.sharp,
    nr: dials.nr,
    clarity: dials.clarity,
    grain: dials.grain,
    chrome: dials.chrome,
    blue: dials.blue,
    mono: dials.mono,
    exposure: exposureNote || "",
  };
  return `<fuji-settings data-json="${esc(JSON.stringify(data))}"></fuji-settings>`;
}

function deltaChips(shot) {
  const changes = shot.delta || [];
  if (!changes.length) return `<span class="delta same">As is</span>`;
  return changes.map((change) => `<span class="delta">${esc(change.text || `${change.label} ${change.value}`)}</span>`).join("");
}

function tileChips(shot) {
  return (shot.delta || []).length ? deltaChips(shot) : "";
}

function shotTile(shot) {
  const saved = ideaLikes.has(shot.id);
  return `<a class="tile" href="${siteUrl("ideas/park/")}#${esc(shot.id)}" title="${esc(shot.label || shot.look)}${saved ? " · saved" : ""}">
    ${saved ? `<span class="mini-heart" aria-hidden="true">♥</span>` : ""}
    <img src="${esc(siteUrl(shot.image))}" alt="" loading="lazy">
    <span class="tile-cap"><b>${esc(shot.code || "")}</b><span class="deltas">${tileChips(shot)}</span></span>
  </a>`;
}

function swatch(sim) {
  return `<i class="sw" style="background:${SIM_SWATCH[simFamily(sim)] || "#cfc6bc"}"></i>`;
}

function baseCard(item) {
  const shots = visibleShots(item);
  const asIs = item.shots.filter((shot) => !(shot.delta || []).length).length;
  const open = state.open.has(item.id) || (state.q && shots.length && shots.length < item.shots.length);
  const strip = shots.slice(0, 5).map((shot) => `<img src="${esc(siteUrl(shot.image))}" alt="" loading="lazy">`).join("");
  const count = shots.length === item.shots.length
    ? `${item.shots.length} shots · ${asIs} as is`
    : `${shots.length} of ${item.shots.length} shots`;
  return `<article class="rc base${open ? " open" : ""}" id="${esc(item.id)}">
    <button type="button" class="rc-hit" data-open="${esc(item.id)}" aria-expanded="${open}">
      <span class="strip">${strip}</span>
      <span class="rc-body">
        <span class="rc-top"><b class="rc-name">${esc(item.name)}</b><span class="code">${esc(item.code)}</span></span>
        <span class="rc-sim">${swatch(item.sim)}${esc(item.sim)} <em>${esc(count)}</em></span>
        <span class="keys">${keyLine(item.dials)}</span>
      </span>
    </button>
    ${open ? `<div class="rc-more">
      <p class="rc-look">${esc(item.look)}</p>
      ${dialTable(item.dials, item.sim, "", item.code)}
      <div class="tiles">${shots.map(shotTile).join("")}</div>
      <a class="rc-link" href="${siteUrl("ideas/park/recipes/")}#${esc(item.id)}">Exposure for each shot</a>
    </div>` : ""}
  </article>`;
}

function catalogCard(item) {
  const open = state.open.has(item.id);
  return `<article class="rc cat${open ? " open" : ""}" id="${esc(item.id)}">
    <button type="button" class="rc-hit" data-open="${esc(item.id)}" aria-expanded="${open}">
      <span class="strip one"><img src="${esc(siteUrl(item.image))}" alt="" loading="lazy"></span>
      <span class="rc-body">
        <span class="rc-top"><b class="rc-name">${esc(item.name)}</b>${item.code ? `<span class="code">${esc(item.code)}</span>` : ""}</span>
        <span class="rc-sim">${swatch(item.sim)}${esc(item.sim)}</span>
        <span class="keys">${keyLine(item.dials)}</span>
      </span>
    </button>
    ${open ? `<div class="rc-more">
      <p class="rc-look">${esc(item.look)}</p>
      ${dialTable(item.dials, item.sim, item.exposure, item.code)}
      <a class="rc-link" href="${esc(item.href)}">Open card</a>
    </div>` : ""}
  </article>`;
}

function plural(n, word) {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

function card(item) {
  return item.kind === "base" ? baseCard(item) : catalogCard(item);
}

function sections(list) {
  if (state.by === "sim") {
    const fams = [...new Set(list.map((item) => simFamily(item.sim)))];
    return fams.map((fam) => ({ id: `sim-${fam}`, label: fam, note: "", items: list.filter((item) => simFamily(item.sim) === fam) }))
      .sort((a, b) => b.items.length - a.items.length);
  }
  return GROUPS.map((group) => ({ ...group, items: list.filter((item) => item.group === group.id) }))
    .filter((group) => group.items.length);
}

function renderLegend() {
  const ex = parkShots.find((shot) => (shot.delta || []).length === 1) || parkShots[0];
  legendBody.innerHTML = `
    <p><b>Recipe</b> <code>GROUP-SIM-LOOK</code>, up to 12 letters, so it fits a custom-setting name on the camera. <code>PK-CC-GOLD</code> is Park, Classic Chrome, Golden.</p>
    <p><b>Shot</b> <code>PK-001</code> to <code>PK-${String(parkShots.length).padStart(3, "0")}</code>, then the recipe, then any change. ${ex ? `<code>${esc(ex.label)}</code> is ${esc(ex.look)}.` : ""} Use it as a photo album or note name.</p>
    <p><b>Groups</b> PK Park, SU Sunny, SF Soft, NT Night, ST Street, FO Forums.</p>
    <p><b>Film sims</b> CC Classic Chrome, CN Classic Neg., NN Nostalgic Neg., AS Astia, EB Eterna Bleach Bypass, ET Eterna, VV Velvia, NH PRO Neg. Hi, AC Acros, MO Monochrome.</p>
    <p><b>Changes</b> H highlight, S shadow, C color, SH sharpness, CL clarity, NR, DR, WB, GR grain (W weak, S strong, then S small, L large), CCE color chrome, FXB FX blue.</p>`;
}

function render() {
  const list = visibleItems();
  const shotCount = list.reduce((sum, item) => sum + visibleShots(item).length, 0);
  const parkInList = list.some((item) => item.kind === "base");
  lede.textContent = `${plural(list.length, "recipe")}${parkInList ? ` · ${plural(shotCount, "park shot")} on them` : ""}`;
  renderChips();
  const groups = sections(list);
  main.innerHTML = groups.length ? groups.map((group) => {
    const shots = group.items.reduce((sum, item) => sum + visibleShots(item).length, 0);
    return `<details class="sect" open data-sect="${esc(group.id)}">
      <summary><h2>${esc(group.label)}</h2><span class="count">${plural(group.items.length, "recipe")}${shots ? ` · ${plural(shots, "shot")}` : ""}</span>${group.note ? `<span class="note">${esc(group.note)}</span>` : ""}</summary>
      <div class="rc-grid">${group.items.map(card).join("")}</div>
    </details>`;
  }).join("") : `<p class="empty">Nothing matches.</p>`;
}

function syncUrl() {
  const next = new URLSearchParams();
  if (state.group) next.set("group", state.group);
  if (state.sim) next.set("sim", state.sim);
  if (state.light) next.set("light", state.light);
  if (state.q) next.set("q", state.q);
  if (state.by === "sim") next.set("by", "sim");
  const query = next.toString();
  history.replaceState(null, "", `${siteUrl("recipes/")}${query ? `?${query}` : ""}${location.hash}`);
}

function toggleChip(kind, value) {
  state[kind] = state[kind] === value ? "" : value;
  syncUrl();
  render();
}

groupEl.addEventListener("click", (event) => {
  const button = event.target.closest("[data-group]");
  if (button) toggleChip("group", button.dataset.group);
});
simEl.addEventListener("click", (event) => {
  const button = event.target.closest("[data-sim]");
  if (button) toggleChip("sim", button.dataset.sim);
});
lightEl.addEventListener("click", (event) => {
  const button = event.target.closest("[data-light]");
  if (button) toggleChip("light", button.dataset.light);
});
document.querySelector(".by").addEventListener("click", (event) => {
  const button = event.target.closest("[data-by]");
  if (!button) return;
  state.by = button.dataset.by;
  syncUrl();
  render();
});
qEl.value = state.q;
qEl.addEventListener("input", () => {
  state.q = qEl.value.trim();
  syncUrl();
  render();
});
main.addEventListener("click", (event) => {
  const hit = event.target.closest("[data-open]");
  if (!hit) return;
  const id = hit.dataset.open;
  if (state.open.has(id)) state.open.delete(id);
  else state.open.add(id);
  render();
});

renderLegend();
const target = location.hash.replace(/^#/, "");
if (target && items.some((item) => item.id === target)) state.open.add(target);
render();
if (target) {
  const el = document.getElementById(target);
  if (el) el.scrollIntoView({ block: "start" });
}
