/**
 * Native storage. The web build uses `keep.web.ts` instead.
 *
 * There is nothing to ask for and nothing to measure. A native build's SQLite
 * file sits in the app's own container, which the OS does not evict to free
 * space — the only thing that removes it is deleting the app. Saying so is
 * more useful than reporting a number nobody can act on.
 */

import type { Keep } from './keepTypes';

async function anchor(): Promise<void> {
  // Nothing to do: the file is already as safe as this platform makes things.
}

async function state(): Promise<{ kind: 'native' }> {
  return { kind: 'native' };
}

export const keep = { anchor, state } satisfies Keep;
