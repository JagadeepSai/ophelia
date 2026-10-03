const ideaLikes = likesStore(IDEA_FAV_KEY);
const page = document.body.dataset.page;
const main = document.querySelector("#main");
const lede = document.querySelector("#lede");
const filtersEl = document.querySelector("#filters");
let activeTag = null;
if (page === "park" && new URLSearchParams(location.search).get("liked") === "1") activeTag = "liked";

function esc(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function tagLabel(id) {
  return IDEAS.tagLabels[id] || id;
}

function tagsHtml(tags) {
  return `<div class="tags">${tags.map((id) => `<span class="tag">${esc(tagLabel(id))}</span>`).join("")}</div>`;
}

function para(text) {
  return `<p>${esc(text)}</p>`;
}

function items(list, ordered) {
  const tag = ordered ? "ol" : "ul";
  return `<${tag}>${list.map((line) => `<li>${esc(line)}</li>`).join("")}</${tag}>`;
}

function parkShots() {
  return IDEAS.shots.filter((shot) => shot.group === "park");
}

function likedShots() {
  return parkShots().filter((shot) => ideaLikes.has(shot.id));
}

function visibleShots() {
  const shots = parkShots();
  if (activeTag === "liked") return likedShots();
  if (!activeTag) return shots;
  return shots.filter((shot) => shot.tags.includes(activeTag));
}

function heartHtml(shot) {
  const on = ideaLikes.has(shot.id);
  return `<button type="button" class="heart" data-like="${esc(shot.id)}" data-name="${esc(shot.look)}" aria-pressed="${on}" aria-label="${on ? "Unsave" : "Save"} ${esc(shot.look)}">${on ? "♥" : "♡"}</button>`;
}

function likedLine(shot) {
  const base = baseOf(shot);
  const codes = (shot.delta || []).map((change) => change.code).filter(Boolean);
  const built = [shot.code, base && base.code, ...codes].filter(Boolean).join(" ");
  const left = present(shot.label) ? String(shot.label).trim() : built;
  return `${left} — ${shot.look}`;
}

function present(value) {
  if (value == null) return false;
  const text = String(value).trim();
  return text !== "" && text !== "undefined" && text !== "null";
}

function dialLookup(shot, name) {
  const row = (shot.dial || []).find(([label]) => label === name);
  return row && present(row[1]) ? row[1] : "";
}

function specValue(shot, key, dialName) {
  const spec = shot.spec || {};
  if (present(spec[key])) return spec[key];
  if (dialName) return dialLookup(shot, dialName);
  return "";
}

function tonePiece(shot, which) {
  const direct = specValue(shot, which);
  if (present(direct)) return direct;
  const tone = (shot.spec || {}).tone;
  if (!present(tone)) return "";
  const match = String(tone).match(which === "highlight" ? /H\s*([+\-−]?\d+(?:\.\d+)?)/ : /S\s*([+\-−]?\d+(?:\.\d+)?)/);
  return match ? match[1] : "";
}

function chromePieces(shot) {
  let chrome = specValue(shot, "chrome", "Color Chrome Effect");
  let blue = specValue(shot, "blue", "Color Chrome FX Blue");
  if (present(chrome) && !present(blue)) {
    const match = chrome.match(/^(.*?)\s*\/\s*Blue\s+(.+)$/i);
    if (match) {
      chrome = match[1].trim();
      blue = match[2].trim();
    }
  }
  return { chrome, blue };
}

function chipText(prefix, value) {
  if (!present(value)) return "";
  const text = String(value).trim();
  if (text.toLowerCase().startsWith(prefix.toLowerCase())) return text;
  return prefix + text;
}

function settingsData(shot) {
  const chrome = chromePieces(shot);
  const base = (IDEAS.bases || []).find((item) => item.id === shot.recipe) || {};
  const changed = (shot.delta || []).map((change) => change.key);
  const prior = {};
  for (const key of changed) {
    if (present(base[key])) prior[key] = base[key];
  }
  return {
    sim: specValue(shot, "sim", "Film simulation"),
    code: base.code || "",
    wb: specValue(shot, "wb", "White balance"),
    dr: specValue(shot, "dr", "Dynamic range"),
    highlight: tonePiece(shot, "highlight"),
    shadow: tonePiece(shot, "shadow"),
    color: specValue(shot, "color", "Color"),
    sharp: specValue(shot, "sharp", "Sharpness"),
    nr: specValue(shot, "nr", "High ISO NR"),
    clarity: specValue(shot, "clarity", "Clarity"),
    grain: specValue(shot, "grain", "Grain"),
    chrome: chrome.chrome,
    blue: chrome.blue,
    aperture: specValue(shot, "aperture"),
    shutter: specValue(shot, "shutter"),
    iso: specValue(shot, "iso"),
    ec: specValue(shot, "ec"),
    focal: specValue(shot, "focal"),
    light: shot.condition || "",
    changed,
    base: prior,
  };
}

function compactDials(shot) {
  return `<fuji-settings data-json="${esc(JSON.stringify(settingsData(shot)))}"></fuji-settings>`;
}

function renderGroups() {
  const ready = parkShots().length;
  const liked = likedShots().length;
  lede.innerHTML = `Frames to shoot again on the X-S20. <a href="${siteUrl("ideas/park/?liked=1")}">Liked · ${liked}</a>`;
  main.innerHTML = `<div class="groups">${IDEAS.groups.map((group) => {
    return `<a class="group" href="${esc(siteUrl(group.href))}">
      <img src="${esc(siteUrl(group.cover))}" alt="">
      <div>
        <p class="kicker">${ready} frames</p>
        <h2>${esc(group.title)}</h2>
        <p>${esc(group.blurb)}</p>
      </div>
    </a>`;
  }).join("")}</div>
  <p class="foot">${esc(IDEAS.note)}</p>`;
}

function renderFilters() {
  if (!filtersEl) return;
  const used = new Set(parkShots().flatMap((shot) => shot.tags));
  const chips = Object.keys(IDEAS.tagLabels).filter((id) => used.has(id));
  const liked = likedShots().length;
  filtersEl.hidden = false;
  filtersEl.innerHTML = `<button type="button" data-tag="liked" aria-pressed="${activeTag === "liked"}">Liked ${liked}</button>${chips.map((id) => {
    return `<button type="button" data-tag="${esc(id)}" aria-pressed="${activeTag === id}">${esc(tagLabel(id))}</button>`;
  }).join("")}${liked ? `<button type="button" data-copy-likes>Copy liked list</button>` : ""}`;
}

function renderGallery() {
  const shots = visibleShots();
  document.title = "Park · Ideas";
  lede.textContent = activeTag === "liked"
    ? (shots.length ? `${shots.length} liked` : "Nothing saved yet")
    : activeTag
      ? `${shots.length} · ${tagLabel(activeTag).toLowerCase()}`
      : "Open a frame for where to stand.";
  renderFilters();
  const grid = shots.length
    ? `<div class="gallery">${shots.map((shot) => {
      return `<article class="card">
        ${heartHtml(shot)}
        <a href="#${esc(shot.id)}">
          <img src="${esc(siteUrl(shot.image))}" alt="" loading="lazy">
          <div>
            ${shot.code ? `<p class="kicker">${esc(shot.code)} · ${esc((baseOf(shot) || {}).name || "")}</p>` : ""}
            <h2>${esc(shot.look)}</h2>
            <p>${esc(shot.mood)}</p>
          </div>
        </a>
      </article>`;
    }).join("")}</div>`
    : `<p class="empty">${activeTag === "liked" ? "Nothing saved yet." : "Nothing under this tag."}</p>`;
  main.innerHTML = `${grid}<p class="foot">${esc(IDEAS.note)}</p>`;
  window.scrollTo(0, 0);
}

function jumpBar(shot) {
  const jumps = [
    ["sec-exposure", "Exposure", compactDials(shot)],
    ["sec-settings", "Settings", shot.settings],
    ["sec-light", "Light", shot.light],
    ["sec-frame", "Frame", shot.frame],
    ["sec-pose", "Pose", shot.pose],
    ["sec-steps", "Steps", shot.steps],
  ].filter(([, , body]) => Array.isArray(body) ? body.some(present) : present(body));
  if (!jumps.length) return "";
  return `<div class="jumps">${jumps.map(([id, label]) => `<button type="button" data-jump="${id}">${label}</button>`).join("")}</div>`;
}

function section(id, title, body, ordered) {
  if (Array.isArray(body)) {
    const lines = body.filter(present);
    if (!lines.length) return "";
    return `<section id="${id}"><h3>${esc(title)}</h3>${items(lines, ordered)}</section>`;
  }
  if (!present(body)) return "";
  return `<section id="${id}"><h3>${esc(title)}</h3>${para(body)}</section>`;
}

function baseOf(shot) {
  return (IDEAS.bases || []).find((base) => base.id === shot.recipe);
}

function deltaChips(shot) {
  const changes = shot.delta || [];
  if (!changes.length) return `<span class="delta same">As is</span>`;
  return changes.map((change) => `<span class="delta">${esc(change.text || `${change.label} ${change.value}`)}</span>`).join("");
}

function recipeLine(shot) {
  const base = baseOf(shot);
  if (!base) return "";
  return `<div class="base-line">
    <a class="base-name" href="${siteUrl("recipes/?group=park")}#${esc(base.id)}">Recipe: ${esc(base.name)}</a>
    <span class="code">${esc(base.code)}</span>
    <span class="deltas">${deltaChips(shot)}</span>
  </div>`;
}

function renderDetail(shot) {
  document.title = `${shot.look} · Park`;
  lede.textContent = shot.mood;
  if (filtersEl) filtersEl.hidden = true;
  main.innerHTML = `<article class="detail">
    <a class="back" href="${siteUrl("ideas/park/")}">Park</a>
    <div class="frame"><img src="${esc(siteUrl(shot.image))}" alt="${esc(shot.look)}"></div>
    <div class="paper">
      <p class="kicker"><a href="${siteUrl("ideas/park/recipes/")}#${esc(shot.id)}">${esc(shot.label || shot.code || "")}</a></p>
      <div class="title-line"><h2>${esc(shot.look)}</h2>${heartHtml(shot)}</div>
      <p class="sub">${esc(shot.mood)}</p>
      ${recipeLine(shot)}
      <section id="sec-exposure">${compactDials(shot)}</section>
      ${jumpBar(shot)}
      ${section("sec-settings", "Settings", shot.settings)}
      ${section("sec-light", "Light", shot.light)}
      ${section("sec-frame", "Frame", shot.frame)}
      ${section("sec-pose", "Pose", shot.pose)}
      ${section("sec-steps", "Steps", shot.steps, true)}
    </div>
  </article>`;
  window.scrollTo(0, 0);
}

function recipeRow(shot) {
  return `<article class="recipe" id="${esc(shot.id)}">
      <a href="${siteUrl("ideas/park/")}#${esc(shot.id)}"><img src="${esc(siteUrl(shot.image))}" alt="" loading="lazy"></a>
      <div>
        <p class="kicker">${esc(shot.code || "")}</p>
        <h2><a href="${siteUrl("ideas/park/")}#${esc(shot.id)}">${esc(shot.look)}</a></h2>
        <div class="deltas">${deltaChips(shot)}</div>
        ${compactDials(shot)}
      </div>
    </article>`;
}

function renderRecipes() {
  const shots = parkShots();
  const bases = IDEAS.bases || [];
  document.title = "Park recipes · Ideas";
  lede.innerHTML = `${shots.length} frames on ${bases.length} recipes. <a href="${siteUrl("recipes/?group=park")}">Recipe cards</a>`;
  const blocks = bases.map((base) => {
    const own = shots.filter((shot) => shot.recipe === base.id);
    if (!own.length) return "";
    return `<section class="base-block" id="${esc(base.id)}">
      <h2 class="base-head"><a href="${siteUrl("recipes/?group=park")}#${esc(base.id)}">${esc(base.name)}</a> <span class="code">${esc(base.code)}</span> <span class="count">${own.length}</span></h2>
      <div class="recipes">${own.map(recipeRow).join("")}</div>
    </section>`;
  }).join("");
  const loose = shots.filter((shot) => !bases.some((base) => base.id === shot.recipe));
  main.innerHTML = `${blocks}${loose.length ? `<div class="recipes">${loose.map(recipeRow).join("")}</div>` : ""}
  <p class="foot">${esc(IDEAS.note)}</p>`;
  const id = location.hash.replace(/^#/, "");
  const target = id && document.getElementById(id);
  if (target) target.scrollIntoView();
  else window.scrollTo(0, 0);
}

function renderPark() {
  const id = location.hash.replace(/^#/, "");
  const shot = parkShots().find((item) => item.id === id);
  if (shot) renderDetail(shot);
  else renderGallery();
}

function copyLikedList(button) {
  const lines = likedShots().map(likedLine).join("\n");
  const done = (ok) => {
    button.textContent = ok ? "Copied" : "Copy failed";
    setTimeout(() => { button.textContent = "Copy liked list"; }, 1200);
  };
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(lines).then(() => done(true), () => done(false));
    return;
  }
  const area = document.createElement("textarea");
  area.value = lines;
  document.body.appendChild(area);
  area.select();
  const ok = document.execCommand("copy");
  area.remove();
  done(ok);
}

if (filtersEl) {
  filtersEl.addEventListener("click", (event) => {
    const copy = event.target.closest("[data-copy-likes]");
    if (copy) {
      copyLikedList(copy);
      return;
    }
    const button = event.target.closest("[data-tag]");
    if (!button) return;
    activeTag = activeTag === button.dataset.tag ? null : button.dataset.tag;
    const path = activeTag === "liked" ? siteUrl("ideas/park/?liked=1") : siteUrl("ideas/park/");
    if (location.hash || location.search) history.pushState(null, "", path);
    else if (activeTag === "liked") history.pushState(null, "", path);
    renderGallery();
  });
}

main.addEventListener("click", (event) => {
  const like = event.target.closest("[data-like]");
  if (like) {
    event.preventDefault();
    event.stopPropagation();
    const id = like.dataset.like;
    ideaLikes.toggle(id);
    if (page === "park" && activeTag === "liked" && !ideaLikes.has(id) && !location.hash) {
      const y = window.scrollY;
      renderGallery();
      window.scrollTo(0, y);
      return;
    }
    const on = ideaLikes.has(id);
    document.querySelectorAll(`[data-like="${CSS.escape(id)}"]`).forEach((button) => {
      button.setAttribute("aria-pressed", String(on));
      button.textContent = on ? "♥" : "♡";
      button.setAttribute("aria-label", `${on ? "Unsave" : "Save"} ${button.dataset.name}`);
    });
    const chip = document.querySelector('[data-tag="liked"]');
    const count = likedShots().length;
    if (chip) chip.textContent = `Liked ${count}`;
    if (filtersEl && !filtersEl.hidden) {
      const copy = filtersEl.querySelector("[data-copy-likes]");
      if (count && !copy) filtersEl.insertAdjacentHTML("beforeend", `<button type="button" data-copy-likes>Copy liked list</button>`);
      if (!count && copy) copy.remove();
    }
    return;
  }
  const jump = event.target.closest("[data-jump]");
  if (!jump) return;
  const section = document.getElementById(jump.dataset.jump);
  if (section) section.scrollIntoView({ behavior: "smooth", block: "start" });
});

window.addEventListener("hashchange", () => {
  if (page === "park") renderPark();
  if (page === "recipes") renderRecipes();
});

if (page === "groups") renderGroups();
else if (page === "recipes") renderRecipes();
else renderPark();
