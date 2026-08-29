import type { StorageState } from '../domain/storage';

/**
 * Keeping the database, implemented twice: `keep.ts` for native and
 * `keep.web.ts` for the browser. Metro picks the right one per platform.
 *
 * Both declare `satisfies Keep`, so a signature that drifts on one platform
 * fails the typecheck rather than failing on somebody's phone — the same
 * bargain `Transfer` makes next door.
 */
export type Keep = {
  /**
   * Ask the platform not to evict this origin's storage.
   *
   * Never throws and never blocks anything. A browser that refuses, or has no
   * opinion, must not be able to stop the app opening — losing the database
   * is the risk being managed here, and refusing to start is not a better
   * outcome than running unanchored.
   */
  anchor(): Promise<void>;
  /** What the platform will say about it, for the readout. */
  state(): Promise<StorageState>;
};
