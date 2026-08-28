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
 * `unreachable()` asks the shell through a global rather than importing
 * anything, which is what keeps this module pure TypeScript and testable on
 * plain Node — so the short case can be tested here too, by answering as the
 * phone does.
 */

/** Answer as a given phone would, for one call. */
function withBand<T>(points: number, run: () => T): T {
  const g = globalThis as { __HAKI_UNREACHABLE__?: () => number };
  const had = g.__HAKI_UNREACHABLE__;
  g.__HAKI_UNREACHABLE__ = () => points;
  try {
    return run();
  } finally {
    if (had) g.__HAKI_UNREACHABLE__ = had;
    else delete g.__HAKI_UNREACHABLE__;
  }
}
describe('the bottom inset', () => {
  it('is honoured when the whole screen is the viewport', () => {
    expect(usableBottom(34)).toBe(34);
    expect(usableBottom(0)).toBe(0);
  });

  it('is dropped when the home indicator is out past the viewport', () => {
    // The phone this app is built for: an 812-point viewport on an 874-point
    // screen, and a home indicator at screen 858 — sixty-two points out in a
    // band the app cannot paint into. Reserving 34 at the foot of the box
    // guards against a hazard that is not in the box.
    expect(withBand(62, () => usableBottom(34))).toBe(0);
  });

  it('is kept when the band is shallower than the inset', () => {
    // Then the indicator is still inside the viewport and the inset is doing
    // its job. Only a band at least as deep as the inset puts it outside.
    expect(withBand(10, () => usableBottom(34))).toBe(34);
    expect(withBand(34, () => usableBottom(34))).toBe(0);
  });

  it('survives a shell that is not there, or throws', () => {
    // Native has no shell at all, and a readout is never worth a crash.
    const g = globalThis as { __HAKI_UNREACHABLE__?: () => number };
    g.__HAKI_UNREACHABLE__ = () => {
      throw new Error('no');
    };
    expect(usableBottom(34)).toBe(34);
    delete g.__HAKI_UNREACHABLE__;
    expect(usableBottom(34)).toBe(34);
  });

  it('never invents padding of its own', () => {
    // It only ever answers with the inset it was handed, or nothing. The
    // floors live at the call sites, where `space.md` is already the minimum.
    for (const inset of [0, 12, 21, 34, 48]) {
      expect([0, inset]).toContain(usableBottom(inset));
    }
  });
});
