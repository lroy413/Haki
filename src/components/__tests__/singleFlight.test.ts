/// <reference types="node" />
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * The acknowledgement goes inside the flight.
 *
 * `useSingleFlight` **drops** a call that arrives while one is already
 * running — that is what stops a second tap queueing a second insert. Which
 * means anything a screen does to say "got it" has to happen *inside* the
 * work, where it only happens if the write is actually going to happen.
 *
 * `app/bells.tsx` cleared its two fields on the line above the flight instead.
 * Hang a bell while any other write was still going down the sqlite channel
 * and the form emptied, the guard dropped the call, and the bell was never
 * written. Nothing threw, nothing was logged, and the screen looked exactly
 * like it had saved: *"I made a Bell and I don't know where it went."*
 *
 * It is invisible to a typecheck, to `innerText`, and to a screenshot, and it
 * is one line out of place — so it is read off the source instead.
 */

const ROOT = join(__dirname, '..', '..', '..');

function screens(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return screens(path);
    return name.endsWith('.tsx') ? [path] : [];
  });
}

const FILES = [
  ...screens(join(ROOT, 'app')),
  ...screens(join(ROOT, 'src', 'components')),
].filter((f) => readFileSync(f, 'utf8').includes('useSingleFlight'));

/** A setter call that is plainly an acknowledgement rather than a read. */
const ACK = /^\s*set[A-Z]\w*\(\s*(''|null|false|\(prev\)|\(rows\)|\(w\))/;
/** The line that opens the flight, however the screen named its guard. */
const FLIGHT = /\b(?:await |void )?\w+\(async \(\) => \{/;

describe('the screen answers the finger, and only when it means it', () => {
  it('has screens to check at all', () => {
    // A rename of the hook would otherwise make this suite pass by emptiness.
    expect(FILES.length).toBeGreaterThan(10);
  });

  it.each(FILES.map((f) => [f.slice(ROOT.length + 1), f]))(
    '%s acknowledges inside the flight',
    (name, path) => {
      const lines = String(readFileSync(path, 'utf8')).split('\n');
      const offenders: string[] = [];

      lines.forEach((line, i) => {
        if (!FLIGHT.test(line)) return;
        // Walk back over the handler's own body to the line that opened it.
        // A setter sitting between the two is an acknowledgement the guard
        // can silently make a lie of.
        for (let j = i - 1; j >= 0; j -= 1) {
          const before = lines[j];
          if (/^\s*(async )?function |=> \{$|^\s*\}/.test(before)) break;
          if (ACK.test(before)) offenders.push(`${j + 1}: ${before.trim()}`);
        }
      });

      expect(offenders, `acknowledged before the flight in ${name}`).toEqual([]);
    },
  );
});
