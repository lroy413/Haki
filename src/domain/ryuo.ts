import { addDays, type DayKey } from './date';
import type { Task } from './tasks';

/**
 * 流桜 — Ryuo. How far the emission reaches.
 *
 * Armament is the black. Ryuo is what happens when you have been hardening
 * long enough that it pushes past the surface — and at the far end of it, two
 * forces meet without ever touching.
 *
 * The thing being measured is deliberately narrow: **did the top of the list
 * get struck?** Not how many tasks were cleared, not how many minutes were
 * logged. Clearing three easy things you added an hour ago while the one that
 * has been sitting there since Tuesday stays open is the exact failure this
 * app exists for, and counting it the same would be a lie.
 *
 * "The top" is the same thing the home screen calls Next Strike: the oldest
 * task still open on that day. So it needs no table of its own — a day counts
 * when the earliest-created task committed to it has been struck, which is
 * derivable from rows that already exist.
 *
 * Three rules, and the first is the one that matters:
 *
 * 1. **A day that misses costs nothing.** Reach is a count of days that went
 *    well inside a window, never a streak and never a penalty. Missing the top
 *    of the list does not undo anything; it just means the window has one
 *    fewer day in it, and tomorrow can put it back. Nothing here is ever
 *    phrased as a loss.
 * 2. **Reach is current, not cumulative.** It reads what has been true lately
 *    rather than what was once true, because that is what the emission is
 *    supposed to be showing.
 * 3. **It only ever scales decoration.** No feature unlocks, nothing is
 *    withheld. The corona goes further out, and that is the whole reward.
 */

export type RyuoTier = 0 | 1 | 2 | 3 | 4;

/** The trailing window reach is read over. Matches Hardness. */
export const WINDOW_DAYS = 28;

/** Days inside the window at which each tier begins. */
export const TIERS: Record<Exclude<RyuoTier, 0>, number> = {
  1: 3,
  2: 8,
  3: 15,
  4: 22,
};

/**
 * Did the top of that day's list get struck?
 *
 * The top is the earliest-created task committed to the day — the one the home
 * screen would have been showing. A day with nothing committed does not count:
 * there was no top to hit.
 */
export function topStruck(tasks: Task[], day: DayKey): boolean {
  let top: Task | null = null;
  for (const task of tasks) {
    if (task.committedFor !== day) continue;
    if (!top || task.createdAt < top.createdAt) top = task;
  }
  return top !== null && top.doneAt !== null;
}

/** How many days in the trailing window had their top struck. */
export function reachDays(tasks: Task[], today: DayKey, window = WINDOW_DAYS): number {
  let count = 0;
  for (let i = 0; i < window; i += 1) {
    if (topStruck(tasks, addDays(today, -i))) count += 1;
  }
  return count;
}

export function tierFor(days: number): RyuoTier {
  if (days >= TIERS[4]) return 4;
  if (days >= TIERS[3]) return 3;
  if (days >= TIERS[2]) return 2;
  if (days >= TIERS[1]) return 1;
  return 0;
}

/**
 * The multiplier on how far the corona travels.
 *
 * Tier 0 is 1 — the emission everyone gets, unchanged. Nothing is taken away
 * from someone who has not built reach yet; there is simply less of it to
 * come.
 */
export function reachFor(tier: RyuoTier): number {
  return [1, 1.2, 1.45, 1.7, 2.1][tier];
}

/** True at the tier where the emission stops needing contact. */
export function isClash(tier: RyuoTier): boolean {
  return tier === 4;
}

export function tierName(tier: RyuoTier): string {
  return (['Latent', 'Flowing', 'Reaching', 'Emitting', 'Beyond touch'] as const)[tier];
}

/**
 * What the app says about reach, in the one place it says anything.
 *
 * Written to describe distance rather than performance. There is no version of
 * this that tells you a day went badly, because a day where the top of the
 * list stayed open is a day, not a verdict.
 */
export function tierMessage(tier: RyuoTier, days: number): string {
  if (tier === 0) {
    return 'Reach builds on the days the top of the list gets struck.';
  }
  if (tier === 4) {
    return `${days} days at the top of the list. Far enough that it lands without contact.`;
  }
  const next = TIERS[(tier + 1) as Exclude<RyuoTier, 0>];
  return `${days} days at the top of the list. ${next - days} more and it reaches further.`;
}
