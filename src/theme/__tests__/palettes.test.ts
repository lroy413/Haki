import { describe, expect, it } from 'vitest';
import { PALETTES, darkest, paletteFor, underCrew, type Palette } from '../palettes';
import { levelName, type HardeningLevel } from '../../domain/hardening';

/**
 * The contrast floor for every palette.
 *
 * This is the test that makes four hand-written palettes safer than one
 * interpolated ramp: each level is checked, so a colour cannot be nudged for
 * looks and quietly become unreadable. It has already earned itself once — it
 * caught an ink grey typed as a yellow-green and a five-digit hex.
 */

const LEVELS: HardeningLevel[] = [0, 1, 2, 3];

function channel(v: number): number {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) throw new Error(`not a six-digit hex colour: ${hex}`);
  const n = parseInt(m[1], 16);
  return (
    0.2126 * channel((n >> 16) & 255) +
    0.7152 * channel((n >> 8) & 255) +
    0.0722 * channel(n & 255)
  );
}

function contrast(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

/** Every token that must be a plain six-digit hex. */
const SOLID: (keyof Palette)[] = [
  'bg',
  'surface',
  'surface2',
  'line',
  'lineSoft',
  'ink',
  'inkDim',
  'inkFaint',
  'violet',
  'violetSoft',
  'cyan',
  'cyanSoft',
  'crimson',
  'crimsonSoft',
  'warn',
  'warnSoft',
  'jade',
  'jadeSoft',
  'amethyst',
  'amethystSoft',
  'stoneRoad',
  'stoneRoadCarve',
  'stoneRoadLip',
  'stoneIsle',
  'stoneIsleCarve',
  'stoneIsleLip',
  'onStone',
  'moss',
  'waterFace',
  'waterDeep',
  'waterSheen',
  'steelFace',
  'steelDeep',
  'steelSheen',
  'specular',
  'onAccent',
];

// jade and amethyst are in here because a themed accent is still an accent:
// under the Zoro crew one labels the Journey tab, the Dream and the burst and
// the other carries the whole of 武装色 — hardness, the Do tab, the strike —
// and both carry the same eleven-point words the others do.
const ACCENTS: (keyof Palette)[] = ['violet', 'cyan', 'crimson', 'warn', 'jade', 'amethyst'];

describe.each(LEVELS)('palette %i', (level) => {
  const p = paletteFor(level);
  const where = `level ${level} (${levelName(level)})`;

  it('is made of real colours', () => {
    for (const key of SOLID) {
      expect(() => luminance(p[key] as string), `${where} ${key}`).not.toThrow();
    }
    for (const key of ['glass', 'glassEdge', 'shadow'] as const) {
      expect(p[key], `${where} ${key}`).toMatch(/^rgba\(/);
    }
  });

  it('carries body text at AAA on both grounds', () => {
    for (const ground of ['bg', 'surface'] as const) {
      expect(contrast(p.ink, p[ground]), `${where} ink on ${ground}`).toBeGreaterThanOrEqual(7);
    }
  });

  it('carries secondary text at AAA on every ground it uses', () => {
    // surface2 is included because inputs, chips and practice tiles are all
    // drawn on it, and every one of them carries text.
    for (const ground of ['bg', 'surface', 'surface2'] as const) {
      expect(
        contrast(p.inkDim, p[ground]),
        `${where} inkDim on ${ground}`,
      ).toBeGreaterThanOrEqual(7);
    }
  });

  it('keeps the faintest text legible rather than decorative', () => {
    // Dates, units, cadences and stat labels live here — nearly every small
    // word in the app. The floor used to be 3:1 on the ground alone, and the
    // result measured 2.9:1 on the palette the app spends its day in: under
    // the minimum for *normal* text, at eleven points. "Faint" is a role in
    // the hierarchy, not permission to disappear.
    for (const ground of ['bg', 'surface', 'surface2'] as const) {
      expect(
        contrast(p.inkFaint, p[ground]),
        `${where} inkFaint on ${ground}`,
      ).toBeGreaterThanOrEqual(4.5);
    }
    // It also sits on the two tinted plates — the reading and Foresight cards.
    for (const tint of ['violetSoft', 'cyanSoft'] as const) {
      expect(
        contrast(p.inkFaint, p[tint]),
        `${where} inkFaint on ${tint}`,
      ).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('reads every accent as text against the ground it sits on', () => {
    // Not merely visible as a shape: every accent carries words somewhere —
    // section labels, the cadence on a needle, "Sit", a rhythm's link. 4.5 is
    // the floor for text, and these are the app's smallest words.
    for (const key of ACCENTS) {
      for (const ground of ['bg', 'surface', 'surface2'] as const) {
        expect(
          contrast(p[key] as string, p[ground]),
          `${where} ${key} on ${ground}`,
        ).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it('reads the label on a filled accent button', () => {
    for (const key of ACCENTS) {
      expect(
        contrast(p.onAccent, p[key] as string),
        `${where} onAccent on ${key}`,
      ).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('keeps each soft tint distinct from the ground and able to hold its accent', () => {
    const pairs = [
      ['violet', 'violetSoft'],
      ['cyan', 'cyanSoft'],
      ['crimson', 'crimsonSoft'],
      ['warn', 'warnSoft'],
      ['jade', 'jadeSoft'],
      ['amethyst', 'amethystSoft'],
    ] as const;
    for (const [accent, soft] of pairs) {
      expect(contrast(p[soft], p.bg), `${where} ${soft} vs bg`).toBeGreaterThanOrEqual(1.08);
      // The accent labels a tinted card from inside it — small text, so the
      // floor is the text floor.
      expect(
        contrast(p[accent], p[soft]),
        `${where} ${accent} on ${soft}`,
      ).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('carries text on the poneglyph stone at AAA, on both stones', () => {
    // The stone is a background the app writes titles, bodies and labels
    // onto, and it is the one ground that does not move with the ramp — so
    // if `onStone` is ever wrong it is wrong on all four palettes at once.
    for (const stone of ['stoneRoad', 'stoneIsle'] as const) {
      expect(
        contrast(p.onStone, p[stone]),
        `${where} onStone on ${stone}`,
      ).toBeGreaterThanOrEqual(7);
    }
  });

  it('cuts a glyph you can read as carved rather than printed', () => {
    // An incision is a shadow and its lower edge catches the light. Both
    // have to separate from the body or the inscription flattens into a
    // pattern; neither may separate so far that the texture starts
    // competing with the words on top of it.
    for (const [body, carve, lip] of [
      ['stoneRoad', 'stoneRoadCarve', 'stoneRoadLip'],
      ['stoneIsle', 'stoneIsleCarve', 'stoneIsleLip'],
    ] as const) {
      expect(contrast(p[body], p[carve]), `${where} ${carve} in ${body}`).toBeGreaterThan(1.35);
      expect(contrast(p[body], p[carve]), `${where} ${carve} in ${body}`).toBeLessThan(3);
      expect(contrast(p[lip], p[body]), `${where} ${lip} on ${body}`).toBeGreaterThan(1.35);
      expect(contrast(p[lip], p[body]), `${where} ${lip} on ${body}`).toBeLessThan(3);
    }
  });

  it('carries text on the lens materials at AAA', () => {
    // Water and steel are grounds the app writes its two loudest readouts
    // onto — the reading and the hardness. They are shown only on the
    // hardened palettes, so it is *that* palette's ink that has to clear on
    // them, and secondary text has to stay legible too.
    if (level === 0) return;
    for (const face of ['waterFace', 'steelFace'] as const) {
      expect(contrast(p.ink, p[face]), `${where} ink on ${face}`).toBeGreaterThanOrEqual(7);
      expect(contrast(p.inkDim, p[face]), `${where} inkDim on ${face}`).toBeGreaterThanOrEqual(
        4.5,
      );
    }
  });

  it('gives each material a surface with light on it', () => {
    // A face with no sheen is a flat fill and the whole point is lost; a
    // sheen that separates too far stops being light on a surface and
    // becomes a second block of colour.
    for (const [face, deep, sheen] of [
      ['waterFace', 'waterDeep', 'waterSheen'],
      ['steelFace', 'steelDeep', 'steelSheen'],
    ] as const) {
      expect(contrast(p[sheen], p[face]), `${where} ${sheen}`).toBeGreaterThan(1.6);
      expect(contrast(p[sheen], p[face]), `${where} ${sheen}`).toBeLessThan(4.5);
      // Deliberately a low bar, and low is the point: both faces are
      // already near-black, so steel cannot reach even 1.2 against pure
      // black. What the gradient has to be is *perceptible without reading
      // as two colours* — a strong falloff here would look like a block
      // sitting on another block rather than one surface receding.
      expect(contrast(p[face], p[deep]), `${where} ${deep} is flat`).toBeGreaterThan(1.12);
      expect(contrast(p[face], p[deep]), `${where} ${deep} is a second block`).toBeLessThan(2);
    }
  });

  it('keeps the stone the same object on every palette', () => {
    // Eight hundred years old and indifferent to what time it is. Every
    // level carries identical stone, so a card cannot drift into looking
    // like a different artifact halfway down the ramp.
    const first = paletteFor(0);
    for (const key of [
      'stoneRoad',
      'stoneRoadCarve',
      'stoneRoadLip',
      'stoneIsle',
      'stoneIsleCarve',
      'stoneIsleLip',
      'onStone',
      'moss',
      'waterFace',
      'waterDeep',
      'waterSheen',
      'steelFace',
      'steelDeep',
      'steelSheen',
    ] as const) {
      expect(p[key], `${where} ${key}`).toBe(first[key]);
    }
  });

  it('tells the two stones apart at a glance', () => {
    // Red pillar, blue island. Both are deliberately dark, so a contrast
    // ratio cannot see the difference between them — the ratio measures
    // lightness and what separates these is *hue*. So the test asks the
    // real question: does the red stone lean red, and the blue one blue?
    const rgb = (hex: string) => {
      const n = parseInt(hex.slice(1), 16);
      return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
    };
    const road = rgb(p.stoneRoad);
    const isle = rgb(p.stoneIsle);
    expect(road.r - road.b, `${where} road leans red`).toBeGreaterThan(40);
    expect(isle.b - isle.r, `${where} isle leans blue`).toBeGreaterThan(40);
  });

  it('draws a hairline you can actually see', () => {
    expect(contrast(p.line, p.bg), `${where} line on bg`).toBeGreaterThanOrEqual(1.25);
    expect(contrast(p.line, p.surface), `${where} line on surface`).toBeGreaterThanOrEqual(1.2);
  });

  it('lifts a card off the ground', () => {
    expect(contrast(p.surface, p.bg), `${where} surface vs bg`).toBeGreaterThanOrEqual(1.04);
  });
});

describe('the palette under a crew', () => {
  const luffy = { conquerors: 'violet', armament: 'crimson' } as const;
  const zoro = { conquerors: 'jade', armament: 'amethyst' } as const;

  it('is untouched under Luffy', () => {
    for (const level of LEVELS) {
      expect(underCrew(paletteFor(level), luffy)).toBe(paletteFor(level));
    }
  });

  it("moves exactly the two lenses under Zoro, and 見聞色's slots are not among them", () => {
    for (const level of LEVELS) {
      const p = paletteFor(level);
      const lens = underCrew(p, zoro);
      // 覇王色: the violet slot carries Enma's green.
      expect(lens.violet, `level ${level}`).toBe(p.jade);
      expect(lens.violetSoft, `level ${level}`).toBe(p.jadeSoft);
      // 武装色: the crimson slot carries the coating.
      expect(lens.crimson, `level ${level}`).toBe(p.amethyst);
      expect(lens.crimsonSoft, `level ${level}`).toBe(p.amethystSoft);
      // And nothing else moves — cyan, ink, grounds all hold, so a screen
      // that takes the lens palette cannot drift anywhere it did not mean to.
      const { violet, violetSoft, crimson, crimsonSoft, ...rest } = lens;
      const { violet: v2, violetSoft: vs2, crimson: c2, crimsonSoft: cs2, ...base } = p;
      expect(rest, `level ${level}`).toEqual(base);
    }
  });
});

describe('the ramp as a whole', () => {
  it('gets darker every step and never doubles back', () => {
    const grounds = LEVELS.map((l) => luminance(paletteFor(l).bg));
    for (let i = 1; i < grounds.length; i += 1) {
      expect(grounds[i], `level ${i} vs ${i - 1}`).toBeLessThan(grounds[i - 1]);
    }
  });

  it('puts the whole flip in the first step', () => {
    // Level 0 is paper and level 1 is hardened. Everything after 1 is depth,
    // so the ink must not change sides again further up the ramp.
    expect(PALETTES[0].lightSurface).toBe(true);
    for (const level of [1, 2, 3] as const) {
      expect(PALETTES[level].lightSurface, `level ${level}`).toBe(false);
    }

    const inkIsLight = LEVELS.map((l) => luminance(paletteFor(l).ink) > 0.5);
    expect(inkIsLight).toEqual([false, true, true, true]);
  });

  it('grows a gloss as it hardens, and has none on paper', () => {
    // An unhardened surface catches no light, so level 0's glint is simply the
    // hairline. From there it has to brighten every step: the sheen is what
    // separates hardened black from a screen that is just dark.
    expect(PALETTES[0].specular).toBe(PALETTES[0].line);

    const lift = ([1, 2, 3] as const).map((l) =>
      contrast(paletteFor(l).specular, paletteFor(l).bg),
    );
    for (let i = 1; i < lift.length; i += 1) {
      expect(lift[i], `level ${i + 1} vs ${i}`).toBeGreaterThan(lift[i - 1]);
    }

    // Visible against the card it edges, without becoming a second border.
    for (const level of [1, 2, 3] as const) {
      const p = paletteFor(level);
      expect(contrast(p.specular, p.surface), `level ${level}`).toBeGreaterThanOrEqual(1.3);
      expect(contrast(p.specular, p.surface), `level ${level}`).toBeLessThan(4);
    }
  });

  it('ends on the palette the app was designed in', () => {
    // The signature ground is untouched. The violet was lifted once, by about
    // four percent of lightness, when the whole palette was raised to a text
    // floor: at #B14CFF it labelled its own card at 4.4:1 in eleven-point
    // mono. Pinned here so it can drift for a stated reason and never by
    // accident.
    expect(PALETTES[3].bg).toBe('#0A0B12');
    expect(PALETTES[3].violet).toBe('#B85BFF');
  });
});

describe('darkest', () => {
  it('is genuinely the darkest ground in every palette', () => {
    // The three lightning layers draw their cores in this, and one of them
    // used `palette.ink` for it directly. That is near-black on paper and
    // near-*white* from level 1 up — it is the text colour, and the text is
    // light on a dark ground — so a full-screen wash in it flashed the whole
    // display white on the three palettes the app spends its day in.
    // Every colour the app paints an area in. `onAccent` is excluded, and is
    // darker still on two levels: it is the text on a violet button and never
    // a ground, so it is not a candidate. See the note on `darkest`.
    const KEYS = ['bg', 'surface', 'surface2', 'ink', 'inkDim', 'inkFaint'] as const;
    for (const level of LEVELS) {
      const p = paletteFor(level);
      const black = luminance(darkest(p));
      for (const key of KEYS) {
        expect(black, `level ${level}: ${key} is darker`).toBeLessThanOrEqual(
          luminance(p[key]),
        );
      }
    }
  });

  it('is dark in absolute terms, not merely the least light one', () => {
    // A palette could in principle drift light all over and still satisfy the
    // test above while the "black" lightning came out grey.
    for (const level of LEVELS) {
      expect(luminance(darkest(paletteFor(level))), `level ${level}`).toBeLessThan(0.05);
    }
  });
});
