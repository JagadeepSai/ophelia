"""Park base recipes. Each one is a full camera recipe a custom bank can hold.

Code format: GROUP-SIM-LOOK, ASCII, at most 12 characters, so it fits the
X-S20 custom-name field and sorts in a phone list by group, then film sim.
"""

# Shots where the automatic pick keeps the wrong two deltas.
# motion-field: the 1/30 blur needs ISO 160, so DR100 has to stay.
# cream-spin, meadow-blur: the glow is clarity, not shadow.
# blue-kneel: the notes rely on FX Blue to keep the blue dress blue.
PINS = {
    "blue-kneel": ("pk-cc-shade", {"blue": "Weak"}),
    "motion-field": ("pk-cc-gold", {"dr": "DR100", "clarity": "−3"}),
    "cream-spin": ("pk-nn-warm", {"highlight": "−2", "clarity": "−4"}),
    "meadow-blur": ("pk-nn-warm", {"highlight": "−2", "clarity": "−5"}),
}

BASES = [
    {
        "id": "pk-cc-gold", "code": "PK-CC-GOLD", "name": "Golden Chrome",
        "look": "Amber skin and warm grass in late sun. Visible grain, soft detail.",
        "light": ["golden", "dappled"],
        "sim": "Classic Chrome", "wb": "Daylight +3R −4B", "dr": "DR400",
        "highlight": "−1", "shadow": "+0.5", "color": "+3", "sharp": "−2", "nr": "−4",
        "clarity": "−1", "grain": "Strong, Small", "chrome": "Weak", "blue": "Off",
    },
    {
        "id": "pk-cc-haze", "code": "PK-CC-HAZE", "name": "Backlit Haze",
        "look": "Sun behind her. Lifted, glowing highlights, low contrast, soft edges.",
        "light": ["backlight"],
        "sim": "Classic Chrome", "wb": "Daylight +3R −2B", "dr": "DR200",
        "highlight": "−2", "shadow": "−1", "color": "+1", "sharp": "−3", "nr": "−4",
        "clarity": "−4", "grain": "Weak, Small", "chrome": "Off", "blue": "Off",
    },
    {
        "id": "pk-cc-sun", "code": "PK-CC-SUN", "name": "Hard Sun Chrome",
        "look": "Midday sun, deep blue sky, crisp shadows, saturated grass.",
        "light": ["hard-sun"],
        "sim": "Classic Chrome", "wb": "Daylight +2R −5B", "dr": "DR200",
        "highlight": "0", "shadow": "+1", "color": "+2", "sharp": "+1", "nr": "−4",
        "clarity": "+2", "grain": "Weak, Small", "chrome": "Strong", "blue": "Off",
    },
    {
        "id": "pk-cc-shade", "code": "PK-CC-SHADE", "name": "Soft Shade Chrome",
        "look": "Open shade and leaf light. Clean skin, quiet greens, gentle contrast.",
        "light": ["shade", "dappled"],
        "sim": "Classic Chrome", "wb": "Daylight +1R −4B", "dr": "DR200",
        "highlight": "−1", "shadow": "−0.5", "color": "+2", "sharp": "−2", "nr": "−4",
        "clarity": "0", "grain": "Weak, Small", "chrome": "Weak", "blue": "Off",
    },
    {
        "id": "pk-cn-fade", "code": "PK-CN-FADE", "name": "Faded Negative",
        "look": "Classic Neg print: muted reds, teal-green cast, big soft grain.",
        "light": ["hard-sun", "dappled", "shade"],
        "sim": "Classic Negative", "wb": "5600K +1R −2B", "dr": "DR400",
        "highlight": "−1", "shadow": "0", "color": "+1", "sharp": "−1", "nr": "−4",
        "clarity": "−1", "grain": "Weak, Large", "chrome": "Weak", "blue": "Weak",
    },
    {
        "id": "pk-nn-warm", "code": "PK-NN-WARM", "name": "Nostalgic Warm",
        "look": "Amber highlights, creamy midtones, a printed-photo feel.",
        "light": ["golden", "backlight"],
        "sim": "Nostalgic Neg.", "wb": "6700K −1R −4B", "dr": "DR400",
        "highlight": "−1", "shadow": "0", "color": "+2", "sharp": "−2", "nr": "−4",
        "clarity": "−2", "grain": "Weak, Large", "chrome": "Weak", "blue": "Off",
    },
    {
        "id": "pk-as-soft", "code": "PK-AS-SOFT", "name": "Astia Soft",
        "look": "Pale, low-saturation skin in shade. No grain, nothing crunchy.",
        "light": ["shade", "hard-sun"],
        "sim": "Astia", "wb": "Auto 0R −1B", "dr": "DR200",
        "highlight": "−1", "shadow": "−1", "color": "−1", "sharp": "−1", "nr": "−2",
        "clarity": "−1", "grain": "Off", "chrome": "Off", "blue": "Off",
    },
]
