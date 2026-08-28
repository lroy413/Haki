import { describe, expect, it } from 'vitest';
import { usableBottom } from '../viewport';

/**
 * The bottom inset worth honouring.
 *
 * `env(safe-area-inset-bottom)` is 34 because the home indicator sits at
 * screen 858 — but on the phone this app is built for, that is out past the
 * end of the 812-point viewport iOS actually gave it. Reserving 34 points at
 * the foot of that box guards against a hazard which is not in the box, and
 * it is why the tab bar floated ninety-six points above the bottom of the
 * phone with the ground running on underneath it.
 *
 * On a device given its whole screen the band is zero and nothing changes,
 * which is the only reason this is safe to apply everywhere.
 *
 * `unreachable()` reads the web shell, so on Node it is 0 — which makes this
 * a test of the healthy case plus the arithmetic. The short case is covered
 * in the browser, where the shell exists.
 */
describe('the bottom inset', () => {
  it('is honoured when the whole screen is the viewport', () => {
    expect(usableBottom(34)).toBe(34);
    expect(usableBottom(0)).toBe(0);
  });

  it('never invents padding of its own', () => {
    // It only ever answers with the inset it was handed, or nothing. The
    // floors live at the call sites, where `space.md` is already the minimum.
    for (const inset of [0, 12, 21, 34, 48]) {
      expect([0, inset]).toContain(usableBottom(inset));
    }
  });
});
