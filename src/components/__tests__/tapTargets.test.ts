/// <reference types="node" />
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Everything you can press announces itself as a button.
 *
 * `Pressable` renders to a plain `div` unless it is given a role, so a screen
 * reader walks straight past it — the Daily Read's Save, the Logbook's rows,
 * Delete on an entry, both Save buttons in Settings. Fourteen of them, every
 * one visually obvious and completely invisible to anything not looking at the
 * screen. Nothing typechecks that, and nothing shows up in a screenshot.
 *
 * `accessibilityRole` is the minimum, and this asks only for *a* role: the tab
 * bar's are `tab` inside a `tablist`, which is the right answer there. A label
 * is only needed on top of the role when the text inside the button does not
 * say what it does — "−" and "+" in Settings, a row whose text is a date.
 */

const ROOT = join(__dirname, '..', '..', '..');
const SEARCH = ['app', join('src', 'components')];

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) out.push(...walk(path));
    else if (/\.tsx$/.test(name)) out.push(path);
  }
  return out;
}

/**
 * The opening tag, from `<Pressable` to the `>` that closes it.
 *
 * Brace-aware, because nearly every one of these carries a `style={({
 * pressed }) => …}` and a naive scan for the next `>` would stop inside the
 * arrow.
 */
function openingTag(src: string, from: number): string {
  let depth = 0;
  for (let i = from; i < src.length; i += 1) {
    const c = src[i];
    if (c === '{') depth += 1;
    else if (c === '}') depth -= 1;
    else if (c === '>' && depth === 0 && src[i - 1] !== '=') return src.slice(from, i);
  }
  return src.slice(from);
}

function lineOf(src: string, index: number): number {
  return src.slice(0, index).split('\n').length;
}

describe('every Pressable is a button', () => {
  const files = SEARCH.flatMap((d) => walk(join(ROOT, d)));

  it('finds files to check at all', () => {
    // Guards against the walk silently matching nothing and passing forever.
    expect(files.length).toBeGreaterThan(10);
  });

  it.each(files.map((f) => [f.slice(ROOT.length + 1), f]))('%s', (_name, path) => {
    const src = String(readFileSync(path, 'utf8'));
    const offenders: string[] = [];
    for (const match of src.matchAll(/<Pressable\b/g)) {
      const at = match.index ?? 0;
      if (!openingTag(src, at).includes('accessibilityRole=')) {
        offenders.push(`line ${lineOf(src, at)}`);
      }
    }
    expect(offenders, 'add accessibilityRole="button"').toEqual([]);
  });
});
