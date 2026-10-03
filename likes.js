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
