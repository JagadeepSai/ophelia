# Exposure block

## Direction

This is for someone standing in the park with an X-S20, phone in one hand, about to turn a dial. The block has one job: set the camera in a glance, and see the look and the exposure trade-off without reading a paragraph.

The hero is the exposure triangle, drawn the way the camera already thinks: three dials, an LCD exposure scale, a Q-menu cluster for the rest. Meaning sits in the shape. A wide iris hole is shallow depth. A long streak is motion blur. Dense dots are noise. A sun, a low sun, or a cloud is the light. Text is the number you have to dial (f/2.8, 1/2500, 640) and nothing else, until you tap a dial.

The page stays the warm cream paper and ink already used on the site. One accent, a rust, marks the single dial this shot changes from the base recipe. No second card, no caption under every slider, no sentence that repeats the picture.

## Plan

| Change | Replaces | Why |
| --- | --- | --- |
| Triangle of three dials | Filled triangle plus four captioned scales | The old triangle was a gray wedge with labels. Each corner is now a dial: iris, motion streak, grain dots, with a tick on the rim for where the setting sits. The corner farthest from a normal f/4, 1/250, ISO 320 gets the heavier ring, so the trade-off is the shape. |
| Light badge in the centre | "EV 9.3, open shade" sentence | Icon plus the EV number. Words ("golden shade") sit under the icon as two words, not a sentence. The mapping is the real one: 15+ full sun, 13–14 hazy sun, 12–13 open shade, 10–11 golden shade, 8–9 deep shade, below 8 dusk. |
| Exposure scale, needle only | EC caption and −3/0/+3 essay | Same marks as the camera LCD. Position is the meaning. The phrase is the accessible name and the tap line. |
| Captions on tap or hover only | A caption under every control, plus a summary line | One line, and only while that dial is pointed at. |
| Tone curve | Six bipolar sliders | Highlight and shadow pull a real curve. Color, sharpness, NR, and clarity are four short ticks under it, not a second instrument panel. |
| Coloured WB square | Empty crosshair box and a long string | Amber to blue, magenta to green, dot on the shift. A corner pip is the mode (daylight, shade). |
| Pips | Full-width DR / grain / chrome / blue bars and the floating "Small grain" line | ●●○ like the Q menu. Grain size is the pip size. |
| Rust on the changed dial | A badge you have to read to know what moved | The badge can stay, but the curve, pip, or tick itself carries the colour. |
| Film swatch plus four palette dots | Swatch and name only | The sim's colour is visible before the name. |
| Same component, parts omitted | Separate widgets per page | Shot pages and the park recipe list pass exposure and look. `/recipes` passes the look, and the compensation sentence when that is all the catalog has. The root sheet does the same. No invented f-stop. |

### Desktop

```
[swatch] Classic Chrome

            (iris dial)  f/2.8
           /                    \
          /      (sun)  12      \
         /      golden shade     \
   1/500 ------------------------ 640
   streak                         dots

   − · · | · · +          needle
   [35 wedge]  [curve]  [WB]  DR ●●●  GR ●●  CC ●  FX ○
```

### 390px

```
          (iris) f/2.8
         /              \
   1/500     (sun)      640

   − · | · +
   [curve........] [WB]
   DR ●●●  GR ●●  CC ●  FX ○
```

The whole block should sit shorter than the old stack of scales, sentences, segmented bars, and sliders.

## EV audit

Thirty shots were more than a stop darker than the light described. Aperture and compensation stayed. Shutter got faster, ISO stayed on the DR floor (DR400 keeps 640, DR200 keeps 320). Anything faster than 1/4000 notes the electronic shutter. Intentional blur (1/30 in the grass) and the near-black forest were left alone.

Maple trunk was f/2.8, 1/500, ISO 640, EV 9.3, mislabeled open shade. It is now f/2.8, 1/2500, ISO 640, +1/3, EV 11.6, golden shade. That matches low sun through the leaves.

## Evaluation

Scored after a second pass. The first screenshots showed the triangle line running through the shutter dial, so the frozen mark did not read, and the tone curve was almost flat. The line now stops at the rims, a fast shutter is a vertical bar, and highlight −1 pulls the shoulder down off a pale guide.

- Visual first: met. Hole, bar, dots, sun, curve, coloured square, and pips carry the settings. The words left in the block are the numbers you dial, the film name, and the two-word light.
- Text only on demand: met. The plain-English effect is the accessible name and shows on hover or tap. Nothing under each control repeats it.
- One hero: met. The triangle is the large piece. Tone, white balance, and the pip row are one shorter band under the exposure scale.
- Meaning in shape and colour: met. Wide hole, frozen bar, grain density, and the heavy ring on the dial doing the work. On Hands on the cheeks, Highlight −1 is a rust curve, not only a badge.
- Camera language: met. Three dials, the LCD exposure scale, a Q-menu pip row.
- Warm cream: met. Ink on the existing paper. Rust is the only accent, and only on a changed control.

At 390px the page does not scroll sideways. The settings block is shorter than the old stack of scales, sentences, bars, and sliders.
