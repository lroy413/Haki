import { daysBetween, type DayKey } from './date';
import { isDone, type Task } from './tasks';

/**
 * Tasks still at sea — committed to a day that has passed, and not done.
 *
 * These used to appear nowhere at all. `todaysLoad` wants `committedFor` to be
 * today and `backlog` wants it to be null, so a task committed to yesterday
 * and left undone fell between the two and was orphaned in the database: still
 * there, never shown, never decided about. The owner's words for it were "it
 * shouldn't just drop it", and the app was doing something worse than
 * dropping it — it was losing it quietly.
 *
 * The model is the Log Pose's, one size down. An island at sea is visible with
 * its days on it until you either reach it or sail past, and **the concept
 * document is explicit that showing the count is most of the intervention**:
 * most people who do not finish things have no idea how many open loops they
 * are carrying. A task is the same shape at a smaller scale, so it gets the
 * same treatment and the same asymmetry:
 *
 *   **Striking it is one tap.** Doing the thing never costs anything.
 *   **Moving it costs a written line**, and so does letting it go. A decision
 *   you cannot be bothered to write down is drift wearing a different coat —
 *   the Log Pose's rule, and the reason this is accountability rather than a
 *   nag. The app never says you failed to do it. It asks what happened, and
 *   the answer is in your words.
 *
 * What this is not: **days at sea are never a score.** No colour turns because
 * a number got big, nothing is ranked by it, and there is no total anywhere of
 * how much you have carried. It is the same figure an island wears, and it
 * reads the same way — a fact about a thing, not a verdict on a person.
 */

export type AtSea = {
  task: Task;
  /** The day it was committed to. */
  from: DayKey;
  /** How many days ago that was. Always at least 1. */
  days: number;
};

/**
 * Everything committed to a past day and still open, oldest first.
 *
 * Oldest first on purpose: the thing that has been waiting longest is the one
 * avoidance is most likely to be about, and it is the one Ryuo already counts
 * as the top of the list.
 */
export function atSea(tasks: Task[], today: DayKey): AtSea[] {
  return tasks
    .filter((t) => t.committedFor !== null && t.committedFor < today && !isDone(t))
    .map((t) => ({
      task: t,
      from: t.committedFor as DayKey,
      days: daysBetween(t.committedFor as DayKey, today),
    }))
    .sort((a, b) => b.days - a.days || a.task.createdAt - b.task.createdAt);
}

/**
 * How long it has been out, said plainly.
 *
 * States the number and stops. There is no version of this that adds "still",
 * "already" or an exclamation mark — the figure is doing the work, and dressing
 * it up would turn a fact into a telling-off.
 */
export function atSeaLine(days: number, plain = false): string {
  const n = Math.max(1, days);
  const unit = n === 1 ? 'day' : 'days';
  return plain ? `Open ${n} ${unit}` : `${n} ${unit} at sea`;
}

/** The heading over the group. */
export function atSeaLabel(count: number, plain = false): string {
  if (plain) return count === 1 ? 'Still open' : `Still open · ${count}`;
  return count === 1 ? 'Still at sea' : `Still at sea · ${count}`;
}

/**
 * The prompt above the line you have to write.
 *
 * A question, not an accusation, and it stays a question either way — the app
 * does not know whether moving a thing is wise or avoidant, and pretending to
 * would be the overreach `foresight.ts` exists to refuse. There is no version
 * of this that says what you ought to have done.
 */
export function movePrompt(carrying: boolean, plain = false): string {
  if (carrying) {
    return plain ? 'What got in the way?' : 'What got in the way? One line.';
  }
  return plain ? 'Why not today?' : 'Why not today? One line.';
}

/**
 * Where it goes, in the app's own vocabulary.
 *
 * The second one is deliberately not "let it go" or "drop it": the task is
 * not destroyed, it goes back to Waiting with a line attached. Naming the
 * real destination is the difference between a decision and a disappearance —
 * and the row it lands in already has a delete for anything you genuinely
 * want gone.
 */
/**
 * The two destinations, named after the lists they are.
 *
 * Deliberately not "Carry today": the capture form's primary button already
 * says that, and it means something else — commit a *new* task to today. Two
 * controls with one name on one screen is how a list gets mis-tapped, and a
 * screen reader walking the page would announce them identically. "Today" is
 * what the backlog rows on the same screen already say for the same move.
 *
 * "Waiting" over "let it go" or "drop it" for the same reason: the task is not
 * destroyed, it goes back to the Waiting list. Naming the real destination is
 * the difference between a decision and a disappearance — and the row it lands
 * in already has a delete for anything you genuinely want gone.
 *
 * Neither changes in plain mode. They are the names of two lists, not a
 * performance.
 */
export const CARRY_LABEL = 'Today';
export const WAIT_LABEL = 'Waiting';

/** What the row tells a screen reader, which has no column headings to read. */
export function moveDescription(title: string, to: 'today' | null): string {
  return to === 'today' ? `Bring ${title} into today` : `Move ${title} to Waiting`;
}

/** The shortest a reason may be. One word is a reason; nothing is not. */
export const MIN_REASON = 2;
export const MAX_REASON = 200;

export function reasonReady(text: string): boolean {
  return text.trim().length >= MIN_REASON;
}

/**
 * How long something may sit before carrying it forward costs a line.
 *
 * Carrying on the first day is a Tuesday. Carrying on the sixth is the
 * pattern the owner named — "procrastination and avoidance" — and the thing
 * he asked to be held to. So the friction is not a flat tax on every move,
 * which would just make the list expensive to keep and therefore abandoned;
 * it arrives exactly when the figure the row already shows says it should.
 */
export const LINE_AFTER_DAYS = 2;

/**
 * Whether this move has to be written down.
 *
 * Leaving the day entirely always does — that is the decision, and it is the
 * Log Pose's "sailed past" one size down. Carrying forward does once it has
 * been carried a while.
 *
 * Striking it never appears here, because doing the thing is never made
 * harder. That is the whole asymmetry.
 */
export function needsLine(days: number, to: 'today' | null): boolean {
  return to === null || days >= LINE_AFTER_DAYS;
}
