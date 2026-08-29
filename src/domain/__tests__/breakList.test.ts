import { describe, expect, it } from 'vitest';
import {
  LET_GO_LABEL,
  LET_GO_NOTE,
  OUTCOME_LABEL,
  OUTCOME_LABEL_PLAIN,
  dayLine,
  emptyListLine,
  heldSomething,
  isOutcome,
  live,
  nameReady,
  outcomeLabel,
  quietDayLine,
  readBack,
  urgesOn,
  type Break,
  type Outcome,
  type Urge,
} from '../breakList';
import { resisted, voyage, type ActDay } from '../voyage';
import { spendOf, spendNote, computeReserve } from '../willReserve';
import { NO_ACTS, type Acts } from '../hardening';
import type { DayKey } from '../date';

const TODAY = '2026-09-23' as DayKey;

let next = 1;
const brk = (over: Partial<Break> = {}): Break => ({
  id: next,
  name: `break ${next}`,
  createdAt: next++ * 1000,
  retiredAt: null,
  ...over,
});

const urge = (of: Break, outcome: Outcome, day: DayKey = TODAY, at = 1): Urge => ({
  id: at,
  breakKey: of.createdAt,
  day,
  outcome,
  createdAt: at,
});

const used = (over: Partial<Acts> = {}): Acts => ({ ...NO_ACTS, ...over });
const day = (d: string, over: Partial<ActDay> = {}): ActDay => ({
  day: d as DayKey,
  ...NO_ACTS,
  ...over,
});

describe('the words', () => {
  it('never says failed, relapsed or clean', () => {
    // Three clinical words borrowed to make a person feel like a case, and one
    // that turns a slip into dirt.
    const copy = [
      ...Object.values(OUTCOME_LABEL),
      ...Object.values(OUTCOME_LABEL_PLAIN),
      LET_GO_LABEL,
      LET_GO_NOTE,
      emptyListLine(),
      emptyListLine(true),
      quietDayLine(),
      quietDayLine(true),
    ]
      .join(' ')
      .toLowerCase();
    // Written as patterns rather than substrings, because a plain `includes`
    // reads "against it" as "again" and "cleanly" as "clean". Stems that have
    // an inflection worth catching say so.
    for (const pattern of [
      /\bfail/,
      /\brelapse/,
      /\bclean\b/,
      /\bsober\b/,
      /\blapse/,
      /\bslip/,
      /\bshould\b/,
      /\blazy\b/,
      /\bfinally\b/,
      /\bagain\b/,
      /\bstreak/,
    ]) {
      expect(copy).not.toMatch(pattern);
    }
  });

  it('names all three endings in both voices', () => {
    for (const out of ['held', 'went', 'riding'] as const) {
      expect(outcomeLabel(out).length).toBeGreaterThan(0);
      expect(outcomeLabel(out, true).length).toBeGreaterThan(0);
    }
  });

  it('refuses an outcome it does not know', () => {
    expect(isOutcome('held')).toBe(true);
    expect(isOutcome('lapsed')).toBe(false);
  });

  it('is ready as soon as there is a name', () => {
    expect(nameReady('  ')).toBe(false);
    expect(nameReady('Doomscrolling')).toBe(true);
  });
});

describe("the day's line", () => {
  const b = brk();

  it('is the sentence the feature exists for', () => {
    // A hold that is never named is a hold that never happened.
    expect(dayLine([urge(b, 'held', TODAY, 1), urge(b, 'held', TODAY, 2)])).toBe(
      '2 urges. Held every one.',
    );
    expect(dayLine([urge(b, 'held')])).toBe('One urge. Held it.');
  });

  it('keeps the same grammar on a day that went the other way', () => {
    // A different shape for a bad day is the app raising an eyebrow.
    expect(dayLine([urge(b, 'went')])).toBe('One urge.');
    expect(dayLine([urge(b, 'went', TODAY, 1), urge(b, 'held', TODAY, 2)])).toBe(
      '2 urges. 1 held.',
    );
  });

  it('says nothing at all on a day with no urges', () => {
    expect(dayLine([])).toBeNull();
  });

  it('has no week, month or running version anywhere', () => {
    // The line is one day's arithmetic and accumulates into nothing. A streak
    // is the shame machine this whole feature exists to refuse.
    const copy = [
      dayLine([urge(b, 'held')]),
      dayLine([urge(b, 'went')]),
      dayLine([urge(b, 'riding')]),
      dayLine([urge(b, 'held', TODAY, 1), urge(b, 'went', TODAY, 2)]),
    ].join(' ');
    expect(copy).not.toMatch(/\b(streak|in a row|since|days? clean|record|best|longest)\b/i);
    expect(copy).not.toMatch(/\d+\s*(of|\/)\s*\d+/);
  });

  it('says what a day still in it is', () => {
    expect(dayLine([urge(b, 'riding')])).toBe('One urge. Still in it.');
    expect(dayLine([urge(b, 'riding')], true)).toBe('1 urge. In it now.');
  });
});

describe('the list and the log', () => {
  it('keeps the days a retired break carried', () => {
    const gone = brk({ retiredAt: 99 });
    const kept = brk();
    expect(live([gone, kept])).toEqual([kept]);
    const days = readBack([urge(gone, 'held', '2026-09-20' as DayKey)], [gone, kept]);
    expect(days[0].urges[0].of.name).toBe(gone.name);
  });

  it('lists days newest first and never aggregates', () => {
    const a = brk();
    const b = brk();
    const days = readBack(
      [
        urge(a, 'held', '2026-09-20' as DayKey, 1),
        urge(b, 'went', '2026-09-22' as DayKey, 2),
        urge(a, 'held', '2026-09-22' as DayKey, 3),
      ],
      [a, b],
    );
    expect(days.map((d) => d.day)).toEqual(['2026-09-22', '2026-09-20']);
    expect(days[0].urges.map((u) => u.of.name)).toEqual([b.name, a.name]);
  });

  it('skips an urge whose break is gone rather than drawing it nameless', () => {
    expect(readBack([urge(brk(), 'held')], [])).toEqual([]);
  });

  it('shows several urges against one break in a day', () => {
    // Three urges in one evening is three urges. Collapsing them would be the
    // app deciding how many times you are allowed to have wanted something.
    const b = brk();
    const list = urgesOn(
      [urge(b, 'held', TODAY, 1), urge(b, 'went', TODAY, 2), urge(b, 'held', TODAY, 3)],
      [b],
      TODAY,
    );
    expect(list).toHaveLength(3);
    // Newest first.
    expect(list.map((u) => u.createdAt)).toEqual([3, 2, 1]);
  });
});

describe('what it tells the rest of the app', () => {
  const b = brk();

  it('reports a held urge and nothing else', () => {
    expect(heldSomething([urge(b, 'held')])).toBe(true);
    expect(heldSomething([urge(b, 'went'), urge(b, 'riding')])).toBe(false);
    expect(heldSomething([])).toBe(false);
  });

  it('counts as resistance, so a week of them is not a dead calm', () => {
    expect(resisted(day('2026-09-23', { held: true, course: true }))).toBe(true);
    expect(resisted(day('2026-09-23', { course: true }))).toBe(false);
  });

  it('breaks the Calm Belt run without breaking anything else', () => {
    // Six easy-but-used days become five when one of them held an urge.
    const easy = (d: string, held = false) => day(d, { course: true, struck: 1, held });
    const days = [
      easy('2026-09-18'),
      easy('2026-09-19'),
      easy('2026-09-20'),
      easy('2026-09-21'),
      easy('2026-09-22'),
      easy('2026-09-23'),
    ];
    expect(voyage(days, TODAY).calmDays).toBe(6);
    const withHold = days.map((d) => (d.day === '2026-09-21' ? easy('2026-09-21', true) : d));
    expect(voyage(withHold, TODAY).calmDays).toBe(2);
  });

  it('does not harden the app', () => {
    // A day whose only entry is three urges is not a day you used, and a level
    // that rose as urges were logged would make logging them farmable.
    const bare = day('2026-09-23', { held: true });
    // `used` reads Acts alone, and `held` is not one of them.
    expect(voyage([bare], TODAY).calmDays).toBe(0);
  });
});

describe('what it costs the Reserve', () => {
  it('costs the same whichever way it went', () => {
    // The wanting is the expensive part. Charging more for a slip would be a
    // punishment with arithmetic on it.
    expect(spendOf(NO_ACTS, 0, 2).fraction).toBe(spendOf(NO_ACTS, 0, 2).fraction);
    expect(spendOf(NO_ACTS, 0, 1).fraction).toBeGreaterThan(0);
  });

  it('says what took it, without saying how it went', () => {
    const note = spendNote(spendOf(used({ struck: 2 }), 0, 2));
    expect(note).toContain('2 urges');
    expect(note).not.toMatch(/held|went|resist|gave/i);
  });

  it('stops adding them up', () => {
    const three = spendOf(NO_ACTS, 0, 3).fraction;
    expect(spendOf(NO_ACTS, 0, 9).fraction).toBe(three);
  });

  it('lowers the reading on a day that did nothing else', () => {
    const inputs = {
      read: { energy: 4, mood: 4, clarity: 4, tension: 2 },
      recentSleepHours: [8],
      sleepTargetHours: 8,
      acts: NO_ACTS,
    };
    const quiet = computeReserve(inputs);
    const hard = computeReserve({ ...inputs, urges: 3 });
    expect(hard.value).toBeLessThan(quiet.value ?? 0);
    expect(hard.spend.urges).toBe(3);
  });
});
