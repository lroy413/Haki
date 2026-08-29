import { describe, expect, it } from 'vitest';
import {
  LINE_AFTER_DAYS,
  MIN_REASON,
  WAIT_LABEL,
  atSea,
  atSeaLabel,
  atSeaLine,
  CARRY_LABEL,
  moveDescription,
  movePrompt,
  needsLine,
  reasonReady,
} from '../atSea';
import type { Task } from '../tasks';
import type { DayKey } from '../date';

const TODAY = '2026-09-20' as DayKey;

const task = (over: Partial<Task> = {}): Task =>
  ({
    id: 1,
    title: 'A thing',
    minutes: 15,
    committedFor: null,
    doneAt: null,
    createdAt: 1,
    rhythmKey: null,
    watch: null,
    ...(over as object),
  }) as Task;

describe('what is still at sea', () => {
  it('finds a task committed to a past day and never done', () => {
    // The bug this exists for: todaysLoad wants today, backlog wants null, so
    // this task appeared in neither and was orphaned in the database.
    const rows = atSea([task({ committedFor: '2026-09-17' as DayKey })], TODAY);
    expect(rows).toHaveLength(1);
    expect(rows[0].days).toBe(3);
    expect(rows[0].from).toBe('2026-09-17');
  });

  it('leaves today, tomorrow and the backlog alone', () => {
    const rows = atSea(
      [
        task({ id: 1, committedFor: TODAY }),
        task({ id: 2, committedFor: '2026-09-25' as DayKey }),
        task({ id: 3, committedFor: null }),
      ],
      TODAY,
    );
    expect(rows).toHaveLength(0);
  });

  it('never surfaces something that was done', () => {
    const rows = atSea([task({ committedFor: '2026-09-10' as DayKey, doneAt: 123 })], TODAY);
    expect(rows).toHaveLength(0);
  });

  it('puts the longest-waiting first, because that is what avoidance is about', () => {
    const rows = atSea(
      [
        task({ id: 1, committedFor: '2026-09-19' as DayKey }),
        task({ id: 2, committedFor: '2026-09-01' as DayKey }),
        task({ id: 3, committedFor: '2026-09-15' as DayKey }),
      ],
      TODAY,
    );
    expect(rows.map((r) => r.task.id)).toEqual([2, 3, 1]);
  });

  it('reads an empty list without inventing anything', () => {
    expect(atSea([], TODAY)).toEqual([]);
  });
});

describe('what it says', () => {
  it('states the days and stops', () => {
    expect(atSeaLine(1)).toBe('1 day at sea');
    expect(atSeaLine(6)).toBe('6 days at sea');
    for (const word of ['still', 'already', 'overdue', 'late', '!']) {
      expect(atSeaLine(9).toLowerCase()).not.toContain(word);
    }
  });

  it('never scores or totals the carrying', () => {
    const copy = [atSeaLine(12), atSeaLabel(4), movePrompt(true), movePrompt(false)].join(' ');
    expect(copy).not.toMatch(/\d+\s*(of|\/)\s*\d+/);
    expect(copy).not.toContain('%');
  });

  it('never shames, in either mode', () => {
    const copy = [
      atSeaLine(30),
      atSeaLine(30, true),
      atSeaLabel(3),
      atSeaLabel(3, true),
      movePrompt(true),
      movePrompt(true, true),
      movePrompt(false),
      movePrompt(false, true),
    ]
      .join(' ')
      .toLowerCase();
    for (const word of [
      'failed',
      'should',
      'lazy',
      'finally',
      'missed',
      'behind',
      'procrast',
    ]) {
      expect(copy).not.toContain(word);
    }
  });

  it('asks the same question either way, because the app cannot tell which is wise', () => {
    expect(movePrompt(true)).toContain('?');
    expect(movePrompt(false)).toContain('?');
  });

  it('drops the nautical vocabulary in plain mode', () => {
    expect(atSeaLine(3, true)).not.toContain('sea');
    expect(atSeaLabel(3, true)).not.toContain('sea');
  });
});

describe('the line you have to write', () => {
  it('takes a word but not an empty gesture', () => {
    expect(reasonReady('')).toBe(false);
    expect(reasonReady('   ')).toBe(false);
    expect(reasonReady('ill')).toBe(true);
    expect('ok'.length).toBeGreaterThanOrEqual(MIN_REASON);
  });
});

describe('the asymmetry', () => {
  it('never charges anything for doing the thing', () => {
    // There is deliberately no `needsLine` case for a strike. Striking is the
    // one act this feature must never make more expensive, and the way that
    // is guaranteed is that the function cannot be asked about it: its second
    // argument is a destination, and a struck task has none.
    expect(needsLine(99, 'today')).toBe(true);
    expect(needsLine(99, null)).toBe(true);
  });

  it('lets the first carry through on one tap', () => {
    expect(needsLine(1, 'today')).toBe(false);
  });

  it('asks for a line once it has been carried a while', () => {
    expect(needsLine(LINE_AFTER_DAYS, 'today')).toBe(true);
    expect(needsLine(LINE_AFTER_DAYS + 4, 'today')).toBe(true);
  });

  it('always asks before it leaves the day for good', () => {
    // Taking it off the day entirely is the decision, so it costs a line on
    // day one as much as on day ten — the Log Pose's "sailed past", one size
    // down.
    expect(needsLine(1, null)).toBe(true);
  });
});

describe('where it goes', () => {
  it('names the real destination rather than implying a delete', () => {
    expect(WAIT_LABEL.toLowerCase()).toContain('waiting');
    for (const word of ['delete', 'drop', 'remove', 'discard']) {
      expect(WAIT_LABEL.toLowerCase()).not.toContain(word);
    }
  });

  it('does not borrow the capture form\u2019s name for a different act', () => {
    // "Carry today" is the capture button, and it commits a new task. This
    // one brings an old one back in. Same screen, so they cannot share.
    expect(CARRY_LABEL).not.toBe('Carry today');
  });

  it('says both moves without shaming', () => {
    const copy = [CARRY_LABEL, WAIT_LABEL].join(' ').toLowerCase();
    for (const word of ['failed', 'should', 'lazy', 'finally', 'missed', 'behind']) {
      expect(copy).not.toContain(word);
    }
  });

  it('tells a screen reader which move it is, since the words are bare', () => {
    const today = moveDescription('Call the dentist', 'today');
    const wait = moveDescription('Call the dentist', null);
    expect(today).toContain('Call the dentist');
    expect(wait).toContain('Call the dentist');
    expect(today).not.toBe(wait);
  });
});
