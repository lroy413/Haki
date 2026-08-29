import { addDays, daysBetween, fromDayKey, toDayKey, type DayKey } from './date';
import { levelFor, type Acts, type HardeningLevel } from './hardening';

/**
 * The week, charted — what is astern and what is placed ahead.
 *
 * Setting Sail reads the week *behind* and asks for a heading; there was never
 * anywhere to see the week **in front of you**, which is the half you can still
 * do something about. This is that half, and it is reachable all week rather
 * than once at the ritual.
 *
 * The whole design is in one rule, and it is a rule about honesty:
 *
 *   **Ink behind, outlines ahead.** A day that has happened is drawn solid, at
 *   the darkness the day actually earned. A day that has not is drawn as an
 *   outline holding whatever is placed on it. They are different kinds of fact
 *   and they must never share a visual channel — a bar that meant "used" on
 *   Monday and "planned" on Friday would be a chart you cannot read, and worse,
 *   one that quietly flatters a week by counting intentions as work.
 *
 * That is the same grammar the rhythm's standing offers already use: dashed and
 * unfilled means *not in the database and not counted*. It is solid the moment
 * it becomes real.
 *
 * Three things this deliberately does not do:
 *
 * - **No week total and no score.** Setting Sail is the one place in this app
 *   allowed to total anything, because a week is bounded and it says so out
 *   loud once. A chart that also totalled would be the same claim made twice,
 *   and the second one always turns into a target.
 * - **No capacity.** Minutes placed on a day are a fact about the plan. The app
 *   does not know how much you can do and will not draw a line you can be over.
 * - **Nothing goes red.** Not a past day with nothing in it, not a day carrying
 *   more than the others. A light day is a fact about a day.
 */

/** Monday. The week people plan in, and no setting nobody asked for. */
const WEEK_STARTS_ON = 1;

export type Standing = 'astern' | 'today' | 'ahead';

export type DayShape = {
  day: DayKey;
  standing: Standing;
  /** One letter for the column head. */
  letter: string;
  /** Day of the month, for the row. */
  date: number;
  /**
   * How dark the day came out, 0–3. Only meaningful once the day has
   * happened; a day ahead has earned nothing and reads 0.
   */
  level: HardeningLevel;
  /** Committed and still open. What is placed, never what is owed. */
  open: number;
  openMinutes: number;
  /** Fixed points hung on the day. */
  bells: number;
  /** Islands whose port of call falls here. Rare, and worth seeing early. */
  ports: number;
};

const LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/** The Monday of the week `day` falls in. */
export function weekStart(day: DayKey): DayKey {
  const date = fromDayKey(day);
  const shift = (date.getDay() - WEEK_STARTS_ON + 7) % 7;
  return addDays(day, -shift);
}

/** The seven days of the week `today` falls in, Monday first. */
export function weekDays(today: DayKey): DayKey[] {
  const from = weekStart(today);
  return Array.from({ length: 7 }, (_, i) => addDays(from, i));
}

export function standingOf(day: DayKey, today: DayKey): Standing {
  if (day === today) return 'today';
  return day < today ? 'astern' : 'ahead';
}

/**
 * Draw the week.
 *
 * Everything is looked up by day key rather than by index, so a missing day —
 * one with no acts row at all, which is most of them — simply reads as an
 * empty day rather than shifting the whole chart by one.
 */
export function chartWeek(
  today: DayKey,
  acts: { day: DayKey; acts: Acts }[],
  placed: { day: DayKey; open: number; minutes: number }[],
  bells: { day: DayKey }[],
  ports: { day: DayKey }[],
): DayShape[] {
  const byDay = new Map(acts.map((a) => [a.day, a.acts]));
  const load = new Map(placed.map((p) => [p.day, p]));
  const count = (rows: { day: DayKey }[], day: DayKey) =>
    rows.reduce((n, r) => (r.day === day ? n + 1 : n), 0);

  return weekDays(today).map((day) => {
    const standing = standingOf(day, today);
    const dayActs = byDay.get(day);
    const dayLoad = load.get(day);
    return {
      day,
      standing,
      letter: LETTERS[fromDayKey(day).getDay()],
      date: fromDayKey(day).getDate(),
      // A day ahead has earned nothing; drawing it inked would count an
      // intention as work, which is the one thing this chart must not do.
      level: standing === 'ahead' || !dayActs ? 0 : levelFor(dayActs),
      open: dayLoad?.open ?? 0,
      openMinutes: dayLoad?.minutes ?? 0,
      bells: count(bells, day),
      ports: count(ports, day),
    };
  });
}

/**
 * What the week ahead is carrying, in one sentence — or nothing.
 *
 * Counts what is placed and stops. Never "you have", never an exclamation, and
 * never a comparison with last week: two weeks is not a trend, and the app has
 * no business implying one.
 */
export function aheadLine(week: DayShape[], plain = false): string | null {
  const ahead = week.filter((d) => d.standing !== 'astern');
  const days = ahead.filter((d) => d.open > 0 || d.bells > 0 || d.ports > 0).length;
  if (days === 0) {
    return plain
      ? 'Nothing placed in the rest of the week yet.'
      : 'Open water for the rest of the week.';
  }
  const noun = days === 1 ? 'day' : 'days';
  return plain
    ? `${days} ${noun} left this week have something on them.`
    : `${days} ${noun} ahead have cargo.`;
}

/**
 * What is astern this week, said as days rather than as a fraction.
 *
 * Deliberately not "3 of 7". Setting Sail is the one screen allowed to put a
 * denominator on a week, and it earns that by saying it once, out loud, in the
 * ritual. Repeating it here would turn a bounded honest count into a target
 * you see every day.
 */
export function asternLine(week: DayShape[], plain = false): string | null {
  const used = week.filter((d) => d.standing !== 'ahead' && d.level > 0).length;
  if (used === 0) return null;
  const noun = used === 1 ? 'day' : 'days';
  return plain ? `${used} ${noun} used so far.` : `${used} ${noun} with something in them.`;
}

/** The label over the chart. */
export function weekLabel(today: DayKey, plain = false): string {
  const from = weekStart(today);
  const gone = daysBetween(from, today);
  if (plain) return 'This week';
  if (gone === 0) return 'The week ahead';
  if (gone >= 6) return 'The week, nearly done';
  return 'The week';
}

/** Whether a day is worth a mark at all — used by the row list. */
export function hasCargo(shape: DayShape): boolean {
  return shape.open > 0 || shape.bells > 0 || shape.ports > 0;
}

/** One day's cargo, said. Empty string when it carries nothing. */
export function cargoLine(shape: DayShape, plain = false): string {
  const parts: string[] = [];
  if (shape.open > 0) {
    parts.push(`${shape.open} ${shape.open === 1 ? 'task' : 'tasks'}`);
  }
  if (shape.bells > 0) {
    const one = shape.bells === 1;
    parts.push(`${shape.bells} ${plain ? (one ? 'time' : 'times') : one ? 'bell' : 'bells'}`);
  }
  if (shape.ports > 0) {
    parts.push(plain ? `${shape.ports} due` : `${shape.ports} to port`);
  }
  return parts.join(' · ');
}

/** Today's own key, for a caller that wants the same week boundary logic. */
export function sameWeek(a: DayKey, b: DayKey): boolean {
  return weekStart(a) === weekStart(b);
}

/** Guard used by the tests: the chart is always exactly seven days. */
export function isWholeWeek(week: DayShape[]): boolean {
  if (week.length !== 7) return false;
  return week.every(
    (d, i) => i === 0 || toDayKey(fromDayKey(d.day)) === addDays(week[0].day, i),
  );
}
