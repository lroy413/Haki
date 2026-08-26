import { describe, expect, it } from 'vitest';
import { lit } from '../surfaces';
import type { HardeningLevel } from '../../domain/hardening';

/**
 * The aura obeys the ramp.
 *
 * `lit` is the one piece of decoration in this app that is allowed to follow
 * hardening, and the licence comes with two conditions that are easy to break
 * by accident later: paper does not glow, and the light only ever grows. A
 * lens that lit up on an unused day would say the opposite of what the whole
 * ramp says, and one that dimmed as the day filled would read as a meter
 * running backwards.
 */

const TINT = '#B85BFF';
const LEVELS: HardeningLevel[] = [0, 1, 2, 3];

describe('the light a lens throws', () => {
  it('gives paper nothing to catch', () => {
    expect(lit(TINT, 0)).toEqual({});
  });

  it('carries the tint it is given, never a colour of its own', () => {
    for (const level of [1, 2, 3] as const) {
      expect(lit(TINT, level).shadowColor, `level ${level}`).toBe(TINT);
    }
  });

  it('grows every step and never doubles back', () => {
    const strength = LEVELS.map((l) => Number(lit(TINT, l).shadowOpacity ?? 0));
    const spread = LEVELS.map((l) => Number(lit(TINT, l).shadowRadius ?? 0));
    for (let i = 1; i < LEVELS.length; i += 1) {
      expect(strength[i], `opacity at ${i}`).toBeGreaterThan(strength[i - 1]);
      expect(spread[i], `radius at ${i}`).toBeGreaterThan(spread[i - 1]);
    }
  });

  it('stays an aura rather than a wash', () => {
    // This used to require a perfectly centred offset, on the reasoning that
    // light coming off all four sides reads as emission. It does — and that
    // turned out to be the problem rather than the goal: at the settled dark
    // the Reserve plate became a lamp and outshouted the number inside it.
    //
    // So the aura now falls slightly, and what the test protects is the two
    // ways that can go wrong: it must not wash the screen, and it must not
    // slide so far that it stops being light and becomes a slab's drop
    // shadow. The offset stays a small fraction of the spread, which is the
    // difference between a glow that settles and a card that is dropped on
    // something.
    for (const level of [1, 2, 3] as const) {
      const style = lit(TINT, level);
      const offset = style.shadowOffset as { width: number; height: number };
      const radius = Number(style.shadowRadius);

      expect(offset.width, `level ${level} drifts sideways`).toBe(0);
      expect(offset.height, `level ${level} rises`).toBeGreaterThanOrEqual(0);
      expect(offset.height, `level ${level} has dropped`).toBeLessThan(radius / 3);

      // Quiet enough to sit under a screen for eleven hours.
      expect(Number(style.shadowOpacity), `level ${level} washes`).toBeLessThanOrEqual(0.4);
    }
  });
});
