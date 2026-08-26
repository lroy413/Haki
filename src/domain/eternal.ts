import { daysBetween, type DayKey } from './date';

/**
 * The Eternal Pose — the one bearing that never recalibrates.
 *
 * The concept doc lists it beside the Log Pose and then, in the same
 * breath, calls it "the dream" — which is why it sat unbuilt for so long:
 * read that way it is the Dream with a second name, and this app does not
 * ship two of anything.
 *
 * The canon settles it. A Log Pose points at the next island and
 * recalibrates on arrival; an **Eternal Pose points at one island forever,
 * and its whole purpose is that you can always find your way back to it.**
 * Luffy carries one to Fish-Man Island. It is not how you get somewhere new.
 * It is how you get home.
 *
 * So the two are genuinely different instruments and this app needs both:
 *
 *   **The Dream** is what you are sailing toward. It is aspiration, it is
 *   who you are becoming, and it is never scaled down for a bad month.
 *
 *   **The Eternal Pose** is what you come back to. One line. The single
 *   thing that survives a week that went sideways — not a goal with a
 *   horizon, a bearing that still reads when everything else has stopped
 *   making sense.
 *
 * For someone whose stated problem is consistency, that is the more useful
 * of the two on the bad days, and it is the one the app was missing.
 *
 * ---
 *
 * **It is never tracked, checked off, or counted.** This is the whole
 * design and it is the easiest thing in this app to get wrong. A
 * non-negotiable with a streak attached is a habit tracker, and a habit
 * tracker pointed at the one thing you promised yourself is the single most
 * effective shame machine this app could possibly build. So there is no
 * state column, nothing to tick, no "held 12 of 14 days", and nowhere to
 * add one. You read it. That is the feature.
 *
 * The only number it carries is how long it has been held, and that is a
 * fact about the bearing rather than a score about the person: it goes up
 * on its own, it cannot be broken, and letting a bearing go does not zero
 * it — the old one keeps the days it had.
 *
 * **Changing it costs a written line**, the same asymmetry the Log Pose
 * uses for sailing past an island. Setting the first one is free, because
 * a blank Eternal Pose helps nobody. Replacing one you are holding takes a
 * reason, because a non-negotiable you can swap on a whim was never one.
 *
 * **The record is kinder than the event**, the same rule the passed islands
 * hold: nothing here is labelled abandoned or broken. A bearing you no
 * longer steer by was *carried*, and it says so.
 */

/** One bearing. The one being held now has no `endedOn`. */
export type Bearing = {
  id: number;
  text: string;
  setOn: DayKey;
  /** The day it stopped being the one, or null while it is held. */
  endedOn: DayKey | null;
  /** Why it was let go. Only ever set on a bearing that has ended. */
  reason: string | null;
};

/** The pose, read: what is held now and everything carried before it. */
export type EternalPose = {
  held: Bearing | null;
  /** Ended bearings, most recently carried first. */
  carried: Bearing[];
};

/**
 * How long the current bearing has been held, in days, counting the day it
 * was set as day one. Null with nothing held.
 *
 * The only figure this module produces, and it is deliberately the one that
 * cannot be lost: it counts days since it was set, never days you managed
 * to keep it. Nothing you do or fail to do today changes it.
 */
export function daysHeld(pose: EternalPose, today: DayKey): number | null {
  if (!pose.held) return null;
  return daysBetween(pose.held.setOn, today) + 1;
}

/** How long a bearing was carried before it was let go. */
export function daysCarried(bearing: Bearing): number | null {
  if (!bearing.endedOn) return null;
  return daysBetween(bearing.setOn, bearing.endedOn) + 1;
}

/**
 * The line under the pose.
 *
 * Unset it is an offer rather than an absence — the same rule the practice
 * card runs on. Six things you have not done is a checklist; six things
 * available is a card, and that difference is one string.
 */
export function poseLine(pose: EternalPose, today: DayKey, plain: boolean): string {
  const days = daysHeld(pose, today);
  if (days === null) {
    return plain
      ? 'The one thing you come back to. Set it when you know what it is.'
      : 'One bearing that never recalibrates. Set it when you know what it is.';
  }
  if (days === 1) return plain ? 'Set today.' : 'Taken today.';
  return plain ? `Set ${days} days ago.` : `Held ${days} days.`;
}

/** How an ended bearing reads in the record. Never "abandoned". */
export function carriedLine(bearing: Bearing): string {
  const days = daysCarried(bearing);
  if (days === null) return 'Carried.';
  return days === 1 ? 'Carried a day.' : `Carried ${days} days.`;
}

/**
 * What the Log Pose says when every needle is spinning.
 *
 * This is the moment the Eternal Pose exists for: nothing open under any
 * pillar, no island at sea, the ordinary state of a week that came apart.
 * A Log Pose has nothing to say here — it points at islands and there are
 * none. The Eternal Pose still reads.
 *
 * It is not a nudge and it does not ask for anything. It says where the
 * bearing points, because that is what you look at when you are lost.
 */
export function lostLine(pose: EternalPose): string | null {
  if (!pose.held) return null;
  return 'Nothing is at sea. This still points.';
}

/** Whether replacing the held bearing needs a reason written first. */
export function needsReason(pose: EternalPose): boolean {
  return pose.held !== null;
}
