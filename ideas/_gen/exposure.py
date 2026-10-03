"""Exposure sanity: scene EV from the settings, target EV from the light."""
import math

from recipe_model import DR_MIN_ISO, ev100, ec_value, first_iso

# EV100 of the settings (f, shutter, ISO), not including exposure compensation.
# Bands: 15+ full sun, 13–14 hazy sun, 12–13 open shade, 10–11 golden shade, 8–9 deep shade.
LIGHT_EV = {
    "hard-sun": (14.6, 13.2, 16.0),
    "backlight": (12.0, 11.2, 13.4),
    "dappled": (11.8, 10.8, 13.2),
    "golden": (12.0, 10.8, 13.4),
    "shade": (12.3, 11.5, 13.3),
}
ORDER = ["hard-sun", "backlight", "golden", "dappled", "shade"]
# Shots whose tags do not describe the light on the subject well.
TARGET = {
    "moon-profile": 13,     # low evening sun, not midday
    "forest-crown": 10.5,   # dark wood
    "woodland-sit": 11.5,   # sun shafts in a wood
}
SHUTTERS = [30, 40, 50, 60, 80, 100, 125, 160, 200, 250, 320, 400, 500, 640,
            800, 1000, 1250, 1600, 2000, 2500, 3200, 4000, 5000, 6400, 8000,
            10000, 12800, 16000, 20000, 25000, 32000]
ISOS = [160, 200, 250, 320, 400, 500, 640, 800, 1000, 1250, 1600, 2000, 2500, 3200]
MECH_MAX = 4000


def light_of(shot):
    for tag in ORDER:
        if tag in shot["tags"]:
            return tag
    return None


def scene_ev(shot):
    return ev100(shot["aperture"], shot["shutter"], shot["iso"])


def check(shot):
    """(scene_ev, target, lo, hi, flagged)"""
    ev = scene_ev(shot)
    tag = light_of(shot)
    target, lo, hi = LIGHT_EV.get(tag, (13, 9, 16))
    target = TARGET.get(shot["id"], target)
    flagged = not (lo <= ev <= hi) or shot["id"] in TARGET
    return ev, target, lo, hi, flagged


def fix(shot, dr, keep=False):
    """New (shutter, iso, electronic) for this shot at effective DR."""
    ev, target, lo, hi, flagged = check(shot)
    old_iso = first_iso(shot["iso"])
    floor = DR_MIN_ISO[dr]
    if keep:
        return shot["shutter"], str(old_iso), False
    iso = old_iso
    if iso < floor:
        iso = floor
    elif old_iso == DR_MIN_ISO.get(shot["dr"]) and old_iso > floor:
        iso = floor
    scene = target if flagged else ev
    n = float(shot["aperture"].replace("f/", ""))

    def speed(iso_):
        # Target is EV100 of f / shutter / ISO. Compensation stays a separate dial.
        return (iso_ / 100) * (2 ** scene) / (n * n)

    while speed(iso) < 125 and iso < 3200:
        iso = ISOS[ISOS.index(iso) + 1]
    want = speed(iso)
    best = min(SHUTTERS, key=lambda s: abs(math.log2(s / want)))
    return f"1/{best}", str(iso), best > MECH_MAX
