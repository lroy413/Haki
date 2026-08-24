import { describe, expect, it } from 'vitest';
import {
  BREATHS,
  BREATH_ORDER,
  breathCompletionMessage,
  isBreathKey,
  type BreathKey,
} from '../breath';
import { durationMs } from '../stillness';
import { SAT_COUNTS_FROM } from '../observation';

describe('the patterns', () => {
  it('covers every pattern in order, once', () => {
    expect([...BREATH_ORDER].sort()).toEqual(Object.keys(BREATHS).sort());
    expect(new Set(BREATH_ORDER).size).toBe(BREATH_ORDER.length);
  });

  it('keeps every pattern at two minutes', () => {
    // The whole design: light enough to be a shame-free exit, deliberately
    // under the sitting threshold so it never claims a practice day.
    for (const key of BREATH_ORDER) {
      expect(BREATHS[key].minutes, key).toBe(2);
    }
  });

  it('stays under the day-sat threshold', () => {
    for (const key of BREATH_ORDER) {
      expect(BREATHS[key].minutes, key).toBeLessThan(SAT_COUNTS_FROM);
    }
  });

  it('carries the cadences it advertises', () => {
    expect(BREATHS.settle.phases).toMatchObject({ inMs: 4000, outMs: 6000 });
    expect(BREATHS.box.phases).toEqual({
      inMs: 4000,
      holdInMs: 4000,
      outMs: 4000,
      holdOutMs: 4000,
    });
    expect(BREATHS.winddown.phases).toMatchObject({
      inMs: 4000,
      holdInMs: 7000,
      outMs: 8000,
    });
  });

  it('exhales at least as long as it inhales, in every pattern', () => {
    // The one uncontroversial piece of breathing advice, held as a floor so
    // a future pattern cannot quietly invert it.
    for (const key of BREATH_ORDER) {
      const p = BREATHS[key].phases;
      expect(p.outMs, key).toBeGreaterThanOrEqual(p.inMs);
    }
  });

  it('runs through the shared session clock', () => {
    for (const key of BREATH_ORDER) {
      expect(durationMs(key)).toBe(2 * 60_000);
    }
    // And the sits still read their own lengths through the same door.
    expect(durationMs('presence')).toBe(5 * 60_000);
  });

  it('recognises its own keys and nothing else', () => {
    for (const key of BREATH_ORDER) expect(isBreathKey(key)).toBe(true);
    expect(isBreathKey('presence')).toBe(false);
    expect(isBreathKey('')).toBe(false);
  });
});

describe('what it says at the end', () => {
  const keys = Object.keys(BREATHS) as BreathKey[];

  it('states the time and stops', () => {
    for (const key of keys) {
      expect(breathCompletionMessage(key)).toContain('Two minutes');
    }
  });

  it('never congratulates and never advises', () => {
    for (const key of keys) {
      const line = breathCompletionMessage(key).toLowerCase();
      for (const word of [
        'well done',
        'great',
        'good job',
        'you should',
        'try to',
        'finally',
      ]) {
        expect(line, `${key}: "${word}"`).not.toContain(word);
      }
    }
  });
});
