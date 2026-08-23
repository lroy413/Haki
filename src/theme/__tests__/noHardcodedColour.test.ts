/// <reference types="node" />
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Colour may only come from the palette.
 *
 * Every screen used to be written against one fixed dark palette, so a literal
 * hex was harmless and fifteen of them accumulated — all of them the label on a
 * filled accent button, all of them near-black. On paper that is dark text on a
 * deep violet, and no amount of typechecking notices.
 *
 * A conversion catches those once. This keeps them caught.
 */

const ROOT = join(__dirname, '..', '..', '..');
const SEARCH = ['app', join('src', 'components'), join('src', 'state')];

/** Where a literal colour is the correct answer. */
const ALLOWED = new Set([
  // A drop shadow is black. It is not a palette colour and never inverts.
  "'#000'",
]);

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) out.push(...walk(path));
    else if (/\.tsx?$/.test(name)) out.push(path);
  }
  return out;
}

describe('no hardcoded colour outside the palette', () => {
  const files = SEARCH.flatMap((d) => walk(join(ROOT, d)));

  it('finds files to check at all', () => {
    // Guards against the walk silently matching nothing and passing forever.
    expect(files.length).toBeGreaterThan(10);
  });

  it.each(files.map((f) => [f.slice(ROOT.length + 1), f]))('%s', (_name, path) => {
    const offenders: string[] = [];
    const lines: string[] = String(readFileSync(path, 'utf8')).split('\n');
    lines.forEach((line: string, i: number) => {
      for (const m of line.matchAll(/'#[0-9a-fA-F]{3,8}'/g)) {
        if (!ALLOWED.has(m[0])) offenders.push(`line ${i + 1}: ${m[0]}`);
      }
      // rgba() literals are palette tokens too — glass lives in the palette.
      for (const m of line.matchAll(/'rgba?\([^']*\)'/g)) {
        offenders.push(`line ${i + 1}: ${m[0]}`);
      }
    });
    expect(offenders, `use a palette token instead`).toEqual([]);
  });
});
