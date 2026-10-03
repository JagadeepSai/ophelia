"""Short light name taken from the shot note, not from the exposure value."""


def _sun_behind(text):
    return any(phrase in text for phrase in (
        "sun behind",
        "sun low behind",
        "from behind",
        "behind her",
        "behind the",
        "just behind",
        "behind and",
    ))


def condition(text):
    """One short name a photographer can read in the triangle."""
    raw = str(text or "").strip()
    t = raw.lower()
    first = t.split(".")[0]

    if "edge of that light" in t:
        return "edge light"
    if "almost black" in t and "shaft" in t:
        return "deep shade"
    if any(phrase in first for phrase in ("low sun", "late sun", "sun low")):
        if _sun_behind(first):
            return "backlight"
        return "low sun"
    if any(phrase in first for phrase in ("hard sun", "hard midday", "midday sun")):
        return "hard sun"
    # "Face in open shade" is the fill. If the sentence leads with the sun behind, that is the light.
    if _sun_behind(first):
        return "backlight"
    if "open shade" in first and "open shade will" not in first and "face in open shade" not in first:
        return "open shade"
    if "hard warm patch" in first:
        return "hard sun"
    if "day through" in first:
        return "soft light"
    if any(phrase in first for phrase in ("through", "patches", "stripes", "a beam", "hard gold", "hard stripe")):
        return "dappled"
    if _sun_behind(first):
        return "backlight"
    if "open sun" in first:
        return "open sun"
    if any(phrase in first for phrase in ("sun high", "hard shadow", "open daylight")):
        return "hard sun"
    if "in the shade" in t or "shade under the trees" in first:
        return "open shade"
    if "bright open sky" in first:
        return "open sky"
    if "open sky" in first and "little shade" in t:
        return "open sky"
    if first.startswith("open, warm"):
        return "low sun"
    if "open shade" in t and "open shade will" not in t and "full shade loses" not in t:
        return "open shade"
    if "sun from the" in first or "sun from camera" in first:
        return "warm sun"
    if any(phrase in t for phrase in (
        "even daylight", "soft, even", "soft daylight", "open, even",
        "no sun on the face", "no sun patches", "little shadow", "face is even",
    )):
        return "open shade"
    raise ValueError("no light name for: " + raw[:80])
