/// <reference types="node" />
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * A drawing takes its colours and never chooses one.
 *
 * `materials.test.ts` held this for the three lens materials; the same rule
 * binds every instrument, and it exists because the palette has to stay the
 * one place colour is decided. A literal in a drawing looks fine on whichever
 * palette it was drawn against and wrong on the other three.
 *
 * The eyes are the case that proves it, and they broke it the *other* way —
 * by taking the right prop for the wrong job. The pupil was handed
 * `palette.ink`, which is the **text** colour: near-black on paper and
 * near-white on the three palettes the app spends its day on. So on every
 * hardened screen the pupil was a white disc covering half the iris, and the
 * catchlight beside it — handed `palette.bg` — was black. An eye drawn
 * correctly for parchment and inverted everywhere else.
 *
 * The fix is the poneglyph's: an eye is an object rather than a mood, so its
 * own colours are fixed across all four palettes. `onStone` is the app's
 * near-white and `darkest()` its near-black, and only the iris (見聞色's
 * violet) and the brow (which sits on the page, not on the eye) move.
 */

const ROOT = join(__dirname, '..', '..', '..');
const DIR = join(ROOT, 'src', 'components', 'instruments');

/** Source with every comment removed, so prose may name colours freely. */
function code(path: string): string {
  return String(readFileSync(path, 'utf8'))
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');
}

const DRAWINGS = readdirSync(DIR).filter((f) => f.endsWith('.tsx'));

describe('the instruments', () => {
  it('has drawings to check at all', () => {
    expect(DRAWINGS.length).toBeGreaterThan(10);
  });

  it.each(DRAWINGS)('%s names no colour and reads no palette', (name) => {
    const src = code(join(DIR, name));
    const offenders: string[] = [];
    src.split('\n').forEach((line, i) => {
      if (/'#[0-9a-fA-F]{3,8}'/.test(line)) offenders.push(`line ${i + 1}: a colour literal`);
      if (/\bpalette\./.test(line)) offenders.push(`line ${i + 1}: reads the palette`);
    });
    expect(offenders, `${name}: ${offenders.join(', ')}`).toEqual([]);
  });
});

describe('the eyes are an object, not a mood', () => {
  const call = code(join(ROOT, 'app', '(tabs)', 'observation.tsx'));
  const mount = call.slice(call.indexOf('<Eyes'), call.indexOf('/>', call.indexOf('<Eyes')));

  it('is mounted at all', () => {
    expect(mount).toContain('openness');
  });

  it('takes its near-white and its near-black from the fixed pair', () => {
    // Not `ink` and not `bg`: both of those flip with the palette, and the
    // eye must not. `onStone` is near-white on all four and `darkest()` is
    // near-black on all four.
    expect(mount).toMatch(/sclera=\{palette\.onStone\}/);
    expect(mount).toMatch(/lash=\{darkest\(palette\)\}/);
  });

  it('never hands the text colour to something inside the eye', () => {
    // `ink` is allowed exactly once, for the brow, which sits on the ground.
    const inks = [...mount.matchAll(/\bink=\{([^}]+)\}/g)].map((m) => m[1]);
    expect(inks).toEqual(['palette.ink']);
    expect(mount).not.toMatch(/(?:sclera|lash|iris)=\{palette\.(?:ink|bg)\}/);
  });

  it('gives the iris the lens, and only the iris', () => {
    expect(mount).toMatch(/iris=\{palette\.violet\}/);
  });
});
