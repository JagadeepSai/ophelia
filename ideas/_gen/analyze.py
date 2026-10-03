"""Cluster the park recipes and test the base + delta model.

Run: python3 ideas/_gen/analyze.py
Reads the original per-shot dials from notes/*.py (the inferred recipes)
and writes a report to stdout.
"""
import itertools
import sys
from collections import Counter
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from recipe_model import (DIALS, assign, check_dials, ev100, ec_value,  # noqa: E402
                          first_iso, DR_MIN_ISO, parse_wb, parse_grain, num, LEVEL)
from bases import BASES, PINS  # noqa: E402

import json  # noqa: E402

# The first-pass inferred dials, one full recipe per shot, before base + delta.
shots = json.loads((HERE / "original_dials.json").read_text())
ns = {"SHOTS": []}
for part in sorted((HERE / "notes").glob("*.py")):
    exec(part.read_text(), ns)
tags = {s["id"]: s["tags"] for s in ns["SHOTS"]}
for s in shots:
    s["tags"] = tags[s["id"]]


def finger(s):
    return tuple(s[k] for k in DIALS)


def steps_apart(a, b):
    """Dials that differ, and whether each differs by at most one step."""
    out = []
    for k in DIALS:
        if a[k] == b[k]:
            continue
        one = False
        if k in ("highlight", "shadow"):
            one = abs(num(a[k]) - num(b[k])) <= 0.5
        elif k in ("color", "sharp", "nr", "clarity"):
            one = abs(num(a[k]) - num(b[k])) <= 1
        elif k == "wb":
            am, ar, ab = parse_wb(a[k])
            bm, br, bb = parse_wb(b[k])
            one = am == bm and abs(ar - br) + abs(ab - bb) <= 1
        elif k in ("chrome", "blue"):
            one = abs(LEVEL[a[k]] - LEVEL[b[k]]) == 1
        elif k == "grain":
            al, as_ = parse_grain(a[k])
            bl, bs = parse_grain(b[k])
            one = abs(al - bl) + (as_ != bs and al and bl) <= 1
        out.append((k, one))
    return out


print("== Inventory")
print("shots", len(shots))
print("film sims", Counter(s["sim"] for s in shots).most_common())
print("distinct camera recipes (exposure excluded):", len({finger(s) for s in shots}))
print("distinct incl. exposure:", len({finger(s) + tuple(s[k] for k in ("aperture", "shutter", "iso", "ec")) for s in shots}))
for key in DIALS:
    print(f"  {key:9} {len(Counter(s[key] for s in shots)):2} values")

print("\n== Near duplicates (<=2 dials apart, each by one step)")
near = []
for a, b in itertools.combinations(shots, 2):
    d = steps_apart(a, b)
    if 0 < len(d) <= 2 and all(one for _, one in d):
        near.append((a["id"], b["id"], [k for k, _ in d]))
print("pairs", len(near))
in_pair = {x for a, b, _ in near for x in (a, b)}
print("shots with at least one near twin", len(in_pair))
parent = {s["id"]: s["id"] for s in shots}


def root(x):
    while parent[x] != x:
        parent[x] = parent[parent[x]]
        x = parent[x]
    return x


for a, b, _ in near:
    parent[root(a)] = root(b)
comps = Counter(root(s["id"]) for s in shots)
print("chained families", len(comps), "sizes", sorted(comps.values(), reverse=True))

print("\n== Validity of the original dials")
bad = 0
for s in shots:
    errs = check_dials(s)
    iso = first_iso(s["iso"])
    if iso < DR_MIN_ISO[s["dr"]]:
        errs.append(f"{s['dr']} with ISO {iso}")
    if errs:
        bad += 1
        print(" ", s["id"], errs)
print("recipes with a problem:", bad)

print("\n== Base assignment")
rows = []
for s in shots:
    a = assign(s, BASES, PINS)
    rows.append((s, a["base"], a["delta"], a["absorbed"], a["dropped"]))
use = Counter(b["code"] for _, b, _, _, _ in rows)
kinds = Counter(len(d) for _, _, d, _, _ in rows)
print("bases", len(BASES), dict(use))
print("0 deltas", kinds[0], "| 1 delta", kinds[1], "| 2 deltas", kinds[2])
print("identical to base before absorbing noise:", sum(1 for r in rows if not r[2] and not r[3]))
print("needed more than 2 deltas (extra dropped):", sum(1 for r in rows if r[4]))
print("absorbed values per dial:", Counter(k for r in rows for k, _ in r[3]).most_common())
for s, b, d, a, x in sorted(rows, key=lambda r: (r[1]["id"], len(r[2]))):
    dt = ", ".join(f"{k} {v}" for k, v in d.items())
    at = ", ".join(f"{k} {v}" for k, v in a)
    xt = ", ".join(f"{k} {v}" for k, v in x)
    print(f"  {b['code']:11} {s['id']:18} delta[{dt}]  dropped[{xt}]  absorbed[{at}]")

print("\n== Exposure check (scene EV = EV100 of settings + EC)")
EXPECT = {"hard-sun": (14, 16), "golden": (10, 13.5), "backlight": (11, 14),
          "dappled": (11, 14.5), "shade": (10.5, 13)}
for s in shots:
    ev = ev100(s["aperture"], s["shutter"], s["iso"]) + ec_value(s["ec"])
    light = [t for t in s["tags"] if t in EXPECT]
    lo = min(EXPECT[t][0] for t in light) if light else 9
    hi = max(EXPECT[t][1] for t in light) if light else 16
    flag = "" if lo - 0.5 <= ev <= hi + 0.5 else "  <-- off"
    if flag or "-v" in sys.argv:
        print(f"  {s['id']:18} {s['aperture']:5} {s['shutter']:6} ISO{s['iso']:>4} EC{s['ec']:>5}"
              f" -> EV {ev:5.1f} light {','.join(light) or '-'} expect {lo}-{hi}{flag}")
