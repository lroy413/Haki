import { describe, expect, it } from 'vitest';
import {
  DEFAULT_TRAINING,
  gapClosedBy,
  lastSessionDay,
  returnMessage,
  sessionsThisWeek,
  startOfWeek,
  trainingStatus,
  type Session,
  type TrainingConfig,
} from '../training';

const config: TrainingConfig = { weeklyTarget: 4, gapDaysForReturn: 3 };

const session = (day: string, kind = 'Push'): Session => ({
  day,
  kind,
  minutes: null,
  intensity: null,
  note: null,
});

describe('startOfWeek', () => {
  it('returns the same day for a Monday', () => {
    // 2026-08-17 is a Monday.
    expect(startOfWeek('2026-08-17')).toBe('2026-08-17');
  });

  it('walks back to Monday from midweek', () => {
    expect(startOfWeek('2026-08-20')).toBe('2026-08-17');
  });

  it('treats Sunday as the end of the week, not the start', () => {
    // 2026-08-23 is a Sunday; its week began on the 17th.
    expect(startOfWeek('2026-08-23')).toBe('2026-08-17');
  });

  it('crosses a month boundary', () => {
    // 2026-09-02 is a Wednesday; its Monday is in August.
    expect(startOfWeek('2026-09-02')).toBe('2026-08-31');
  });
});

describe('sessionsThisWeek', () => {
  it('counts only from Monday onward', () => {
    const sessions = [
      session('2026-08-16'), // previous week (Sunday)
      session('2026-08-17'),
      session('2026-08-19'),
    ];
    expect(sessionsThisWeek(sessions, '2026-08-20')).toBe(2);
  });

  it('ignores sessions dated after today', () => {
    const sessions = [session('2026-08-19'), session('2026-08-22')];
    expect(sessionsThisWeek(sessions, '2026-08-20')).toBe(1);
  });

  it('is zero with nothing logged', () => {
    expect(sessionsThisWeek([], '2026-08-20')).toBe(0);
  });
});

describe('lastSessionDay', () => {
  it('finds the most recent day regardless of array order', () => {
    const sessions = [session('2026-08-12'), session('2026-08-19'), session('2026-08-15')];
    expect(lastSessionDay(sessions, '2026-08-22')).toBe('2026-08-19');
  });

  it('ignores anything after the cutoff', () => {
    const sessions = [session('2026-08-19'), session('2026-08-25')];
    expect(lastSessionDay(sessions, '2026-08-22')).toBe('2026-08-19');
  });

  it('is null when nothing qualifies', () => {
    expect(lastSessionDay([], '2026-08-22')).toBeNull();
  });
});

describe('gapClosedBy', () => {
  it('is zero for the very first session ever', () => {
    // There was nothing to return from.
    expect(gapClosedBy([], '2026-08-22', config)).toBe(0);
  });

  it('is zero when you trained recently', () => {
    expect(gapClosedBy([session('2026-08-21')], '2026-08-22', config)).toBe(0);
  });

  it('reports the gap once it reaches the Return threshold', () => {
    expect(gapClosedBy([session('2026-08-19')], '2026-08-22', config)).toBe(3);
  });

  it('measures the full week off', () => {
    expect(gapClosedBy([session('2026-08-15')], '2026-08-22', config)).toBe(7);
  });

  it('uses the most recent prior session, not the oldest', () => {
    const sessions = [session('2026-07-01'), session('2026-08-15')];
    expect(gapClosedBy(sessions, '2026-08-22', config)).toBe(7);
  });

  it('ignores sessions on or after the day being logged', () => {
    const sessions = [session('2026-08-15'), session('2026-08-22'), session('2026-08-25')];
    expect(gapClosedBy(sessions, '2026-08-22', config)).toBe(7);
  });
});

describe('returnMessage', () => {
  it('is silent when there is no gap to name', () => {
    expect(returnMessage(0)).toBeNull();
  });

  it('names the gap plainly', () => {
    expect(returnMessage(4)).toContain('4 days');
    expect(returnMessage(9)).toContain('9 days');
  });

  it('never praises the absence or scolds the gap', () => {
    for (const gap of [3, 7, 14, 40]) {
      const message = (returnMessage(gap) ?? '').toLowerCase();
      for (const word of ['finally', 'should', 'failed', 'lazy', 'disappoint', 'excuse']) {
        expect(message).not.toContain(word);
      }
    }
  });
});

describe('trainingStatus', () => {
  it('reports an untouched state before anything is logged', () => {
    const status = trainingStatus([], config, '2026-08-22');
    expect(status.daysSinceLast).toBeNull();
    expect(status.inGap).toBe(false); // nothing to be in a gap from
    expect(status.sessionsThisWeek).toBe(0);
  });

  it('reports zero days since a session logged today', () => {
    const status = trainingStatus([session('2026-08-22')], config, '2026-08-22');
    expect(status.daysSinceLast).toBe(0);
    expect(status.inGap).toBe(false);
  });

  it('flags a gap once the threshold is crossed', () => {
    const status = trainingStatus([session('2026-08-19')], config, '2026-08-22');
    expect(status.daysSinceLast).toBe(3);
    expect(status.inGap).toBe(true);
  });

  it('describes the week this app was built for', () => {
    // Trained through the 15th, then sleep collapsed and the week went.
    const sessions = [session('2026-08-11'), session('2026-08-13'), session('2026-08-15')];
    const status = trainingStatus(sessions, config, '2026-08-22');
    expect(status.daysSinceLast).toBe(7);
    expect(status.inGap).toBe(true);
    expect(status.sessionsThisWeek).toBe(0);
    // What is *not* asserted here any more: that three weeks of work is still
    // on the board. That property moved with Hardness to `armament.test.ts`,
    // where it is measured over every act rather than over workouts.
  });

  it('ships a sane default config', () => {
    expect(DEFAULT_TRAINING.weeklyTarget).toBeGreaterThan(0);
    expect(DEFAULT_TRAINING.gapDaysForReturn).toBeGreaterThan(0);
  });
});
