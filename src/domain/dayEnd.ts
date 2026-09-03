import type { Acts } from './hardening';
import type { CrewName } from './crew';

/**
 * Day's End — the evening ritual.
 *
 * The app had a morning (the Daily Read) and a week (Setting Sail) and
 * nothing in between. The owner named the gap himself: *"At the end of the
 * day I want it to ask how it went, if I moved something or didn't do
 * something I want it to ask why and have me write a brief explanation."*
 *
 * So this is the day's closing pass. Three movements, and the order matters
 * for the same reason Setting Sail's does:
 *
 *   **The day, read back** — what it actually had in it. Facts, listed, never
 *   graded and never totalled against anything. A day has no denominator.
 *
 *   **What is still open, and what moved** — the leftovers, decidable here
 *   rather than left to roll silently into tomorrow, and the moves already
 *   made today that arrived without words.
 *
 *   **How it went** — one line, in your own words. The only part that is the
 *   ritual rather than the tidying.
 *
 * Three rules it inherits and must not break:
 *
 * - **The course is read back, never marked.** `app/course.tsx` promises in
 *   as many words that nothing asks at the end of the day whether you held
 *   it. Showing the heading is not asking about it; a checkbox beside it
 *   would break a promise the app makes to your face.
 * - **Nothing here is required.** A ritual you can fail is a ritual you stop
 *   opening. Every field is optional and the screen closes whatever is in it.
 * - **An empty day gets an offer, not an audit.** The absence is never the
 *   sentence — see the day's practice card, which established this.
 */

/** How far into the day the door opens. */
export const DAY_END_AFTER_HOURS = 18;

/**
 * When the day's end is available.
 *
 * Eighteen hours after the day boundary, and until the day turns over. The
 * owner's own arithmetic: _"if I put that my day ends at 4am then it should
 * be 18hrs after 4am, so in this instance it would start at 10:00pm."_ It
 * used to open with the strip's evening watch at five, which on a day that
 * starts at four in the morning is a door standing open for eleven hours —
 * and a door that is always open is furniture, which is the one thing the
 * door was built not to be.
 *
 * `dayStart` is the voyage's boundary (`voyage.dayStartHour`), passed in
 * rather than read here so this stays arithmetic. The strip's watches are a
 * different clock — they divide the day's picture, this closes the day — and
 * they were never the same thing.
 */
export function dayEndOpen(hour: number, dayStart = 0): boolean {
  const into = (((hour - dayStart) % 24) + 24) % 24;
  return into >= DAY_END_AFTER_HOURS;
}

/**
 * The day, listed.
 *
 * Facts in the order the day tends to produce them. No day is graded against
 * another and nothing is summed — six items is not a better day than two, and
 * an app that implied it would be inventing the denominator this whole
 * project refuses to invent.
 */
export function readBack(acts: Acts, plain = false, crew: CrewName = 'luffy'): string[] {
  const lines: string[] = [];
  if (acts.read) lines.push(plain ? 'Checked in' : 'The read was taken');
  if (acts.struck > 0) {
    lines.push(`${acts.struck} ${acts.struck === 1 ? 'task' : 'tasks'} struck`);
  }
  if (acts.trained > 0) {
    lines.push(`${acts.trained} ${acts.trained === 1 ? 'session' : 'sessions'} logged`);
  }
  if (acts.gearMinutes > 0) {
    lines.push(
      `${Math.round(acts.gearMinutes)} minutes ${crew === 'zoro' ? 'drawn' : 'in gear'}`,
    );
  }
  if (acts.satMinutes > 0) lines.push(`${Math.round(acts.satMinutes)} minutes sat`);
  if (acts.entries > 0) {
    lines.push(`${acts.entries} ${acts.entries === 1 ? 'entry' : 'entries'} written`);
  }
  return lines;
}

/**
 * What a day with nothing in it is told.
 *
 * Not "you did nothing" and not a dash. The evening watch runs to the day
 * boundary, so there is genuinely time left, and saying so is both true and
 * the only useful thing to say. The offer, never the absence.
 */
export function emptyDayLine(plain = false): string {
  return plain
    ? 'Nothing logged yet. There is still time for one thing.'
    : 'Nothing logged yet — and the watch is not over. One thing still counts.';
}

/** The one question the ritual asks. Open, unscaled, unanswerable wrongly. */
export const HOW_PROMPT = 'How did it go?';
export const HOW_PLACEHOLDER = 'A line. Whatever it was.';
export const MAX_HOW = 400;

/**
 * The heading, read back.
 *
 * Deliberately past tense and deliberately not a question. "Where today
 * pointed" is a fact about a decision you made this morning; "did you hold
 * it?" is a mark, and the course screen promises there is never one.
 */
export function headingLine(plain = false): string {
  return plain ? 'Today’s focus' : 'Where today pointed';
}

/**
 * The heading over the leftovers. Says what they are, counts nothing else.
 *
 * Reads the same in both modes: "still open" is already plain, and there is
 * no nautical version of it worth having.
 */
export function openLabel(count: number): string {
  return count === 1 ? 'Still open' : `Still open · ${count}`;
}

export const MOVED_LABEL = 'Moved today';

/**
 * The prompt for a move that was made without words.
 *
 * The Do tab lets a first-day carry through on one tap, because a writing tax
 * on every leftover is how a list gets abandoned. The ritual is where that
 * debt is collected — once, in a place you came to on purpose, rather than
 * forty times in the flow of a day. Still optional: the screen closes with
 * the field empty.
 */
export function movedPrompt(to: string | null, plain = false): string {
  if (to === null)
    return plain ? 'Why did this move off the day?' : 'Why did this come off the day?';
  return plain ? 'Why did this move?' : 'What got in the way?';
}

/**
 * The closing line.
 *
 * A day is not congratulated and not corrected. The weekly ritual's rule —
 * never congratulate a frictionless week — applies here at the smaller scale,
 * so the send-off is the same whatever the day held.
 */
export function closingLine(plain = false): string {
  return plain ? 'Saved. That is the day.' : 'Logged. The watch is yours.';
}
