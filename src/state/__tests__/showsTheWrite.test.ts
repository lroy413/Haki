/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * A door that writes behind itself says what it wrote.
 *
 * The Daily Read and the Course both close in the same frame as the tap and
 * let the row land behind the closed door — which is the app's rule and is
 * right. What was missing is the other half: the *result* of the write was
 * left waiting on a round trip.
 *
 * The home screen refreshes when it regains focus, and it regains focus at
 * `router.back()` — **before the write below it has even been issued**. So the
 * correct picture only ever arrived on the refresh that runs after the write,
 * and the screen was relying on that refresh winning a race against the focus
 * one. The owner: _"I'd hit today and it would take me to the main screen but
 * the course didn't show up... same with my daily read, I had to close and
 * reopen and then it was there."_
 *
 * The fix is the app's own law — anything that toggles holds its own
 * optimistic state and drops it when the stored value agrees — applied to the
 * two doors that never had it. These read the screens for it, because the
 * ordering is the whole thing and a later edit could quietly undo it.
 */

const ROOT = join(__dirname, '..', '..', '..');
const COURSE = join(ROOT, 'app', 'course.tsx');
const READ = join(ROOT, 'app', 'read.tsx');
const PROVIDER = join(ROOT, 'src', 'state', 'HakiProvider.tsx');

const read = (p: string) => String(readFileSync(p, 'utf8'));

describe.each([
  ['the Course', COURSE, 'showCourse'],
  ['the Daily Read', READ, 'showRead'],
])('%s', (_name, path, show) => {
  const src = read(path);

  it('says what it wrote', () => {
    expect(src).toContain(`${show}(`);
  });

  it('says it before the door closes, not after the write', () => {
    // The order is the fix. Calling it after `router.back()` would still beat
    // the round trip, but calling it after the *write* would put it back
    // behind the same race it exists to remove.
    const said = src.indexOf(`${show}(`);
    const closed = src.indexOf('router.back()', said);
    const wrote = src.search(/await (?:setCourse|saveRead)\(/);
    expect(said, 'never says what it wrote').toBeGreaterThan(-1);
    expect(closed, 'closes the door after saying it').toBeGreaterThan(said);
    expect(wrote, 'writes after saying it').toBeGreaterThan(said);
  });

  it('still writes, and still refreshes afterwards', () => {
    // Optimistic is a head start, never a replacement: the refresh is what
    // makes it true, and what puts the old value back if the write failed.
    expect(src).toMatch(/await (?:setCourse|saveRead)\(/);
    expect(src).toMatch(/await refresh\(\)/);
  });
});

describe('the provider', () => {
  const src = read(PROVIDER);

  it('offers both, and they are plain setters', () => {
    // Not a cache and not a queue. One value, replaced by the next refresh
    // whatever it says — so this can never disagree with the database for
    // longer than a moment, and a failed write self-corrects.
    expect(src).toMatch(
      /showCourse = useCallback\(\(next: Course \| null\) => setCourse\(next\)/,
    );
    expect(src).toMatch(/showRead = useCallback\(/);
  });

  it('hands them to every screen', () => {
    expect(src).toMatch(/showCourse: \(next: Course \| null\) => void;/);
    expect(src).toMatch(
      /showRead: \(next: \(DailyRead & \{ weather: string \| null \}\) \| null\) => void;/,
    );
  });
});
