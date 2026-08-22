import { describe, expect, it } from 'vitest';
import {
  assessCascade,
  consecutiveBadNights,
  DEFAULT_KEYSTONE,
  type KeystoneConfig,
  type SleepNight,
} from '../cascade';

const config: KeystoneConfig = {
  targetHours: 7.5,
  thresholdHours: 6,
  escalateAfterNights: 2,
  downstreamNames: ['Training'],
};

const night = (day: string, hours: number): SleepNight => ({ day, hours });

describe('consecutiveBadNights', () => {
  it('is zero when the most recent night was good', () => {
    const nights = [night('2026-08-22', 8), night('2026-08-21', 4)];
    expect(consecutiveBadNights(nights, 6, '2026-08-22')).toBe(0);
  });

  it('counts an unbroken run backwards from the given morning', () => {
    const nights = [
      night('2026-08-22', 5),
      night('2026-08-21', 4.5),
      night('2026-08-20', 5.5),
      night('2026-08-19', 8),
    ];
    expect(consecutiveBadNights(nights, 6, '2026-08-22')).toBe(3);
  });

  it('stops at a gap rather than counting across it', () => {
    // 08-21 was never logged. Two bad nights either side of an unlogged night
    // are not a two-night run — we do not know what happened in between.
    const nights = [night('2026-08-22', 5), night('2026-08-20', 4)];
    expect(consecutiveBadNights(nights, 6, '2026-08-22')).toBe(1);
  });

  it('treats exactly the threshold as a good night', () => {
    expect(consecutiveBadNights([night('2026-08-22', 6)], 6, '2026-08-22')).toBe(0);
  });

  it('is zero when the morning itself has no record', () => {
    expect(consecutiveBadNights([night('2026-08-21', 3)], 6, '2026-08-22')).toBe(0);
  });

  it('ignores non-finite hours instead of counting them as bad', () => {
    const nights = [night('2026-08-22', Number.NaN), night('2026-08-21', 4)];
    expect(consecutiveBadNights(nights, 6, '2026-08-22')).toBe(0);
  });

  it('crosses a month boundary', () => {
    const nights = [night('2026-09-01', 5), night('2026-08-31', 5), night('2026-08-30', 9)];
    expect(consecutiveBadNights(nights, 6, '2026-09-01')).toBe(2);
  });

  it('uses the last write when a day is recorded twice', () => {
    const nights = [night('2026-08-22', 4), night('2026-08-22', 8)];
    expect(consecutiveBadNights(nights, 6, '2026-08-22')).toBe(0);
  });
});

describe('assessCascade', () => {
  it('reports no data when this morning has no sleep logged', () => {
    const verdict = assessCascade([night('2026-08-21', 4)], config, '2026-08-22');
    expect(verdict.hasData).toBe(false);
    expect(verdict.level).toBe('clear');
    expect(verdict.message).toBeNull();
  });

  it('is clear after a good night', () => {
    const verdict = assessCascade([night('2026-08-22', 8)], config, '2026-08-22');
    expect(verdict.level).toBe('clear');
    expect(verdict.hasData).toBe(true);
    expect(verdict.message).toBeNull();
  });

  it('watches after one bad night and says when it escalates', () => {
    const verdict = assessCascade([night('2026-08-22', 5)], config, '2026-08-22');
    expect(verdict.level).toBe('watch');
    expect(verdict.consecutiveBadNights).toBe(1);
    expect(verdict.message).toContain('tomorrow');
  });

  it('breaches on the second consecutive bad night and names what is at risk', () => {
    const nights = [night('2026-08-22', 5), night('2026-08-21', 4)];
    const verdict = assessCascade(nights, config, '2026-08-22');
    expect(verdict.level).toBe('breach');
    expect(verdict.consecutiveBadNights).toBe(2);
    expect(verdict.message).toContain('Training');
    expect(verdict.message).toContain('cheap day');
  });

  it('reproduces the week this app was built for', () => {
    // Sleep went first, training followed. The breach fires on the morning of
    // the 17th — before a single session was missed, not after seven.
    const nights = [night('2026-08-16', 5), night('2026-08-17', 4.5)];
    const verdict = assessCascade(nights, config, '2026-08-17');
    expect(verdict.level).toBe('breach');
  });

  it('never scolds', () => {
    const nights = [night('2026-08-22', 3), night('2026-08-21', 3), night('2026-08-20', 3)];
    const message = assessCascade(nights, config, '2026-08-22').message ?? '';
    for (const word of ['should', 'failed', 'fail', 'lazy', 'bad job', "didn't"]) {
      expect(message.toLowerCase()).not.toContain(word);
    }
  });

  it('falls back to generic wording with no downstream habits named', () => {
    const bare = { ...config, downstreamNames: [] };
    const nights = [night('2026-08-22', 5), night('2026-08-21', 5)];
    expect(assessCascade(nights, bare, '2026-08-22').message).toContain('the rest of the week');
  });

  it('lists several downstream habits readably', () => {
    const many = { ...config, downstreamNames: ['Training', 'Reading', 'Cooking'] };
    const nights = [night('2026-08-22', 5), night('2026-08-21', 5)];
    expect(assessCascade(nights, many, '2026-08-22').message).toContain(
      'Training, Reading and Cooking',
    );
  });

  it('honours a stricter escalation setting', () => {
    const strict = { ...config, escalateAfterNights: 1 };
    const verdict = assessCascade([night('2026-08-22', 5)], strict, '2026-08-22');
    expect(verdict.level).toBe('breach');
  });

  it('ships a sane default keystone', () => {
    expect(DEFAULT_KEYSTONE.thresholdHours).toBeLessThan(DEFAULT_KEYSTONE.targetHours);
    expect(DEFAULT_KEYSTONE.escalateAfterNights).toBeGreaterThan(0);
  });
});
