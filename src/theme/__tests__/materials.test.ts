/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * A lens's material is a performance, and performances have a licence.
 *
 * Each lens is made of something now: 見聞色 is still water, 武装色 is
 * hardened steel, 覇王色 is poneglyph stone. Two of those three obey the
 * same law every other performance in this app obeys — `lit()`, the
 * settings chart's night scene, `Rise`:
 *
 *   **Paper catches nothing.** On the unhardened palette a plate is a plate.
 *   A black steel slab on parchment is not a mood, it is a mistake, and it
 *   would fail the contrast floors besides — the material colours are
 *   hand-set against near-white ink and exist only on the dark palettes.
 *
 *   **Plain mode gets none of it.** Plain mode is the switch that stops the
 *   app performing.
 *
 * The stone is the deliberate exception and is *not* checked here: a
 * poneglyph is an object rather than a mood, eight hundred years old and
 * indifferent to what time it is, so it shows on paper too. See
 * `Stone.tsx`.
 *
 * The gate lives at the call site — `!plainMode && hardening > 0` — which is
 * exactly the kind of condition that gets copied to a third screen with one
 * half of it dropped. So this reads the screens.
 */

const ROOT = join(__dirname, '..', '..', '..');

/** Screens that mount a ramping material, and the drawing each mounts. */
const WEARERS = [
  { file: join('app', '(tabs)', 'observation.tsx'), drawing: 'Water' },
  { file: join('app', '(tabs)', 'armament.tsx'), drawing: 'Steel' },
];

describe('the lens materials', () => {
  it.each(WEARERS.map((w) => [w.file, w.drawing, join(ROOT, w.file)]))(
    '%s gates <%s> on both halves of the licence',
    (_file, drawing, path) => {
      const src = String(readFileSync(path, 'utf8'));

      // The screen computes the gate once and both halves are present.
      expect(src, 'no material gate found').toMatch(
        /const material\s*=\s*!plainMode\s*&&\s*hardening\s*>\s*0\s*;/,
      );

      // And the drawing is only ever rendered behind that gate. Anywhere
      // else and one of the two halves has been lost.
      const mounts = [...src.matchAll(new RegExp(`<${drawing}\\b`, 'g'))];
      expect(mounts.length, `${drawing} is not mounted at all`).toBeGreaterThan(0);
      for (const m of mounts) {
        const before = src.slice(Math.max(0, m.index! - 220), m.index!);
        expect(before, `<${drawing}> is mounted outside the material gate`).toContain(
          'material ?',
        );
      }
    },
  );

  it('leaves the stone out, because a poneglyph is an object', () => {
    // The NeedleCard shows stone on paper on purpose. If it ever appears in
    // the list above, that decision has been reversed by accident.
    expect(WEARERS.map((w) => w.file)).not.toContain(
      join('src', 'components', 'logpose', 'NeedleCard.tsx'),
    );
  });

  it('keeps the material drawings free of colour decisions', () => {
    // Same rule the rest of the instruments hold: a drawing takes its
    // colours and never names one, so the palette stays the only place
    // colour is decided.
    for (const drawing of ['Water.tsx', 'Steel.tsx']) {
      const src = String(
        readFileSync(join(ROOT, 'src', 'components', 'instruments', drawing), 'utf8'),
      );
      const offenders: string[] = [];
      src.split('\n').forEach((line, i) => {
        const code = line.replace(/^\s*(?:\*|\/\/).*$/, '');
        if (/'#[0-9a-fA-F]{3,8}'/.test(code)) offenders.push(`line ${i + 1}`);
        if (/\bpalette\./.test(code)) offenders.push(`line ${i + 1}: reads the palette`);
      });
      expect(offenders, `${drawing}: ${offenders.join(', ')}`).toEqual([]);
    }
  });
});
