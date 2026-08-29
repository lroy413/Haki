import { WATCHES, WATCH_ORDER, type Watch } from './tasks';

/**
 * The day, drawn.
 *
 * The three watches already exist — tasks have carried one since the day the
 * capture row grew its second chip row, and the Do tab groups by them. What
 * has never existed is the *shape*: how much is in each watch, where the day
 * currently is, and what is still in the hold waiting to be placed.
 *
 * A crew divides the day into watches rather than into twenty-four rows, and
 * that is the whole argument for this over an hour grid. Three bands is a
 * shape you can read at a glance and plan against without deciding what
 * o'clock anything happens at — which is the decision that never gets made.
 *
 * Two rules, and the second is the one that keeps this from becoming a
 * scheduler:
 *
 * 1. **Load is a fact in minutes, never a capacity.** No bar filling toward a
 *    limit, no percentage of the day planned, no colour that changes when a
 *    watch is "too full". The app does not know how much you can do, and a
 *    figure that implied it would be inventing a denominator — the same rule
 *    the Log Pose holds about journeys.
 * 2. **The hold is the ordinary place to be.** A task with no watch is not
 *    unscheduled, unplanned or late. Placing one is an offer, exactly as a
 *    rhythm is, and nothing anywhere counts how many were placed.
 */

/** Clock hour each watch begins. The evening runs on into the small hours. */
export const WATCH_STARTS: Record<Watch, number> = {
  morning: 5,
  afternoon: 12,
  evening: 17,
};

/**
 * The window the strip draws, in clock hours.
 *
 * Five in the morning to midnight. Deliberately not the voyage's own day
 * boundary: that boundary decides which *day* an act belongs to, and this
 * decides where to put the sun. Somebody working to two in the morning is in
 * the evening watch of a day that has not rolled over, and the sky above them
 * is dark — both of those are true at once and neither needs the other.
 */
export const DAY_OPENS = 5;
export const DAY_CLOSES = 24;
const SPAN = DAY_CLOSES - DAY_OPENS;

/** Which watch a clock hour falls in. The small hours belong to the evening. */
export function watchAt(hour: number): Watch {
  const h = ((hour % 24) + 24) % 24;
  if (h >= WATCH_STARTS.evening || h < WATCH_STARTS.morning) return 'evening';
  if (h >= WATCH_STARTS.afternoon) return 'afternoon';
  return 'morning';
}

/** Where a watch sits across the strip, each 0..1. */
export type Band = { watch: Watch; from: number; to: number };

export const BANDS: Band[] = WATCH_ORDER.map((watch, i) => {
  const next = WATCH_ORDER[i + 1];
  return {
    watch,
    from: (WATCH_STARTS[watch] - DAY_OPENS) / SPAN,
    to: next === undefined ? 1 : (WATCH_STARTS[next] - DAY_OPENS) / SPAN,
  };
});

/**
 * Where the sun sits across the drawn day, 0..1 — or null when it is not up.
 *
 * The one variable in the drawing, and it is a position rather than a
 * quantity: the sun says what time it is, not how the day is going. The Sunny
 * at the top of the same screen stays at anchor for exactly the opposite
 * reason — a ship travelling toward somewhere would be a progress bar.
 */
export function sunAt(hour: number, minute = 0): number | null {
  const h = hour + minute / 60;
  if (h < DAY_OPENS || h >= DAY_CLOSES) return null;
  return (h - DAY_OPENS) / SPAN;
}

/** What a watch is carrying. */
export type Cargo<T> = { watch: Watch; items: T[]; minutes: number };

export type Manifest<T> = {
  /** Every watch, in order — including the empty ones, which the strip draws. */
  watches: Cargo<T>[];
  /** Placed nowhere in particular. The ordinary place for a task to be. */
  hold: T[];
  /** Minutes across the whole day, placed and unplaced alike. */
  minutes: number;
};

type Placeable = { watch: Watch | null; minutes: number };

/**
 * Sort the day's list into its watches.
 *
 * Unlike `byWatch`, every watch comes back whether or not it holds anything:
 * the strip draws three bands always, because a day with an empty afternoon
 * is a fact about the afternoon rather than a reason to redraw the day.
 */
export function manifest<T extends Placeable>(items: T[]): Manifest<T> {
  const watches = WATCH_ORDER.map((watch) => {
    const inWatch = items.filter((i) => i.watch === watch);
    return {
      watch,
      items: inWatch,
      minutes: inWatch.reduce((sum, i) => sum + Math.max(0, i.minutes), 0),
    };
  });
  const hold = items.filter((i) => i.watch === null);

  return {
    watches,
    hold,
    minutes: items.reduce((sum, i) => sum + Math.max(0, i.minutes), 0),
  };
}

/**
 * What a watch's line says.
 *
 * An empty watch says what it is rather than that it is empty — open water,
 * not a gap to be filled. The app's own law about offers over absences,
 * applied to a band of time.
 */
export function watchLine(cargo: Cargo<unknown>, plain = false): string {
  if (cargo.items.length === 0) return plain ? 'Nothing placed' : 'Open water';
  const n = cargo.items.length;
  return `${n} ${n === 1 ? 'thing' : 'things'}`;
}

/** The name a watch goes by on the strip. */
export function watchName(watch: Watch, plain = false): string {
  return plain ? WATCHES[watch].short : WATCHES[watch].label;
}
