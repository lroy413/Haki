import { describe, expect, it } from 'vitest';
import { MIN_GAP_MS, nextGapMs, weatherFor, type Weather } from '../ambient';
import type { HardeningLevel } from '../hardening';

const HARDENED: HardeningLevel[] = [1, 2, 3];
const at = (level: HardeningLevel) => weatherFor(level) as Weather;

describe('weatherFor', () => {
  it('is silent on an unhardened day', () => {
    // The owner's rule: it starts once hardened. An app that flickers before
    // you have done anything is performing at you.
    expect(weatherFor(0)).toBeNull();
  });

  it('has weather at every level above that', () => {
    for (const level of HARDENED) expect(weatherFor(level)).not.toBeNull();
  });

  it('comes more often the further into the day it is', () => {
    const gaps = HARDENED.map((l) => at(l).everyMs);
    expect(gaps[0]).toBeGreaterThan(gaps[1]);
    expect(gaps[1]).toBeGreaterThan(gaps[2]);
  });

  it('comes harder, too', () => {
    const seen = HARDENED.map((l) => at(l));
    expect(seen[0].opacity).toBeLessThan(seen[1].opacity);
    expect(seen[1].opacity).toBeLessThan(seen[2].opacity);
    expect(seen[0].width).toBeLessThan(seen[1].width);
    expect(seen[1].width).toBeLessThan(seen[2].width);
  });

  it('never asks to flash', () => {
    // The one limit that is not negotiable. A level that wanted to be exciting
    // has to argue with this.
    for (const level of HARDENED) expect(at(level).everyMs).toBeGreaterThanOrEqual(MIN_GAP_MS);
  });

  it('stays decoration: nothing here is a count of anything', () => {
    for (const level of HARDENED) {
      const weather = at(level);
      expect(weather.opacity).toBeGreaterThan(0);
      expect(weather.opacity).toBeLessThan(0.5);
    }
  });
});

describe('nextGapMs', () => {
  it('spans from the floor to the floor plus the jitter', () => {
    const weather = at(3);
    expect(nextGapMs(weather, 0)).toBe(weather.everyMs);
    expect(nextGapMs(weather, 1)).toBe(weather.everyMs + weather.jitterMs);
  });

  it('grows with the roll', () => {
    const weather = at(2);
    expect(nextGapMs(weather, 0.25)).toBeLessThan(nextGapMs(weather, 0.75));
  });

  it('never returns a gap under the floor, whatever it is handed', () => {
    for (const level of HARDENED) {
      for (const roll of [-5, -0.1, 0, 0.5, 1, 4, Number.NaN, Number.POSITIVE_INFINITY]) {
        expect(nextGapMs(at(level), roll)).toBeGreaterThanOrEqual(MIN_GAP_MS);
      }
    }
  });

  it('treats a broken roll as no jitter rather than as an error', () => {
    const weather = at(1);
    expect(nextGapMs(weather, Number.NaN)).toBe(weather.everyMs);
  });
});
