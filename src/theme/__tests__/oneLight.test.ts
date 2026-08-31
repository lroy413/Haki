/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * One screen, one light.
 *
 * Each tab burns its own lens colour and every control on it wears the same
 * one — cyan on the day and its record, violet on 見聞色, crimson on 武装色,
 * the crew's colour on 覇王色, plain ink in settings.
 *
 * The rule is easy to state and easy to break in exactly one way: a control
 * written on one screen and later reused on another carries its birthplace's
 * colour with it. That is how the Do tab — a crimson screen — came to have a
 * teal "Carry today" button, teal duration chips, a teal checkbox and teal
 * "Tomorrow / Later" links, while the crimson watch chips sat directly
 * underneath them. The file disagreed with itself, which is the tell that
 * nobody chose it.
 *
 * So a component that stands on more than one screen must take its colour
 * from the screen that mounts it. This test is the list of those components
 * and the assertion that none of them names an accent directly.
 *
 * It deliberately does not police single-screen components: `CourseLine`
 * lives only on the home screen and cyan is simply correct there, and
 * `GlassTabBar` names every accent because it *is* the legend.
 */

const ROOT = join(__dirname, '..', '..', '..');

/** Components mounted by more than one screen. */
const SHARED = [
  join('src', 'components', 'LogLine.tsx'),
  join('src', 'components', 'SectionLabel.tsx'),
  join('src', 'components', 'PageHeading.tsx'),
  join('src', 'components', 'Rise.tsx'),
  join('src', 'components', 'Toggle.tsx'),
  join('src', 'components', 'WritingBar.tsx'),
];

/** The lens colours. A shared control may not reach for any of them. */
const ACCENTS = /\b(?:c|palette|lens)\.(cyan|violet|crimson|amethyst|jade)(?:Soft)?\b/g;

describe('one screen, one light', () => {
  it.each(SHARED.map((f) => [f, join(ROOT, f)]))(
    '%s takes its colour, never names one',
    (name, path) => {
      const src = String(readFileSync(path, 'utf8'));
      const offenders: string[] = [];
      src.split('\n').forEach((line, i) => {
        // Prose in a doc comment may name colours freely — the rule is about
        // what the component *paints*, not what it explains.
        const code = line.replace(/^\s*(?:\*|\/\/).*$/, '');
        for (const m of code.matchAll(ACCENTS)) offenders.push(`line ${i + 1}: ${m[0]}`);
      });
      expect(offenders, `${name} hardcodes a lens colour: ${offenders.join(', ')}`).toEqual([]);
    },
  );

  it('leaves the tab bar alone, because it is the legend', () => {
    // A guard on the guard: if the list above ever grows to include the bar,
    // this test would start failing for a component that is *supposed* to
    // name all five.
    expect(SHARED).not.toContain(join('src', 'components', 'GlassTabBar.tsx'));
  });

  it('keeps the Daily Read in one colour', () => {
    // 見聞色's own instrument. Its four dials are four facets of one reading,
    // not four lenses — they were violet, violet, cyan and crimson, and the
    // crimson one sat under a label reading "low is better", so a good answer
    // lit up in the colour this app reserves for something having gone wrong.
    const src = String(readFileSync(join(ROOT, 'app', 'read.tsx'), 'utf8'));
    const offenders: string[] = [];
    src.split('\n').forEach((line, i) => {
      const code = line.replace(/^\s*(?:\*|\/\/).*$/, '');
      if (/\b(?:c|palette|lens)\.(?:cyan|crimson|jade|amethyst)(?:Soft)?\b/.test(code)) {
        offenders.push(`line ${i + 1}`);
      }
    });
    expect(offenders, `the Daily Read reaches past violet at ${offenders.join(', ')}`).toEqual(
      [],
    );
  });

  it('keeps the Do tab in one colour', () => {
    // The specific regression. 武装色's own controls — the box that fills on
    // a strike, the duration chips, the defer links, the primary button —
    // must not be cyan, which belongs to the day and its record.
    const src = String(readFileSync(join(ROOT, 'app', '(tabs)', 'armament.tsx'), 'utf8'));
    const offenders: string[] = [];
    src.split('\n').forEach((line, i) => {
      const code = line.replace(/^\s*(?:\*|\/\/).*$/, '');
      if (/\b(?:c|palette|lens)\.cyan(?:Soft)?\b/.test(code)) offenders.push(`line ${i + 1}`);
    });
    expect(offenders, `Armament reaches for cyan at ${offenders.join(', ')}`).toEqual([]);
  });
});
