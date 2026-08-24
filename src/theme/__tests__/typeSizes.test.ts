/// <reference types="node" />
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Nothing in this app is set smaller than eleven points.
 *
 * The owner said the app was hard to read at full brightness. Contrast was
 * half of it; the other half was size. Forty-two separate styles had reached
 * past the type scale to set nine, nine-and-a-half or ten points — always the
 * same move, a date or a unit or a stat label nudged down until it stopped
 * competing with the thing above it. Each one is defensible alone and the sum
 * is a squint.
 *
 * The scale already has a bottom (`type.label`, and `type.mono` above it). If
 * something needs to recede, the tools are colour and weight and space — not
 * another point off a figure that is already small.
 */

const ROOT = join(__dirname, '..', '..', '..');
const SEARCH = ['app', join('src', 'components')];

/** The floor, and the one thing allowed under it. */
const FLOOR = 11;
const ALLOWED: Record<string, number> = {
  // Five tabs across the narrowest phone, each a kanji over an English word.
  // "Settings" at eleven truncates; the label is a caption under a glyph that
  // is already doing the naming, and it is drawn at full accent contrast.
  [join('src', 'components', 'GlassTabBar.tsx')]: 10,
};

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) out.push(...walk(path));
    else if (/\.tsx?$/.test(name)) out.push(path);
  }
  return out;
}

describe('type never goes below the floor', () => {
  const files = SEARCH.flatMap((d) => walk(join(ROOT, d)));

  it('finds files to check at all', () => {
    expect(files.length).toBeGreaterThan(10);
  });

  it.each(files.map((f) => [f.slice(ROOT.length + 1), f]))('%s', (name, path) => {
    const floor = ALLOWED[name] ?? FLOOR;
    const offenders: string[] = [];
    String(readFileSync(path, 'utf8'))
      .split('\n')
      .forEach((line: string, i: number) => {
        for (const m of line.matchAll(/fontSize: (\d+(?:\.\d+)?)/g)) {
          if (Number(m[1]) < floor) offenders.push(`line ${i + 1}: ${m[0]}`);
        }
      });
    expect(offenders, `${floor}pt is the floor here`).toEqual([]);
  });
});
