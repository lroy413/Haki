import { WATCHES, type Watch } from './tasks';
import { watchAt } from './watches';
import { DAY_CLOSES, DAY_OPENS } from './watches';

/**
 * The Bells — the one thing the day could not hold.
 *
 * Everything else in this app is elastic. A task is a thing you mean to do
 * today; a rhythm comes round; an island takes weeks. None of them happen at
 * three o'clock. The dentist does, and until now the app had nowhere to put
 * that — so the day's shape was a shape with the fixed points missing from it,
 * which is the one way a picture of a day can actively mislead.
 *
 * A bell is a title, a day and a time on the clock. That is the whole model.
 *
 * Four rules, and the first two are what stop this becoming a calendar:
 *
 * 1. **A bell does not ring.** By default it makes no sound and sends no
 *    notification — it is a mark on a chart, not an alarm clock. The Den Den
 *    Mushi taxonomy in the concept doc is explicit that an escalation channel
 *    only means something if it is almost never used, and "every appointment"
 *    is the opposite of almost never.
 * 2. **A bell that has passed is not missed.** It simply sits astern. Nothing
 *    turns red, nothing is counted, nothing asks whether you made it, and
 *    there is deliberately no "done" on a bell — an appointment is not a task
 *    and ticking it off would make the day's fixed points into a checklist.
 * 3. **Nothing counts them.** Not how many you keep, not how many pass, not
 *    how full a day is. The same rule the rhythms hold.
 * 4. **It belongs to a watch by arithmetic**, never by choice: where it falls
 *    on the clock decides which band it hangs in, so the strip and the list
 *    can never disagree about when something is.
 */

/** Minutes past midnight, 0..1439. */
export type ClockMinute = number;

export type Bell = {
  id: number;
  title: string;
  /** The day it falls on, as a day key. */
  day: string;
  /** Minutes past midnight. */
  at: ClockMinute;
};

export const MAX_BELL_CHARS = 60;

/** Round a stray value onto the clock rather than trusting it. */
export function clampClock(minute: number): ClockMinute {
  if (!Number.isFinite(minute)) return 0;
  return Math.min(1439, Math.max(0, Math.round(minute)));
}

/** "15:00". Twenty-four hours, because it is a chart and not a conversation. */
export function clockLabel(at: ClockMinute): string {
  const m = clampClock(at);
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

/** Parse "9", "9:30", "0930", "21:05" into minutes, or null if it is not a time. */
export function parseClock(input: string): ClockMinute | null {
  const text = input.trim();
  if (text.length === 0) return null;

  const colon = /^(\d{1,2})\s*[:.]\s*(\d{2})$/.exec(text);
  const bare = /^(\d{1,2})$/.exec(text);
  const packed = /^(\d{2})(\d{2})$/.exec(text);

  let h: number;
  let m: number;
  if (colon) {
    h = Number(colon[1]);
    m = Number(colon[2]);
  } else if (packed) {
    h = Number(packed[1]);
    m = Number(packed[2]);
  } else if (bare) {
    h = Number(bare[1]);
    m = 0;
  } else {
    return null;
  }

  if (h > 23 || m > 59) return null;
  return h * 60 + m;
}

/** Which watch a bell hangs in. Decided by the clock, never by a choice. */
export function watchOf(bell: Pick<Bell, 'at'>): Watch {
  return watchAt(Math.floor(bell.at / 60));
}

/**
 * Where a bell hangs across the strip, 0..1 — or null when it falls outside
 * the drawn day.
 *
 * A three-in-the-morning bell is real and belongs in its list; it simply has
 * nowhere to hang on a strip that starts at five, and drawing it clamped to
 * the edge would put it at a time it is not.
 */
export function bellAt(at: ClockMinute): number | null {
  const hour = clampClock(at) / 60;
  if (hour < DAY_OPENS || hour >= DAY_CLOSES) return null;
  return (hour - DAY_OPENS) / (DAY_CLOSES - DAY_OPENS);
}

/** Earliest first. The day reads in the order it happens. */
export function inOrder(bells: Bell[]): Bell[] {
  return [...bells].sort((a, b) => a.at - b.at || a.id - b.id);
}

/** The bells still ahead of a moment, in order. */
export function ahead(bells: Bell[], nowMinute: ClockMinute): Bell[] {
  return inOrder(bells).filter((b) => b.at >= nowMinute);
}

/**
 * The next one, said in one line, or null when the day has none left.
 *
 * States the time and the title. No countdown, no "in 20 minutes" that has to
 * be recomputed to stay true, and above all no urgency — a bell an hour away
 * and a bell five minutes away read exactly the same, because the app has no
 * business deciding which of your afternoons is stressful.
 */
export function nextBellLine(bells: Bell[], nowMinute: ClockMinute): string | null {
  const next = ahead(bells, nowMinute)[0];
  return next ? `${clockLabel(next.at)} · ${next.title}` : null;
}

/** What a watch's bells are, for the list under it. */
export function bellsInWatch(bells: Bell[], watch: Watch): Bell[] {
  return inOrder(bells).filter((b) => watchOf(b) === watch);
}

/** The label a bell wears in a list. */
export function bellLabel(bell: Bell, plain = false): string {
  return plain
    ? `${clockLabel(bell.at)} ${bell.title}`
    : `${clockLabel(bell.at)} ${bell.title}, ${WATCHES[watchOf(bell)].label}`;
}
