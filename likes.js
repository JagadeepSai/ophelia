// likes.js lives at the site root, so its directory is the base for every
// site link (works at "/" locally and under "/ophelia/" on GitHub Pages).
const SITE_BASE = new URL(".", document.currentScript.src).href;

function siteUrl(path) {
  if (/^([a-z][a-z0-9+.-]*:|\/\/)/i.test(path)) return path;
  return SITE_BASE + String(path).replace(/^\/+/, "");
}

const RECIPE_FAV_KEY = "fuji-recipe-favs";
const IDEA_FAV_KEY = "fuji-idea-favs";

function likesStore(key) {
  const set = new Set(JSON.parse(localStorage.getItem(key) || "[]"));
  return {
    set,
    save() {
      localStorage.setItem(key, JSON.stringify([...set]));
    },
    has(id) {
      return set.has(id);
    },
    toggle(id) {
      if (set.has(id)) set.delete(id);
      else set.add(id);
      this.save();
      return set.has(id);
    },
    list() {
      return [...set];
    },
  };
}
