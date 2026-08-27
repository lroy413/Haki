/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * **Plain mode gets a plain list.**
 *
 * Two screens in this app draw themselves as a chart — the settings
 * archipelago and the Log Pose's standing stones — and both are performances.
 * Plain mode is the switch that stops the app performing: it exists so the
 * thing can be opened in a waiting room or on a shared screen without a night
 * sea and a set of red poneglyphs announcing themselves. Same categories,
 * same order, same routes, drawn as rows.
 *
 * The gate is one ternary per screen, which is exactly the kind of thing that
 * survives a refactor with one branch quietly gone. So this reads the screens
 * rather than trusting them, and checks the half that actually breaks: that
 * the drawing cannot be reached in plain mode, and that the plain branch
 * still has a way to add one of whatever the screen is listing.
 */

const ROOT = join(__dirname, '..', '..', '..');

/** A screen that draws itself twice, and the drawing that is the performance. */
const PERFORMERS = [
  {
    file: join('app', '(tabs)', 'conquerors.tsx'),
    drawing: '<ChartTable',
    plain: '<NeedleCard',
  },
  {
    file: join('app', '(tabs)', 'settings.tsx'),
    drawing: '<ChartSky',
    plain: 'styles.list',
  },
];

/** The two arms of `{plainMode ? ( … ) : ( … )}`, at any indentation. */
function arms(src: string): { plain: string; performed: string } {
  const at = src.indexOf('{plainMode ? (');
  expect(at, 'no plain-mode gate on this screen').toBeGreaterThan(-1);

  // Walk the parens rather than searching for a delimiter. Both arms are full
  // of JSX with arrow functions in it, so every plausible marker — `) : (`,
  // `)}` — occurs inside them long before the arm ends.
  const balanced = (from: number): [string, number] => {
    const open = src.indexOf('(', from);
    let depth = 0;
    for (let i = open; i < src.length; i += 1) {
      if (src[i] === '(') depth += 1;
      else if (src[i] === ')') {
        depth -= 1;
        if (depth === 0) return [src.slice(open + 1, i), i];
      }
    }
    throw new Error('the plain-mode gate never closes');
  };

  const [plain, endOfPlain] = balanced(at);
  const [performed] = balanced(endOfPlain);
  return { plain, performed };
}

describe('plain mode gets a plain list', () => {
  it.each(PERFORMERS.map((p) => [p.file, p.drawing, p.plain]))(
    '%s keeps %s out of the plain arm',
    (file, drawing, plain) => {
      const { plain: plainArm, performed } = arms(
        String(readFileSync(join(ROOT, file), 'utf8')),
      );

      expect(performed, `${drawing} is not in the performed arm`).toContain(drawing);
      expect(plainArm, `${drawing} is reachable in plain mode`).not.toContain(drawing);
      expect(plainArm, `the plain arm lost ${plain}`).toContain(plain);
    },
  );

  it('leaves the Log Pose a way to raise a pillar in both modes', () => {
    // The chart carries its own offer — a dashed stone in the next column —
    // so the list's button is gated to plain mode. Drop either and one mode
    // silently cannot add a Road Poneglyph at all, which no screenshot of
    // the other mode would ever show.
    const src = String(readFileSync(join(ROOT, 'app', '(tabs)', 'conquerors.tsx'), 'utf8'));
    expect(src, 'the chart lost its offer slot').toMatch(/canAdd=\{room\.canAdd/);
    expect(src, 'the plain list lost its add button').toMatch(
      /room\.canAdd\s*&&\s*plainMode\s*\?/,
    );
  });
});
