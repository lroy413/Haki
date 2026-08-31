/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { holdWords, wordsHeld } from '../writing';

/**
 * The reload waits for the words.
 *
 * This is a regression test for the worst thing the app has done: it threw a
 * journal entry away. The shell reloads the page when a new service worker
 * takes over — right, and necessary, because a standalone app on iOS is
 * resumed for days without navigating and would otherwise never receive a fix.
 * But the reload was unconditional, the editor autosaves 800ms after the last
 * keystroke, and a deploy is the one event guaranteed to change the
 * controller. The owner lost the entry he was writing.
 *
 * Two halves, and both are needed: a screen has to *say* it is holding words,
 * and the shell has to *ask* before throwing the page away.
 */

const ROOT = join(__dirname, '..', '..', '..');
const SHELL = join(ROOT, 'tools', 'pwa-head.mjs');
const ENTRY = join(ROOT, 'app', 'entry', '[id].tsx');
const NOTE = join(ROOT, 'app', 'note', '[id].tsx');

const read = (p: string) => String(readFileSync(p, 'utf8'));

describe('the flag', () => {
  beforeEach(() => {
    holdWords('entry', false);
    holdWords('note', false);
  });

  it('is clear when nothing is being written', () => {
    expect(wordsHeld()).toBe(false);
  });

  it('holds while a screen has words the database does not', () => {
    holdWords('entry', true);
    expect(wordsHeld()).toBe(true);
    holdWords('entry', false);
    expect(wordsHeld()).toBe(false);
  });

  it('lets two editors hold at once without cancelling each other', () => {
    // A set rather than a boolean: a note releasing must not clear the hold a
    // half-written entry still has. That is the whole bug, one layer down.
    holdWords('entry', true);
    holdWords('note', true);
    holdWords('note', false);
    expect(wordsHeld()).toBe(true);
    holdWords('entry', false);
    expect(wordsHeld()).toBe(false);
  });

  it('publishes the answer where a plain script can read it', () => {
    // The shell is parsed before the bundle and cannot import anything, so
    // this crosses the seam on `window`, like __HAKI_SHELL__ next door.
    const w = globalThis as { __HAKI_WRITING__?: () => boolean };
    expect(typeof w.__HAKI_WRITING__).toBe('function');
    holdWords('entry', true);
    expect(w.__HAKI_WRITING__?.()).toBe(true);
    holdWords('entry', false);
    expect(w.__HAKI_WRITING__?.()).toBe(false);
  });
});

describe('the shell asks before it reloads', () => {
  const src = read(SHELL);

  it('never reloads on a controller change without checking first', () => {
    // The exact shape that cost the entry: a bare reload in the handler.
    expect(src).not.toMatch(/controllerchange'[\s\S]{0,200}?window\.location\.reload\(\)/);
    expect(src).toContain('__HAKI_WRITING__');
  });

  it('comes back for the reload rather than dropping it', () => {
    // A deferred update that never happens is the bug the reload exists to
    // fix. Held is held *until the words are down*, not abandoned.
    expect(src).toMatch(/setInterval/);
    expect(src).toMatch(/clearInterval/);
  });

  it('reloads anyway when the app cannot answer', () => {
    // Before the bundle parses there is nothing on screen to lose, and a
    // throwing accessor must not wedge updates forever.
    expect(src).toMatch(/catch \(e\) \{\s*return false;/);
  });
});

describe('both editors hold their words', () => {
  it.each([
    ['the journal', ENTRY],
    ['a loose page', NOTE],
  ])('%s holds from the keystroke and lets go after the write', (_name, path) => {
    const src = read(path);
    // Held before the debounce is armed. Marking it held *after* the timer
    // fires would leave the gap this exists to close.
    expect(src).toMatch(/holdWords\(HOLD, true\);[\s\S]{0,240}setTimeout/);
    // And released only where the write has actually landed.
    expect(src).toMatch(/await update(?:Entry|Note)\([\s\S]{0,80}?holdWords\(HOLD, false\)/);
  });

  it.each([
    ['the journal', ENTRY],
    ['a loose page', NOTE],
  ])('%s writes what it is holding when the app goes away', (_name, path) => {
    const src = read(path);
    // Backgrounding and unmounting both run the pending write now rather than
    // in 800ms — so the hold clears in a moment and the shell can get on.
    expect(src).toMatch(/AppState\.addEventListener\('change'/);
    expect(src).toMatch(/next !== 'active'[\s\S]{0,60}flush\.current\(\)/);
    expect(src).toMatch(/return \(\) => \{[\s\S]{0,260}flush\.current\(\)/);
  });
});
