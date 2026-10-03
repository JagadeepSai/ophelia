"""One-time move from 79 full recipes to base + delta.

Writes original_dials.json (the first-pass inferred dials and exposure, kept
for the record and for analyze.py), then rewrites notes/*.py so each shot
stores "recipe" and "delta" instead of twelve dial fields, with corrected
exposure. Safe to re-run: it stops if the notes are already migrated.
"""
import json
import math
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from recipe_model import DIALS, EXPOSURE, apply, assign, needs_low_iso  # noqa: E402
from bases import BASES, PINS  # noqa: E402
from exposure import fix  # noqa: E402

ORIGINAL = HERE / "original_dials.json"
MAX_ES = 8000
STOPS = ["f/2.8", "f/4", "f/5.6", "f/8", "f/11"]

PROSE = {
    "bouquet-flare": [("Clarity is already at −5 so the bloom is in the JPEG",
                       "Clarity −4 already puts most of the bloom in the JPEG")],
    "redhead-grass": [("Clarity stays at 0 so the freckles stay",
                       "Clarity stays near 0 so the freckles stay")],
    "head-on-book": [("Clarity stays at 0 so the freckles stay",
                      "Clarity stays near 0 so the freckles stay")],
    "sun-disc": [("If 1/2000 is not enough and the disc blows, go to 1/4000 on the "
                  "mechanical shutter before you switch to electronic.",
                  "The face is metered, so the disc itself will clip. That is the look.")],
}
ES_NOTE = " Faster than 1/4000 needs the electronic shutter."

if "--force" not in sys.argv and "recipe" in (HERE / "notes" / "01.py").read_text()[:600]:
    raise SystemExit("notes already migrated")

files = sorted((HERE / "notes").glob("*.py"))
original = []
for path in files:
    ns = {"SHOTS": []}
    exec(path.read_text(), ns)
    original.extend(ns["SHOTS"])
if not ORIGINAL.exists():
    ORIGINAL.write_text(json.dumps(
        [{"id": s["id"], **{k: s[k] for k in DIALS + EXPOSURE}} for s in original],
        ensure_ascii=False, indent=1) + "\n")
by_id = {s["id"]: s for s in original}


def speed_at(shot, aperture, iso, shutter_den):
    old_n = float(shot["aperture"].replace("f/", ""))
    new_n = float(aperture.replace("f/", ""))
    return shutter_den * (old_n / new_n) ** 2


def new_exposure(shot, eff):
    shutter, iso, es = fix(shot, eff["dr"], needs_low_iso(shot))
    aperture = shot["aperture"]
    den = int(shutter.split("/")[1])
    while den > MAX_ES and aperture in STOPS and aperture != STOPS[-1]:
        aperture = STOPS[STOPS.index(aperture) + 1]
        den = den / 2
    if aperture != shot["aperture"]:
        from exposure import SHUTTERS
        den = min(SHUTTERS, key=lambda s: abs(math.log2(s / den)))
        shutter = f"1/{den}"
    return aperture, shutter, iso, den > 4000


def q(value):
    return json.dumps(value, ensure_ascii=False)


def rewrite_block(block, shot):
    a = assign(shot, BASES, PINS)
    eff = apply(a["base"], a["delta"])
    aperture, shutter, iso, es = new_exposure(shot, eff)

    dial_re = re.compile(r'^"sim": .*\n"highlight": .*\n"grain": .*\n', re.M)
    if not dial_re.search(block):
        raise SystemExit("dial lines not found in " + shot["id"])
    block = dial_re.sub(f'"recipe": {q(a["base"]["id"])}, "delta": {q(a["delta"])},\n', block)
    block = re.sub(
        r'^"aperture": .*$',
        f'"aperture": {q(aperture)}, "shutter": {q(shutter)}, "iso": {q(iso)}, '
        f'"ec": {q(shot["ec"])}, "focal": {q(shot["focal"])},',
        block, count=1, flags=re.M)

    head, sep, prose = block.partition('"settings":')
    for old, new in PROSE.get(shot["id"], []):
        if old not in prose:
            raise SystemExit(f"{shot['id']}: prose not found: {old}")
        prose = prose.replace(old, new)
    old_tri = f'{shot["aperture"]}, {shot["shutter"]}, ISO {shot["iso"]}'
    new_tri = f'{aperture}, {shutter}, ISO {iso}'
    prose = prose.replace(old_tri, new_tri)
    if shutter != shot["shutter"]:
        prose = re.sub(r'(?<![\d/])' + re.escape(shot["shutter"]) + r'(?!\d)', shutter, prose)
    if iso != str(shot["iso"]):
        prose = re.sub(r'ISO ' + re.escape(str(shot["iso"])) + r'(?!\d)', 'ISO ' + iso, prose)
    # Drop the old full-dial step; the build writes the base + delta step.
    prose = re.sub(r'^"Set [^"\n]*",\n', "", prose, flags=re.M)
    if es and ES_NOTE.strip() not in prose:
        prose = re.sub(r'^( "[^\n]*?)(",)$', lambda m: m.group(1) + ES_NOTE + m.group(2),
                       prose, count=1, flags=re.M)
    return head + sep + prose, (shot, a, eff, aperture, shutter, iso, es)


log = []
for path in files:
    text = path.read_text()
    parts = text.split("SHOTS.append({")
    out = [parts[0]]
    for block in parts[1:]:
        sid = re.search(r'^"id": "([^"]+)"', block, re.M).group(1)
        new, info = rewrite_block(block, by_id[sid])
        out.append(new)
        log.append(info)
    path.write_text("SHOTS.append({".join(out))

for shot, a, eff, aperture, shutter, iso, es in log:
    if (aperture, shutter, iso) != (shot["aperture"], shot["shutter"], str(shot["iso"])):
        print(f'{shot["id"]:18} {shot["aperture"]} {shot["shutter"]} ISO {shot["iso"]} -> '
              f'{aperture} {shutter} ISO {iso}{" ES" if es else ""}')
print("migrated", len(log))
