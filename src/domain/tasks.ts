/**
 * Tasks — the load you are carrying.
 *
 * Garp trains by carrying the weight. That is the model here: a task is not a
 * checkbox, it is an amount of time you have decided to carry today, and the
 * honest question is whether it fits.
 *
 * Everything in this file exists to fight one specific failure: an ADHD brain
 * facing a list of forty things does none of them. So —
 *
 * - **Estimates are mandatory.** Every task carries minutes. Time blindness is
 *   the core problem; a list with no durations cannot be planned against.
 * - **Today is a small, explicit set.** Nothing enters it by accident. The
 *   backlog is a separate place you visit on purpose, not a wall you face
 *   every time you open the app.
 * - **One next thing.** The home screen asks for a single commitment, because
 *   starting is the hard part and a list of options is where starting dies.
 * - **Over-commitment is named, not punished.** Going over capacity is
 *   information about the plan, never a verdict on you.
 */

import { daysBetween, type DayKey } from './date';

export type Task = {
  id: number;
  title: string;
  /** The estimate, in minutes. Always present — that is the point. */
  minutes: number;
  /** The day this was pulled into, or null while it sits in the backlog. */
  committedFor: DayKey | null;
  doneAt: number | null;
  /**
   * The rhythm that produced this, by that rhythm's `createdAt`. Null for an
   * ordinary one-off task. See `domain/rhythm.ts`.
   */
  rhythmKey: number | null;
  /**
   * The island this was struck from, by that poneglyph's `createdAt`. Null
   * for everything not born on the Log Pose — which is most tasks. The link
   * is what lets an arrival say what it actually took. See `islandWake`.
   */
  islandKey: number | null;
  /** Which watch of the day this is placed in, or null for any time. */
  watch: Watch | null;
  createdAt: number;
};

/**
 * The three watches — the day, divided the way a crew divides it.
 *
 * A schedule in this app's accent: not hours, not calendar slots, just which
 * stretch of the day a thing belongs to. Optional on every task — an
 * unplaced task is normal, not incomplete — and the day's list only grows
 * watch headings once something actually carries one.
 */
export type Watch = 'morning' | 'afternoon' | 'evening';

export const WATCH_ORDER: Watch[] = ['morning', 'afternoon', 'evening'];

export const WATCHES: Record<Watch, { label: string; short: string; kanji: string }> = {
  morning: { label: 'Morning watch', short: 'Morning', kanji: '朝' },
  afternoon: { label: 'Afternoon watch', short: 'Afternoon', kanji: '昼' },
  evening: { label: 'Evening watch', short: 'Evening', kanji: '夜' },
};

export function isWatch(value: string): value is Watch {
  return value in WATCHES;
}

/**
 * The day's list, split by watch, in watch order, unplaced last.
 *
 * Groups with nothing in them are absent rather than empty: three headings
 * over one task is a timetable, and this is not a timetable. When no task
 * carries a watch at all the result is one unlabelled group — the exact list
 * the screen showed before watches existed.
 */
export function byWatch<T extends { watch: Watch | null }>(
  items: T[],
): { watch: Watch | null; items: T[] }[] {
  const groups: { watch: Watch | null; items: T[] }[] = [];
  for (const watch of [...WATCH_ORDER, null] as (Watch | null)[]) {
    const inWatch = items.filter((item) => item.watch === watch);
    if (inWatch.length > 0) groups.push({ watch, items: inWatch });
  }
  return groups;
}

/**
 * What an island's wake holds: every struck task that carries its key.
 *
 * Counts and minutes, nothing else — the Log Pose's rule about denominators
 * binds here too. There is no "of", no target, no pace; the wake is what the
 * water shows behind you.
 */
export function islandWake(
  tasks: { islandKey: number | null; doneAt: number | null; minutes: number }[],
  key: number,
): { struck: number; minutes: number } {
  let struck = 0;
  let minutes = 0;
  for (const task of tasks) {
    if (task.islandKey !== key || task.doneAt === null) continue;
    struck += 1;
    minutes += task.minutes;
  }
  return { struck, minutes };
}

/**
 * The wake, said in one mono line — or nothing at all.
 *
 * Null when nothing has been struck under the island yet: a record shows
 * what is astern, and an empty wake is not a thing to report. "Nothing yet"
 * under every fresh island would be six absences on a screen about work.
 */
export function wakeLine(wake: { struck: number; minutes: number }): string | null {
  if (wake.struck === 0) return null;
  const struck = `${wake.struck} struck`;
  return wake.minutes > 0 ? `${struck} · ${formatMinutes(wake.minutes)} in its wake` : struck;
}

/** Sensible default for a single task: small enough to actually start. */
export const DEFAULT_TASK_MINUTES = 15;

/**
 * How much intentional work a day can really hold, in minutes.
 *
 * Three hours, not eight. This is time you deliberately spend on things you
 * chose, around a job and a life — setting it at eight guarantees the app
 * lies to you every single day.
 */
export const DEFAULT_CAPACITY_MINUTES = 180;

/** A task sitting untouched this long is worth a decision, not another day. */
export const STALE_AFTER_DAYS = 14;

export type LoadRead = 'empty' | 'light' | 'full' | 'over';

export type Load = {
  /** Committed to this day and not yet done. */
  open: Task[];
  doneToday: Task[];
  openMinutes: number;
  doneMinutes: number;
  capacityMinutes: number;
  read: LoadRead;
  /** Minutes past capacity. Zero unless `read` is 'over'. */
  overBy: number;
};

const sumMinutes = (tasks: Task[]) =>
  tasks.reduce((total, t) => total + (Number.isFinite(t.minutes) ? t.minutes : 0), 0);

export function isDone(task: Task): boolean {
  return task.doneAt !== null;
}

/** Everything not committed to a day and not finished. */
export function backlog(tasks: Task[]): Task[] {
  return tasks
    .filter((t) => t.committedFor === null && !isDone(t))
    .sort((a, b) => a.createdAt - b.createdAt);
}

/**
 * Backlog items old enough to deserve a decision.
 *
 * Surfaced for triage, never auto-deleted — silently dropping something you
 * wrote down is how an app stops being trustworthy.
 */
export function stale(tasks: Task[], today: DayKey, afterDays = STALE_AFTER_DAYS): Task[] {
  return backlog(tasks).filter((t) => {
    const age = daysBetween(dayOf(t.createdAt), today);
    return age >= afterDays;
  });
}

function dayOf(timestamp: number): DayKey {
  const d = new Date(timestamp);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export function todaysLoad(
  tasks: Task[],
  today: DayKey,
  capacityMinutes = DEFAULT_CAPACITY_MINUTES,
): Load {
  const forToday = tasks.filter((t) => t.committedFor === today);
  const open = forToday.filter((t) => !isDone(t)).sort((a, b) => a.createdAt - b.createdAt);
  const doneToday = forToday.filter(isDone).sort((a, b) => (a.doneAt ?? 0) - (b.doneAt ?? 0));

  const openMinutes = sumMinutes(open);
  const doneMinutes = sumMinutes(doneToday);
  const capacity = capacityMinutes > 0 ? capacityMinutes : DEFAULT_CAPACITY_MINUTES;

  // Finished work still spent the time, so it counts against the day.
  const total = openMinutes + doneMinutes;

  let read: LoadRead;
  if (forToday.length === 0) read = 'empty';
  else if (total > capacity) read = 'over';
  else if (total >= capacity * 0.75) read = 'full';
  else read = 'light';

  return {
    open,
    doneToday,
    openMinutes,
    doneMinutes,
    capacityMinutes: capacity,
    read,
    overBy: read === 'over' ? total - capacity : 0,
  };
}

/**
 * The single next thing.
 *
 * The oldest open task on today's list, not the smallest and not the most
 * urgent — ordering by anything clever turns picking into another decision,
 * and the decision is what you were trying to avoid.
 */
export function nextStrike(load: Load): Task | null {
  return load.open[0] ?? null;
}

export function formatMinutes(minutes: number): string {
  const m = Math.max(0, Math.round(minutes));
  if (m < 60) return `${m}m`;
  const hours = Math.floor(m / 60);
  const rest = m % 60;
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
}

/**
 * What the app says about today's load.
 *
 * `light` returns null on purpose. A quiet day is not an achievement to praise
 * and not a gap to fill — the app has nothing useful to say about it.
 */
export function loadMessage(load: Load): string | null {
  if (load.read === 'empty') return 'Nothing pulled in for today yet.';

  // A cleared list comes first: "0m still to carry" and "this belongs to
  // another day" are both about work that is still open, and once everything
  // is struck they read as the day not counting — the exact opposite of what
  // happened.
  if (load.open.length === 0 && load.doneToday.length > 0) {
    return `The list is clear. ${formatMinutes(load.doneMinutes)} carried today.`;
  }

  if (load.read === 'over') {
    return (
      `${formatMinutes(load.openMinutes + load.doneMinutes)} on today against about ` +
      `${formatMinutes(load.capacityMinutes)}. ${formatMinutes(load.overBy)} of this belongs ` +
      `to another day — moving it is a decision, not a loss.`
    );
  }

  if (load.read === 'full') {
    return `${formatMinutes(load.openMinutes)} still to carry. That is a full day as it stands.`;
  }

  return null;
}
