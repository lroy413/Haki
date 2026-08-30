import { describe, expect, it } from 'vitest';
import {
  CHARGE_FROM,
  CHARGE_FULL,
  chargeFor,
  chargeOf,
  levelFor,
  NO_ACTS,
  settleCharge,
  settleLevel,
  THRESHOLDS,
  weightOf,
  type Acts,
} from '../hardening';

/**
 * The charge — the ramp continued past the point the ground runs out of dark.
 *
 * Every rule in this file is one of `domain/hardening.ts`'s own, read back at
 * it. The dangerous one is the third: this is decoration that grows with how
 * much you did, which is one bad decision away from being a score.
 */

const acts = (over: Partial<Acts> = {}): Acts => ({ ...NO_ACTS, ...over });

describe('the charge starts where the palette stops', () => {
  it('is nothing at all below black', () => {
    for (let w = 0; w <= CHARGE_FROM; w += 1) {
      expect(chargeFor(w), `weight ${w}`).toBe(0);
    }
  });

  it('starts exactly where level 3 does', () => {
    expect(CHARGE_FROM).toBe(THRESHOLDS[3]);
    // One point past the threshold is already moving: the act that pushes a
    // day past black has to be visible, or the ramp has a dead zone at the
    // moment it is meant to resume.
    expect(chargeFor(CHARGE_FROM + 1)).toBeGreaterThan(0);
  });

  it('cannot exist on a screen that is not black', () => {
    // Structural, not enforced: an unhardened screen has too little weight
    // behind it to charge, so paper catching nothing falls out of arithmetic
    // rather than out of a guard someone could delete.
    for (let w = 0; w <= CHARGE_FROM; w += 1) {
      if (chargeFor(w) > 0) expect(levelFor(acts({ struck: w }))).toBe(3);
    }
  });

  it('saturates, and stays saturated', () => {
    expect(chargeFor(CHARGE_FULL)).toBe(1);
    expect(chargeFor(CHARGE_FULL * 4)).toBe(1);
    expect(chargeFor(9999)).toBe(1);
  });

  it('is monotonic — a further act never makes the app quieter', () => {
    let last = -1;
    for (let w = 0; w <= CHARGE_FULL + 5; w += 1) {
      const now = chargeFor(w);
      expect(now, `weight ${w}`).toBeGreaterThanOrEqual(last);
      last = now;
    }
  });

  it('is linear between the two ends, so no act is worth more than another', () => {
    // The whole argument for a flat curve: the step from the first act past
    // black to the second is the same size as the step from the tenth to the
    // eleventh. A knee anywhere would make some region of the afternoon
    // count for less, which is the complaint this was built to answer.
    const step = chargeFor(CHARGE_FROM + 2) - chargeFor(CHARGE_FROM + 1);
    for (let w = CHARGE_FROM + 1; w < CHARGE_FULL; w += 1) {
      expect(chargeFor(w + 1) - chargeFor(w), `at ${w}`).toBeCloseTo(step, 10);
    }
  });
});

describe('the charge reads the whole day, not one lens', () => {
  it('a full morning does not charge on its own', () => {
    // read + course + sit + an entry + a struck task = 8, which is black and
    // no further. The whole second half of the ramp is still to come.
    const morning = acts({ read: true, course: true, satMinutes: 20, entries: 1, struck: 1 });
    expect(weightOf(morning)).toBe(CHARGE_FROM);
    expect(levelFor(morning)).toBe(3);
    expect(chargeOf(morning)).toBe(0);
  });

  it('sitting still charges the app, like everything else that uses a day', () => {
    // The rule at the top of `hardening.ts`: withholding the ramp from
    // meditation would be a mental-health app punishing somebody for
    // meditating. That has to hold on the second half of the ramp too.
    const busy = acts({ read: true, course: true, trained: 1, struck: 4 });
    const withSit = acts({ ...busy, satMinutes: 20 });
    expect(chargeOf(withSit)).toBeGreaterThan(chargeOf(busy));
  });

  it('a full day gets there, an ordinary one does not', () => {
    const ordinary = acts({ read: true, course: true, satMinutes: 20, struck: 3 });
    expect(chargeOf(ordinary)).toBeLessThan(0.5);

    const full = acts({
      read: true,
      course: true,
      satMinutes: 20,
      entries: 1,
      trained: 1,
      gearMinutes: 75,
      struck: 6,
    });
    expect(weightOf(full)).toBeGreaterThanOrEqual(CHARGE_FULL);
    expect(chargeOf(full)).toBe(1);
  });
});

describe('it never goes backwards inside a day', () => {
  const today = '2026-08-30';
  const busy = acts({ read: true, course: true, trained: 1, struck: 6, satMinutes: 20 });

  it('holds the high-water mark when a task is un-ticked', () => {
    const held = weightOf(busy);
    const undone = acts({ ...busy, struck: 1 });
    expect(chargeOf(undone)).toBeLessThan(chargeOf(busy));
    expect(settleCharge(undone, today, { day: today, weight: held })).toBe(chargeOf(busy));
  });

  it('ignores a mark from an older day', () => {
    // Waking to an uncharged screen is the same promise as waking to a pale
    // one: yesterday is not carried in.
    expect(settleCharge(NO_ACTS, today, { day: '2026-08-29', weight: 40 })).toBe(0);
  });

  it('starts from the acts when nothing has ever been recorded', () => {
    expect(settleCharge(busy, today, null)).toBe(chargeOf(busy));
  });

  it('rises above the mark when the day goes further', () => {
    const more = acts({ ...busy, struck: 12 });
    expect(settleCharge(more, today, { day: today, weight: weightOf(busy) })).toBe(
      chargeOf(more),
    );
  });

  it('moves with the level rather than against it', () => {
    // The two halves of one ramp. Anything charged is black; nothing pale is
    // charged. If these ever disagree the app is lighting a plate on a
    // palette that has not hardened.
    const cases = [NO_ACTS, acts({ struck: 2 }), acts({ struck: 5 }), acts({ struck: 30 })];
    for (const a of cases) {
      if (settleCharge(a, today, null) > 0) expect(settleLevel(a, today, null)).toBe(3);
    }
  });
});
