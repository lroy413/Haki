import type { CrewName } from './crew';
import { addDays, type DayKey } from './date';

/**
 * The ladder — the Gears as a week you climb, and a stamina you keep.
 *
 * The owner's brief, in his words: _"a career, business goal tracker and
 * planner... strictly career goals and aspiration focused. I want to make it
 * game like. Every week I can set a number of goals or practice activities
 * needed to activate the next gear. It should get progressively more things...
 * I want to advance in my field and start practicing more to get better and
 * push myself further and learn more."_
 *
 * So the shape is a ladder with five rungs — Luffy's five gears, Zoro's five
 * styles — and the week is what climbs it. Three things, and the relationship
 * between them is the whole design:
 *
 * **Tracks and items.** A track is a thing being mastered — the main career,
 * each side hustle. An item is a *practice* (comes round every week, with a
 * weekly target in times or minutes) or a *goal* (done once). Meeting an
 * item's target completes it for the week, and the ladder counts completed
 * items across every track: one ladder, not one per track, because a week is
 * one week however many things you are learning in it.
 *
 * **Reached.** How far this week's completions got you. Each rung has a
 * minimum number of completed items; the app sets a floor and the owner may
 * raise a rung and bring it back down to the floor, never under it. Monday
 * starts it from nothing.
 *
 * **Held.** Stamina — the owner's own word for it: _"think of it like stamina
 * building. That is usually what is the nerf to the top abilities... every
 * successful week makes one level persist and vice versa if I miss a week I go
 * down."_ Every Monday, held moves **one rung toward last week's reached**:
 * up if the week outran it, down if it fell short, unchanged if it matched.
 * Never zeroed, never jumped. Reaching the top three weeks running from
 * nothing carries you to the third rung; holding the top is a month of it.
 *
 * What it is not:
 *
 * - **Not hardening.** A gear on a career item does not darken the app. The
 *   owner asked for exactly that, and it is also right: hardening reads the
 *   day being *used*, and a practice week has its own ladder to climb. The
 *   Reserve still spends on gear minutes — an hour of practice is an hour of
 *   will — and the Calm Belt still counts a gear as resistance.
 * - **Not a streak.** Nothing counts weeks at a rung, nothing says "down from
 *   last week", and a dropped rung is a state change and nothing else — the
 *   steam thins, the flame lowers, and the app says which rung you hold. The
 *   whole point of *held* is that a bad week costs one rung and not the lot.
 * - **Not a score beyond the one the game needs.** "Two more for Gear 3" is
 *   the ladder's own arithmetic and the owner asked for it. Nothing else here
 *   is totalled: no percentage, no per-track figure, no history of drops.
 *
 * Keys never move. A rung is a number 0–5 under every flag, and an item's
 * kind and unit are stored words, so a year of practice logged under Gear 3
 * reads as Santoryu the moment the crew changes — the same law
 * `domain/crew.ts` holds for the timers.
 */

export type Rung = 0 | 1 | 2 | 3 | 4 | 5;
/** The rungs you can stand on. Zero is the ground. */
export type Step = 1 | 2 | 3 | 4 | 5;

export const STEPS: Step[] = [1, 2, 3, 4, 5];
export const TOP: Rung = 5;

/**
 * The app's floor: completed items this week to reach each rung.
 *
 * Low on purpose, because it can be raised and never lowered under this. The
 * first rung is one thing met — a week with anything finished in it is a week
 * in gear — and the top is eight, which for a main career and two side hustles
 * is most of what was set up. "Progressively more things", in the owner's
 * words, and the gaps widen as it climbs.
 */
export const FLOOR: Record<Step, number> = { 1: 1, 2: 2, 3: 4, 4: 6, 5: 8 };

export type Minimums = Record<Step, number>;

/**
 * Read a stored rung table back, and refuse anything that would break the
 * ladder's own rules: every rung at or above the floor, and each strictly above
 * the one below it. Anything else is the floor — a malformed setting must not
 * strand somebody on a ladder they cannot climb.
 */
export function parseMinimums(raw: string | null): Minimums {
  if (!raw) return { ...FLOOR };
  const parts = raw.split(',').map((p) => Number(p.trim()));
  if (parts.length !== STEPS.length || parts.some((n) => !Number.isInteger(n))) {
    return { ...FLOOR };
  }
  const out = { ...FLOOR };
  for (const step of STEPS) out[step] = parts[step - 1];
  return isSound(out) ? out : { ...FLOOR };
}

export function encodeMinimums(m: Minimums): string {
  return STEPS.map((s) => String(m[s])).join(',');
}

function isSound(m: Minimums): boolean {
  for (const step of STEPS) {
    if (m[step] < FLOOR[step]) return false;
    if (step > 1 && m[step] <= m[(step - 1) as Step]) return false;
  }
  return true;
}

/**
 * Raise one rung by one.
 *
 * The rungs above it are pushed up as far as they need to go to stay above
 * it, so the ladder can never fold: a rung that asks for fewer than the one
 * below it is not a rung.
 */
export function raiseRung(m: Minimums, step: Step): Minimums {
  const out = { ...m };
  out[step] += 1;
  for (let s = step + 1; s <= TOP; s += 1) {
    const here = s as Step;
    const below = (s - 1) as Step;
    if (out[here] <= out[below]) out[here] = out[below] + 1;
  }
  return out;
}

/**
 * Lower one rung by one — never under the floor, and never down onto the
 * rung below it. The owner's rule: change or add, but not subtract past the
 * minimum.
 */
export function lowerRung(m: Minimums, step: Step): Minimums {
  const out = { ...m };
  const belowIt = step > 1 ? out[(step - 1) as Step] + 1 : 0;
  out[step] = Math.max(FLOOR[step], belowIt, out[step] - 1);
  return out;
}

/** Whether a rung can still come down. */
export function canLower(m: Minimums, step: Step): boolean {
  return lowerRung(m, step)[step] < m[step];
}

/** How far a count of completed items climbs. */
export function reachedRung(completed: number, m: Minimums): Rung {
  let reached: Rung = 0;
  for (const step of STEPS) {
    if (completed >= m[step]) reached = step;
  }
  return reached;
}

/* ------------------------------------------------------------------ items */

export type ItemKind = 'practice' | 'goal';
export type Unit = 'times' | 'minutes';

export const KINDS: ItemKind[] = ['practice', 'goal'];
export const UNITS: Unit[] = ['times', 'minutes'];

export function isKind(value: string): value is ItemKind {
  return value === 'practice' || value === 'goal';
}

export function isUnit(value: string): value is Unit {
  return value === 'times' || value === 'minutes';
}

export const MAX_TITLE = 80;
export const MAX_TRACK_NAME = 40;

/**
 * The weekly targets on offer.
 *
 * Times run to seven because a week has seven days and a practice done twice
 * a day is one practice. Minutes stop at ten hours: past that the thing being
 * measured is a job, and the ladder counts items met, not hours worked.
 */
export const TARGET_CHOICES: Record<Unit, number[]> = {
  times: [1, 2, 3, 4, 5, 6, 7],
  minutes: [25, 50, 90, 120, 180, 300, 600],
};

/** One tap on a minutes item logs this much — a gear's shortest block. */
export const LOGGED_BLOCK = 25;

export type Track = {
  id: number;
  /** Creation stamp — what items point at, because ids do not survive a backup. */
  key: number;
  name: string;
  retired: boolean;
};

export type Item = {
  id: number;
  /** Creation stamp — what ticks and gear sessions point at. */
  key: number;
  trackKey: number;
  title: string;
  kind: ItemKind;
  /** Per week. A goal's is always one. */
  target: number;
  unit: Unit;
  /** The day a goal was met, or null. A practice never closes. */
  closedOn: DayKey | null;
  retired: boolean;
};

/** One tap. Ticks are the only thing the ladder writes about an item. */
export type Tick = {
  id: number;
  itemKey: number;
  day: DayKey;
  amount: number;
  createdAt: number;
};

/** A gear session, as the ladder sees it: which item, which day, how long. */
export type Timed = {
  itemKey: number | null;
  day: DayKey;
  minutes: number;
};

export type Progress = {
  done: number;
  target: number;
  unit: Unit;
  complete: boolean;
};

/** The Monday of the week a day falls in. Same week the bag and the chart keep. */
export function mondayOf(day: DayKey): DayKey {
  const date = new Date(`${day}T12:00:00`);
  const dow = date.getDay();
  return addDays(day, dow === 0 ? -6 : 1 - dow);
}

export function inWeek(day: DayKey, monday: DayKey): boolean {
  return day >= monday && day <= addDays(monday, 6);
}

/**
 * How far one item has got this week.
 *
 * A tap counts what it says. A gear session counts its minutes on a minutes
 * item and one time on a times item — you sat down to it, however long you
 * stayed — except a session that ended before its first minute, which the
 * gear screen already says counted nothing.
 */
export function progressOf(
  item: Item,
  ticks: Tick[],
  timed: Timed[],
  monday: DayKey,
): Progress {
  const mine = ticks.filter((t) => t.itemKey === item.key && inWeek(t.day, monday));
  const sessions = timed.filter(
    (s) => s.itemKey === item.key && s.minutes >= 1 && inWeek(s.day, monday),
  );
  const tapped = mine.reduce((sum, t) => sum + t.amount, 0);
  const done =
    item.unit === 'minutes'
      ? tapped + sessions.reduce((sum, s) => sum + s.minutes, 0)
      : tapped + sessions.length;
  return { done, target: item.target, unit: item.unit, complete: done >= item.target };
}

/**
 * The items a week can see.
 *
 * Retired ones are gone. A goal met in an earlier week has left the list —
 * it counted in the week it was met, and a done thing standing in the list
 * every week after would be a trophy shelf. A goal met *this* week stays,
 * ticked, so it can be un-ticked if the tap was a slip.
 */
export function activeItems(items: Item[], monday: DayKey, includeRetired = false): Item[] {
  return items.filter(
    (i) =>
      (includeRetired || !i.retired) &&
      (i.kind !== 'goal' || i.closedOn === null || inWeek(i.closedOn, monday)),
  );
}

/** How many of the week's items are met. The ladder's one input. */
export function completedIn(
  items: Item[],
  ticks: Tick[],
  timed: Timed[],
  monday: DayKey,
): number {
  return items.filter((i) => progressOf(i, ticks, timed, monday).complete).length;
}

/* ------------------------------------------------------------------- held */

/**
 * Monday's move: one rung toward what the week reached.
 *
 * Never further. A week at the top from nothing is one rung up, not five, and
 * a week with nothing in it is one rung down, not the lot. This is the whole
 * of the stamina rule, and it is the reason the ladder can be honest about a
 * bad week without having a shame mechanic in it.
 */
export function step(held: Rung, reached: Rung): Rung {
  const next = held + Math.sign(reached - held);
  return Math.max(0, Math.min(TOP, next)) as Rung;
}

/**
 * One week, settled: what was held going into it, and what the week before
 * it reached — written once, on the first day the app is opened in the week,
 * and never recomputed. Targets and rungs can be raised later; a settled
 * week keeps what it was read as.
 */
export type WeekRecord = {
  weekStart: DayKey;
  held: Rung;
  reachedBefore: Rung;
};

/**
 * Bring the record up to this week.
 *
 * Walks every week after the last settled one, because a fortnight the app
 * was not opened in is two weeks that reached nothing and two rungs given
 * back — recorded as such rather than skipped, so the record and the rule
 * cannot disagree. Returns nothing when this week is already settled.
 *
 * `reachedIn` reads a past week's completions live; it is only ever asked
 * about weeks that have not been written down yet.
 */
export function settleWeeks(
  last: WeekRecord | null,
  thisWeek: DayKey,
  reachedIn: (weekStart: DayKey) => Rung,
): WeekRecord[] {
  if (last && last.weekStart >= thisWeek) return [];
  let held: Rung = last?.held ?? 0;
  let week = last ? addDays(last.weekStart, 7) : thisWeek;
  const out: WeekRecord[] = [];
  while (week <= thisWeek) {
    const reachedBefore = reachedIn(addDays(week, -7));
    held = step(held, reachedBefore);
    out.push({ weekStart: week, held, reachedBefore });
    week = addDays(week, 7);
  }
  return out;
}

/**
 * The rung the page wears: whichever is higher of what the week has reached
 * and what is held. A held gear is drawn all the time; a week that outruns
 * it shows the climb.
 */
export function wornRung(reached: Rung, held: Rung): Rung {
  return Math.max(reached, held) as Rung;
}

/* ------------------------------------------------------------------ names */

export type RungName = {
  /** Empty on the ground. */
  kanji: string;
  label: string;
};

/**
 * 速 is the counter for a vehicle's gear ratios — the same choice the timers
 * make, and for the same reason: a lone 五 at display size is a rule, not a
 * word.
 */
const LUFFY: Record<Rung, RungName> = {
  0: { kanji: '', label: 'No gear yet' },
  1: { kanji: '一速', label: 'Gear 1' },
  2: { kanji: '二速', label: 'Gear 2' },
  3: { kanji: '三速', label: 'Gear 3' },
  4: { kanji: '四速', label: 'Gear 4' },
  5: { kanji: '五速', label: 'Gear 5' },
};

/**
 * One blade, two, three, then the two that are something else: Ashura, the
 * nine-sword illusion his Conqueror's makes, and 閻王 — the King of Hell,
 * Enma's flame down the blade.
 */
const ZORO: Record<Rung, RungName> = {
  0: { kanji: '', label: 'Sheathed' },
  1: { kanji: '一刀流', label: 'Ittoryu' },
  2: { kanji: '二刀流', label: 'Nitoryu' },
  3: { kanji: '三刀流', label: 'Santoryu' },
  4: { kanji: '阿修羅', label: 'Ashura' },
  5: { kanji: '閻王', label: 'King of Hell' },
};

export function rungName(crew: CrewName, rung: Rung): RungName {
  return crew === 'zoro' ? ZORO[rung] : LUFFY[rung];
}

/** The noun, so a sentence can be built in either crew's vocabulary. */
export function rungWord(crew: CrewName): string {
  return crew === 'zoro' ? 'style' : 'gear';
}

/* ------------------------------------------------------------------- copy */

const said = (n: number): string =>
  n <= 10
    ? ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'][n]
    : String(n);

/**
 * The line under the rung: what the week has met, and what the next rung
 * asks. This is the ladder's own arithmetic and the one count the game
 * needs; it states the next rung and never the whole table.
 */
export function reachLine(
  completed: number,
  reached: Rung,
  m: Minimums,
  crew: CrewName,
): string {
  const met = completed === 0 ? 'Nothing met yet' : `${completed} met this week`;
  if (reached >= TOP) return `${met} · nothing above ${rungName(crew, TOP).label}`;
  const next = (reached + 1) as Step;
  const more = m[next] - completed;
  const word = completed === 0 ? '' : 'more ';
  return `${met} · ${said(more)} ${word}for ${rungName(crew, next).label}`;
}

/** What is held, said plainly. Nothing about how long, nothing about last week. */
export function holdLine(held: Rung, crew: CrewName): string {
  if (held === 0) {
    return crew === 'zoro'
      ? 'Nothing held yet. A week in a style carries one rung into the next.'
      : 'Nothing held yet. A week in gear carries one rung into the next.';
  }
  return `Holding ${rungName(crew, held).label}`;
}

/** One item's week, in a few mono characters. */
export function progressLine(p: Progress, kind: ItemKind): string {
  if (kind === 'goal') return p.complete ? 'Done' : 'Once';
  const unit = p.unit === 'minutes' ? ' min' : '';
  return p.complete
    ? `Met · ${p.done}${unit}`
    : `${p.done} of ${p.target}${unit}${p.unit === 'times' ? ' this week' : ''}`;
}

/** The line above the ladder, in the crew's vocabulary. */
export function ladderBlurb(crew: CrewName): string {
  return crew === 'zoro'
    ? 'Name what you are mastering and what each thing needs in a week. Every item met climbs a style; a week held carries one rung into the next, and a week under it gives one back.'
    : 'Name what you are mastering and what each thing needs in a week. Every item met climbs a gear; a week held carries one rung into the next, and a week under it gives one back.';
}

/** What the plate says the first time, before anything is set up. */
export function emptyLine(crew: CrewName): string {
  return crew === 'zoro'
    ? 'Nothing to draw on yet. Name a thing to master and the styles run on it.'
    : 'Nothing to shift on yet. Name a thing to master and the gears run on it.';
}

/** Where a gear started from an item lands. */
export function onItemLine(title: string): string {
  return `On ${title}`;
}
