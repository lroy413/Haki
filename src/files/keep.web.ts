/**
 * Browser storage. The native build uses `keep.ts` instead.
 *
 * The whole database lives in OPFS under this origin, and unless it is marked
 * persistent the browser may evict all of it under disk pressure — silently,
 * with no error and no event. This is the file that asks it not to.
 */

import type { StorageState } from '../domain/storage';
import type { Keep } from './keepTypes';

/**
 * Ask once per load.
 *
 * `persist()` is idempotent and cheap, and on the platforms this app runs on
 * it is silent: Chrome decides on an engagement heuristic and Safari grants it
 * to an installed home-screen app. Asking on every cold start is what lets the
 * answer change from "no" to "yes" the day the app is installed, without the
 * app having to notice that it was.
 *
 * Everything here is wrapped: an origin with storage disabled entirely throws
 * on the *accessor*, not just the call, and a database that opens fine must
 * not be stopped by a question about it.
 */
async function anchor(): Promise<void> {
  try {
    if (typeof navigator === 'undefined' || !navigator.storage?.persist) return;
    if (await navigator.storage.persisted()) return;
    await navigator.storage.persist();
  } catch {
    // Nothing to do and nothing worth saying. The readout tells the truth
    // either way, and the export is the copy that survives anything.
  }
}

async function state(): Promise<StorageState> {
  try {
    if (typeof navigator === 'undefined' || !navigator.storage?.persisted) {
      return { kind: 'unsupported' };
    }
    const persisted = await navigator.storage.persisted();
    let usedBytes: number | null = null;
    let quotaBytes: number | null = null;
    if (navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate();
      usedBytes = estimate.usage ?? null;
      quotaBytes = estimate.quota ?? null;
    }
    return { kind: 'web', persisted, usedBytes, quotaBytes };
  } catch {
    return { kind: 'unsupported' };
  }
}

export const keep = { anchor, state } satisfies Keep;
