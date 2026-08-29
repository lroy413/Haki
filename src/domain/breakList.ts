import type { DayKey } from './date';

/**
 * The Break List — urges, not failures.
 *
 * The concept document's line, and the reason this exists at all: *most apps
 * only let you record the loss.* Every quit-tracker ever built is a counter
 * that goes up while you hold and resets to zero when you do not, which means
 * the only thing it can record about the hardest thing you did all week is
 * that you eventually stopped doing it. **There was nowhere in this app to
 * record a win that consists of not doing something.**
 *
 * So the unit here is the *urge*, not the day and not the run. An urge landed;
 * something happened. Both outcomes are written down, neither is scored, and
 * the app has no opinion about either.
 *
 * - **There is no streak and there is nowhere to put one.** Not "14 days
 *   clean", not a longest run, not a count since. That figure is the shame
 *   machine this whole app was built to avoid, and it is worse here than
 *   anywhere else in it: a number whose only move is to zero turns one bad
 *   hour into the erasure of a month. Nothing accumulates.
 * - **A slip is data.** It is written down in the same words, in the same
 *   list, at the same weight. Nothing turns red, nothing resets, nothing says
 *   "again". The one asymmetry allowed is that a hold is *named* as one —
 *   because a win nobody records is a win nobody had.
 * - **Logging is one tap, both ways.** The tap has to be cheaper at the worst
 *   moment of the week than not tapping. There is no required line, no
 *   "how strong was it" dial, no mood check first.
 * - **An urge you are still in is a real state.** "Riding it out" records one
 *   with no ending yet, because opening the app mid-urge is itself the coping
 *   act and the concept says to log the craving *the moment it lands*. It is
 *   never nagged about and never rolled into tomorrow: an urge that stayed
 *   open is a true record of an evening, not a task you failed to close.
 * - **An urge costs will whichever way it went.** The wanting is the expensive
 *   part. Making a slip cost more would be a punishment with arithmetic on it,
 *   and making a hold cost more would tax the thing the feature is for.
 */

export type Outcome = 'held' | 'went' | 'riding';

export type Break = {
  id: number;
  name: string;
  createdAt: number;
  /** Off the list. Every urge it ever carried stays where it was. */
  retiredAt: number | null;
};

export type Urge = {
  id: number;
  /** The break's `createdAt`, not its row id — ids move on import. */
  breakKey: number;
  day: DayKey;
  outcome: Outcome;
  createdAt: number;
};

export const MAX_NAME = 60;

export function nameReady(text: string): boolean {
  return text.trim().length > 0;
}

export function isOutcome(value: string): value is Outcome {
  return value === 'held' || value === 'went' || value === 'riding';
}

/**
 * What each button says.
 *
 * "Went with it" rather than "gave in", "relapsed", "failed" or "slipped".
 * Every one of those words is a verdict, and three of them are clinical
 * vocabulary borrowed to make a person feel like a case. You went with it.
 * That is what happened.
 */
export const OUTCOME_LABEL: Record<Outcome, string> = {
  held: 'Held',
  went: 'Went with it',
  riding: 'Riding it out',
};

export const OUTCOME_LABEL_PLAIN: Record<Outcome, string> = {
  held: 'Resisted',
  went: 'Gave in',
  riding: 'In it now',
};

export function outcomeLabel(outcome: Outcome, plain = false): string {
  return plain ? OUTCOME_LABEL_PLAIN[outcome] : OUTCOME_LABEL[outcome];
}

/** The breaks still on the list, in the order they were named. */
export function live(breaks: Break[]): Break[] {
  return breaks.filter((b) => b.retiredAt === null);
}

/** Today's urges, newest first, each with the break it belongs to. */
export function urgesOn(urges: Urge[], breaks: Break[], day: DayKey): (Urge & { of: Break })[] {
  const byKey = new Map(breaks.map((b) => [b.createdAt, b]));
  return urges
    .filter((u) => u.day === day)
    .flatMap((u) => {
      const of = byKey.get(u.breakKey);
      return of ? [{ ...u, of }] : [];
    })
    .sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * The day, said out loud — and this is the sentence the feature exists for.
 *
 * A hold that is never named is a hold that never happened, so the app says
 * it: "Two urges. Both held." It is one day's arithmetic and it accumulates
 * into nothing — there is no week's version of this line, no month's, and no
 * running figure anywhere that it feeds.
 *
 * The shape of the sentence never changes with the outcome. A day where none
 * were held gets the same grammar as a day where all of them were, because a
 * different shape for a bad day is the app raising an eyebrow.
 */
export function dayLine(urges: Urge[], plain = false): string | null {
  if (urges.length === 0) return null;
  const held = urges.filter((u) => u.outcome === 'held').length;
  const riding = urges.filter((u) => u.outcome === 'riding').length;
  const n = urges.length;
  const count = plain
    ? `${n} ${n === 1 ? 'urge' : 'urges'}.`
    : `${n === 1 ? 'One urge' : `${n} urges`}.`;

  if (riding === n) return plain ? `${count} In it now.` : `${count} Still in it.`;

  const settled = n - riding;
  if (held === 0) return count;
  if (held === settled) {
    const all = settled === 1 ? 'Held it.' : 'Held every one.';
    return `${count} ${plain ? (settled === 1 ? 'Resisted.' : 'Resisted all.') : all}`;
  }
  return `${count} ${held} ${plain ? 'resisted.' : 'held.'}`;
}

/**
 * Before there is anything to log against.
 *
 * An offer, not an absence — the day's practice card's rule. What is on offer
 * is somewhere to put an urge, and the sentence says what the list is for
 * rather than what is missing from it.
 */
export function emptyListLine(plain = false): string {
  return plain
    ? 'Name something you are trying not to do. Urges get logged against it — both ways.'
    : 'Name what you are trying not to do. When the urge lands it goes here, whichever way it went.';
}

/** A day with the list in place and nothing logged on it. */
export function quietDayLine(plain = false): string {
  return plain
    ? 'Nothing logged today.'
    : 'Nothing logged today. An urge goes here the moment it lands.';
}

export const LET_GO_LABEL = 'Off the list';
export const LET_GO_NOTE = 'It comes off the list. Every urge it carried stays.';

/**
 * Did today have a held urge in it?
 *
 * This is the one thing the Break List tells the rest of the app, and it feeds
 * exactly one place: `resisted()` in `voyage.ts`, which decides whether the
 * Calm Belt's run of easy days is still running. Holding an urge is
 * unambiguously the hard thing, and a week of them is not a dead calm.
 *
 * It deliberately does **not** feed hardening. Hardening reads the day being
 * *used*, and a day whose only entry is three urges is not a day you used —
 * and a level that rose as you logged them would make logging them farmable,
 * which is the one thing that would corrupt this data.
 */
export function heldSomething(urges: Urge[]): boolean {
  return urges.some((u) => u.outcome === 'held');
}

/**
 * The log, read back: days newest first, with what landed on each.
 *
 * Chronological and never aggregated — `carried`'s rule. You may read what
 * happened; the app may not turn it into a finding. An urge whose break has
 * gone from the list entirely is skipped rather than drawn nameless.
 */
export function readBack(
  urges: Urge[],
  breaks: Break[],
): { day: DayKey; urges: (Urge & { of: Break })[] }[] {
  const byKey = new Map(breaks.map((b) => [b.createdAt, b]));
  const days = new Map<DayKey, (Urge & { of: Break })[]>();
  for (const urge of [...urges].sort((a, b) => a.createdAt - b.createdAt)) {
    const of = byKey.get(urge.breakKey);
    if (!of) continue;
    const list = days.get(urge.day) ?? [];
    list.push({ ...urge, of });
    days.set(urge.day, list);
  }
  return [...days.entries()]
    .map(([day, list]) => ({ day, urges: list }))
    .sort((a, b) => b.day.localeCompare(a.day));
}
