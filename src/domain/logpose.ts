import { daysAtSea, type DayKey } from './date';

/**
 * 覇王色 — the Log Pose. Where you are going, and what it takes to get there.
 *
 * Three sizes, and the whole design is the relationship between them:
 *
 *   **The Dream** — one. Never revised downward, never made "realistic", never
 *   scaled for a bad month. Luffy's is Pirate King; Zoro's is the greatest
 *   swordsman. It is not a goal, it is the direction goals are measured
 *   against, and there is exactly one because a person who has two does not
 *   have one.
 *
 *   **Road Poneglyphs** — the big things that have to happen for the dream to
 *   be reachable at all. Four of them triangulate Laugh Tale in canon, and
 *   four is the target here for the same reason: it is enough to describe a
 *   life and few enough to hold in your head. Seven is the ceiling, because
 *   life sometimes genuinely has more than four fronts and a system that
 *   refuses to admit it just gets lied to.
 *
 *   **Poneglyphs** — the islands. One concrete milestone under a Road
 *   Poneglyph, reachable in weeks rather than years.
 *
 * ---
 *
 * **A journey has no denominator.** Nothing here is a percentage, a bar, or an
 * "N of M", and it never can be — nobody sailing knows how many islands are
 * left, and any number claiming to would be invented. So progress is reported
 * the only honest way: what you have reached, counted, with no total beside
 * it. This is the same rule `domain/hardening.ts` holds, arrived at from the
 * other direction.
 *
 * **One island at a time per Road Poneglyph.** The Log Pose points at the next
 * island *only*, and does not recalibrate until you have arrived. That is the
 * WIP limit, and it is the fix for the failure mode this module exists to
 * treat: unfinished projects are almost never a decision to quit, they are
 * silent drift — you never chose to stop, you just stopped, and the thing
 * stays technically open forever. You cannot open a second island under a
 * pillar while one is at sea.
 *
 * **Finish or sail past — no third option.** Wanting to start something new is
 * fine. It costs one decision: reach the open island, or sail past it, and
 * sailing past is a logged event with a reason attached. Always allowed, never
 * graded, never called a failure — but *chosen*, out loud, which is the entire
 * intervention. Drift is what this converts into a decision.
 *
 * **No meter.** Observation has a state and Armament has a hardness; this lens
 * deliberately has neither. Conqueror's cannot be trained, only refined — it
 * is knowing exactly who you are — and a number that went up when you knew
 * yourself better would be a lie about what the thing is. What this reports is
 * a *bearing*: where the needles are pointing. Not how far along you are.
 */

/** Four triangulates. The number the app suggests, and never enforces. */
export const ROAD_TARGET = 4;

/**
 * The ceiling. Above this the same week is split more ways than it can be, and
 * the pillars stop being pillars — but the gap between four and seven exists
 * because real life sometimes has five fronts and a system that says otherwise
 * only teaches you to keep the fifth one out of it.
 */
export const ROAD_MAX = 7;

export type PoneglyphState = 'open' | 'reached' | 'passed';

/** A Road Poneglyph — one of the big things the dream requires. */
export type Road = {
  id: number;
  /**
   * Creation timestamp, used as the stable link from its Poneglyphs.
   *
   * Row ids are deliberately not carried in backups — they are autoincrement
   * values that mean nothing outside the database that issued them — so a
   * child table cannot reference one and survive an export. `createdAt` is the
   * natural key everything else in this app dedupes on, it is stable across a
   * rename, and it round-trips.
   */
  key: number;
  title: string;
  /** Why the dream needs this. Optional — some are self-evident. */
  why: string | null;
  retired: boolean;
};

/** A Poneglyph — one island under one Road Poneglyph. */
export type Poneglyph = {
  id: number;
  roadKey: number;
  title: string;
  state: PoneglyphState;
  openedOn: DayKey;
  closedOn: DayKey | null;
  /** Why you sailed past. Only ever set on a passed island. */
  reason: string | null;
};

/** One Road Poneglyph, read: what it points at and what is astern of it. */
export type Needle = {
  road: Road;
  /** The island at sea under this pillar, or null while the needle spins. */
  next: Poneglyph | null;
  /** Day 1 is the day it was opened. Null with nothing open. */
  atSea: number | null;
  reached: number;
  /** Everything closed under this pillar, most recent first. */
  astern: Poneglyph[];
};

export type LogPose = {
  dream: string | null;
  needles: Needle[];
  /** Islands at sea across every pillar. */
  open: number;
  /** Islands reached, all time, across every pillar. No denominator. */
  reached: number;
};

/**
 * Read the whole thing.
 *
 * Retired pillars keep their history but drop off the needles: a front you
 * have stepped away from is not a spinning compass you have to look at.
 */
export function logPose(
  dream: string | null,
  roads: Road[],
  glyphs: Poneglyph[],
  today: DayKey,
): LogPose {
  const live = roads.filter((r) => !r.retired);

  const needles = live.map((road): Needle => {
    const mine = glyphs.filter((g) => g.roadKey === road.key);
    const next = mine.find((g) => g.state === 'open') ?? null;
    const astern = mine
      .filter((g) => g.state !== 'open')
      .sort((a, b) => (b.closedOn ?? '').localeCompare(a.closedOn ?? ''));

    return {
      road,
      next,
      atSea: next ? daysAtSea(next.openedOn, today) : null,
      reached: mine.filter((g) => g.state === 'reached').length,
      astern,
    };
  });

  return {
    dream: dream?.trim() ? dream.trim() : null,
    needles,
    open: needles.filter((n) => n.next !== null).length,
    // Every reached island counts, including ones under a retired pillar —
    // stepping away from a front does not un-sail the water behind you.
    reached: glyphs.filter((g) => g.state === 'reached').length,
  };
}

/**
 * Can another island be opened under this pillar?
 *
 * The WIP limit, and the only rule in this module that says no to anything.
 */
export function canOpen(needle: Needle): boolean {
  return needle.next === null;
}

/**
 * How much room is left for Road Poneglyphs, and what to say about it.
 *
 * Every string from here down takes `plain`, the same way `practice()` does.
 * Plain mode is a mute button for waiting rooms and screenshares, and a line
 * about triangulating a position off four Road Poneglyphs is not something
 * anyone wants on a shared screen. It is the same system underneath and the
 * same rules — no score, no denominator, nothing that shames — said in a way
 * that gives nothing away.
 */
export function roadRoom(count: number, plain = false): { canAdd: boolean; note: string } {
  const noun = plain ? 'main goals' : 'Road Poneglyphs';
  if (count === 0) {
    return {
      canAdd: true,
      note: plain
        ? 'Four main goals is the target. Name the first.'
        : 'Four Road Poneglyphs triangulate a position. Name the first.',
    };
  }
  if (count < ROAD_TARGET) {
    const left = ROAD_TARGET - count;
    return {
      canAdd: true,
      note: plain
        ? `${count} named. ${left} more reaches four, which is the target.`
        : `${count} named. ${left} more reaches four, which is the shape that triangulates.`,
    };
  }
  if (count === ROAD_TARGET) {
    return {
      canAdd: true,
      note: 'Four. Room for three more if life genuinely has more fronts.',
    };
  }
  if (count < ROAD_MAX) {
    return { canAdd: true, note: `${count} ${noun}. The same week is split ${count} ways.` };
  }
  return { canAdd: false, note: 'Seven is the ceiling. Retiring one opens a place.' };
}

/**
 * The line at the top of the screen.
 *
 * A bearing, never a score — where the needles point, not how far along
 * anything is. Each state names the one next move rather than what is absent,
 * which is the same rule the practice card runs on.
 */
export function bearing(pose: LogPose, plain = false): string {
  if (!pose.dream) {
    return plain
      ? 'Name the big one first. Everything under it points at that.'
      : 'Name the dream first. Everything under it points at that.';
  }
  if (pose.needles.length === 0) {
    return plain
      ? 'It is named. What has to happen for it?'
      : 'The dream is named. What has to happen for it?';
  }
  if (pose.open === 0) {
    return plain
      ? 'Nothing under way. Set the next step on any of them.'
      : 'Every needle is spinning. Name the next island on any of them.';
  }
  if (pose.open === pose.needles.length) {
    if (pose.open === 1) return plain ? 'One step under way.' : 'The needle is locked.';
    return plain
      ? `All ${pose.open} have a next step, and every one leads to the same place.`
      : `All ${pose.open} needles locked, and every one leads to the same place.`;
  }
  if (plain) return pose.open === 1 ? 'One step under way.' : `${pose.open} steps under way.`;
  return pose.open === 1 ? 'One island at sea.' : `${pose.open} islands at sea.`;
}

/**
 * What the app calls each state.
 *
 * "Sailed past" rather than abandoned, and the word is doing real work.
 * Abandoning is the correct name for the *event* — it has to be a decision,
 * logged, with a reason, or it is drift wearing a hat — but the record of it
 * sits in this app for years afterwards, and a list of things labelled
 * ABANDONED is a monument to being someone who quits. You did not fail the
 * island. You went past it, on purpose, and kept sailing.
 *
 * Plain mode says "Set aside" for the same reason and with the same care.
 */
export function stateName(state: PoneglyphState, plain = false): string {
  if (plain) return { open: 'Open', reached: 'Done', passed: 'Set aside' }[state];
  return { open: 'At sea', reached: 'Reached', passed: 'Sailed past' }[state];
}

/** The line under one Road Poneglyph. */
export function needleLine(needle: Needle, plain = false): string {
  if (!needle.next) {
    if (needle.reached > 0) {
      return plain
        ? 'Nothing under way. Set the next step.'
        : 'The needle is spinning. Name the next island.';
    }
    return plain
      ? 'No step set yet. One concrete thing, weeks not years.'
      : 'No island named yet. One concrete thing, weeks not years.';
  }
  const days = needle.atSea ?? 1;
  if (plain) return days === 1 ? 'Open since today' : `Open ${days} days`;
  return days === 1 ? 'Day 1 at sea' : `Day ${days} at sea`;
}

/**
 * What reaching an island is worth saying.
 *
 * The only place in the app that gets to be loud, and it earns it: an island
 * is weeks of work closing. Nothing here counts, ranks, or points at the next
 * one — arriving is allowed to just be arriving.
 */
export function arrivalMessage(reached: number, plain = false): string {
  if (reached === 1) {
    return plain
      ? 'First one done. Set the next when you are ready.'
      : 'First island. The Log Pose recalibrates from here.';
  }
  if (plain) return `${reached} done. Set the next when you are ready.`;
  return `${reached} islands reached. The needle is spinning again.`;
}

/**
 * What sailing past is worth saying, which is very little on purpose.
 *
 * No relief, no congratulation, no "good call" — this is a neutral log entry
 * about a course change, and any warmth here would make it a thing to seek out.
 */
export function passedMessage(plain = false): string {
  return plain ? 'Logged. That slot is free.' : 'Logged. The needle is free.';
}

/** Islands reached, said without a denominator. */
export function reachedLine(reached: number, plain = false): string {
  if (plain) {
    if (reached === 0) return 'None done yet.';
    return reached === 1 ? '1 done.' : `${reached} done.`;
  }
  if (reached === 0) return 'No islands astern yet.';
  return reached === 1 ? '1 island astern.' : `${reached} islands astern.`;
}
