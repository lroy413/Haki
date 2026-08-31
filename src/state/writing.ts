/**
 * Whether anything is written but not yet stored.
 *
 * ---------------------------------------------------------------------------
 * This exists because the app threw a journal entry away.
 *
 * The shell asks the service worker for an update on every return to the
 * foreground and **reloads the page the moment a new worker takes over** — a
 * standalone app on iOS is resumed for days without ever navigating, so
 * without that reload a shipped fix can sit undelivered indefinitely. That
 * reasoning is still right. What was wrong is that the reload was
 * unconditional: `window.location.reload()` fired mid-sentence, and the
 * journal autosaves 800ms after the last keystroke.
 *
 * So a deploy — the one thing guaranteed to change the controller — could
 * take the last thing the owner wrote. It did. In a journal, that is the
 * worst failure the app has, and it is worse than a crash: a crash is
 * visible, and this looked like the entry was simply never there.
 *
 * The fix is this flag. A screen holding unsaved words says so, the shell
 * waits, and the reload happens the moment the words are down. Nothing is
 * blocked for longer than one debounce, because every screen that holds text
 * also flushes it when the app goes to the background.
 * ---------------------------------------------------------------------------
 *
 * **Never gate anything else on this.** It is not a "busy" flag and it is not
 * a lock. The one question it answers is whether throwing this page away right
 * now would lose words, and the only caller entitled to ask is the thing that
 * would do the throwing.
 */

/** Who is holding words. A set, so two open editors cannot cancel each other. */
const holding = new Set<string>();

/**
 * The shell is a plain script in the document head, parsed before the bundle
 * and unable to import anything, so the answer is published on `window` —
 * the same way `__HAKI_SHELL__` and `__HAKI_BUILD__` cross that seam.
 */
function publish(): void {
  const w = globalThis as { __HAKI_WRITING__?: () => boolean };
  w.__HAKI_WRITING__ = () => holding.size > 0;
}

publish();

/**
 * Say whether this screen is holding words the database does not have yet.
 *
 * Call it with `true` the instant the text changes — before the debounce, not
 * after it — and with `false` only once the write has actually landed. The
 * order matters: marking clean when the write is *scheduled* reopens exactly
 * the window this closes.
 */
export function holdWords(who: string, unsaved: boolean): void {
  if (unsaved) holding.add(who);
  else holding.delete(who);
  publish();
}

/** Whether anything anywhere is unsaved. */
export function wordsHeld(): boolean {
  return holding.size > 0;
}
