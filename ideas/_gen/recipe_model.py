"""Shared parsing, ranges and delta logic for park recipes.

Camera recipe = what a custom bank stores: film sim, WB (mode + R/B shift),
DR, highlight, shadow, color, sharpness, NR, clarity, grain, CCE, CC FX Blue.
Exposure (aperture, shutter, ISO, EC, focal length) is per shot and is not
part of the recipe.
"""
import math
import re

SIMS = {
    "Provia": "PV", "Velvia": "VV", "Astia": "AS", "Classic Chrome": "CC",
    "PRO Neg. Hi": "NH", "PRO Neg. Std": "NS", "Classic Negative": "CN",
    "Nostalgic Neg.": "NN", "Eterna": "ET", "Eterna Bleach Bypass": "EB",
    "Acros": "AC", "Acros+Ye": "AC", "Acros+R": "AC", "Acros+G": "AC",
    "Monochrome": "MO", "Monochrome+Ye": "MO", "Monochrome+R": "MO",
    "Monochrome+G": "MO", "Sepia": "SP",
}
NOT_ON_XS20 = {"Reala Ace"}

DIALS = ["sim", "wb", "dr", "highlight", "shadow", "color", "sharp", "nr",
         "clarity", "grain", "chrome", "blue"]
EXPOSURE = ["aperture", "shutter", "iso", "ec", "focal"]

LABEL = {
    "sim": "Film sim", "wb": "WB", "dr": "DR", "highlight": "Highlight",
    "shadow": "Shadow", "color": "Color", "sharp": "Sharpness", "nr": "NR",
    "clarity": "Clarity", "grain": "Grain", "chrome": "Color chrome",
    "blue": "FX Blue",
}
CODE = {
    "wb": "WB", "dr": "DR", "highlight": "H", "shadow": "S", "color": "C",
    "sharp": "SH", "nr": "NR", "clarity": "CL", "grain": "GR",
    "chrome": "CCE", "blue": "FXB", "sim": "SIM",
}

RANGE = {
    "highlight": (-2, 4, 0.5), "shadow": (-2, 4, 0.5),
    "color": (-4, 4, 1), "sharp": (-4, 4, 1), "nr": (-4, 4, 1),
    "clarity": (-5, 5, 1),
}
LEVEL = {"Off": 0, "Weak": 1, "Strong": 2}
DR_MIN_ISO = {"DR100": 160, "DR200": 320, "DR400": 640, "DR-Auto": 160}

# A difference at or below these is inside the error of reading a dial off a
# compressed web photo, so it is absorbed into the base instead of becoming a
# delta. Anything above is kept as a visible change.
NOISE = {"highlight": 0.5, "shadow": 0.5, "color": 1, "sharp": 2, "nr": 2,
         "clarity": 1}
MAX_DELTAS = 2
WB_NOISE = 1
# Visual weight of one unit of difference, used to pick which deltas to keep.
WEIGHT = {"highlight": 2.0, "shadow": 2.0, "color": 0.8, "sharp": 0.3,
          "nr": 0.1, "clarity": 0.6}


def num(text):
    t = str(text).strip().replace("−", "-").replace("–", "-")
    return float(t)


def fmt(value):
    if value == 0:
        return "0"
    s = ("%g" % abs(value))
    return ("+" if value > 0 else "−") + s


def parse_wb(text):
    t = str(text).replace("−", "-")
    m = re.match(r"^(.*?)\s*([+-]?\d+)R\s*([+-]?\d+)B$", t.strip())
    if not m:
        raise ValueError("bad wb " + text)
    return m.group(1).strip(), int(m.group(2)), int(m.group(3))


def fmt_wb(mode, r, b):
    def s(v):
        return "0" if v == 0 else ("+%d" % v if v > 0 else "−%d" % -v)
    return f"{mode} {s(r)}R {s(b)}B"


def parse_grain(text):
    t = str(text)
    if t.strip().lower() == "off":
        return 0, ""
    level = LEVEL["Strong"] if "Strong" in t else LEVEL["Weak"]
    size = "Large" if "Large" in t else "Small"
    return level, size


def fmt_grain(level, size):
    if level == 0:
        return "Off"
    return ("Strong" if level == 2 else "Weak") + ", " + size


def first_iso(iso):
    return int(re.split(r"[–-]", str(iso))[0])


def ev100(aperture, shutter, iso):
    n = float(str(aperture).replace("f/", ""))
    s = str(shutter)
    t = 1 / float(s.split("/")[1]) if s.startswith("1/") else float(s.rstrip('"s'))
    return math.log2(n * n / t) - math.log2(first_iso(iso) / 100)


def ec_value(ec):
    t = str(ec).replace("−", "-").strip()
    if t in ("0", "±0"):
        return 0.0
    sign = -1 if t.startswith("-") else 1
    t = t.lstrip("+-")
    whole = 0.0
    if " " in t:
        a, t = t.split(" ", 1)
        whole = float(a)
    if "/" in t:
        p, q = t.split("/")
        return sign * (whole + float(p) / float(q))
    return sign * (whole + float(t))


def check_dials(r):
    """Return a list of problems with one recipe on an X-S20."""
    errs = []
    if r["sim"] in NOT_ON_XS20 or r["sim"] not in SIMS:
        errs.append(f"film sim {r['sim']} is not on the X-S20")
    for key, (lo, hi, step) in RANGE.items():
        v = num(r[key])
        if v < lo or v > hi:
            errs.append(f"{key} {r[key]} outside {lo}..{hi}")
        if abs(v / step - round(v / step)) > 1e-9:
            errs.append(f"{key} {r[key]} not a {step} step")
        if key in ("color", "sharp", "nr", "clarity") and v != int(v):
            errs.append(f"{key} {r[key]} has no half steps")
    parse_wb(r["wb"])
    if r["dr"] not in DR_MIN_ISO:
        errs.append("dr " + r["dr"])
    g = str(r["grain"])
    if g != "Off" and not re.match(r"^(Weak|Strong), (Small|Large)$", g):
        errs.append("grain " + g)
    for key in ("chrome", "blue"):
        if r[key] not in LEVEL:
            errs.append(f"{key} {r[key]}")
    return errs


def diff(shot, base, keep_dr=False):
    """Per-dial differences between a shot recipe and a base.

    Returns (deltas, absorbed), or None when the film sim differs (a base is
    never stretched across film sims). Each item: (key, impact, value, note).
    DR one step apart is absorbed: the shot takes the base DR and its ISO is
    raised to the DR floor. keep_dr keeps it as a delta, for shots that need
    a low ISO (slow shutter).
    """
    deltas, absorbed = [], []
    if shot["sim"] != base["sim"]:
        return None
    sm, sr, sb = parse_wb(shot["wb"])
    bm, br, bb = parse_wb(base["wb"])
    dr_, db_ = sr - br, sb - bb
    if sm != bm or abs(dr_) > WB_NOISE or abs(db_) > WB_NOISE:
        impact = (2.0 if sm != bm else 0) + 0.6 * (abs(dr_) + abs(db_))
        deltas.append(("wb", impact, shot["wb"], ""))
    elif dr_ or db_:
        absorbed.append(("wb", 0.3 * (abs(dr_) + abs(db_)), shot["wb"], ""))
    if shot["dr"] != base["dr"]:
        steps = abs(["DR100", "DR200", "DR400"].index(shot["dr"]) -
                    ["DR100", "DR200", "DR400"].index(base["dr"]))
        item = ("dr", 1.0 * steps, shot["dr"], "")
        (deltas if keep_dr or steps > 1 else absorbed).append(item)
    for key in ("highlight", "shadow", "color", "sharp", "nr", "clarity"):
        d = num(shot[key]) - num(base[key])
        if d == 0:
            continue
        item = (key, WEIGHT[key] * abs(d), shot[key], "")
        (absorbed if abs(d) <= NOISE[key] else deltas).append(item)
    sl, ss = parse_grain(shot["grain"])
    bl, bs = parse_grain(base["grain"])
    if sl != bl or (sl and ss != bs):
        if {sl, bl} == {0, 1} or (sl == bl):
            absorbed.append(("grain", 0.4, shot["grain"], ""))
        else:
            deltas.append(("grain", 1.5 * abs(sl - bl), shot["grain"], ""))
    for key, w in (("chrome", 1.0), ("blue", 0.6)):
        a, b = LEVEL[shot[key]], LEVEL[base[key]]
        if a == b:
            continue
        if {a, b} == {0, 1}:
            absorbed.append((key, 0.3, shot[key], ""))
        else:
            deltas.append((key, w * abs(a - b), shot[key], ""))
    return deltas, absorbed


def needs_low_iso(shot):
    s = str(shot["shutter"])
    return s.startswith("1/") and int(s.split("/")[1]) < 60


def assign(shot, bases, pins=None):
    """Pick the base with the fewest deltas, then the smallest total change.

    Returns dict(base, delta{key: value}, absorbed[(key, value)],
    dropped[(key, value)]) where dropped are deltas past MAX_DELTAS.
    """
    keep_dr = needs_low_iso(shot)
    pin = (pins or {}).get(shot["id"])
    if pin:
        b = next(x for x in bases if x["id"] == pin[0])
        deltas, absorbed = diff(shot, b, keep_dr)
        chosen = pin[1]
        if len(chosen) > MAX_DELTAS:
            raise SystemExit(f"{shot['id']}: pin has more than {MAX_DELTAS} deltas")
        return {
            "base": b,
            "delta": dict(chosen),
            "absorbed": [(k, v) for k, _, v, _ in absorbed],
            "dropped": [(k, v) for k, _, v, _ in deltas if k not in chosen],
        }
    best = None
    for b in bases:
        res = diff(shot, b, keep_dr)
        if res is None:
            continue
        deltas, absorbed = res
        score = (len(deltas), sum(x[1] for x in deltas) + sum(x[1] for x in absorbed))
        if best is None or score < best[0]:
            best = (score, b, deltas, absorbed)
    if best is None:
        raise SystemExit(f"{shot['id']}: no base with film sim {shot['sim']}")
    _, b, deltas, absorbed = best
    deltas = sorted(deltas, key=lambda x: -x[1])
    return {
        "base": b,
        "delta": {k: v for k, _, v, _ in deltas[:MAX_DELTAS]},
        "absorbed": [(k, v) for k, _, v, _ in absorbed],
        "dropped": [(k, v) for k, _, v, _ in deltas[MAX_DELTAS:]],
    }


def apply(base, delta):
    out = {k: base[k] for k in DIALS}
    out.update(delta)
    return out


def delta_text(key, value):
    if key == "wb":
        return "WB " + value
    if key == "dr":
        return value
    if key == "grain":
        return "Grain " + value.replace(", ", " ")
    if key in ("chrome", "blue"):
        return f"{LABEL[key]} {value}"
    return f"{LABEL[key]} {value}"


def delta_code(key, value):
    """Short ASCII form for phone notes: S+1, CL-4, DR100, CCE-S, GR-WL."""
    v = str(value).replace("−", "-")
    if key == "dr":
        return v
    if key == "wb":
        mode, r, b = parse_wb(value)
        m = {"Daylight": "DAY", "Auto": "AUTO", "Shade": "SHADE"}.get(mode, mode)
        return f"WB{m}{r:+d}R{b:+d}B".replace("+0R", "0R").replace("+0B", "0B")
    if key == "grain":
        if v == "Off":
            return "GR-OFF"
        lv, size = parse_grain(value)
        return "GR-" + ("S" if lv == 2 else "W") + size[0]
    if key in ("chrome", "blue"):
        return CODE[key] + "-" + {"Off": "OFF", "Weak": "W", "Strong": "S"}[v]
    n = num(value)
    return CODE[key] + ("%+g" % n if n else "0")
