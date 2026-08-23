/// <reference types="node" />
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * A Drizzle transaction here may never be handed an async callback.
 *
 * The expo-sqlite driver is synchronous all the way down — prepareSync,
 * executeSync, getAllSync — and its `transaction` runs the callback and takes
 * the returned value without awaiting it. Give it an async function and it
 * receives a pending promise, commits straight away, and the statements land
 * *after* the COMMIT: outside the transaction entirely, from microtasks that
 * interleave with anything else touching the database.
 *
 * On web that corrupts reads as well as writes. Every synchronous call
 * marshals its result through one shared buffer behind a lock, so a query
 * firing from a stray microtask can read a payload another call is still
 * writing — which surfaced as a JSON parse error at a different offset on
 * every run, and made importing a backup silently break the app afterwards.
 *
 * Nothing about it fails to typecheck, so this is the only thing standing
 * between that shape and the repo.
 *
 * `withTransactionAsync` is a different API — expo-sqlite's own, on the raw
 * handle, genuinely asynchronous — and is not what this is looking for.
 */

const ROOT = join(__dirname, '..', '..', '..');
const SEARCH = ['src', 'app'];

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '__tests__') continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) out.push(...walk(path));
    else if (/\.tsx?$/.test(name)) out.push(path);
  }
  return out;
}

describe('drizzle transactions stay synchronous', () => {
  const files = SEARCH.flatMap((d) => walk(join(ROOT, d)));

  it('has files to check', () => {
    expect(files.length).toBeGreaterThan(10);
  });

  it('never passes an async callback to .transaction()', () => {
    const offenders: string[] = [];
    for (const path of files) {
      const source = String(readFileSync(path, 'utf8'));
      // `.transaction(async` — with or without an await in front of it.
      if (/\.transaction\(\s*async\b/.test(source)) {
        offenders.push(path.slice(ROOT.length + 1));
      }
    }
    expect(offenders, 'use a synchronous callback and .run()').toEqual([]);
  });

  it('never awaits a statement inside a transaction callback', () => {
    // `await tx.insert(...)` is the same mistake wearing a different hat: the
    // await only exists because the callback was made async.
    const offenders: string[] = [];
    for (const path of files) {
      const source = String(readFileSync(path, 'utf8'));
      const lines = source.split('\n');
      lines.forEach((line, i) => {
        if (/await\s+tx\./.test(line))
          offenders.push(`${path.slice(ROOT.length + 1)}:${i + 1}`);
      });
    }
    expect(offenders, 'call .run() instead of awaiting').toEqual([]);
  });
});
