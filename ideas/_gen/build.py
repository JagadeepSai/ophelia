import json
import sys
from pathlib import Path

ROOT = Path("/Users/jagadeep/fuji-recipes/ideas/_gen")
OUT = Path("/Users/jagadeep/fuji-recipes/ideas/ideas-data.js")
IMAGES = Path("/Users/jagadeep/fuji-recipes/public/ideas/park")
LOGO = "e50a7ff02109d1d42300c769367991e8_x1EB.jpg"

sys.path.insert(0, str(ROOT))
from recipe_model import (DIALS, DR_MIN_ISO, LABEL, MAX_DELTAS, SIMS, apply,  # noqa: E402
                          check_dials, delta_code, delta_text, first_iso)
from bases import BASES  # noqa: E402
from light import condition as light_condition  # noqa: E402

NEED = [
    "id", "file", "look", "mood", "tags", "recipe", "delta",
    "aperture", "shutter", "iso", "ec", "focal",
    "settings", "light", "frame", "pose", "steps",
]
CODE_MAX = 12

ns = {"SHOTS": []}
for part in sorted((ROOT / "notes").glob("*.py")):
    exec(part.read_text(), ns)

bases = {}
for base in BASES:
    errs = check_dials(base)
    if errs:
        raise SystemExit(f"{base['id']} {errs}")
    code = base["code"]
    if len(code) > CODE_MAX or not code.isascii():
        raise SystemExit(f"{code} must be ASCII and at most {CODE_MAX} characters")
    if code.split("-")[1] != SIMS[base["sim"]]:
        raise SystemExit(f"{code} film sim code does not match {base['sim']}")
    bases[base["id"]] = {**base, "shots": []}


def dial_step(base, delta):
    first = f"Recipe {base['name']} ({base['code']})."
    if not delta:
        return first + " No changes."
    return first + " Change " + " and ".join(
        f"{LABEL[k]} to {v}" for k, v in delta.items()) + "."


shots = []
seen = set()
names = set()
for n, raw in enumerate(ns["SHOTS"], 1):
    missing = [key for key in NEED if key not in raw]
    if missing:
        raise SystemExit(f"{raw.get('id')} missing {missing}")
    if raw["id"] in seen:
        raise SystemExit("duplicate id " + raw["id"])
    seen.add(raw["id"])
    if raw["look"] in names:
        raise SystemExit("duplicate name " + raw["look"])
    names.add(raw["look"])
    base = bases.get(raw["recipe"])
    if not base:
        raise SystemExit(f"{raw['id']} unknown recipe {raw['recipe']}")
    delta = {k: raw["delta"][k] for k in DIALS if k in raw["delta"]}
    if len(delta) != len(raw["delta"]):
        raise SystemExit(f"{raw['id']} unknown change {raw['delta']}")
    if len(delta) > MAX_DELTAS:
        raise SystemExit(f"{raw['id']} has {len(delta)} changes, max {MAX_DELTAS}")
    for key, value in delta.items():
        if key not in DIALS or key == "sim":
            raise SystemExit(f"{raw['id']} cannot change {key}")
        if value == base[key]:
            raise SystemExit(f"{raw['id']} change {key} equals the base")
    eff = apply(base, delta)
    errs = check_dials(eff)
    iso = first_iso(raw["iso"])
    if iso < DR_MIN_ISO[eff["dr"]]:
        errs.append(f"{eff['dr']} needs ISO {DR_MIN_ISO[eff['dr']]}+, has {iso}")
    if errs:
        raise SystemExit(f"{raw['id']} {errs}")

    code = f"PK-{n:03d}"
    changes = [{
        "key": k,
        "label": LABEL[k],
        "value": v,
        "text": delta_text(k, v),
        "code": delta_code(k, v),
    } for k, v in delta.items()]
    label = " ".join([code, base["code"]] + [c["code"] for c in changes])
    steps = [dial_step(base, delta)] + [s for s in raw["steps"] if not str(s).startswith("Set ")]
    base["shots"].append(raw["id"])
    shots.append({
        "id": raw["id"],
        "code": code,
        "label": label,
        "group": "park",
        "image": "/public/ideas/park/" + raw["file"],
        "file": raw["file"],
        "tags": raw["tags"],
        "look": raw["look"],
        "mood": raw["mood"],
        "recipe": base["id"],
        "delta": changes,
        "spec": {
            **{k: eff[k] for k in DIALS},
            "tone": f"H{eff['highlight']} S{eff['shadow']}",
            "aperture": raw["aperture"],
            "shutter": raw["shutter"],
            "iso": raw["iso"],
            "ec": raw["ec"],
            "focal": raw["focal"],
        },
        "settings": raw["settings"],
        "light": raw["light"],
        "condition": light_condition(raw["light"]),
        "frame": raw["frame"],
        "pose": raw["pose"],
        "steps": steps,
    })

unused = [b["code"] for b in bases.values() if not b["shots"]]
if unused:
    raise SystemExit(f"unused base recipes {unused}")

files = {shot["file"] for shot in shots}
on_disk = {path.name for path in IMAGES.iterdir() if path.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp"}}
missing = sorted(on_disk - files - {LOGO})
extra = sorted(files - on_disk)
if missing or extra:
    raise SystemExit(f"missing {missing} extra {extra}")

data = {
    "tagLabels": {
        "golden": "Golden",
        "backlight": "Backlight",
        "shade": "Shade",
        "hard-sun": "Hard sun",
        "dappled": "Dappled",
        "overhead": "Overhead",
        "close": "Close",
        "low": "Low angle",
        "full": "Full length",
    },
    "note": f"{len(shots)} frames on {len(bases)} recipes. Where the same picture was saved in several sizes, it is here once.",
    "groups": [
        {
            "id": "park",
            "title": "Park",
            "code": "PK",
            "href": "/ideas/park",
            "status": "ready",
            "blurb": f"How to shoot each frame. {len(bases)} recipes cover all {len(shots)}, most with one or two dials changed.",
            "cover": "/public/ideas/park/c8cb66f7b4d713967ae3c5f67990e5a6_002_x1EB.jpg",
        }
    ],
    "bases": [{**b, "group": "park"} for b in bases.values()],
    "shots": shots,
}

OUT.write_text("const IDEAS = " + json.dumps(data, ensure_ascii=False, indent=2) + ";\n")
counts = {b["code"]: len(b["shots"]) for b in bases.values()}
plain = sum(1 for s in shots if not s["delta"])
print(f"shots {len(shots)} recipes {len(bases)} exact {plain} changed {len(shots) - plain}")
print(counts)
