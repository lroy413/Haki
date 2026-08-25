import { describe, expect, it } from 'vitest';
import { SYNODIC_DAYS, moonPhase } from '../moon';

describe('the moon', () => {
  it('is new at its own epoch', () => {
    const m = moonPhase(new Date(Date.UTC(2000, 0, 6, 18, 14)));
    expect(m.age).toBeCloseTo(0, 5);
    expect(m.fraction).toBeLessThan(0.001);
    expect(m.name).toBe('new moon');
  });

  it('is new at a total solar eclipse, which is a new moon by definition', () => {
    // 1999-08-11, 11:03 UTC — the eclipse that crossed Europe.
    const m = moonPhase(new Date(Date.UTC(1999, 7, 11, 11, 3)));
    expect(Math.min(m.age, SYNODIC_DAYS - m.age)).toBeLessThan(1);
    expect(m.fraction).toBeLessThan(0.03);
  });

  it('is full half a cycle after new', () => {
    const m = moonPhase(
      new Date(Date.UTC(2000, 0, 6, 18, 14) + (SYNODIC_DAYS / 2) * 86_400_000),
    );
    expect(m.fraction).toBeGreaterThan(0.999);
    expect(m.name).toBe('full moon');
  });

  it('waxes to full and wanes after it, lighting the fraction symmetrically', () => {
    const at = (days: number) =>
      moonPhase(new Date(Date.UTC(2000, 0, 6, 18, 14) + days * 86_400_000));
    expect(at(5).waxing).toBe(true);
    expect(at(20).waxing).toBe(false);
    // The same distance either side of full shows the same lit fraction.
    expect(at(10).fraction).toBeCloseTo(at(SYNODIC_DAYS - 10).fraction, 7);
    // Quarter moons are half lit.
    expect(at(SYNODIC_DAYS / 4).fraction).toBeCloseTo(0.5, 2);
    expect(at((3 * SYNODIC_DAYS) / 4).fraction).toBeCloseTo(0.5, 2);
  });

  it('repeats every synodic month and never leaves its bounds', () => {
    const base = new Date(Date.UTC(2026, 7, 25));
    const a = moonPhase(base);
    const b = moonPhase(new Date(base.getTime() + SYNODIC_DAYS * 86_400_000));
    expect(a.age).toBeCloseTo(b.age, 6);
    for (let d = 0; d < 60; d += 1) {
      const m = moonPhase(new Date(Date.UTC(2026, 0, 1) + d * 86_400_000));
      expect(m.age).toBeGreaterThanOrEqual(0);
      expect(m.age).toBeLessThan(SYNODIC_DAYS);
      expect(m.fraction).toBeGreaterThanOrEqual(0);
      expect(m.fraction).toBeLessThanOrEqual(1);
    }
  });

  it('handles dates before its epoch', () => {
    const m = moonPhase(new Date(Date.UTC(1969, 6, 20)));
    expect(m.age).toBeGreaterThanOrEqual(0);
    expect(m.age).toBeLessThan(SYNODIC_DAYS);
  });
});
