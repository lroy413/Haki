import { describe, expect, it } from 'vitest';
import {
  FLOOR,
  LOGGED_BLOCK,
  STEPS,
  TARGET_CHOICES,
  TOP,
  activeItems,
  canLower,
  completedIn,
  emptyLine,
  encodeMinimums,
  holdLine,
  inWeek,
  ladderBlurb,
  lowerRung,
  mondayOf,
  parseMinimums,
  progressLine,
  progressOf,
  raiseRung,
  reachLine,
  reachedRung,
  rungName,
  settleWeeks,
  step,
  wornRung,
  type Item,
  type Minimums,
  type Rung,
  type Tick,
  type Timed,
  type WeekRecord,
} from '../ladder';

/** Monday 31 August 2026 and the week after it. */
const MON = '2026-08-31';
const NEXT = '2026-09-07';

let stamp = 1000;
function item(over: Partial<Item> = {}): Item {
  stamp += 1;
  return {
    id: stamp,
    key: stamp,
    trackKey: 1,
    title: 'Practice scales',
    kind: 'practice',
    target: 3,
    unit: 'times',
    closedOn: null,
    retired: false,
    ...over,
  };
}

function tick(itemKey: number, day: string, amount = 1): Tick {
  stamp += 1;
  return { id: stamp, itemKey, day, amount, createdAt: stamp };
}

const timed = (itemKey: number | null, day: string, minutes: number): Timed => ({
  itemKey,
  day,
  minutes,
});

describe('the rungs', () => {
  it('climbs from the floor and the gaps widen', () => {
    const mins = STEPS.map((s) => FLOOR[s]);
    expect(mins).toEqual([...mins].sort((a, b) => a - b));
    const gaps = mins.slice(1).map((m, i) => m - mins[i]);
    expect(gaps).toEqual([...gaps].sort((a, b) => a - b));
    expect(FLOOR[1]).toBe(1);
  });

  it('reads the floor back from nothing and from rubbish', () => {
    expect(parseMinimums(null)).toEqual(FLOOR);
    expect(parseMinimums('')).toEqual(FLOOR);
    expect(parseMinimums('1,2')).toEqual(FLOOR);
    expect(parseMinimums('a,b,c,d,e')).toEqual(FLOOR);
    // Under the floor, or folded: the floor.
    expect(parseMinimums('0,2,4,6,8')).toEqual(FLOOR);
    expect(parseMinimums('1,5,4,6,8')).toEqual(FLOOR);
  });

  it('round-trips a raised table', () => {
    const raised = raiseRung(raiseRung(FLOOR, 3), 3);
    expect(parseMinimums(encodeMinimums(raised))).toEqual(raised);
  });

  it('raising a rung pushes the ones above it up rather than folding the ladder', () => {
    let m: Minimums = { ...FLOOR };
    for (let i = 0; i < 5; i += 1) m = raiseRung(m, 2);
    expect(m[2]).toBe(7);
    expect(m[3]).toBe(8);
    expect(m[4]).toBe(9);
    expect(m[5]).toBe(10);
    expect(m[1]).toBe(1);
  });

  it('never lowers under the floor, and never onto the rung below', () => {
    expect(lowerRung(FLOOR, 3)).toEqual(FLOOR);
    expect(canLower(FLOOR, 3)).toBe(false);
    const raised = raiseRung(FLOOR, 3);
    expect(canLower(raised, 3)).toBe(true);
    expect(lowerRung(raised, 3)).toEqual(FLOOR);
    // Rung 2 raised to sit right under a raised rung 3: rung 3 cannot come
    // down onto it.
    let m = raiseRung(FLOOR, 2); // 3
    m = raiseRung(m, 2); // 4, which pushes rung 3 to 5
    expect(m[3]).toBe(5);
    expect(canLower(m, 3)).toBe(false);
  });

  it('reads how far a count climbs', () => {
    expect(reachedRung(0, FLOOR)).toBe(0);
    expect(reachedRung(1, FLOOR)).toBe(1);
    expect(reachedRung(3, FLOOR)).toBe(2);
    expect(reachedRung(7, FLOOR)).toBe(4);
    expect(reachedRung(8, FLOOR)).toBe(5);
    expect(reachedRung(40, FLOOR)).toBe(TOP);
  });
});

describe('the week', () => {
  it('starts on Monday', () => {
    expect(mondayOf('2026-09-02')).toBe(MON);
    expect(mondayOf('2026-09-06')).toBe(MON);
    expect(mondayOf(MON)).toBe(MON);
    expect(mondayOf(NEXT)).toBe(NEXT);
  });

  it('ends on Sunday, and Sunday belongs to the week it closes', () => {
    expect(inWeek('2026-09-06', MON)).toBe(true);
    expect(inWeek(NEXT, MON)).toBe(false);
    expect(inWeek('2026-08-30', MON)).toBe(false);
  });
});

describe('progress', () => {
  it('counts taps toward a times target', () => {
    const scales = item({ target: 3 });
    const ticks = [tick(scales.key, '2026-08-31'), tick(scales.key, '2026-09-02')];
    const p = progressOf(scales, ticks, [], MON);
    expect(p).toEqual({ done: 2, target: 3, unit: 'times', complete: false });
    expect(
      progressOf(scales, [...ticks, tick(scales.key, '2026-09-03')], [], MON).complete,
    ).toBe(true);
  });

  it('counts a gear session as one time, however long it ran', () => {
    const scales = item({ target: 2 });
    const sessions = [timed(scales.key, '2026-09-01', 25), timed(scales.key, '2026-09-02', 7)];
    expect(progressOf(scales, [], sessions, MON).done).toBe(2);
  });

  it('does not count a session that ended before its first minute', () => {
    const scales = item({ target: 1 });
    expect(progressOf(scales, [], [timed(scales.key, '2026-09-01', 0)], MON).done).toBe(0);
  });

  it('counts minutes on a minutes item from taps and from gears', () => {
    const writing = item({ target: 120, unit: 'minutes' });
    const ticks = [tick(writing.key, '2026-09-01', LOGGED_BLOCK)];
    const sessions = [timed(writing.key, '2026-09-02', 90)];
    const p = progressOf(writing, ticks, sessions, MON);
    expect(p.done).toBe(115);
    expect(p.complete).toBe(false);
  });

  it('only reads its own week and its own item', () => {
    const scales = item({ target: 1 });
    const other = item({ target: 1 });
    const ticks = [
      tick(scales.key, '2026-08-30'), // Sunday before
      tick(other.key, '2026-09-01'),
      tick(scales.key, NEXT), // the Monday after
    ];
    expect(progressOf(scales, ticks, [timed(null, '2026-09-01', 90)], MON).done).toBe(0);
  });

  it('counts completed items across every track', () => {
    const a = item({ trackKey: 1, target: 1 });
    const b = item({ trackKey: 2, target: 1 });
    const c = item({ trackKey: 2, target: 2 });
    const ticks = [
      tick(a.key, '2026-09-01'),
      tick(b.key, '2026-09-01'),
      tick(c.key, '2026-09-01'),
    ];
    expect(completedIn([a, b, c], ticks, [], MON)).toBe(2);
  });
});

describe('the list a week can see', () => {
  it('drops retired items and goals met in an earlier week, and keeps this week’s', () => {
    const gone = item({ retired: true });
    const earlier = item({ kind: 'goal', target: 1, closedOn: '2026-08-28' });
    const thisWeek = item({ kind: 'goal', target: 1, closedOn: '2026-09-02' });
    const open = item({ kind: 'goal', target: 1 });
    const practice = item();
    const seen = activeItems([gone, earlier, thisWeek, open, practice], MON);
    expect(seen.map((i) => i.key)).toEqual([thisWeek.key, open.key, practice.key]);
  });
});

describe('held', () => {
  it('moves one rung toward the week, never further', () => {
    expect(step(0, 5)).toBe(1);
    expect(step(1, 5)).toBe(2);
    expect(step(4, 5)).toBe(5);
    expect(step(3, 3)).toBe(3);
    expect(step(3, 0)).toBe(2);
    expect(step(5, 2)).toBe(4);
  });

  it('never leaves the ladder', () => {
    expect(step(0, 0)).toBe(0);
    expect(step(5, 5)).toBe(5);
  });

  it('reaches the top three weeks running from the second rung', () => {
    // The owner's picture: "at 3 weeks the final gear persists". From nothing
    // it is five; from a couple of held rungs it is three.
    let held: Rung = 2;
    for (let week = 0; week < 3; week += 1) held = step(held, 5);
    expect(held).toBe(5);
  });

  it('settles the first week on the ground', () => {
    expect(settleWeeks(null, MON, () => 5)).toEqual([
      { weekStart: MON, held: 1, reachedBefore: 5 },
    ]);
    expect(settleWeeks(null, MON, () => 0)).toEqual([
      { weekStart: MON, held: 0, reachedBefore: 0 },
    ]);
  });

  it('does nothing when this week is already written', () => {
    const last: WeekRecord = { weekStart: MON, held: 2, reachedBefore: 3 };
    expect(settleWeeks(last, MON, () => 5)).toEqual([]);
  });

  it('carries a good week up one rung on Monday', () => {
    const last: WeekRecord = { weekStart: MON, held: 1, reachedBefore: 1 };
    const rows = settleWeeks(last, NEXT, (w) => (w === MON ? 4 : 0));
    expect(rows).toEqual([{ weekStart: NEXT, held: 2, reachedBefore: 4 }]);
  });

  it('records every week of a gap and gives one rung back per week', () => {
    // Held four, then three weeks with nothing in them: down to one, with
    // each week written down as the week it was rather than skipped.
    const last: WeekRecord = { weekStart: MON, held: 4, reachedBefore: 4 };
    const threeLater = '2026-09-21';
    const rows = settleWeeks(last, threeLater, (w) => (w === MON ? 4 : 0));
    expect(rows.map((r) => r.weekStart)).toEqual([NEXT, '2026-09-14', threeLater]);
    expect(rows.map((r) => r.held)).toEqual([4, 3, 2]);
    expect(rows.map((r) => r.reachedBefore)).toEqual([4, 0, 0]);
  });

  it('never zeroes a hold in one move', () => {
    const last: WeekRecord = { weekStart: MON, held: 5, reachedBefore: 5 };
    const rows = settleWeeks(last, NEXT, () => 0);
    expect(rows[0].held).toBe(4);
  });

  it('wears whichever is higher of reached and held', () => {
    expect(wornRung(1, 3)).toBe(3);
    expect(wornRung(4, 2)).toBe(4);
    expect(wornRung(0, 0)).toBe(0);
  });
});

describe('the names', () => {
  it('keeps the same six rungs under both crews', () => {
    for (const rung of [0, 1, 2, 3, 4, 5] as Rung[]) {
      expect(rungName('luffy', rung).label.length).toBeGreaterThan(0);
      expect(rungName('zoro', rung).label.length).toBeGreaterThan(0);
      // The ground has no kanji; every rung has one.
      expect(rungName('luffy', rung).kanji.length > 0).toBe(rung > 0);
      expect(rungName('zoro', rung).kanji.length > 0).toBe(rung > 0);
    }
  });

  it('names Luffy’s five gears and Zoro’s five styles', () => {
    expect(rungName('luffy', 5).label).toBe('Gear 5');
    expect(rungName('luffy', 5).kanji).toBe('五速');
    expect(rungName('zoro', 1).label).toBe('Ittoryu');
    expect(rungName('zoro', 2).label).toBe('Nitoryu');
    expect(rungName('zoro', 3).label).toBe('Santoryu');
    expect(rungName('zoro', 4).label).toBe('Ashura');
    expect(rungName('zoro', 5).label).toBe('King of Hell');
  });

  it('never leaves one crew speaking the other one’s vocabulary', () => {
    const zoro = [0, 1, 2, 3, 4, 5]
      .flatMap((r) => [rungName('zoro', r as Rung).label, rungName('zoro', r as Rung).kanji])
      .concat([
        ladderBlurb('zoro'),
        emptyLine('zoro'),
        holdLine(0, 'zoro'),
        holdLine(3, 'zoro'),
      ])
      .join(' ')
      .toLowerCase();
    for (const word of ['gear', '速']) expect(zoro, `zoro says "${word}"`).not.toContain(word);

    const luffy = [0, 1, 2, 3, 4, 5]
      .flatMap((r) => [rungName('luffy', r as Rung).label, rungName('luffy', r as Rung).kanji])
      .concat([
        ladderBlurb('luffy'),
        emptyLine('luffy'),
        holdLine(0, 'luffy'),
        holdLine(3, 'luffy'),
      ])
      .join(' ')
      .toLowerCase();
    for (const word of ['blade', 'sword', '刀', 'style']) {
      expect(luffy, `luffy says "${word}"`).not.toContain(word);
    }
  });
});

describe('the copy', () => {
  const lines = [
    ...([0, 1, 2, 3, 4, 5] as Rung[]).flatMap((r) => [
      holdLine(r, 'luffy'),
      holdLine(r, 'zoro'),
    ]),
    reachLine(0, 0, FLOOR, 'luffy'),
    reachLine(1, 1, FLOOR, 'luffy'),
    reachLine(3, 2, FLOOR, 'zoro'),
    reachLine(9, 5, FLOOR, 'luffy'),
    reachLine(8, 5, FLOOR, 'zoro'),
    progressLine({ done: 0, target: 3, unit: 'times', complete: false }, 'practice'),
    progressLine({ done: 3, target: 3, unit: 'times', complete: true }, 'practice'),
    progressLine({ done: 40, target: 120, unit: 'minutes', complete: false }, 'practice'),
    progressLine({ done: 0, target: 1, unit: 'times', complete: false }, 'goal'),
    progressLine({ done: 1, target: 1, unit: 'times', complete: true }, 'goal'),
    ladderBlurb('luffy'),
    ladderBlurb('zoro'),
    emptyLine('luffy'),
    emptyLine('zoro'),
  ];

  it('never scolds, never congratulates, and never counts weeks', () => {
    for (const line of lines) {
      const text = line.toLowerCase();
      for (const word of [
        'failed',
        'should',
        'lazy',
        'finally',
        'well done',
        'streak',
        'missed',
        'down from',
        'lost',
        'congrat',
        'in a row',
        'weeks at',
      ]) {
        expect(text, `"${line}" says ${word}`).not.toContain(word);
      }
    }
  });

  it('says what the next rung asks, and nothing above the top', () => {
    expect(reachLine(0, 0, FLOOR, 'luffy')).toBe('Nothing met yet · one for Gear 1');
    expect(reachLine(1, 1, FLOOR, 'luffy')).toBe('1 met this week · one more for Gear 2');
    expect(reachLine(3, 2, FLOOR, 'zoro')).toBe('3 met this week · one more for Santoryu');
    expect(reachLine(5, 3, FLOOR, 'luffy')).toBe('5 met this week · one more for Gear 4');
    expect(reachLine(8, 5, FLOOR, 'luffy')).toBe('8 met this week · nothing above Gear 5');
  });

  it('says what is held and never how long', () => {
    expect(holdLine(3, 'luffy')).toBe('Holding Gear 3');
    expect(holdLine(5, 'zoro')).toBe('Holding King of Hell');
    expect(holdLine(0, 'luffy')).toContain('Nothing held yet');
    expect(holdLine(3, 'luffy')).not.toMatch(/week/);
  });

  it('says the offer on an item, never a dash', () => {
    expect(
      progressLine({ done: 0, target: 3, unit: 'times', complete: false }, 'practice'),
    ).toBe('0 of 3 this week');
    expect(progressLine({ done: 0, target: 1, unit: 'times', complete: false }, 'goal')).toBe(
      'Once',
    );
    for (const line of lines) expect(line).not.toMatch(/—|–/);
  });

  it('offers a week of times and a working week of minutes', () => {
    expect(TARGET_CHOICES.times[TARGET_CHOICES.times.length - 1]).toBe(7);
    expect(TARGET_CHOICES.minutes[0]).toBe(LOGGED_BLOCK);
  });
});
