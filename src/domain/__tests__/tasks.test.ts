import { describe, expect, it } from 'vitest';
import {
  backlog,
  DEFAULT_CAPACITY_MINUTES,
  formatMinutes,
  isDone,
  loadMessage,
  nextStrike,
  stale,
  todaysLoad,
  type Task,
} from '../tasks';

const TODAY = '2026-08-22';

let seq = 0;
const task = (over: Partial<Task> = {}): Task => ({
  id: ++seq,
  title: 'Something',
  minutes: 30,
  committedFor: null,
  doneAt: null,
  createdAt: 1000 + seq,
  ...over,
});

describe('backlog', () => {
  it('holds only uncommitted, unfinished tasks', () => {
    const tasks = [
      task({ title: 'waiting' }),
      task({ title: 'today', committedFor: TODAY }),
      task({ title: 'finished', doneAt: 1 }),
    ];
    expect(backlog(tasks).map((t) => t.title)).toEqual(['waiting']);
  });

  it('is oldest first, so nothing gets buried by newer capture', () => {
    const older = task({ title: 'older', createdAt: 100 });
    const newer = task({ title: 'newer', createdAt: 900 });
    expect(backlog([newer, older]).map((t) => t.title)).toEqual(['older', 'newer']);
  });

  it('is empty when everything is committed or done', () => {
    expect(backlog([task({ committedFor: TODAY }), task({ doneAt: 5 })])).toEqual([]);
  });
});

describe('stale', () => {
  const dayMs = 24 * 60 * 60 * 1000;
  const madeDaysAgo = (n: number) => new Date('2026-08-22T12:00:00').getTime() - n * dayMs;

  it('flags backlog items past the threshold', () => {
    const old = task({ title: 'old', createdAt: madeDaysAgo(20) });
    const fresh = task({ title: 'fresh', createdAt: madeDaysAgo(2) });
    expect(stale([old, fresh], TODAY).map((t) => t.title)).toEqual(['old']);
  });

  it('never flags something already committed to a day', () => {
    const old = task({ createdAt: madeDaysAgo(40), committedFor: TODAY });
    expect(stale([old], TODAY)).toEqual([]);
  });

  it('never flags something already done', () => {
    expect(stale([task({ createdAt: madeDaysAgo(40), doneAt: 1 })], TODAY)).toEqual([]);
  });

  it('does not delete anything — it only reports', () => {
    const tasks = [task({ createdAt: madeDaysAgo(90) })];
    stale(tasks, TODAY);
    expect(tasks).toHaveLength(1);
  });
});

describe('todaysLoad', () => {
  it('is empty when nothing is pulled in', () => {
    const load = todaysLoad([task()], TODAY);
    expect(load.read).toBe('empty');
    expect(load.open).toEqual([]);
    expect(load.openMinutes).toBe(0);
  });

  it('counts only today, not other days', () => {
    const tasks = [
      task({ committedFor: TODAY, minutes: 30 }),
      task({ committedFor: '2026-08-21', minutes: 90 }),
    ];
    expect(todaysLoad(tasks, TODAY).openMinutes).toBe(30);
  });

  it('separates what is left from what is finished', () => {
    const tasks = [
      task({ committedFor: TODAY, minutes: 30 }),
      task({ committedFor: TODAY, minutes: 45, doneAt: 5 }),
    ];
    const load = todaysLoad(tasks, TODAY);
    expect(load.openMinutes).toBe(30);
    expect(load.doneMinutes).toBe(45);
    expect(load.doneToday).toHaveLength(1);
  });

  it('reads light on a small day', () => {
    const load = todaysLoad([task({ committedFor: TODAY, minutes: 30 })], TODAY, 180);
    expect(load.read).toBe('light');
    expect(load.overBy).toBe(0);
  });

  it('reads full near capacity', () => {
    const load = todaysLoad([task({ committedFor: TODAY, minutes: 150 })], TODAY, 180);
    expect(load.read).toBe('full');
  });

  it('reads over past capacity, and says by how much', () => {
    const load = todaysLoad([task({ committedFor: TODAY, minutes: 240 })], TODAY, 180);
    expect(load.read).toBe('over');
    expect(load.overBy).toBe(60);
  });

  it('counts finished work against the day too — the time was still spent', () => {
    const tasks = [
      task({ committedFor: TODAY, minutes: 120, doneAt: 1 }),
      task({ committedFor: TODAY, minutes: 120 }),
    ];
    expect(todaysLoad(tasks, TODAY, 180).read).toBe('over');
  });

  it('falls back to a sane capacity if given a nonsensical one', () => {
    const load = todaysLoad([task({ committedFor: TODAY })], TODAY, 0);
    expect(load.capacityMinutes).toBe(DEFAULT_CAPACITY_MINUTES);
  });

  it('survives a task with a broken estimate rather than producing NaN', () => {
    const tasks = [task({ committedFor: TODAY, minutes: Number.NaN })];
    expect(todaysLoad(tasks, TODAY).openMinutes).toBe(0);
  });
});

describe('nextStrike', () => {
  it('is the oldest open task on today', () => {
    const tasks = [
      task({ title: 'second', committedFor: TODAY, createdAt: 900 }),
      task({ title: 'first', committedFor: TODAY, createdAt: 100 }),
    ];
    expect(nextStrike(todaysLoad(tasks, TODAY))?.title).toBe('first');
  });

  it('skips what is already finished', () => {
    const tasks = [
      task({ title: 'done', committedFor: TODAY, createdAt: 100, doneAt: 5 }),
      task({ title: 'open', committedFor: TODAY, createdAt: 200 }),
    ];
    expect(nextStrike(todaysLoad(tasks, TODAY))?.title).toBe('open');
  });

  it('is null when today is clear', () => {
    expect(nextStrike(todaysLoad([], TODAY))).toBeNull();
  });

  it('does not pick from the backlog — today is an explicit choice', () => {
    expect(nextStrike(todaysLoad([task({ title: 'someday' })], TODAY))).toBeNull();
  });
});

describe('formatMinutes', () => {
  it('reads naturally at every scale', () => {
    expect(formatMinutes(0)).toBe('0m');
    expect(formatMinutes(45)).toBe('45m');
    expect(formatMinutes(60)).toBe('1h');
    expect(formatMinutes(90)).toBe('1h 30m');
    expect(formatMinutes(240)).toBe('4h');
  });

  it('never renders a negative', () => {
    expect(formatMinutes(-30)).toBe('0m');
  });
});

describe('loadMessage', () => {
  const at = (minutes: number, capacity = 180) =>
    loadMessage(todaysLoad([task({ committedFor: TODAY, minutes })], TODAY, capacity));

  it('says nothing at all about a light day', () => {
    // A quiet day is not an achievement to praise or a gap to fill.
    expect(at(30)).toBeNull();
  });

  it('names an empty day plainly', () => {
    expect(loadMessage(todaysLoad([], TODAY))).toContain('Nothing pulled in');
  });

  it('states the overage and frames moving it as a decision', () => {
    const message = at(300) ?? '';
    expect(message).toContain('2h');
    expect(message).toContain('decision');
  });

  it('never shames, at any load', () => {
    for (const minutes of [0, 30, 150, 300, 900]) {
      const message = (at(minutes) ?? '').toLowerCase();
      for (const word in { failed: 1, should: 1, lazy: 1, behind: 1, finally: 1 }) {
        expect(message).not.toContain(word);
      }
    }
  });
});

describe('isDone', () => {
  it('keys off the timestamp, not a flag that can drift', () => {
    expect(isDone(task({ doneAt: 1 }))).toBe(true);
    expect(isDone(task({ doneAt: null }))).toBe(false);
  });
});
