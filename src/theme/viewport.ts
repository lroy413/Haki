/**
 * How much of the screen this app is not given.
 *
 * On the phone this app is built for, iOS hands a standalone install a web
 * view positioned full-screen and sized as though it were inset at the top:
 * 812 points tall on an 874-point screen. Two measurements off a screenshot
 * settle it — the wordmark's cap sits at exactly `insets.top + space.lg`, so
 * the viewport is anchored at screen y = 0; and the tab bar's rounded rect
 * reaches its full left edge at 811.3 and then stops dead at 812.0, which is
 * a clip rather than a corner completing.
 *
 * **The last sixty-two points cannot be painted into.** Growing the root to
 * `screen.height` was tried and put the tab bar's labels off the bottom of
 * the phone. The browser extends the page's own background colour into the
 * band, which is why the app looks continuous down there and why this took
 * six rounds to see.
 *
 * What the app *can* do is stop wasting the space it has, which is what this
 * module is for.
 */

/**
 * Points of screen below the viewport that nothing can reach. 0 when healthy.
 *
 * Asks the shell through a global rather than importing anything. The shell
 * only exists on the web, so a missing global *is* the native answer — and it
 * keeps this module pure TypeScript, which is what lets the rule below be
 * tested on plain Node. The first cut reached for `Platform` and the test
 * could not even parse: vitest runs on Node with no React Native preset, and
 * RN's own entry point is Flow. Same rule `src/domain/` holds, arrived at
 * from the other end.
 */
export function unreachable(): number {
  try {
    const ask = (globalThis as { __HAKI_UNREACHABLE__?: () => number }).__HAKI_UNREACHABLE__;
    return typeof ask === 'function' ? ask() : 0;
  } catch {
    return 0;
  }
}

/**
 * The bottom inset worth honouring.
 *
 * `env(safe-area-inset-bottom)` is 34 because the home indicator sits at
 * screen 858 — but on this phone that is out in the unreachable band, not
 * inside the viewport. Reserving 34 points at the foot of an 812-point box
 * guards against a hazard that is not in the box, and it is why the tab bar
 * floated ninety-six points above the bottom of the phone.
 *
 * So: when the band is at least as deep as the inset, the hazard is outside
 * and the inset is dropped. On a device that is given its whole screen the
 * band is zero and nothing changes — which is the only reason this is safe
 * to apply everywhere.
 */
export function usableBottom(inset: number): number {
  return unreachable() >= inset ? 0 : inset;
}
