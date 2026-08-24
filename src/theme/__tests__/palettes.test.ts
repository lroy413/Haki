import { describe, expect, it } from 'vitest';
import { PALETTES, darkest, paletteFor, type Palette } from '../palettes';
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
  'specular',
  'onAccent',
];

const ACCENTS: (keyof Palette)[] = ['violet', 'cyan', 'crimson', 'warn'];

describe.each(LEVELS)('palette %i', (level) => {
  const p = paletteFor(level);
  const where = `level ${level} (${levelName(level)})`;

  it('is made of real colours', () => {
    for (const key of SOLID) {
      expect(() => luminance(p[key] as string), `${where} ${key}`).not.toThrow();
    }
    for (const key of ['glass', 'glassEdge', 'glassActive', 'shadow'] as const) {
      expect(p[key], `${where} ${key}`).toMatch(/^rgba\(/);
    }
  });

  it('carries body text at AAA on both grounds', () => {
    for (const ground of ['bg', 'surface'] as const) {
      expect(contrast(p.ink, p[ground]), `${where} ink on ${ground}`).toBeGreaterThanOrEqual(7);
    }
  });

  it('carries secondary text at AA', () => {
    for (const ground of ['bg', 'surface'] as const) {
      expect(
        contrast(p.inkDim, p[ground]),
        `${where} inkDim on ${ground}`,
      ).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('keeps the faintest text legible rather than decorative', () => {
    // Dates, units and stat labels live here. They are small, so 3:1 is the
    // floor and anything below it is a value pretending to be a whisper.
    expect(contrast(p.inkFaint, p.bg), `${where} inkFaint on bg`).toBeGreaterThanOrEqual(3);
  });

  it('shows every accent against the ground it sits on', () => {
    for (const key of ACCENTS) {
      expect(contrast(p[key] as string, p.bg), `${where} ${key} on bg`).toBeGreaterThanOrEqual(
        3,
      );
      expect(
        contrast(p[key] as string, p.surface),
        `${where} ${key} on surface`,
      ).toBeGreaterThanOrEqual(3);
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
    ] as const;
    for (const [accent, soft] of pairs) {
      expect(contrast(p[soft], p.bg), `${where} ${soft} vs bg`).toBeGreaterThanOrEqual(1.08);
      expect(
        contrast(p[accent], p[soft]),
        `${where} ${accent} on ${soft}`,
      ).toBeGreaterThanOrEqual(3);
    }
  });

  it('draws a hairline you can actually see', () => {
    expect(contrast(p.line, p.bg), `${where} line on bg`).toBeGreaterThanOrEqual(1.25);
    expect(contrast(p.line, p.surface), `${where} line on surface`).toBeGreaterThanOrEqual(1.2);
  });

  it('lifts a card off the ground', () => {
    expect(contrast(p.surface, p.bg), `${where} surface vs bg`).toBeGreaterThanOrEqual(1.04);
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
    expect(PALETTES[3].bg).toBe('#0A0B12');
    expect(PALETTES[3].violet).toBe('#B14CFF');
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
