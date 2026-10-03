const FAV_KEY = RECIPE_FAV_KEY;
const tagName = Object.fromEntries(CATALOG.tags);
const recipeLikes = likesStore(FAV_KEY);
const favs = recipeLikes.set;
const glance = {
  sunny: "Hard sun.",
  soft: "Cloud or shade.",
  night: "After dark.",
  street: "Daytime city.",
  all: "Every recipe.",
};
const hideOnSet = {
  sunny: new Set(["sunny", "night", "indoor", "overcast", "beach", "black-and-white"]),
  soft: new Set(["sunny", "night", "golden-hour", "landscape", "indoor", "black-and-white"]),
  night: new Set(["sunny", "golden-hour", "beach", "landscape", "travel", "overcast", "night"]),
  street: new Set(["street", "night", "indoor", "golden-hour", "beach", "landscape"]),
};

let activeSet = "sunny";
let activeTag = null;

const backupsEl = document.querySelector("#backups");
const filtersEl = document.querySelector("#filters");
const stage = document.querySelector("#stage");
const hint = document.querySelector("#hint");
const sheet = document.querySelector("#sheet");
const sheetBody = document.querySelector("#sheet-body");
const pop = document.querySelector("#pop");
const popBody = document.querySelector("#pop-body");

const notes = {
  "reggies-portra": {
    when: "Daylight and faces. Strongest in the hour before sunset.",
    how: ["Exposure starts at 0. Change it per frame.", "White balance: Auto, +2 Red, −4 Blue."],
    watch: ["Color Chrome FX Blue is Off. The older card says Weak.", "DR-Auto. Auto ISO can start at 160."],
  },
  "kodak-gold-200": {
    when: "Hard sun, when you want it warmer than Kodachrome.",
    how: ["Exposure +2/3 to +1.", "White balance: Daylight, +4 Red, −5 Blue."],
    watch: ["DR400 is dead below ISO 640. Raise the Auto ISO floor."],
  },
  "kodachrome-64": {
    when: "Sunny streets and travel. Not shade, not night.",
    how: ["Exposure 0 to +2/3.", "White balance: Daylight, +2 Red, −5 Blue."],
    watch: ["DR200 needs Auto ISO to start at 320."],
  },
  "california-summer": {
    when: "Midday and golden hour. Not indoors.",
    how: ["Exposure +2/3 to +1 1/3.", "White balance is 6700K, −1 Red, −6 Blue."],
    watch: ["DR400 needs ISO 640. Nostalgic Neg. is built into the X-S20.", "Landscapes: the Velvia numbers are the swap on the settings card."],
  },
  "pacific-blues": {
    when: "Fog, cloud, open shade, bright beach.",
    how: ["Exposure +2/3 to +1.", "White balance: 5800K, +1 Red, −3 Blue."],
    watch: ["DR400 needs ISO 640.", "If faces go muddy, use Reala Ace, the Classic Negative card in this backup."],
  },
  "pushed-cinestill": {
    when: "Overcast day, and it can stay on after sunset.",
    how: ["Exposure −1/3 to +2/3.", "White balance is 7700K, −9 Red, +5 Blue."],
    watch: ["DR400 needs ISO 640.", "Eterna Bleach Bypass. This is not the night CineStill."],
  },
  "reala-ace": {
    when: "Shade, evening, and light that keeps changing.",
    how: ["Exposure −1/3 to +1.", "White balance: Auto, −1 Red, +1 Blue."],
    watch: ["DR400 needs ISO 640.", "Classic Negative, not the Reala Ace film sim.", "Easy Reala Ace needs the Reala Ace film sim. The X-S20 does not have it."],
  },
  "kodak-1976": {
    when: "When you want contrast and warmth, not Pacific Blues.",
    how: ["Exposure +1/3 to +1.", "White balance: Auto, −2 Red, −4 Blue."],
    watch: ["DR200 needs ISO 320. Needs Nostalgic Neg.", "Indoor bulbs push it too warm."],
  },
  "cinestill-800t": {
    when: "After sunset. Street lamps and tungsten rooms.",
    how: ["Exposure −1/3 to +2/3.", "White balance is Fluorescent 3, −6 Red, −4 Blue."],
    watch: ["DR400 needs ISO 640. Cap Auto ISO near 6400.", "Daylight only makes this cold and blue."],
  },
  "fluorescent-night": {
    when: "Shops and offices under fluorescent tubes.",
    how: ["At night, exposure −2/3 to −1/3.", "White balance: Fluorescent 2, −8 Red, −1 Blue."],
    watch: ["DR200 needs ISO 320. Needs Nostalgic Neg.", "Warm street lamps: use CineStill instead."],
  },
  "tri-x-400": {
    when: "Black and white from ISO 1600 up. Also the daytime mono look.",
    how: ["Film sim Acros+Ye. Exposure +1/3 to +1.", "White balance: Daylight, +9 Red, −9 Blue."],
    watch: ["1600–3200 is newer Tri-X. 6400 and up is the older stock.", "Low contrast: Highlight −1, Shadow +2. High: Highlight +1, Shadow +4.", "Acros+R and Acros+G are the other filters on the same card."],
  },
  "hp5-400": {
    when: "The softer black and white next to Tri-X. Day or night.",
    how: ["Film sim Monochrome. Exposure −2/3 to +2/3.", "White balance: Daylight, +1 Red, −8 Blue."],
    watch: ["DR400 needs ISO 640. Clarity stays at 0.", "Written for X-Trans IV. Color Chrome is Off, so it matches on this body."],
  },
  "vibrant-arizona": {
    when: "Hard sun on streets and buildings. Not faces, not night.",
    how: ["Exposure +2/3 to +1 1/3.", "White balance: 4350K, +6 Red, −8 Blue."],
    watch: ["D-Range Priority Strong. Auto ISO starts at 640.", "Highlight and Shadow are locked while that is on.", "Color Chrome FX Blue Weak. The older card says Strong."],
  },
  "super-hg": {
    when: "Daytime when you keep walking between sun and shade.",
    how: ["Exposure +2/3 to +1.", "White balance: Auto White Priority, −3 Red, −1 Blue."],
    watch: ["DR400 needs ISO 640.", "D-Range Priority Off.", "Not Pacific Blues. That one is locked to 5800K."],
  },
  "vericolor-vps": {
    when: "Daytime city, shade, and window light.",
    how: ["Exposure +1/3 to +1.", "White balance: 4500K, +2 Red, −5 Blue."],
    watch: ["DR400 needs ISO 640. Needs Nostalgic Neg.", "D-Range Priority Off.", "Not California Summer and not 1976 Kodak."],
  },
  "newspaper": {
    when: "Harsh daylight. Big shadows.",
    how: ["Acros+Ye. Exposure starts at 0.", "White balance: Auto, −4 Red, −3 Blue."],
    watch: ["Highlight +4 and Shadow +4. Clarity stays 0.", "D-Range Priority Off and DR100, or those tones will not apply.", "He published the shift only. Chrome effects stay Off."],
  },
  "classic-cuban": {
    when: "Warm summer streets.",
    how: ["Start exposure at +1/3.", "White balance: Auto, +4 Red, −5 Blue."],
    watch: ["DR400 needs ISO 640. His card says 500.", "Too orange in shade and on pale skin. Use Astia or Ultramax then."],
  },
  "vibrant-astia": {
    when: "Faces in daylight, without the yellow of Portra.",
    how: ["Start exposure at +1/3.", "White balance: Auto, +2 Red, −2 Blue."],
    watch: ["DR400 needs ISO 640.", "Film sim is Astia. Clarity stays at −4."],
  },
  "ultramax-400": {
    when: "Everyday color. Daylight, cloud, walking around.",
    how: ["Exposure +1/3 to +1.", "White balance: Auto, +1 Red, −5 Blue."],
    watch: ["DR-Auto. Auto ISO can start at 160.", "Color Chrome FX Blue Off. Grain is Strong, Large."],
  },
  "vivid-velvia": {
    when: "Landscapes in sun. Not faces.",
    how: ["Exposure +1/3 to +1.", "White balance: Auto, Ambience Priority, +1 Red, −3 Blue."],
    watch: ["DR400 needs ISO 640.", "Film sim is Velvia. Color +4 will blow skin."],
  },
  "pro-neg-160c": {
    when: "People and cloud, when the color should stay quiet.",
    how: ["Exposure 0 to +2/3.", "White balance: Auto, +1 Red, −3 Blue."],
    watch: ["DR400 needs ISO 640.", "Film sim is PRO Neg. Hi, not Reala Ace."],
  },
  "lighthouse": {
    when: "Hard light and night streets. Bleak, not grainy-night.",
    how: ["Acros+R. Exposure starts at 0.", "Monochromatic color: WC −1, MG 0."],
    watch: ["Highlight +4 and Shadow +4. Clarity +3.", "D-Range Priority Off and DR100.", "He did not publish a white balance. Leave Auto at 0, 0."],
  },
};

function saveFavs() {
  recipeLikes.save();
}

function setRecipes() {
  if (activeSet === "all") return CATALOG.recipes;
  return CATALOG.recipes.filter((recipe) => recipe.set === activeSet);
}

function visibleRecipes() {
  const inSet = setRecipes();
  if (activeTag === "favs") return inSet.filter((recipe) => favs.has(recipe.id));
  if (activeTag) return inSet.filter((recipe) => recipe.tags.includes(activeTag));
  return inSet;
}

function frameGrid(images) {
  const cls = images.length === 3 ? "frames three" : "frames";
  return `<span class="${cls}">${images.map((src) => `<img src="${src}" alt="">`).join("")}</span>`;
}

function shot(recipe) {
  const saved = favs.has(recipe.id);
  const mark = recipe.score == null ? "" : `<em>${recipe.score}</em>`;
  return `<figure class="shot">
    <button class="heart" data-fav="${recipe.id}" aria-pressed="${saved}" aria-label="Save ${recipe.name}">${saved ? "♥" : "♡"}</button>
    <button class="info" data-info="${recipe.id}" aria-label="Notes for ${recipe.name}">i</button>
    <button class="shot-hit" data-open="${recipe.id}" aria-label="${recipe.name}">
      ${frameGrid(recipe.images)}
      <span class="cap"><strong>${recipe.name}</strong>${mark}</span>
    </button>
  </figure>`;
}

function attr(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

const SETTING_KEY = {
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

function catalogSettings(recipe) {
  const data = { sim: recipe.sim, code: recipe.code || "", exposure: recipe.exposure || "" };
  for (const row of recipe.settings || []) {
    const key = SETTING_KEY[row[0]];
    if (key && row[1]) data[key] = row[1];
  }
  return `<fuji-settings data-json="${attr(JSON.stringify(data))}"></fuji-settings>`;
}

function openNotes(id) {
  const recipe = CATALOG.recipes.find((item) => item.id === id);
  const note = notes[id];
  const list = (items) => `<ul>${items.map((line) => `<li>${line}</li>`).join("")}</ul>`;
  popBody.innerHTML = `
    <div class="sheet-head">
      <h2>${recipe.name}</h2>
      <button class="close" value="cancel">Close</button>
    </div>
    <section><h3>When</h3><p>${note.when}</p></section>
    <section><h3>How</h3>${list(note.how)}</section>
    <section><h3>Watch</h3>${list(note.watch)}</section>
    <section><h3>On the X-S20</h3>${list([
      "JPEG + RAW. The recipe is in the JPEG.",
      "White balance grid: right is more red, down is less blue.",
      "Auto Update Custom Setting off, or the slot rewrites itself.",
    ])}</section>`;
  pop.showModal();
}

function openRecipe(id) {
  const recipe = CATALOG.recipes.find((item) => item.id === id);
  const set = CATALOG.sets.find((item) => item.id === recipe.set);
  const score = recipe.score == null ? "" : `${recipe.score}`;
  const swap = recipe.swap
    ? `<button type="button" class="swap" data-swap="${recipe.id}">${recipe.swap.name}</button>`
    : "";
  sheetBody.innerHTML = `
    <div class="sheet-head">
      <div>
        <h2>${recipe.name}</h2>
        <p class="meta">${set.backup}${score ? ` · ${score}` : ""}</p>
      </div>
      <button type="button" class="info in-sheet" data-info="${recipe.id}" aria-label="Notes for ${recipe.name}">i</button>
      <button class="close" value="cancel">Close</button>
    </div>
    <div class="photo">${frameGrid(recipe.images)}</div>
    ${catalogSettings(recipe)}
    ${swap}`;
  sheet.showModal();
}

function render() {
  const tabs = [
    ...CATALOG.sets.filter((set) => set.show !== false),
    { id: "all", backup: "All" },
  ];
  backupsEl.innerHTML = tabs.map((set) => {
    const on = !activeTag && activeSet === set.id;
    return `<button type="button" data-set="${set.id}" aria-pressed="${on}">${set.backup}</button>`;
  }).join("");

  const blocked = hideOnSet[activeSet] || new Set();
  const used = new Set(setRecipes().flatMap((recipe) => recipe.tags).filter((tag) => !blocked.has(tag)));
  const chips = [["favs", "Saved"], ...CATALOG.tags.filter(([id]) => used.has(id))];
  filtersEl.innerHTML = chips.map(([id, label]) => {
    return `<button type="button" data-tag="${id}" aria-pressed="${activeTag === id}">${label}</button>`;
  }).join("");

  const recipes = visibleRecipes();
  if (activeTag === "favs") hint.textContent = recipes.length ? "Saved looks" : "Nothing saved yet";
  else if (activeTag) hint.textContent = tagName[activeTag];
  else hint.textContent = glance[activeSet];

  stage.classList.toggle("is-all", activeSet === "all");
  stage.innerHTML = recipes.length
    ? recipes.map(shot).join("")
    : `<p class="empty">Nothing in this backup matches.</p>`;
  stage.scrollTop = 0;
}

backupsEl.addEventListener("click", (event) => {
  const button = event.target.closest("[data-set]");
  if (!button) return;
  activeSet = button.dataset.set;
  activeTag = null;
  render();
});

sheet.addEventListener("click", (event) => {
  const info = event.target.closest("[data-info]");
  if (!info) return;
  openNotes(info.dataset.info);
});

filtersEl.addEventListener("click", (event) => {
  const button = event.target.closest("[data-tag]");
  if (!button) return;
  activeTag = activeTag === button.dataset.tag ? null : button.dataset.tag;
  render();
});

stage.addEventListener("click", (event) => {
  const fav = event.target.closest("[data-fav]");
  if (fav) {
    event.stopPropagation();
    const id = fav.dataset.fav;
    if (favs.has(id)) favs.delete(id);
    else favs.add(id);
    saveFavs();
    render();
    return;
  }
  const info = event.target.closest("[data-info]");
  if (info) {
    event.stopPropagation();
    openNotes(info.dataset.info);
    return;
  }
  const open = event.target.closest("[data-open]");
  if (open) openRecipe(open.dataset.open);
});

render();

const requestedRecipe = new URLSearchParams(location.search).get("recipe");
if (requestedRecipe) {
  const recipe = CATALOG.recipes.find((item) => item.id === requestedRecipe);
  if (recipe) {
    activeSet = recipe.set;
    activeTag = null;
    render();
    openRecipe(recipe.id);
  }
}
