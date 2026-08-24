import { daysBetween, fromDayKey, type DayKey } from './date';

/**
 * The rhythm — things that come back.
 *
 * Training days, laundry, the weekly call. Every task app in the world has
 * recurrence and this one did not, which made it the single biggest hole in
 * the day-to-day: anything that repeats had to be retyped, and so it wasn't.
 *
 * **A rhythm is a standing offer, never a queue.** That is the whole design,
 * and it is what makes recurrence safe in an app with no shame mechanics.
 * Everywhere else, a recurring task that comes due creates a row; miss it and
 * the row sits there going red, and by Friday the list is a rap sheet for the
 * week. Here nothing is created until you strike it. Tuesday's laundry that
 * did not happen leaves *nothing behind* — no row, no red, no count, no
 * broken streak. Thursday simply offers it again, in the same voice it used
 * on Tuesday.
 *
 * Which is the practice card's rule — an untouched thing shows its offer, not
 * its absence — applied to the list rather than the day.
 *
 * So a rhythm has no completion history of its own. The record of doing one is
 * the struck task it creates, which is a real task like any other: it counts
 * toward the day's hardening and toward Armament's hardness, and it reads back
 * in the logbook as part of the day. Untick it and the row is *deleted* rather
 * than left undone, because a rhythm is either done today or on offer today,
 * and there is no third state worth storing.
 */

export type RhythmKind = 'weekdays' | 'interval';

export type Rhythm = {
  id: number;
  /**
   * Creation timestamp — the stable link from the tasks it spawns. Row ids do
   * not survive a backup (see `domain/backup.ts`), so anything pointing at a
   * rhythm points at this.
   */
  key: number;
  title: string;
  minutes: number;
  kind: RhythmKind;
  /** 0 = Sunday … 6 = Saturday. Only read when `kind` is 'weekdays'. */
  weekdays: number[];
  /** Days between offers. Only read when `kind` is 'interval'. */
  intervalDays: number;
  retired: boolean;
};

export const MIN_INTERVAL = 1;
export const MAX_INTERVAL = 60;

export const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

/** Which weekday a key falls on, 0..6. */
export function weekdayOf(day: DayKey): number {
  return fromDayKey(day).getDay();
}

/**
 * Is this rhythm on offer today?
 *
 * Weekdays is a plain calendar question. Interval is deliberately measured
 * **from the last time it was actually done**, not from a fixed anchor: an
 * anchored cycle silently passes you while you are not looking, so a plant you
 * forgot to water on day three is not offered again until day six. Measuring
 * from the last strike means a missed day pushes nothing away — the offer is
 * simply standing there the next morning, and every morning after, until it is
 * taken. Late is not a state this app has.
 */
export function offeredOn(rhythm: Rhythm, day: DayKey, lastDone: DayKey | null): boolean {
  if (rhythm.retired) return false;
  if (rhythm.kind === 'weekdays') {
    return rhythm.weekdays.includes(weekdayOf(day));
  }
  // Never done: on offer from the moment it exists.
  if (lastDone === null) return true;
  return daysBetween(lastDone, day) >= Math.max(MIN_INTERVAL, rhythm.intervalDays);
}

/** Everything on offer for a day, in the order it was created. */
export function offers(
  rhythms: Rhythm[],
  day: DayKey,
  lastDoneByKey: Map<number, DayKey>,
  doneTodayKeys: ReadonlySet<number> = new Set(),
): Rhythm[] {
  return rhythms.filter(
    (r) => !doneTodayKeys.has(r.key) && offeredOn(r, day, lastDoneByKey.get(r.key) ?? null),
  );
}

/**
 * How a rhythm says when it comes back.
 *
 * Names the cadence and stops. Never "due", never "overdue", never how many
 * times it has been missed — the cadence is a fact about the thing, and a
 * count of misses is a fact about the person.
 */
export function cadence(rhythm: Rhythm): string {
  if (rhythm.kind === 'interval') {
    const n = Math.max(MIN_INTERVAL, rhythm.intervalDays);
    return n === 1 ? 'Every day' : `Every ${n} days`;
  }
  const days = [...new Set(rhythm.weekdays)].sort((a, b) => a - b);
  if (days.length === 0) return 'No days set';
  if (days.length === 7) return 'Every day';
  if (days.length === 5 && [1, 2, 3, 4, 5].every((d) => days.includes(d))) return 'Weekdays';
  if (days.length === 2 && days[0] === 0 && days[1] === 6) return 'Weekends';
  return days.map((d) => DAY_NAMES[d]).join(' · ');
}

/** Ready to be saved? A rhythm with no days would never come back. */
export function isPlayable(rhythm: Pick<Rhythm, 'title' | 'kind' | 'weekdays'>): boolean {
  if (!rhythm.title.trim()) return false;
  return rhythm.kind === 'interval' || rhythm.weekdays.length > 0;
}

/**
 * The line above the offered rhythms.
 *
 * Describes what is on offer and stops there. There is deliberately no
 * "n of m done" — that would turn the standing offer back into the checklist
 * this whole model exists to avoid.
 */
export function offerLine(count: number, plain = false): string {
  if (count === 0) return plain ? 'Nothing repeating today.' : 'Nothing comes back today.';
  const noun = count === 1 ? 'thing' : 'things';
  return plain
    ? `${count} repeating ${noun} today.`
    : `${count} ${noun} the week keeps bringing back.`;
}

/** Weekday set helpers for the editor. */
export function toggleWeekday(days: number[], day: number): number[] {
  return days.includes(day)
    ? days.filter((d) => d !== day)
    : [...days, day].sort((a, b) => a - b);
}

/** Stored as a comma-separated list, which sorts and dedupes on the way in. */
export function encodeWeekdays(days: number[]): string {
  return [...new Set(days)]
    .filter((d) => Number.isInteger(d) && d >= 0 && d <= 6)
    .sort((a, b) => a - b)
    .join(',');
}

export function decodeWeekdays(raw: string | null): number[] {
  if (!raw) return [];
  return encodeWeekdays(
    raw
      .split(',')
      .map((part) => Number(part.trim()))
      .filter((n) => Number.isInteger(n)),
  )
    .split(',')
    .filter((s) => s.length > 0)
    .map(Number);
}
