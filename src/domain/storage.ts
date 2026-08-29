/**
 * Whether the database is safe from the browser.
 *
 * On the web this app's entire life — every journal entry, every island, every
 * day ever read — lives in OPFS under one origin, and by default that storage
 * is **best-effort**: a browser under disk pressure may evict the whole origin
 * without asking and without telling anybody. There is no error to catch and
 * no event to handle. You open the app one morning and it is a fresh install.
 *
 * `navigator.storage.persist()` is the one line that changes it, and it was
 * never called. It is not a permission dialog on the platforms this app runs
 * on — Chrome grants it silently on an engagement heuristic and Safari grants
 * it to an installed home-screen app — so the honest thing is to ask and then
 * *say what the answer was*, because a guarantee you cannot verify is not one.
 *
 * That is the same argument `ShellReport` was built on: five rounds of the
 * viewport bug were diagnosed by inference and three of those inferences were
 * wrong. The phone is the only thing that knows.
 */

export type StorageState =
  /** Native. The file is in the app's own container; nothing evicts it. */
  | { kind: 'native' }
  /** A browser too old for the Storage API. Nothing can be asked or known. */
  | { kind: 'unsupported' }
  | {
      kind: 'web';
      /** Whether the origin is exempt from automatic eviction. */
      persisted: boolean;
      usedBytes: number | null;
      quotaBytes: number | null;
    };

/**
 * Bytes, said rather than dumped.
 *
 * Two significant figures is all anybody wants from this: the question it
 * answers is "is my journal about to be a problem", and the answer is always
 * no. Deliberately not a bar or a percentage of quota — the quota is a browser
 * implementation detail that moves on its own, and drawing this app's data as
 * a fraction of it would be inventing a denominator, which is the one thing
 * this codebase refuses to do everywhere else.
 */
export function saidBytes(bytes: number | null): string {
  if (bytes === null) return 'unknown';
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb < 10 ? kb.toFixed(1) : Math.round(kb)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`;
  return `${(mb / 1024).toFixed(1)} GB`;
}

/** The verdict, in one sentence. */
export function storageLine(state: StorageState, plain = false): string {
  switch (state.kind) {
    case 'native':
      return plain
        ? 'Stored in the app itself. Nothing can clear it but deleting the app.'
        : 'In the hold. Nothing clears it but scuttling the ship.';
    case 'unsupported':
      return 'This browser will not say whether it keeps the data. Export often.';
    case 'web':
      return state.persisted
        ? plain
          ? 'Marked as persistent. The browser will not clear it to free space.'
          : 'Anchored. The browser will not clear this to make room.'
        : plain
          ? 'Not yet marked persistent. The browser may clear it to free space.'
          : 'Not anchored yet. The browser may clear this to make room.';
  }
}

/**
 * What to do about it, or nothing.
 *
 * Only speaks when there is something to do — the granted case says nothing,
 * because a reassurance repeated under a green readout is noise. And the
 * advice is real: on iOS the thing that actually flips this is installing to
 * the home screen, which this app already asks for elsewhere.
 */
export function storageAdvice(state: StorageState): string | null {
  if (state.kind === 'native') return null;
  if (state.kind === 'unsupported')
    return 'The export above is the copy that survives anything.';
  if (state.persisted) return null;
  return 'Installing to the home screen is usually what grants this. Until then, the export above is the copy that survives anything.';
}

/** The label for the readout. */
export function storageLabel(plain = false): string {
  return plain ? 'Storage' : 'The hold';
}
