import { describe, expect, it } from 'vitest';
import {
  KINDS,
  KIND_MARK,
  byKind,
  emptyLine,
  firstTimeLine,
  kindLabel,
  isKind,
  live,
  nameReady,
  namedToday,
  readBack,
  todayLine,
  LET_GO_LABEL,
  LET_GO_NOTE,
  type Hit,
  type Stone,
} from '../seaPrism';
import { spendOf, spendNote, computeReserve, NO_SPEND } from '../willReserve';
import { NO_ACTS, type Acts } from '../hardening';
import type { DayKey } from '../date';

const TODAY = '2026-09-23' as DayKey;

let next = 1;
const stone = (over: Partial<Stone> = {}): Stone => ({
  id: next,
  kind: 'someone',
  name: `stone ${next}`,
  createdAt: next++ * 1000,
  retiredAt: null,
  ...over,
});

const hit = (s: Stone, day: DayKey, at = 1): Hit => ({
  id: at,
  stoneKey: s.createdAt,
  day,
  createdAt: at,
});

const used = (over: Partial<Acts> = {}): Acts => ({ ...NO_ACTS, ...over });

describe('the four kinds', () => {
  it('names and marks every one, in both voices', () => {
    for (const kind of KINDS) {
      expect(kindLabel(kind).length).toBeGreaterThan(0);
      expect(kindLabel(kind, true).length).toBeGreaterThan(0);
      expect(KIND_MARK[kind].length).toBeGreaterThan(0);
    }
  });

  it('refuses a kind it does not know', () => {
    // The database and a backup both hand this strings from outside.
    expect(isKind('someone')).toBe(true);
    expect(isKind('nemesis')).toBe(false);
  });

  it('draws no heading for a kind with nothing under it', () => {
    const list = [stone({ kind: 'someone' }), stone({ kind: 'aloop' })];
    expect(byKind(list).map((g) => g.kind)).toEqual(['someone', 'aloop']);
  });

  it('keeps the kinds in their fixed order however they were named', () => {
    const list = [stone({ kind: 'aloop' }), stone({ kind: 'someone' })];
    expect(byKind(list).map((g) => g.kind)).toEqual(['someone', 'aloop']);
  });
});

describe('naming one, and taking it back', () => {
  it('is a flag for the day, never a count', () => {
    // Two hits on the same stone in one day is one named stone. A second tap
    // would be a severity dial with extra steps — see the header.
    const s = stone();
    const named = namedToday([hit(s, TODAY, 1), hit(s, TODAY, 2)], TODAY);
    expect(named.size).toBe(1);
    expect(named.has(s.createdAt)).toBe(true);
  });

  it('reads only today', () => {
    const s = stone();
    expect(namedToday([hit(s, '2026-09-22' as DayKey)], TODAY).size).toBe(0);
  });

  it('a name is ready as soon as there is one', () => {
    expect(nameReady('')).toBe(false);
    expect(nameReady('   ')).toBe(false);
    expect(nameReady('The Tuesday call')).toBe(true);
  });
});

describe('letting one go', () => {
  it('takes it off the list and keeps every day it had', () => {
    const kept = stone();
    const gone = stone({ retiredAt: 99 });
    expect(live([kept, gone])).toEqual([kept]);

    // The record still names it: `readBack` looks names up in the whole list,
    // retired ones included.
    const days = readBack([hit(gone, '2026-09-20' as DayKey)], [kept, gone]);
    expect(days).toHaveLength(1);
    expect(days[0].named[0].name).toBe(gone.name);
  });

  it('is never called a delete, and says what it does', () => {
    const copy = `${LET_GO_LABEL} ${LET_GO_NOTE}`.toLowerCase();
    expect(copy).not.toContain('delete');
    expect(copy).not.toContain('remove');
    expect(copy).toContain('stay');
  });
});

describe('reading the log back', () => {
  it('lists days newest first and never aggregates', () => {
    const a = stone();
    const b = stone();
    const days = readBack(
      [
        hit(a, '2026-09-20' as DayKey, 1),
        hit(b, '2026-09-22' as DayKey, 2),
        hit(a, '2026-09-22' as DayKey, 3),
      ],
      [a, b],
    );
    expect(days.map((d) => d.day)).toEqual(['2026-09-22', '2026-09-20']);
    expect(days[0].named.map((s) => s.name)).toEqual([b.name, a.name]);
  });

  it('skips a hit whose stone is gone rather than drawing it nameless', () => {
    const s = stone();
    expect(readBack([hit(s, TODAY)], [])).toEqual([]);
  });
});

describe('what it says', () => {
  it('never counts anything but the day in front of you', () => {
    const copy = [
      todayLine(1),
      todayLine(3),
      todayLine(1, true),
      todayLine(3, true),
      emptyLine(),
      emptyLine(true),
      firstTimeLine(),
      firstTimeLine(true),
    ].join(' ');
    // No totals, no runs, no comparison to any other day.
    expect(copy).not.toMatch(/\bthis (week|month|year)\b/i);
    expect(copy).not.toMatch(/\b(total|streak|worst|most|again this)\b/i);
    expect(copy).not.toMatch(/\d+\s*(of|\/)\s*\d+/);
  });

  it('says nothing at all on a day with nothing on it', () => {
    expect(todayLine(0)).toBeNull();
  });

  it('offers somewhere to put it rather than reporting an absence', () => {
    // The day's practice card's rule, and it binds hardest here: "nothing
    // logged" on a screen about what wears you down reads as a scold about not
    // having journalled your own bad day.
    for (const line of [emptyLine(), emptyLine(true)]) {
      expect(line.toLowerCase()).not.toMatch(/\bnone\b|\b0\b/);
      expect(line).toMatch(/here|Tap/);
    }
  });

  it('never blames, advises or scolds', () => {
    const copy = [
      todayLine(2),
      todayLine(2, true),
      emptyLine(),
      emptyLine(true),
      firstTimeLine(),
      firstTimeLine(true),
      LET_GO_NOTE,
    ]
      .join(' ')
      .toLowerCase();
    for (const word of [
      'because',
      'you should',
      'avoid',
      'toxic',
      'bad',
      'failed',
      'lazy',
      'finally',
      'try to',
    ]) {
      expect(copy).not.toContain(word);
    }
  });
});

describe('what it costs the Reserve', () => {
  it('spends, and says so', () => {
    const quiet = spendOf(NO_ACTS, 0);
    const hard = spendOf(NO_ACTS, 2);
    expect(quiet.fraction).toBe(0);
    expect(hard.fraction).toBeGreaterThan(0);
    expect(spendNote(hard)).toContain('2 stones');
    expect(spendNote(hard, true)).toContain('2 drains');
  });

  it('stops adding them up', () => {
    // A day you have named four things on is a day you already know about, and
    // a gauge that kept falling would be the app piling on.
    const three = spendOf(NO_ACTS, 3).fraction;
    expect(spendOf(NO_ACTS, 6).fraction).toBe(three);
    expect(spendOf(NO_ACTS, 40).fraction).toBe(three);
  });

  it('is the term a flat day never had', () => {
    // The case the whole feature exists for: nothing was done, and the reading
    // is still lower than the morning's, because something happened.
    const morning = { energy: 4, mood: 4, clarity: 4, tension: 2 };
    const inputs = { read: morning, recentSleepHours: [8], sleepTargetHours: 8 };
    const idle = computeReserve({ ...inputs, acts: NO_ACTS });
    const hard = computeReserve({ ...inputs, acts: NO_ACTS, drains: 2 });
    expect(idle.value).toBe(idle.started);
    expect(hard.value).toBeLessThan(idle.value ?? 0);
    expect(hard.started).toBe(idle.started);
  });

  it('leaves the Reserve unknown when there is no read, however hard the day', () => {
    // Spend is only half the question and the app will not answer the other
    // half for you.
    const r = computeReserve({
      read: null,
      recentSleepHours: [8],
      sleepTargetHours: 8,
      acts: NO_ACTS,
      drains: 3,
    });
    expect(r.value).toBeNull();
    expect(r.spend.drains).toBe(3);
  });

  it('carries no drains where none were passed', () => {
    expect(NO_SPEND.drains).toBe(0);
    expect(spendOf(used({ struck: 4 })).drains).toBe(0);
  });
});
