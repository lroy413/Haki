import { addDays, fromDayKey, toDayKey, type DayKey } from './date';
import { levelFor, type Acts, type HardeningLevel } from './hardening';
import { moonPhase, SYNODIC_DAYS } from './moon';
import { standingOf, weekStart, type Standing } from './week';

/**
 * The Tide Calendar — a month, inked by what the days held.
 *
 * The day strip shows today, Chart the Week shows the week. This is the size
 * above both, and it answers the one question neither can: *what has this
 * month actually been like?* Not as a number — as a shape you can see from
 * across the room.
 *
 * It is read-mostly. Everything here is already in the database; nothing on
 * this screen creates anything, and there is no way to plan from it. The month
 * is for looking at.
 *
 * The rules it inherits, all of which bite hardest at month scale:
 *
 * - **No total and no streak.** Thirty inked squares in a row is exactly the
 *   thing this app refuses to turn into a number, and a calendar is where
 *   every other app grows a streak counter. There is none, there is no
 *   percentage, and a gap is drawn as an empty square rather than as a break
 *   in anything.
 * - **Nothing is red.** An empty day is a day that was not used. That is a
 *   fact about a day and the app has nothing to add to it.
 * - **The moon keeps the sky's clock, not the voyage's.** `moon.ts` takes a
 *   plain `Date` for exactly this reason: the phase over your head does not
 *   care what hour you decided your day starts at.
 */

/** One square. */
export type TideDay = {
  day: DayKey;
  /** Null for the leading and trailing blanks that pad the grid. */
  inMonth: boolean;
  date: number;
  standing: Standing;
  level: HardeningLevel;
  /** A port of call falls here. */
  port: boolean;
  /** One of the four principal phases falls here, or null. */
  moon: MoonMark | null;
};

export type MoonMark = 'new' | 'first' | 'full' | 'last';

/**
 * Whether one of the four principal phases lands on this day.
 *
 * Only the four, deliberately. Drawing a moon on all thirty would be noise
 * with a nautical excuse; the quarters are the ones that are actually events,
 * and they give the month a rhythm you can feel without counting.
 *
 * A phase "falls on" a day when the day's noon is the closest noon to the
 * exact moment — which is how an almanac assigns them, and it means each phase
 * lands on exactly one day a month.
 */
export function moonMarkFor(day: DayKey): MoonMark | null {
  const noon = fromDayKey(day);
  noon.setHours(12, 0, 0, 0);
  const age = moonPhase(noon).age;
  const quarter = SYNODIC_DAYS / 4;
  const marks: [MoonMark, number][] = [
    ['new', 0],
    ['first', quarter],
    ['full', quarter * 2],
    ['last', quarter * 3],
  ];
  for (const [mark, at] of marks) {
    // Distance around the cycle, so "new" catches both ends of the month.
    const raw = Math.abs(age - at);
    const away = Math.min(raw, SYNODIC_DAYS - raw);
    if (away <= 0.5) return mark;
  }
  return null;
}

/**
 * The mark as a phase, so it can be *drawn* rather than typed.
 *
 * The first cut set ◐ and ◑ in the mono face and both came out as clipped
 * slivers — IBM Plex Mono has no half-moon, so the browser fell back to
 * whatever it had and then the 12-point line box cut the top off it. The same
 * class of bug as the em-dash that rendered as a filled bar. The chart already
 * owns real moon geometry (`litPath` in `moon.ts`), so the calendar borrows it
 * and the two can never disagree about which way a crescent points.
 */
export const MOON_LIT: Record<MoonMark, { fraction: number; waxing: boolean }> = {
  new: { fraction: 0, waxing: true },
  first: { fraction: 0.5, waxing: true },
  full: { fraction: 1, waxing: false },
  last: { fraction: 0.5, waxing: false },
};

export const MOON_NAME: Record<MoonMark, string> = {
  new: 'New moon',
  first: 'First quarter',
  full: 'Full moon',
  last: 'Last quarter',
};

/** The first of the month `day` falls in. */
export function monthStart(day: DayKey): DayKey {
  const d = fromDayKey(day);
  return toDayKey(new Date(d.getFullYear(), d.getMonth(), 1));
}

/** The month before or after, by whole months rather than by 30 days. */
export function shiftMonth(day: DayKey, by: number): DayKey {
  const d = fromDayKey(monthStart(day));
  return toDayKey(new Date(d.getFullYear(), d.getMonth() + by, 1));
}

export function monthLabel(day: DayKey, today: DayKey): string {
  const d = fromDayKey(day);
  const name = d.toLocaleString('en-US', { month: 'long' });
  const thisYear = fromDayKey(today).getFullYear();
  return d.getFullYear() === thisYear ? name : `${name} ${d.getFullYear()}`;
}

/**
 * The month as whole weeks, Monday first.
 *
 * Padded out to complete weeks with days from either side, marked
 * `inMonth: false` — a grid with holes in it reads as broken, and the
 * neighbouring days are real days that really did hold something.
 *
 * The week boundary comes from `week.ts` rather than being computed again
 * here, so the month and the week chart can never disagree about which day a
 * week starts on.
 */
export function monthGrid(
  month: DayKey,
  today: DayKey,
  acts: { day: DayKey; acts: Acts }[],
  ports: { day: DayKey }[],
): TideDay[][] {
  const first = monthStart(month);
  const monthIndex = fromDayKey(first).getMonth();
  const from = weekStart(first);

  const byDay = new Map(acts.map((a) => [a.day, a.acts]));
  const portDays = new Set(ports.map((p) => p.day));

  const weeks: TideDay[][] = [];
  let cursor = from;
  // Six rows covers every month in every year; the loop stops as soon as the
  // month is spent, so most months draw five.
  for (let row = 0; row < 6; row += 1) {
    const week: TideDay[] = [];
    for (let i = 0; i < 7; i += 1) {
      const d = fromDayKey(cursor);
      const inMonth = d.getMonth() === monthIndex;
      const dayActs = byDay.get(cursor);
      week.push({
        day: cursor,
        inMonth,
        date: d.getDate(),
        standing: standingOf(cursor, today),
        level: dayActs ? levelFor(dayActs) : 0,
        port: portDays.has(cursor),
        moon: inMonth ? moonMarkFor(cursor) : null,
      });
      cursor = addDays(cursor, 1);
    }
    weeks.push(week);
    if (fromDayKey(cursor).getMonth() !== monthIndex) break;
  }
  return weeks;
}

/**
 * What the month held, said as days — never as a fraction of the month.
 *
 * Setting Sail is the one screen allowed a denominator, and a week is what it
 * is allowed one *of*: seven is bounded and honest. A month is longer, more
 * variable and further from anything you can act on, so "12 of 30" here would
 * be a score with a calendar behind it.
 */
export function monthLine(weeks: TideDay[][], plain = false): string | null {
  const days = weeks.flat().filter((d) => d.inMonth);
  const used = days.filter((d) => d.level > 0).length;
  if (used === 0) return null;
  const noun = used === 1 ? 'day' : 'days';
  return plain ? `${used} ${noun} used.` : `${used} ${noun} with something in them.`;
}

/** Whether the grid is showing the month today is in. */
export function isThisMonth(month: DayKey, today: DayKey): boolean {
  return monthStart(month) === monthStart(today);
}

/** How far back the calendar will go: the day the voyage started. */
export function canGoBack(month: DayKey, setSailAt: DayKey): boolean {
  return monthStart(month) > monthStart(setSailAt);
}

/**
 * Forward is capped at the month today is in.
 *
 * There is nothing to see in November. The week chart is where the future
 * lives, because a week ahead is a thing you can still act on; a month ahead
 * is a calendar, and this is not one.
 */
export function canGoOn(month: DayKey, today: DayKey): boolean {
  return monthStart(month) < monthStart(today);
}
