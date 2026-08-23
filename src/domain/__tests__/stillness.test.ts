import { describe, expect, it } from 'vitest';
import {
  BREATH,
  BREATH_CYCLE_MS,
  SITS,
  SIT_ORDER,
  abandonMessage,
  completionMessage,
  durationMs,
  endsAt,
  isRipe,
  isRunning,
  minutesToday,
  remainingMs,
  runningSession,
  type SitDepth,
  type SitSession,
} from '../stillness';
import type { DayKey } from '../date';

const DAY = '2026-08-23' as DayKey;
const T0 = 1_700_000_000_000;

const sit = (over: Partial<SitSession> = {}): SitSession => ({
  depth: 'presence',
  day: DAY,
  startedAt: T0,
  endedAt: null,
  completed: false,
  ...over,
});

describe('the three depths', () => {
  it('offers exactly five, ten and fifteen minutes', () => {
    expect(SIT_ORDER.map((d) => SITS[d].minutes)).toEqual([5, 10, 15]);
  });

  it('gets longer down the list, so the order is never a surprise', () => {
    const minutes = SIT_ORDER.map((d) => SITS[d].minutes);
    expect([...minutes].sort((a, b) => a - b)).toEqual(minutes);
  });

  it('labels every depth in both scripts', () => {
    for (const depth of SIT_ORDER) {
      expect(SITS[depth].kanji.length).toBeGreaterThan(0);
      expect(SITS[depth].label.length).toBeGreaterThan(0);
      expect(SITS[depth].blurb.length).toBeGreaterThan(0);
    }
  });

  it('charges nothing for any of them', () => {
    // The Gears carry a `cost` field precisely because they have costs.
    // Nothing in stillness does, and nothing here should grow one quietly.
    for (const depth of SIT_ORDER) {
      expect(SITS[depth]).not.toHaveProperty('cost');
    }
  });
});

describe('the breath', () => {
  it('breathes out for longer than it breathes in', () => {
    expect(BREATH.outMs).toBeGreaterThan(BREATH.inMs);
  });

  it('adds up to the cycle it claims', () => {
    expect(BREATH_CYCLE_MS).toBe(BREATH.inMs + BREATH.holdMs + BREATH.outMs);
  });
});

describe('time, taken from the clock', () => {
  it('ends a sit its full length after it started', () => {
    expect(endsAt(sit({ depth: 'intent' }))).toBe(T0 + durationMs('intent'));
  });

  it('floors what is left at zero rather than going negative', () => {
    expect(remainingMs(sit(), T0 + 60 * 60_000)).toBe(0);
  });

  it('is running until its time is up', () => {
    const s = sit();
    expect(isRunning(s, T0 + 60_000)).toBe(true);
    expect(isRunning(s, T0 + durationMs('presence'))).toBe(false);
  });

  it('is ripe once the time is up but nothing has closed it', () => {
    const s = sit();
    expect(isRipe(s, T0 + 60_000)).toBe(false);
    expect(isRipe(s, T0 + durationMs('presence'))).toBe(true);
  });

  it('is neither running nor ripe once it has been closed', () => {
    const s = sit({ endedAt: T0 + 60_000 });
    expect(isRunning(s, T0 + 90_000)).toBe(false);
    expect(isRipe(s, T0 + 10 * 60_000)).toBe(false);
  });

  it('finds the one still running out of a day of them', () => {
    const done = sit({ endedAt: T0 + 5 * 60_000, completed: true });
    const live = sit({ depth: 'ahead', startedAt: T0 + 60 * 60_000 });
    expect(runningSession([done, live], T0 + 61 * 60_000)).toBe(live);
    expect(runningSession([done], T0 + 61 * 60_000)).toBeNull();
  });
});

describe('minutesToday', () => {
  it('is nothing before anything has been sat', () => {
    expect(minutesToday([], T0)).toBe(0);
  });

  it('counts a closed sit by what it actually ran, not what it promised', () => {
    // Fifteen minutes started, two minutes sat.
    const short = sit({ depth: 'ahead', endedAt: T0 + 2 * 60_000 });
    expect(minutesToday([short], T0 + 60 * 60_000)).toBe(2);
  });

  it('counts a running sit as far as it has got', () => {
    expect(minutesToday([sit({ depth: 'intent' })], T0 + 3 * 60_000)).toBe(3);
  });

  it('never counts a running sit past its own end', () => {
    // The phone was in a pocket for an hour; the sit was still five minutes.
    expect(minutesToday([sit()], T0 + 60 * 60_000)).toBe(5);
  });

  it('adds several sits together, because there is no daily maximum', () => {
    const first = sit({ endedAt: T0 + 5 * 60_000, completed: true });
    const second = sit({
      depth: 'intent',
      startedAt: T0 + 60 * 60_000,
      endedAt: T0 + 70 * 60_000,
      completed: true,
    });
    expect(minutesToday([first, second], T0 + 80 * 60_000)).toBe(15);
  });
});

describe('what it says', () => {
  const SHAMING = ['failed', 'should', 'lazy', 'behind', 'finally', 'only'];

  it('names the length and stops when a sit runs out', () => {
    expect(completionMessage('presence')).toContain('Five');
    expect(completionMessage('intent')).toContain('Ten');
    expect(completionMessage('ahead')).toContain('Fifteen');
  });

  it('keeps the minutes when a sit is ended early', () => {
    expect(abandonMessage(3)).toContain('3 minutes');
    expect(abandonMessage(1)).toContain('1 minute');
    expect(abandonMessage(1)).not.toContain('1 minutes');
  });

  it('owes nothing for getting up at zero', () => {
    expect(abandonMessage(0).toLowerCase()).toContain('nothing owed');
    expect(abandonMessage(-4).toLowerCase()).toContain('nothing owed');
  });

  it('never shames, and never congratulates', () => {
    const all = [
      ...(SIT_ORDER as SitDepth[]).map(completionMessage),
      ...[0, 1, 3, 14].map(abandonMessage),
    ];
    for (const message of all) {
      const lower = message.toLowerCase();
      for (const word of SHAMING) expect(lower).not.toContain(word);
      // Praise for sitting in a chair is its own kind of pressure.
      for (const word of ['well done', 'great', 'nice work', 'proud']) {
        expect(lower).not.toContain(word);
      }
    }
  });
});
