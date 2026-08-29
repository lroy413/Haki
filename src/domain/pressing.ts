import { addDays, daysBetween, fromDayKey, shortDay, toDayKey, type DayKey } from './date';
// Types only, deliberately: `tasks.ts` imports the comparator below, and a
// runtime import in this direction would close a cycle. A type import is
// erased, so the two files can name each other's shapes freely.
import type { Task } from './tasks';

/**
 * What is pressing — priority, and a date you have to make.
 *
 * The owner asked for this in plain words: *"If I set a date I want to have
 * something done by I need it to be in my face and emphasized if labeled
 * priority."* Everything else in this app is elastic on purpose — a task is
 * for today, a rhythm comes round, an island takes weeks — and that elasticity
 * is exactly what lets a real deadline slide past without the app ever raising
 * its voice.
 *
 * Two fields carry it, and keeping them separate is the whole design:
 *
 *   **`dueBy` is when it has to be done.** A fact about the world — the form
 *   closes Friday whether or not you planned around it.
 *   **`committedFor` is when you are doing it.** A decision you made.
 *
 * Conflating them is what every task app does, and it is why "due date" ends
 * up meaning nothing: a thing due Friday that you plan to do Tuesday is not
 * two tasks and not a task that moved. It is one task with a plan and a
 * deadline, and the app should be able to say when those two disagree.
 *
 * Three rules hold the tone, and they are the reason this can exist in an app
 * with no shame mechanics:
 *
 * - **The count runs toward, and keeps running.** "3 days", then "Due today",
 *   then "2 days past". It never stops at zero and it never turns into a
 *   verdict — the same figure an island at sea wears, read the same way.
 * - **`warn`, never crimson.** The app's one warmth is the colour for *look
 *   at this*; crimson is the colour for *something has gone wrong*, and a
 *   date arriving is not a breach. The Calm Belt settled this exact question
 *   already and this follows it.
 * - **Loud by weight and position, not by alarm.** Nothing here rings,
 *   badges, or counts how many dates have passed. It sorts to the top and it
 *   is drawn heavier — that is what "in your face" is allowed to mean.
 *
 * And priority is **one flag, not a scale**. A three-level priority system is
 * a system you spend Sunday afternoon administering, and the second level
 * always means "not really".
 */

/** How hard a date is pressing. Drives the sort and how loud the row is. */
export type Heat = 'past' | 'today' | 'soon' | 'later' | 'none';

/** Within this many days, a date is worth drawing warm in the list. */
export const SOON_DAYS = 2;

/**
 * How far ahead the home screen looks — deliberately tighter than `SOON_DAYS`.
 *
 * Two different questions with two different right answers. In the day's list,
 * "warm" means *this one has a date, keep it in view*, and two days is a fair
 * window for that. On the home screen it has to mean *this is on you now*, and
 * a card that says three things are bearing down when one of them is Thursday
 * teaches you to ignore the card — which is the only way this feature can
 * actually fail.
 */
export const BEARING_DAYS = 1;

/**
 * The most the home screen will show at once.
 *
 * A wall of undone things is what makes an ADHD brain close the app, and this
 * card sits above everything else on the screen you open — so it is the last
 * place that should be allowed to grow without limit. The rest are counted in
 * one quiet line, not hidden: nothing here is dropped, it is just not all
 * shouted at once.
 */
export const BEARING_SHOWN = 3;

/**
 * Days until the date, or null when there is no date.
 *
 * Negative once it has passed, which is what lets one number carry the whole
 * story instead of a boolean beside it.
 */
export function daysUntil(dueBy: DayKey | null, today: DayKey): number | null {
  if (dueBy === null) return null;
  return daysBetween(today, dueBy);
}

export function heatOf(days: number | null): Heat {
  if (days === null) return 'none';
  if (days < 0) return 'past';
  if (days === 0) return 'today';
  if (days <= SOON_DAYS) return 'soon';
  return 'later';
}

/** Whether this one should be drawn in the app's one warmth. */
export function isWarm(heat: Heat, priority: boolean): boolean {
  return priority || heat === 'past' || heat === 'today' || heat === 'soon';
}

/**
 * The date, said.
 *
 * Counts toward and keeps counting after. Deliberately not "overdue",
 * "missed" or "late": those describe a person, and this describes a date.
 * "Past" is positional, which is all the app actually knows.
 */
export function dueLine(dueBy: DayKey | null, today: DayKey): string | null {
  const days = daysUntil(dueBy, today);
  if (days === null || dueBy === null) return null;
  if (days === 0) return 'Due today';
  if (days === 1) return 'Due tomorrow';
  if (days < 0) {
    const past = Math.abs(days);
    return `${past} ${past === 1 ? 'day' : 'days'} past`;
  }
  // Beyond a week the count stops being useful and the date itself is
  // clearer — "Due in 23 days" is a number you have to convert back.
  if (days <= 7) return `Due in ${days} days`;
  return `Due ${shortDay(dueBy, today)}`;
}

/** The word on the flag. One flag, one word. */
export const PRIORITY_LABEL = 'Priority';

/**
 * What should be looked at first.
 *
 * Priority outranks everything, then the nearest date, then the order it was
 * written down. A task with no date sorts after every task with one, because
 * a date is a commitment to the world and an undated task is a commitment to
 * yourself — and this is the one place the first outranks the second.
 *
 * Written as a comparator rather than as one packed number. The first cut
 * encoded the flag and the days into a single sort key by multiplying the
 * flag by a billion and adding the days, which put an undated priority task
 * (days standing in as `MAX_SAFE_INTEGER`, nine million times larger than the
 * offset) at the *bottom* of the list — the exact opposite of the one thing
 * the flag exists to do. Three explicit comparisons cannot overflow into each
 * other.
 */
export function byPressing(a: Task, b: Task, today: DayKey): number {
  if (a.priority !== b.priority) return a.priority ? -1 : 1;

  const left = daysUntil(a.dueBy, today);
  const right = daysUntil(b.dueBy, today);
  if (left === null && right !== null) return 1;
  if (left !== null && right === null) return -1;
  if (left !== null && right !== null && left !== right) return left - right;

  return a.createdAt - b.createdAt;
}

/** The same list, with the pressing things at the top. */
export function pressingFirst(tasks: Task[], today: DayKey): Task[] {
  return [...tasks].sort((a, b) => byPressing(a, b, today));
}

/**
 * Everything that deserves to be on the home screen, whatever day it is
 * planned for.
 *
 * The day's own list is not enough here, and that is the entire point: a task
 * due today that you have planned for tomorrow appears in *tomorrow's* list,
 * which is the one place you will not look today. Filtering by `committedFor`
 * would hide exactly the case this feature exists to catch.
 */
export function pressing(tasks: Task[], today: DayKey, horizon = BEARING_DAYS): Task[] {
  const worth = tasks.filter((task) => {
    if (task.doneAt !== null) return false;
    if (task.priority) return true;
    const days = daysUntil(task.dueBy, today);
    return days !== null && days <= horizon;
  });
  return pressingFirst(worth, today);
}

/**
 * The heading over them, or nothing.
 *
 * Says how many and stops. No "you have", no exclamation, and nothing
 * anywhere that totals how many dates have gone past — that figure is
 * derivable and showing it would turn a list into a record of failures.
 */
export function pressingLabel(count: number, plain = false): string {
  if (count === 1) return plain ? 'Needs doing' : 'Bearing down';
  return plain ? `Needs doing · ${count}` : `Bearing down · ${count}`;
}

/**
 * The line under a capped list, or nothing.
 *
 * Says how many are not drawn and where they are. Never "and 4 more overdue"
 * — the count is of rows this card chose not to render, which is a fact about
 * the card, not about the person.
 */
export function moreLine(total: number, shown: number, plain = false): string | null {
  const rest = total - shown;
  if (rest <= 0) return null;
  return plain ? `${rest} more in the list` : `${rest} more on the list ›`;
}

/**
 * When the plan and the deadline disagree.
 *
 * The one sentence the split between `dueBy` and `committedFor` buys, and the
 * reason they are separate fields. Descriptive only: it states the two days
 * and stops, because whether that is a problem is a thing only the person
 * knows.
 */
export function planNote(task: Task, today: DayKey, plain = false): string | null {
  if (task.dueBy === null || task.committedFor === null) return null;
  if (task.committedFor <= task.dueBy) return null;
  const when = saidDay(task.committedFor, today);
  return plain
    ? `Planned for ${when}, after its date.`
    : `Planned for ${when} — after the date it is due.`;
}

/**
 * A day, said the way a person would.
 *
 * "Planned for Sep 20" on Sep 20 is a schema showing through the app's own
 * voice — the same fault `shortDay` was written to fix one level up. Today
 * and tomorrow have names; everything else gets its date.
 */
function saidDay(day: DayKey, today: DayKey): string {
  const off = daysBetween(today, day);
  if (off === 0) return 'today';
  if (off === 1) return 'tomorrow';
  if (off === -1) return 'yesterday';
  return shortDay(day, today);
}

/* ------------------------------------------------------------- setting one */

/** The chips the capture form offers. Relative, because most dates are. */
export const DUE_CHIPS: { label: string; plain: string; days: number }[] = [
  { label: 'Today', plain: 'Today', days: 0 },
  { label: 'Tomorrow', plain: 'Tomorrow', days: 1 },
  { label: 'In 3', plain: '3 days', days: 3 },
  { label: 'A week', plain: '1 week', days: 7 },
];

/**
 * Full names, matched by prefix — never the other way round.
 *
 * The first cut held three-letter abbreviations and asked whether the typed
 * word started with one, which reads "febtember" as February. A month name is
 * a prefix *of* this list, so the test has to run in that direction.
 */
const MONTHS = [
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
];

/** The month a word names, or -1. At least three letters, so "ma" is not May. */
function monthOf(word: string): number {
  if (word.length < 3) return -1;
  return MONTHS.findIndex((name) => name.startsWith(word));
}

/**
 * Read a date somebody typed, or null.
 *
 * Takes the forms a person actually types when they are in a hurry: `15`,
 * `9/15`, `15 sep`, `sep 15`, `2026-09-15`. A bare day number means the next
 * time that day comes round, so typing `3` on the 28th means next month —
 * which is what you meant, and the alternative is a date already in the past.
 *
 * Returns null rather than guessing. A date the app got wrong is worse than a
 * date the app refused, because you would not check it.
 */
export function parseDay(text: string, today: DayKey): DayKey | null {
  const raw = text.trim().toLowerCase();
  if (raw.length === 0) return null;

  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (iso) {
    const day = raw as DayKey;
    return sane(day) ? day : null;
  }

  const now = fromDayKey(today);

  // A bare day of the month: the next time it comes round.
  const bare = /^(\d{1,2})$/.exec(raw);
  if (bare) {
    const dom = Number(bare[1]);
    if (dom < 1 || dom > 31) return null;
    return nextWithDay(now, dom);
  }

  // 9/15 or 9-15, month first — the ordering this app's owner writes in.
  const slash = /^(\d{1,2})[/-](\d{1,2})$/.exec(raw);
  if (slash) {
    const month = Number(slash[1]);
    const dom = Number(slash[2]);
    if (month < 1 || month > 12 || dom < 1 || dom > 31) return null;
    return inMonth(now, month - 1, dom);
  }

  // "sep 15" or "15 sep", with or without a full month name.
  const words = raw.split(/[\s,]+/).filter(Boolean);
  if (words.length === 2) {
    const [a, b] = words;
    const monthFirst = monthOf(a);
    const monthSecond = monthOf(b);
    if (monthFirst >= 0 && /^\d{1,2}$/.test(b)) return inMonth(now, monthFirst, Number(b));
    if (monthSecond >= 0 && /^\d{1,2}$/.test(a)) return inMonth(now, monthSecond, Number(a));
  }

  return null;
}

/** The next date with this day of the month, today included. */
function nextWithDay(now: Date, dom: number): DayKey | null {
  for (let ahead = 0; ahead < 13; ahead += 1) {
    const candidate = new Date(now.getFullYear(), now.getMonth() + ahead, dom);
    // A day number the month does not have rolls over in the Date
    // constructor, which would silently give the wrong date.
    if (candidate.getDate() !== dom) continue;
    if (toDayKey(candidate) >= toDayKey(now)) return toDayKey(candidate);
  }
  return null;
}

/**
 * How far into the past a named month-and-day is still taken at face value.
 *
 * The first cut rolled *any* past date forward a year, so typing `9/19` on
 * the 20th silently produced September of the following year — a twelve-month
 * jump, on a field whose whole job is to be right. Recording something that
 * was due last week is an ordinary thing to do; meaning next September is
 * not. A month away is the line between them.
 */
const BACKDATE_GRACE_DAYS = 30;

/**
 * That month and day. This year when it is recent or ahead, next year when it
 * is long past — "jan 5" typed in September means the coming January.
 */
function inMonth(now: Date, monthIndex: number, dom: number): DayKey | null {
  const thisYear = new Date(now.getFullYear(), monthIndex, dom);
  if (thisYear.getMonth() !== monthIndex || thisYear.getDate() !== dom) return null;

  const behind = daysBetween(toDayKey(thisYear), toDayKey(now));
  if (behind <= BACKDATE_GRACE_DAYS) return toDayKey(thisYear);

  const nextYear = new Date(now.getFullYear() + 1, monthIndex, dom);
  if (nextYear.getMonth() !== monthIndex || nextYear.getDate() !== dom) return null;
  return toDayKey(nextYear);
}

function sane(day: DayKey): boolean {
  const parsed = fromDayKey(day);
  return !Number.isNaN(parsed.getTime()) && toDayKey(parsed) === day;
}

/** A relative chip's day. */
export function dueFromChip(days: number, today: DayKey): DayKey {
  return addDays(today, days);
}
