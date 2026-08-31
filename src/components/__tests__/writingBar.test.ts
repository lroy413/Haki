/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * The writing bar's marks are drawings.
 *
 * This is the moon's law (`domain/moon.ts`) applied one screen over, and it is
 * here because the bar broke it in five places at once and the only thing that
 * caught it was somebody looking at their phone: *"This is not a toolbar I
 * understand."* The buttons were characters chosen because they resembled
 * icons — a backtick for code, a dot for a list, a hollow square for a
 * checkbox, a left-half-block for a quote, an em-dash for a rule. Two of those
 * do not exist in the app's faces at all, so they rendered as whatever
 * fallback the platform had: the block came out as a solid teal bar
 * indistinguishable from a missing glyph, and the backtick as a speck in the
 * corner of an otherwise empty button.
 *
 * A character is set at a font's size, on a font's baseline, in whatever face
 * happens to have it. A drawing is the shape you drew. So the rule is that the
 * bar may label a key with a **letter** or with a drawing, and with nothing
 * else — and the three letters it does use are Latin capitals, which is the
 * one thing no loaded face is missing.
 */

const ROOT = join(__dirname, '..', '..', '..');
const BAR = join(ROOT, 'src', 'components', 'WritingBar.tsx');
const ICONS = join(ROOT, 'src', 'components', 'WritingIcons.tsx');

/** Source with every comment removed, so prose may name a glyph freely. */
function code(path: string): string {
  return String(readFileSync(path, 'utf8'))
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
}

describe('the bar draws its marks and never types them', () => {
  it('labels every letter key with a Latin capital, and nothing else', () => {
    const letters = [...code(BAR).matchAll(/letter: '([^']*)'/g)].map((m) => m[1]);
    expect(letters.length).toBeGreaterThan(0);
    for (const letter of letters) expect(letter).toMatch(/^[A-Z]$/);
  });

  it('holds no glyph anywhere in the bar it could label a key with', () => {
    // Every character that has ever gone wrong here — ▌ ☐ • — and every one
    // that could — is above the ASCII range. Prose is exempt; code is not.
    const stray = [...code(BAR)].filter((ch) => ch.charCodeAt(0) > 127);
    expect(stray).toEqual([]);
  });

  it('gives every key either a letter or a drawing', () => {
    // A key with neither renders an empty 44-point box, which is a button
    // that looks broken rather than one that looks wrong.
    const src = code(BAR);
    const keys = [...src.matchAll(/\{\s*(?:mark|prefix): '[a-z]+',[\s\S]*?\}/g)].map(
      (m) => m[0],
    );
    expect(keys.length).toBe(7);
    for (const rest of keys) expect(rest).toMatch(/letter: '|icon: '/);
  });

  it('asks only for drawings that exist', () => {
    const union = /export type IconName =([^;]+);/.exec(code(ICONS))?.[1] ?? '';
    const drawn = new Set([...union.matchAll(/'([a-z]+)'/g)].map((m) => m[1]));
    expect(drawn.size).toBeGreaterThan(0);

    const asked = [...code(BAR).matchAll(/icon="?([a-z]+)"?/g)].map((m) => m[1]);
    for (const name of asked) expect(drawn.has(name), `no drawing for "${name}"`).toBe(true);

    // And every drawing the union promises is actually drawn: a name with no
    // `case` falls off the end of the switch and renders nothing at all.
    for (const name of drawn) {
      expect(code(ICONS), `"${name}" is named but not drawn`).toContain(`case '${name}':`);
    }
  });
});

describe('the drawings take their colour', () => {
  it('names none and reads no palette', () => {
    // The same contract every instrument signs. The bar decides the colour,
    // because the bar is the thing that knows whether a key is lit.
    const src = code(ICONS);
    const offenders: string[] = [];
    src.split('\n').forEach((line, i) => {
      if (/'#[0-9a-fA-F]{3,8}'/.test(line)) offenders.push(`line ${i + 1}: a colour literal`);
      if (/\bpalette\./.test(line)) offenders.push(`line ${i + 1}: reads the palette`);
    });
    expect(offenders, offenders.join(', ')).toEqual([]);
  });

  it('cannot eat a tap, because every one of them sits inside a button', () => {
    expect(code(ICONS)).toContain('pointerEvents="none"');
  });
});

describe('the bar takes its light and never assumes one', () => {
  it('has no default for either half of it', () => {
    // The shared-control rule from `oneLight.test.ts`: a control that cannot
    // be mounted without naming its light cannot drift onto a screen whose
    // light is a different colour. `oneLight` holds the other half — that
    // this file names no accent of its own.
    const props = /export function WritingBar\(\{[\s\S]*?\}: \{([\s\S]*?)\n\}\)/.exec(
      code(BAR),
    );
    expect(props, 'could not find the props').not.toBeNull();
    expect(props?.[1]).toMatch(/\btint: string;/);
    expect(props?.[1]).toMatch(/\btintSoft: string;/);
    expect(code(BAR)).not.toMatch(/\btint(?:Soft)?\s*=/);
  });
});
