import type { DayKey } from './date';

/**
 * Headway — ground made toward a pillar that was not the island you were
 * sailing to.
 *
 * The Log Pose models one thing: something you steer toward, one at a time,
 * closed by reaching it or sailing past it. That is the right model for what
 * you *plan*, and it had no room at all for what actually happens. The owner:
 * _"yesterday the main cam Op on the show I was sick and I filled in for him.
 * Unplanned and unexpected but it's a big step towards that main goal and I
 * wanted a way to log it as progress."_
 *
 * An island cannot hold that. An island is set before it happens and closed
 * after; you cannot name one for a thing that already arrived by surprise,
 * and filling in for somebody has nothing to do with whichever island is
 * currently open. Nor is it a task — a task is a thing you decide to do.
 *
 * So a mark is its own shape, and the whole shape is: **it already happened,
 * it moved this pillar, and it is written down.** No state, no closing, no
 * limit on how many. One line, one day.
 *
 * Four rules, and the first is the one that keeps this honest:
 *
 * - **Marks are listed and never totalled.** No count on the pillar, no
 *   "3 this month", nothing ranked by how many a pillar has. Islands astern
 *   are counted because you steered to every one of them; a chance you were
 *   ready for is not something you can decide to have more of, and a figure
 *   you cannot influence, displayed as an achievement, is luck wearing a
 *   score's clothes. The list is the record — reading it back is the whole
 *   feature, exactly as it is for the reasons on this screen.
 * - **Planned or not is not recorded.** The first cut had a flag for it, and
 *   a flag is a grade: it invites the question of which kind counts more, and
 *   the answer would be a rule about somebody's luck. What moved it moved it.
 * - **It is a record, so it never hardens the app.** Hardening reads the day
 *   being *used*, and this is usually written down about a day that has
 *   already gone — the owner logged Tuesday's on Wednesday. Weight for a
 *   backdated record would let a good week be re-entered as a better one.
 * - **The day can be moved back and never forward.** You write these up when
 *   you get to them; you cannot have made headway tomorrow.
 */

export type Mark = {
  id: number;
  /** The pillar's creation stamp — ids do not survive a backup. */
  roadKey: number;
  text: string;
  day: DayKey;
  createdAt: number;
};

/**
 * One line. Long enough for "Filled in as main cam op on the show", short
 * enough that it stays a mark rather than becoming the journal — the words
 * about how it felt belong in an entry, and this is the fact.
 */
export const MAX_TEXT = 140;

export function isSayable(text: string): boolean {
  return text.trim().length > 0;
}

/** Newest first: the last thing that moved a pillar is what you came to see. */
export function newestFirst(marks: Mark[]): Mark[] {
  return [...marks].sort((a, b) => b.day.localeCompare(a.day) || b.createdAt - a.createdAt);
}

/**
 * What the section says when a pillar has none.
 *
 * The offer, never the absence — the practice card's rule. An empty list here
 * is the ordinary state of a pillar raised this morning, and the app has
 * nothing to say about it beyond what would go in it. It is also the only
 * line the section ever carries: once there are marks the list says what it
 * is far better than a sentence above it could, and a standing explanation
 * of a section you are already using is onboarding that never leaves.
 */
export function emptyLine(plain = false): string {
  return plain
    ? 'Nothing here yet. Anything that moved this goal counts, planned or not.'
    : 'Nothing marked yet. Anything that moved this counts — a step you took, or one that arrived.';
}
