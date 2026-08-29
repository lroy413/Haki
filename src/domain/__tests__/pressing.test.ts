import { describe, expect, it } from 'vitest';
import {
  BEARING_DAYS,
  BEARING_SHOWN,
  DUE_CHIPS,
  PRIORITY_LABEL,
  SOON_DAYS,
  daysUntil,
  dueFromChip,
  dueLine,
  heatOf,
  isWarm,
  parseDay,
  planNote,
  portLine,
  pressing,
  pressingFirst,
  pressingLabel,
  moreLine,
} from '../pressing';
import type { Task } from '../tasks';
import type { DayKey } from '../date';

const TODAY = '2026-09-20' as DayKey;

let seq = 0;
const task = (over: Partial<Task> = {}): Task => ({
  id: ++seq,
  title: 'A thing',
  minutes: 15,
  committedFor: null,
  doneAt: null,
  rhythmKey: null,
  islandKey: null,
  watch: null,
  priority: false,
  dueBy: null,
  createdAt: seq,
  ...over,
});

describe('how hard it presses', () => {
  it('counts toward and keeps counting after', () => {
    expect(daysUntil('2026-09-23' as DayKey, TODAY)).toBe(3);
    expect(daysUntil(TODAY, TODAY)).toBe(0);
    expect(daysUntil('2026-09-18' as DayKey, TODAY)).toBe(-2);
    expect(daysUntil(null, TODAY)).toBeNull();
  });

  it('grades the heat', () => {
    expect(heatOf(-1)).toBe('past');
    expect(heatOf(0)).toBe('today');
    expect(heatOf(SOON_DAYS)).toBe('soon');
    expect(heatOf(SOON_DAYS + 1)).toBe('later');
    expect(heatOf(null)).toBe('none');
  });

  it('draws priority warm whatever its date says', () => {
    // The flag is the whole point: a priority task with no date at all still
    // has to be the loud thing on the screen.
    expect(isWarm('none', true)).toBe(true);
    expect(isWarm('later', true)).toBe(true);
    expect(isWarm('later', false)).toBe(false);
    expect(isWarm('none', false)).toBe(false);
  });
});

describe('the date, said', () => {
  it('never stops at zero', () => {
    expect(dueLine('2026-09-20' as DayKey, TODAY)).toBe('Due today');
    expect(dueLine('2026-09-21' as DayKey, TODAY)).toBe('Due tomorrow');
    expect(dueLine('2026-09-19' as DayKey, TODAY)).toBe('1 day past');
    expect(dueLine('2026-09-13' as DayKey, TODAY)).toBe('7 days past');
  });

  it('switches from a count to the date once counting stops helping', () => {
    expect(dueLine('2026-09-25' as DayKey, TODAY)).toBe('Due in 5 days');
    expect(dueLine('2026-10-15' as DayKey, TODAY)).toBe('Due Oct 15');
  });

  it('says nothing when there is no date', () => {
    expect(dueLine(null, TODAY)).toBeNull();
  });

  it('describes the date, never the person', () => {
    const copy = [
      dueLine('2026-09-01' as DayKey, TODAY),
      dueLine(TODAY, TODAY),
      dueLine('2026-10-30' as DayKey, TODAY),
      pressingLabel(1),
      pressingLabel(4),
      pressingLabel(1, true),
      pressingLabel(4, true),
      PRIORITY_LABEL,
    ]
      .join(' ')
      .toLowerCase();
    for (const word of [
      'overdue',
      'late',
      'missed',
      'failed',
      'should',
      'behind',
      'lazy',
      'finally',
      '!',
    ]) {
      expect(copy).not.toContain(word);
    }
  });

  it('never totals how many have gone past', () => {
    const copy = [pressingLabel(6), pressingLabel(6, true)].join(' ');
    expect(copy).not.toMatch(/\d+\s*(of|\/)\s*\d+/);
    expect(copy).not.toContain('%');
  });
});

describe('what gets looked at first', () => {
  it('puts priority above everything, then the nearest date', () => {
    const rows = pressingFirst(
      [
        task({ id: 1, dueBy: '2026-09-30' as DayKey }),
        task({ id: 2 }),
        task({ id: 3, dueBy: '2026-09-21' as DayKey }),
        task({ id: 4, priority: true }),
        task({ id: 5, dueBy: '2026-09-18' as DayKey }),
      ],
      TODAY,
    );
    expect(rows.map((r) => r.id)).toEqual([4, 5, 3, 1, 2]);
  });

  it('keeps an undated priority task at the very top', () => {
    // The regression the packed sort key caused: an undated priority task
    // sorted to the bottom, which is the exact opposite of what the flag is
    // for. Its "no date" must never outweigh its flag.
    const rows = pressingFirst(
      [
        task({ id: 1, dueBy: '2026-09-18' as DayKey }),
        task({ id: 2, priority: true }),
        task({ id: 3, dueBy: TODAY }),
      ],
      TODAY,
    );
    expect(rows[0].id).toBe(2);
  });

  it('leaves an undated list in the order it was written', () => {
    const rows = pressingFirst([task({ id: 1 }), task({ id: 2 }), task({ id: 3 })], TODAY);
    expect(rows.map((r) => r.id)).toEqual([1, 2, 3]);
  });
});

describe('what belongs on the home screen', () => {
  it('catches a task due today that is planned for another day', () => {
    // The case the whole feature exists for. Filtering by committedFor would
    // hide it in tomorrow's list, which is the one place you will not look.
    const rows = pressing(
      [task({ id: 1, dueBy: TODAY, committedFor: '2026-09-25' as DayKey })],
      TODAY,
    );
    expect(rows.map((r) => r.id)).toEqual([1]);
  });

  it('leaves distant dates and ordinary tasks alone', () => {
    const rows = pressing(
      [task({ id: 1, dueBy: '2026-10-20' as DayKey }), task({ id: 2 })],
      TODAY,
    );
    expect(rows).toHaveLength(0);
  });

  it('looks less far ahead than the list does', () => {
    // Two windows on purpose. A card saying three things are bearing down
    // when one of them is Thursday teaches you to ignore the card, which is
    // the only way this feature can really fail.
    expect(BEARING_DAYS).toBeLessThan(SOON_DAYS);
    const thursday = task({ id: 1, dueBy: '2026-09-22' as DayKey });
    expect(pressing([thursday], TODAY)).toHaveLength(0);
    expect(isWarm(heatOf(daysUntil(thursday.dueBy, TODAY)), false)).toBe(true);
  });

  it('counts what it does not draw, rather than hiding it', () => {
    expect(moreLine(7, BEARING_SHOWN)).toContain('4');
    expect(moreLine(3, 3)).toBeNull();
    expect(moreLine(1, 3)).toBeNull();
    for (const plain of [false, true]) {
      const line = (moreLine(9, 3, plain) ?? '').toLowerCase();
      expect(line).not.toContain('overdue');
      expect(line).not.toContain('missed');
      expect(line).not.toContain('!');
    }
  });

  it('never surfaces something already done', () => {
    const rows = pressing([task({ priority: true, dueBy: TODAY, doneAt: 1 })], TODAY);
    expect(rows).toHaveLength(0);
  });

  it('keeps carrying a date that has gone past', () => {
    const rows = pressing([task({ id: 1, dueBy: '2026-09-10' as DayKey })], TODAY);
    expect(rows.map((r) => r.id)).toEqual([1]);
  });
});

describe('when the plan and the date disagree', () => {
  it('says so, and says only that', () => {
    const note = planNote(
      task({ dueBy: '2026-09-22' as DayKey, committedFor: '2026-09-25' as DayKey }),
      TODAY,
    );
    expect(note).toContain('Sep 25');
    expect(note?.toLowerCase()).not.toContain('should');
    expect(note?.toLowerCase()).not.toContain('move');
  });

  it('names today and tomorrow rather than printing their dates', () => {
    // "Planned for Sep 20" on Sep 20 is the schema showing through the app's
    // own voice — the fault shortDay exists to fix, one level up.
    expect(
      planNote(task({ dueBy: '2026-09-19' as DayKey, committedFor: TODAY }), TODAY),
    ).toContain('today');
    expect(
      planNote(
        task({ dueBy: '2026-09-19' as DayKey, committedFor: '2026-09-21' as DayKey }),
        TODAY,
      ),
    ).toContain('tomorrow');
    expect(
      planNote(
        task({ dueBy: '2026-09-19' as DayKey, committedFor: '2026-09-28' as DayKey }),
        TODAY,
      ),
    ).toContain('Sep 28');
  });

  it('is silent when they agree, or when either is missing', () => {
    expect(planNote(task({ dueBy: TODAY, committedFor: TODAY }), TODAY)).toBeNull();
    expect(
      planNote(task({ dueBy: '2026-09-25' as DayKey, committedFor: TODAY }), TODAY),
    ).toBeNull();
    expect(planNote(task({ dueBy: TODAY }), TODAY)).toBeNull();
    expect(planNote(task({ committedFor: TODAY }), TODAY)).toBeNull();
  });
});

describe('setting a date', () => {
  it('reads the forms a person actually types', () => {
    expect(parseDay('2026-09-25', TODAY)).toBe('2026-09-25');
    expect(parseDay('9/25', TODAY)).toBe('2026-09-25');
    expect(parseDay('9-25', TODAY)).toBe('2026-09-25');
    expect(parseDay('sep 25', TODAY)).toBe('2026-09-25');
    expect(parseDay('25 sep', TODAY)).toBe('2026-09-25');
    expect(parseDay('September 25', TODAY)).toBe('2026-09-25');
  });

  it('reads a bare day as the next time it comes round', () => {
    // On the 20th, "25" is this month; "3" is next month, because the
    // alternative is silently setting a date that has already gone.
    expect(parseDay('25', TODAY)).toBe('2026-09-25');
    expect(parseDay('3', TODAY)).toBe('2026-10-03');
    expect(parseDay('20', TODAY)).toBe('2026-09-20');
  });

  it('takes a recently-past date at face value', () => {
    // Recording something that was due last week is ordinary. The first cut
    // rolled any past date forward a year, so "9/19" on the 20th silently
    // became September 2027 — a twelve-month jump on the one field whose
    // whole job is to be right.
    expect(parseDay('9/19', TODAY)).toBe('2026-09-19');
    expect(parseDay('sep 1', TODAY)).toBe('2026-09-01');
  });

  it('rolls a long-past month-day into next year', () => {
    // "jan 5" typed in September means the January that is coming.
    expect(parseDay('jan 5', TODAY)).toBe('2027-01-05');
    expect(parseDay('3/1', TODAY)).toBe('2027-03-01');
  });

  it('refuses rather than guessing', () => {
    // A date the app got wrong is worse than one it refused: you would not
    // check a date the app filled in for you.
    for (const bad of ['', '   ', 'soon', '32', '0', '13/40', 'febtember 3', '9/31']) {
      expect(parseDay(bad, TODAY)).toBeNull();
    }
  });

  it('never lands on a day the month does not have', () => {
    // The Date constructor rolls 31 February over to March without complaint,
    // which would set a date nobody typed.
    expect(parseDay('31', '2026-02-05' as DayKey)).toBe('2026-03-31');
    expect(parseDay('2/30', TODAY)).toBeNull();
  });

  it('offers relative chips that land where they say', () => {
    expect(DUE_CHIPS.map((c) => dueFromChip(c.days, TODAY))).toEqual([
      '2026-09-20',
      '2026-09-21',
      '2026-09-23',
      '2026-09-27',
    ]);
  });
});

describe('a port of call', () => {
  it('speaks the Log Pose’s scale, not the task list’s', () => {
    expect(portLine('2026-10-02' as DayKey, TODAY)).toBe('12 days to port');
    expect(portLine(TODAY, TODAY)).toBe('Port today');
    expect(portLine('2026-09-18' as DayKey, TODAY)).toBe('2 days past port');
  });

  it('gives the date once counting stops helping', () => {
    // A month out, "43 days" is a number you have to convert back.
    expect(portLine('2026-09-30' as DayKey, TODAY)).toBe('10 days to port');
    expect(portLine('2026-12-01' as DayKey, TODAY)).toBe('Port Dec 1');
  });

  it('says nothing for the ordinary island, which is most of them', () => {
    expect(portLine(null, TODAY)).toBeNull();
  });

  it('drops the nautical vocabulary in plain mode', () => {
    expect(portLine('2026-10-02' as DayKey, TODAY, true)).not.toContain('port');
    expect(portLine('2026-09-18' as DayKey, TODAY, true)).not.toContain('port');
    expect(portLine(TODAY, TODAY, true)).not.toContain('Port');
  });

  it('never turns a missed port into a verdict', () => {
    const copy = [
      portLine('2026-01-01' as DayKey, TODAY),
      portLine('2026-01-01' as DayKey, TODAY, true),
    ]
      .join(' ')
      .toLowerCase();
    for (const word of ['overdue', 'late', 'missed', 'failed', 'behind', '!']) {
      expect(copy).not.toContain(word);
    }
  });
});
