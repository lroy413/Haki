/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * The ladder is a game with no shame mechanic in it.
 *
 * A weekly ladder with a held rung is the shape every other app grows a
 * streak counter on, and the pane is where the temptation would land: a
 * "3 weeks at Gear 4", a "down from last week", a red rung. None of it is
 * allowed. A dropped week thins the steam and the plate says which rung is
 * held, and that is the whole of what a drop does. This reads the screens
 * for the words, with the comments stripped first — the prose is where the
 * law is written down, so it is allowed the words the code is not.
 *
 * And the two performances — the aura on the plate and the page at the top
 * rung — obey the licence every other performance in the app obeys: plain
 * mode gets none of it. The gate is one boolean per file, which is exactly
 * the kind of thing that survives a refactor with a branch quietly gone, so
 * every mount of a drawing is checked for standing behind it.
 */

const ROOT = join(__dirname, '..', '..', '..');

const SCREENS = [
  join('src', 'components', 'GearsPane.tsx'),
  join('src', 'components', 'ladder', 'GearPlate.tsx'),
  join('src', 'components', 'ladder', 'LadderItem.tsx'),
  join('src', 'components', 'ladder', 'LadderForms.tsx'),
];

/** Source with every comment removed. */
function code(path: string): string {
  return String(readFileSync(path, 'utf8'))
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
}

describe('the ladder has no shame mechanic', () => {
  it.each(SCREENS)('%s never counts weeks, scolds, or congratulates', (file) => {
    const src = code(join(ROOT, file)).toLowerCase();
    for (const word of [
      'streak',
      'missed',
      'down from',
      'failed',
      'well done',
      'congrat',
      'in a row',
      'weeks at',
      'lost a',
    ]) {
      expect(src, `${file} says "${word}"`).not.toContain(word);
    }
  });

  it('never draws a rung in crimson for having dropped', () => {
    // Crimson is the app's "something has gone wrong". A drop is not that.
    const src = code(join(ROOT, 'src', 'components', 'ladder', 'GearPlate.tsx'));
    expect(src).not.toMatch(/palette\.crimson/);
  });
});

describe('the aura and the page are performances', () => {
  const DRAWINGS = [
    { file: join('src', 'components', 'ladder', 'GearPlate.tsx'), gate: 'showAura' },
    { file: join('src', 'components', 'GearsPane.tsx'), gate: 'atTop' },
  ];

  it.each(DRAWINGS.map((d) => [d.file, d.gate]))(
    '%s mounts its drawings only behind %s, which plain mode turns off',
    (file, gate) => {
      const src = String(readFileSync(join(ROOT, file), 'utf8'));
      // The gate itself carries the plain-mode half.
      expect(src, `${gate} does not read plainMode`).toMatch(
        new RegExp(`const ${gate}\\s*=\\s*[^;]*performing[^;]*;`),
      );
      expect(src, 'performing is not the plain-mode switch').toMatch(
        /const performing\s*=\s*!plainMode\s*;/,
      );
      const mounts = [...src.matchAll(/<(?:Steam|Flame)\b/g)];
      expect(mounts.length, 'no drawing mounted').toBeGreaterThan(0);
      for (const m of mounts) {
        const before = src.slice(Math.max(0, m.index! - 700), m.index!);
        expect(before, `a drawing is mounted outside ${gate}`).toContain(`${gate} ?`);
      }
    },
  );
});

describe('the top rung fires the burst once a week', () => {
  it('writes the week down before it fires', () => {
    // A second refresh landing in the same frame must not fire it twice, and
    // reopening the pane on Thursday must not fire it again.
    const src = code(join(ROOT, 'src', 'components', 'GearsPane.tsx'));
    const write = src.indexOf('writeBurstWeek(');
    const fire = src.indexOf('fireConquerors(');
    expect(write, 'the burst week is never written').toBeGreaterThan(-1);
    expect(fire, 'the burst is never fired').toBeGreaterThan(-1);
    expect(write).toBeLessThan(fire);
  });
});

describe('the gears no longer harden the app', () => {
  it('reads no gear minutes in the weight', () => {
    const src = code(join(ROOT, 'src', 'domain', 'hardening.ts'));
    const body = src.slice(
      src.indexOf('export function weightOf'),
      src.indexOf('export function levelFor'),
    );
    expect(body).not.toContain('gearMinutes');
  });
});
