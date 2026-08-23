import { describe, expect, it } from 'vitest';
import {
  GEARS,
  GEAR_ORDER,
  THIRD_COOLDOWN_MINUTES,
  abandonMessage,
  availability,
  completionMessage,
  durationMs,
  isRipe,
  isRunning,
  minutesToday,
  remainingMs,
  runningSession,
  type GearName,
  type GearSession,
} from '../gears';

const DAY = '2026-08-23';
const T0 = Date.UTC(2026, 7, 23, 9, 0, 0);
const MINUTE = 60_000;

function session(gear: GearName, over: Partial<GearSession> = {}): GearSession {
  return { gear, day: DAY, startedAt: T0, endedAt: null, completed: false, ...over };
}

/** A session that ran its full length and closed cleanly. */
function finished(gear: GearName, startedAt = T0): GearSession {
  return {
    gear,
    day: DAY,
    startedAt,
    endedAt: startedAt + durationMs(gear),
    completed: true,
  };
}

describe('the gears themselves', () => {
  it('gets longer as it gets more expensive', () => {
    const minutes = GEAR_ORDER.map((g) => GEARS[g].minutes);
    expect(minutes).toEqual([...minutes].sort((a, b) => a - b));
  });

  it('charges nothing for the everyday one', () => {
    expect(GEARS.second.cost).toBeNull();
    expect(GEARS.third.cost).not.toBeNull();
    expect(GEARS.fourth.cost).not.toBeNull();
  });

  it('names every gear in both scripts', () => {
    for (const name of GEAR_ORDER) {
      expect(GEARS[name].kanji.length).toBeGreaterThan(0);
      expect(GEARS[name].label.length).toBeGreaterThan(0);
    }
  });
});

describe('running and remaining', () => {
  it('runs until its time is up', () => {
    const s = session('second');
    expect(isRunning(s, T0)).toBe(true);
    expect(isRunning(s, T0 + 24 * MINUTE)).toBe(true);
    expect(isRunning(s, T0 + 25 * MINUTE)).toBe(false);
  });

  it('is derived from the clock, so closing the app does not lose it', () => {
    // Nothing ticks. The same session read an hour later simply knows.
    const s = session('third');
    expect(remainingMs(s, T0 + 60 * MINUTE)).toBe(30 * MINUTE);
  });

  it('never reports negative time left', () => {
    expect(remainingMs(session('second'), T0 + 900 * MINUTE)).toBe(0);
  });

  it('is ripe once the time is up but nothing has closed it', () => {
    const s = session('second');
    expect(isRipe(s, T0 + 10 * MINUTE)).toBe(false);
    expect(isRipe(s, T0 + 25 * MINUTE)).toBe(true);
    expect(isRipe({ ...s, endedAt: T0 + 5 * MINUTE }, T0 + 25 * MINUTE)).toBe(false);
  });

  it('finds the running one and ignores the closed ones', () => {
    const sessions = [finished('second'), session('third', { startedAt: T0 + 30 * MINUTE })];
    expect(runningSession(sessions, T0 + 40 * MINUTE)?.gear).toBe('third');
    expect(runningSession([finished('second')], T0 + 40 * MINUTE)).toBeNull();
  });
});

describe('availability', () => {
  it('opens every gear on an empty day', () => {
    for (const gear of GEAR_ORDER) {
      expect(availability(gear, [], T0)).toEqual({ ready: true });
    }
  });

  it('closes everything while a gear is running', () => {
    const running = [session('second')];
    for (const gear of GEAR_ORDER) {
      const a = availability(gear, running, T0 + 5 * MINUTE);
      expect(a.ready).toBe(false);
      if (!a.ready) expect(a.reason).toContain('Gear 2');
    }
  });

  it('holds the next gear for half an hour after a finished Gear 3', () => {
    const done = [finished('third')];
    const endedAt = T0 + durationMs('third');

    const during = availability('second', done, endedAt + 10 * MINUTE);
    expect(during.ready).toBe(false);
    if (!during.ready) expect(during.reason).toContain('20 minutes');

    const after = availability('second', done, endedAt + THIRD_COOLDOWN_MINUTES * MINUTE);
    expect(after).toEqual({ ready: true });
  });

  it('ends the day after a finished Gear 4', () => {
    const done = [finished('fourth')];
    const later = T0 + durationMs('fourth') + 300 * MINUTE;
    for (const gear of GEAR_ORDER) {
      const a = availability(gear, done, later);
      expect(a.ready).toBe(false);
    }
  });

  it('charges nothing at all for a gear that was ended early', () => {
    // The whole point: stopping early must never make the next attempt harder,
    // or the app has taught you not to start.
    const bailed: GearSession[] = [
      { gear: 'fourth', day: DAY, startedAt: T0, endedAt: T0 + 3 * MINUTE, completed: false },
      {
        gear: 'third',
        day: DAY,
        startedAt: T0 + 5 * MINUTE,
        endedAt: T0 + 6 * MINUTE,
        completed: false,
      },
    ];
    for (const gear of GEAR_ORDER) {
      expect(availability(gear, bailed, T0 + 10 * MINUTE)).toEqual({ ready: true });
    }
  });

  it('lets an unfinished Gear 3 be followed straight away', () => {
    const bailed = [
      {
        gear: 'third' as const,
        day: DAY,
        startedAt: T0,
        endedAt: T0 + MINUTE,
        completed: false,
      },
    ];
    expect(availability('second', bailed, T0 + 2 * MINUTE)).toEqual({ ready: true });
  });

  it('counts the cooldown from the latest Gear 3, not the first', () => {
    const early = finished('third');
    const lateStart = T0 + 200 * MINUTE;
    const late = finished('third', lateStart);
    const a = availability('second', [early, late], lateStart + durationMs('third') + MINUTE);
    expect(a.ready).toBe(false);
  });
});

describe('minutesToday', () => {
  it('is zero with nothing logged', () => {
    expect(minutesToday([], T0)).toBe(0);
  });

  it('counts a running session only as far as now', () => {
    expect(minutesToday([session('third')], T0 + 20 * MINUTE)).toBe(20);
  });

  it('never counts a running session past its own end', () => {
    expect(minutesToday([session('second')], T0 + 500 * MINUTE)).toBe(25);
  });

  it('counts an abandoned session for what it actually was', () => {
    const bailed = [
      {
        gear: 'fourth' as const,
        day: DAY,
        startedAt: T0,
        endedAt: T0 + 7 * MINUTE,
        completed: false,
      },
    ];
    expect(minutesToday(bailed, T0 + 60 * MINUTE)).toBe(7);
  });

  it('adds sessions together', () => {
    const sessions = [finished('second'), finished('second', T0 + 60 * MINUTE)];
    expect(minutesToday(sessions, T0 + 200 * MINUTE)).toBe(50);
  });
});

describe('the copy', () => {
  it('never scolds and never congratulates the clock', () => {
    const lines = [
      ...GEAR_ORDER.map((g) => completionMessage(g)),
      ...GEAR_ORDER.map((g) => GEARS[g].blurb),
      ...GEAR_ORDER.map((g) => GEARS[g].cost ?? ''),
      abandonMessage(0),
      abandonMessage(1),
      abandonMessage(14),
      ...GEAR_ORDER.flatMap((g) => {
        const a = availability(g, [finished('fourth')], T0 + 500 * MINUTE);
        return a.ready ? [] : [a.reason];
      }),
    ];
    for (const line of lines) {
      const text = line.toLowerCase();
      for (const word of [
        'failed',
        'should',
        'lazy',
        'excuse',
        'wasted',
        'finally',
        'well done',
      ]) {
        expect(text).not.toContain(word);
      }
    }
  });

  it('says nothing is owed when a gear is ended early', () => {
    expect(abandonMessage(0).toLowerCase()).toContain('nothing');
    expect(abandonMessage(9).toLowerCase()).toContain('nothing owed');
  });

  it('makes the singular read like English', () => {
    expect(abandonMessage(1)).toContain('1 minute in gear');
    expect(abandonMessage(2)).toContain('2 minutes in gear');
  });

  it("says out loud that Gear 4's lockout is only the gears", () => {
    expect(completionMessage('fourth')).toContain('rest of the app');
  });
});
