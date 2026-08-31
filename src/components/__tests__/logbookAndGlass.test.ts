/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Two screens where a number would be the whole failure.
 *
 * **The bound Logbook** is a book you flip through, and a book is exactly the
 * shape that grows a page count. "47 / 112" is a tally of how much you have
 * written — an accumulating figure attached to a practice, which is a streak
 * in a different costume, and the app does not keep those anywhere.
 *
 * **The glass** — one day's weather and every time it moved — is worse, and it
 * is worse in the direction the owner asked for it: he wants to notice what
 * shifts his state. A count of how often the day moved would answer that
 * question with a steadiness score, and a run of low numbers would become a
 * thing to keep low. `domain/weather.ts` refuses it and these read the screens
 * for whether they honour the refusal.
 */

const ROOT = join(__dirname, '..', '..', '..');
const VOLUME = join(ROOT, 'src', 'components', 'Volume.tsx');
const SKY = join(ROOT, 'src', 'components', 'SkyRun.tsx');
const GLASS = join(ROOT, 'app', 'weather', '[day].tsx');

/**
 * Source with every comment stripped.
 *
 * The prose is where the law is written down, so it is allowed the words the
 * code is not — `tideScreen.test.ts` settled this for the calendar.
 */
function code(path: string): string {
  return String(readFileSync(path, 'utf8'))
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/\/\/.*$/gm, '');
}

/** Any string the screen could actually print. */
function strings(src: string): string[] {
  return [
    ...[...src.matchAll(/'([^'\\]{2,})'/g)].map((m) => m[1]),
    ...[...src.matchAll(/"([^"\\]{2,})"/g)].map((m) => m[1]),
    ...[...src.matchAll(/`([^`]{2,})`/g)].map((m) => m[1]),
  ];
}

describe('the bound logbook', () => {
  const src = code(VOLUME);

  it('never prints a page number or a leaf count', () => {
    // Not `3 / 40`, not "page 3", not "40 entries". The fore-edge draws a
    // fixed few leaves — a book's edge, never a measure of the block.
    // `pages.length === 0` is a branch. Anything that would *render* the
    // number is not, and neither is `at + 1` — the one-based page you are on.
    expect(src).not.toMatch(/\{\s*pages\.length\s*\}/);
    expect(src).not.toMatch(/\$\{[^}]*pages\.length[^}]*\}/);
    expect(src).not.toMatch(/\bat\s*\+\s*1\b/);
    for (const line of strings(src)) {
      expect(line, `"${line}"`).not.toMatch(/\bpage \d|\d+ ?\/ ?\d|\bof \$\{/i);
      expect(line, `"${line}"`).not.toMatch(
        /\b(entries|pages|leaves) (so far|written|kept)\b/i,
      );
    }
  });

  it('never repeats the day it is already showing at the head of the page', () => {
    // The head carries the date. Printing it again under the book is the
    // tab-labels-drawn-twice bug one line lower.
    expect(src).not.toMatch(/foot[\s\S]{0,200}pages\[at\]/);
  });

  it('takes its light and never names one', () => {
    // It stands on the Observation tab today and will stand somewhere else
    // eventually — the shared-control rule from `oneLight.test.ts`.
    expect(src).toMatch(/\btint: string;/);
    // A default, not `tint={tint}` handing it on: a control that cannot be
    // mounted without naming its light cannot drift onto the wrong screen.
    expect(src).not.toMatch(/\btint\s*=\s*[^{]/);
    expect(src).not.toMatch(/\b(?:c|palette)\.(?:cyan|violet|crimson|amethyst|jade)\b/);
  });

  it('draws the page out of the palette, so it hardens with everything else', () => {
    // A cream leaf would be right at level 0 and a lit rectangle at eleven at
    // night. The book-ness is the furniture, not a hardcoded paper.
    expect(src).not.toMatch(/'#[0-9a-fA-F]{3,8}'/);
    expect(src).toMatch(/backgroundColor: c\.surface/);
  });
});

describe('the glass', () => {
  const src = code(GLASS);
  const sky = code(SKY);

  it('never counts the readings, anywhere', () => {
    expect(src).not.toMatch(/readings\.length\s*[}<+]/);
    // `readings.length === 0` is a branch, not a figure. Anything that would
    // render the number is not.
    expect(src).not.toMatch(/\{\s*readings\.length\s*\}/);
    for (const line of strings(src)) {
      expect(line, `"${line}"`).not.toMatch(/\btimes\b|\bshifts today\b|\d+ readings?/i);
    }
  });

  it('asks what was happening, never why', () => {
    // `foresight.ts` holds this line against its own statistics; this holds it
    // against your own report. The app must not teach you to invent a cause.
    for (const line of strings(src)) {
      expect(line, `"${line}"`).not.toMatch(
        /\bbecause\b|\bcaused\b|\byou should\b|\btrigger(ed)?\b/i,
      );
    }
  });

  it('says nothing about whether a day was good or a person is steady', () => {
    for (const line of strings(src)) {
      expect(line, `"${line}"`).not.toMatch(
        /\b(unstable|volatile|steady|erratic|mood swing|better|worse)\b/i,
      );
    }
  });

  it('keeps crimson for the one thing that destroys a record', () => {
    // The app's one "something has gone wrong" colour, and taking a reading
    // off the day is the only thing on this screen that qualifies. Naming a
    // rough word is not a breach.
    const crimson = [...src.matchAll(/c\.crimson\w*/g)].length;
    expect(crimson).toBeGreaterThan(0);
    expect(src).toMatch(/drop[\s\S]{0,160}c\.crimson/);
  });

  it('is reached from a column of the run, and the column is a real target', () => {
    expect(sky).toMatch(/router\.push\(`\/weather\/\$\{sky\.day\}`\)/);
    expect(sky).toMatch(/accessibilityRole="button"/);
    expect(sky).toMatch(/minHeight: 44/);
  });

  it('marks a day that moved without saying how much', () => {
    expect(sky).toMatch(/sky\.moved \?/);
    expect(sky).not.toMatch(/sky\.(?:count|readings|moves)\b/);
  });
});
