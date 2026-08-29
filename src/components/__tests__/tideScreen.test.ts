/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * The month is the size at which every other app grows a streak counter.
 *
 * Thirty inked squares in a row is precisely the figure this app refuses to
 * turn into a number, and a calendar is the screen where the temptation is
 * strongest — a run is *visible* here in a way it is nowhere else, so the next
 * hand to touch this file will be tempted to count it. These are the two
 * things the drawing may not do, read off the source rather than trusted.
 *
 * `domain/tide.ts` holds the same laws for the copy (`monthLine` counts days
 * and never the month); this is the half of it that lives in the screen.
 */

const SCREEN = String(
  readFileSync(join(__dirname, '..', '..', '..', 'app', 'tide.tsx'), 'utf8'),
);

/**
 * The prose is where the law is written down, so it is allowed the words the
 * code is not — the screen's own header says "streak" three times explaining
 * why there isn't one. Comments come out before anything is scanned.
 */
const CODE = SCREEN.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/.*$/gm, ' ');

describe('the tide calendar', () => {
  it('never turns a run of days into a figure', () => {
    // No streak, no longest, no run, no percentage.
    expect(CODE).not.toMatch(/\bstreak\b/i);
    expect(CODE).not.toMatch(/\blongest\b/i);
    expect(CODE).not.toMatch(/\bin a row\b/i);
    expect(CODE).not.toMatch(/\bpercent/i);
  });

  it('draws nothing red', () => {
    // An empty day is a day that was not used. That is a fact about a day and
    // the app has nothing to add to it — crimson would be the app saying
    // something went wrong, and nothing did. A port keeps the app's one
    // warmth, like every other date.
    expect(CODE).not.toMatch(/\b(?:c|palette)\.crimson\b/);
    expect(CODE).toMatch(/\bc\.warn\b/);
  });

  it('keeps the future out of it', () => {
    // Forward stops at the month you are in: a week ahead is something you can
    // still act on, which is the week chart's job, and a month ahead is a
    // calendar. The screen has no way to write anything either — every repo
    // call it makes is a read.
    expect(CODE).toContain('canGoOn');
    expect(CODE).not.toMatch(/\b(?:create|save|set|update|delete)[A-Z]\w*\(db/);
  });
});
