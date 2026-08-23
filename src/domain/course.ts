import { addDays, type DayKey } from './date';

/**
 * The course — one line saying where the day is pointed.
 *
 * A ship's day starts with a heading and the log is written against it. That
 * is the whole idea, and it is the reason this is not a task: a task is a
 * thing you finish, a course is a direction you are on. You can be on a
 * heading all day and arrive nowhere, and the heading was still the right one.
 *
 * Three rules hold it to that:
 *
 * 1. **It is never marked.** Nothing asks at the end of the day whether the
 *    course was held, and nothing scores it. The moment an intention gets
 *    graded it stops being an intention and becomes a task you failed to
 *    finish, which is the exact machine this app was built to avoid.
 * 2. **It can be set the night before.** Setting tomorrow's heading before bed
 *    is the version of this that actually works, so it is a first-class thing
 *    rather than a workaround — `setCourse` takes a day, and the screen offers
 *    both.
 * 3. **One line.** A paragraph is a plan, and a plan is a decision made at the
 *    wrong time of day. It is clamped, not validated: a long line is trimmed
 *    rather than refused, because being told off by a text field at seven in
 *    the morning is worse than a slightly truncated sentence.
 */

export type Course = {
  day: DayKey;
  heading: string;
};

/** Long enough for a real sentence, short enough that it cannot become a plan. */
export const MAX_HEADING = 120;

/**
 * Trim, flatten and clamp.
 *
 * Newlines collapse to spaces on purpose — the field is one line, and pasting
 * three paragraphs into it should produce a heading rather than a mess.
 */
export function normaliseHeading(text: string): string {
  return text.replace(/\s+/g, ' ').trim().slice(0, MAX_HEADING);
}

export function courseFor(courses: Course[], day: DayKey): Course | null {
  return courses.find((c) => c.day === day) ?? null;
}

/**
 * What the home screen shows when no heading is set. Never a reproach.
 *
 * Built from the label rather than written out, because plain mode calls this
 * an Intention and a card reading "INTENTION / No course set" is the app
 * talking to itself.
 */
export function noCourse(label: string): string {
  return `No ${label.toLowerCase()} set`;
}

/** The prompt above the field. */
export const COURSE_PROMPT = 'One line. Where today is pointed.';

/**
 * What to say about a heading set for tomorrow.
 *
 * Setting one the night before is the good case, so this reads as a note
 * rather than a nudge — it says what is already true and stops.
 */
export function tomorrowNote(course: Course | null, today: DayKey): string | null {
  if (!course) return null;
  if (course.day !== addDays(today, 1)) return null;
  return `Tomorrow is already set: ${course.heading}`;
}
