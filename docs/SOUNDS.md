# The sounds

Every effect in `assets/sounds/` is a cut from a longer source, made with
`tools/make_sound.py`. This file is the record of what was cut from what, so a
sound can be re-cut later — longer, shorter, or from a better source — without
anyone having to guess.

Nobody working on these files can listen to them, which is why the tool has
`--map`: it prints the envelope so a cut can be chosen by reading it.

```bash
# Map the whole file coarsely to find the region.
python3 tools/make_sound.py --map --rows 90 SOURCE.wav

# Then map that region finely, and read the phrase boundary off it.
python3 tools/make_sound.py --map --rows 40 --start 3.2 --end 4.4 SOURCE.wav

# Then cut.
python3 tools/make_sound.py --start 0.58 --end 3.90 --fade 150 SOURCE.wav out.mp3
```

## What ships

| File                   | Length | Plays when                           | Source                           |
| ---------------------- | -----: | ------------------------------------ | -------------------------------- |
| `armament-strike.wav`  |  0.70s | a task is struck                     | Armament Haki SFX (4.54s, 871KB) |
| `observation-read.wav` |  ~1.9s | the Daily Read is saved              | Observation Haki SFX (Katakuri)  |
| `return-drums.mp3`     |     6s | a training session lands as a Return | Drums of Liberation theme (104s) |
| `gear-second.mp3`      |  3.38s | shifting into Gear 2                 | "Gear second" on a loop (106s)   |
| `gear-third.mp3`       |  2.66s | shifting into Gear 3                 | Gear 3 scene audio               |
| `gear-fourth.mp3`      |  4.49s | shifting into Gear 4                 | Gear 4 transformation scene      |
| `denden.wav`           |  1.33s | a sit runs out — the bell in `/sit`  | Den Den Mushi ringtone           |

## Known cuts

Only the parameters actually recorded at the time. The five earlier cuts were
made before this file existed, so their exact offsets are lost — the sources
are named above, and re-cutting one means mapping it again.

**`gear-second.mp3`** — three "Gear second"s, ending on the clean break at
3.86s where the take drops to room tone.

```bash
python3 tools/make_sound.py \
  --start 0.58 --end 3.90 --fade 150 \
  "Luffy_saying_gear_second_for_1_minute_straight_or_more.wav" \
  assets/sounds/gear-second.mp3
```

## Rules

- **Under a second for anything that fires on a tap.** The Armament strike is
  0.70s. A spoken cue at the start of a long focus block can run longer, which
  is why the gears do.
- **Never commit the raw source into `assets/`.** Everything under it is
  bundled and shipped to the phone.
- **wav for taps, mp3 for anything spoken or musical.** PCM at tap length is a
  few tens of kilobytes; the same thing at four seconds is a third of a
  megabyte, and a few milliseconds of encoder padding at the head of a spoken
  cue costs nothing.
- **Fade the tail.** A cut that ends on a non-zero sample clicks. `--fade` is
  120ms by default; give it more when the cut lands in loud material.
- Adding one is a line in `src/sound/sounds.ts` plus the file. Playing it is
  `play('name')` — it never blocks and never throws.
