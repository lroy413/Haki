/// <reference types="node" />
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { lit } from '../surfaces';

/**
 * The charge is a performance, and performances have a licence.
 *
 * `domain/hardening.ts` says what the charge *is*; this reads the app for
 * whether it is spent the way that file promises. Three of the rules can be
 * broken silently by a call site:
 *
 *   **Plain mode gets none of it.** Plain mode pins `hardening` to the settled
 *   dark, which is precisely the value that would burn brightest, so the
 *   pin has to be somewhere — and it is in the provider, once, rather than at
 *   every screen. A screen that reached past it would light up in the one mode
 *   that exists to stop the app performing.
 *
 *   **Nothing writes its own version of it.** The app already learned this
 *   with `lit()`: the Reserve rolled its own glow, so retuning the shared
 *   constant did nothing to the loudest element on the screen.
 *
 *   **The drawing decides no colours.** Same rule every instrument holds.
 */

const ROOT = join(__dirname, '..', '..', '..');
const CRACKLE = join(ROOT, 'src', 'components', 'instruments', 'Crackle.tsx');

function screens(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return screens(path);
    return name.endsWith('.tsx') || name.endsWith('.ts') ? [path] : [];
  });
}

const SOURCES = [...screens(join(ROOT, 'app')), ...screens(join(ROOT, 'src'))].filter(
  (f) => !f.includes('__tests__'),
);

describe('lit() carries the charge past black', () => {
  it('does nothing at all on paper, charged or not', () => {
    expect(lit('#ff0000', 0, 1)).toEqual({});
  });

  it('ignores the charge below black', () => {
    // The ground has not run out of dark yet, so there is nothing for the
    // surfaces to take over. Levels 1 and 2 must be byte-identical whatever
    // the charge says.
    for (const level of [1, 2] as const) {
      expect(lit('#ff0000', level, 0)).toEqual(lit('#ff0000', level, 1));
    }
  });

  it('grows at black, and only upward', () => {
    const off = lit('#ff0000', 3, 0);
    const on = lit('#ff0000', 3, 1);
    expect(Number(on.shadowOpacity)).toBeGreaterThan(Number(off.shadowOpacity));
    expect(Number(on.shadowRadius)).toBeGreaterThan(Number(off.shadowRadius));
  });

  it('saturates rather than running away on a nonsense value', () => {
    expect(lit('#ff0000', 3, 40)).toEqual(lit('#ff0000', 3, 1));
    expect(lit('#ff0000', 3, -5)).toEqual(lit('#ff0000', 3, 0));
  });
});

describe('the discharge', () => {
  it('is pinned to zero in plain mode, once, in the provider', () => {
    const src = String(readFileSync(join(ROOT, 'src', 'state', 'HakiProvider.tsx'), 'utf8'));
    expect(src).toMatch(/charge:\s*settings\.plainMode\s*\?\s*0\s*:\s*charge/);
  });

  it('is only ever drawn by the one instrument', () => {
    // `lit()`'s lesson, one size up: a second implementation somewhere means
    // retuning this one silently stops reaching the loudest plate in the app.
    const offenders = SOURCES.filter((f) => {
      if (f === CRACKLE) return false;
      const src = String(readFileSync(f, 'utf8'));
      return /strokeOpacity=\{[^}]*\bcharge\b/.test(src) || /\bcharge\s*\*\s*0\.\d/.test(src);
    });
    expect(offenders.map((f) => f.slice(ROOT.length + 1))).toEqual([]);
  });

  it('takes its colour and never names one', () => {
    const src = String(readFileSync(CRACKLE, 'utf8'));
    const offenders: string[] = [];
    src.split('\n').forEach((line, i) => {
      const code = line.replace(/^\s*(?:\*|\/\/).*$/, '');
      if (/'#[0-9a-fA-F]{3,8}'/.test(code)) offenders.push(`line ${i + 1}: a colour literal`);
      if (/\bpalette\./.test(code)) offenders.push(`line ${i + 1}: reads the palette`);
    });
    expect(offenders, offenders.join(', ')).toEqual([]);
  });

  it('cannot eat a tap', () => {
    // It covers a whole plate, and two of the plates it covers are pressable.
    const src = String(readFileSync(CRACKLE, 'utf8'));
    expect(src).toContain('pointerEvents="none"');
  });

  it('is static — nothing here animates', () => {
    const src = String(readFileSync(CRACKLE, 'utf8'));
    expect(src).not.toMatch(/\bAnimated\b|requestAnimationFrame|setInterval|useSharedValue/);
  });

  it('never says how charged it is', () => {
    // The rule the whole ramp lives under: you cannot read a score off a
    // surface. No figure, no percentage, no count, no name for a step.
    const src = String(readFileSync(CRACKLE, 'utf8'));
    const code = src
      .split('\n')
      .filter((l) => !/^\s*(\*|\/\/|\/\*)/.test(l))
      .join('\n');
    expect(code).not.toMatch(/<Text\b/);
    expect(code).not.toMatch(/toFixed\(\d\)\s*\+\s*'%'|`\$\{[^}]*charge[^}]*\}%`/);
  });
});
