import type { DayKey } from './date';

/**
 * The Sea Prism Log — what takes the will away.
 *
 * The concept document's biggest hole. Will Reserve had a level, a burn and a
 * recovery, and the burn read *output only*: gear, sessions, struck tasks. So
 * the gauge could explain an empty evening after four hours of deep work and
 * had nothing at all to say about the far more common one — a day where you
 * did almost nothing and are flat anyway. There was nowhere in the app to
 * record that something cost you, and no way for the number to know.
 *
 * Kairoseki is the right name and it is worth being precise about why. Sea
 * Prism Stone is not evil and it does not make you weak — it *nullifies*, and
 * only while you are in contact with it. **Naming something here is not an
 * accusation.** A person on this list is not a bad person; a room is not a bad
 * room. They are things that, for you, cost something to be near. That
 * distinction is the whole difference between a log you can be honest in and a
 * grudge ledger, and every rule below exists to hold it.
 *
 * - **Nothing is ever counted per stone.** No tally, no ranking, no "your
 *   worst", no "eleven times this month". `task_move` holds the same line for
 *   the same reason — the number is derivable and displaying it would turn a
 *   record into a rap sheet, which is bad enough pointed at a task and
 *   indefensible pointed at a person.
 * - **One flag, never a scale.** There is no "how bad was it" dial. Three
 *   levels is a system you spend Sunday administering and the middle one comes
 *   to mean "not really" — priority settled this already, and a severity dial
 *   on a bad afternoon is worse: it asks you to score your own suffering.
 * - **Logging is one tap and costs nothing.** This gets used at the moment you
 *   have the least will available, so it has to be cheaper than not using it.
 *   The line is optional. Naming a new stone costs a word, and that is the
 *   only writing anywhere in the feature.
 * - **A day with stones in it is not a bad day.** The Reserve says what took
 *   it and stops. There is no version of any sentence here that says what to
 *   do about it — `foresight.ts` holds that line against its own statistics
 *   and this holds it against your own report.
 * - **A stone can be let go, and the record keeps what it had.** Same
 *   asymmetry the Eternal Pose has: the event is a real choice, the record is
 *   kinder than the event.
 */

/**
 * The four kinds, straight from the concept: the people, hours, rooms and
 * thought-loops.
 *
 * Chosen once, when a stone is named, and never again — logging a hit is
 * tapping a chip. The expensive act is the rare one and the common act is
 * free, which is the same trade the rhythm workshop makes.
 */
export const KINDS = ['someone', 'somewhere', 'sometime', 'aloop'] as const;
export type Kind = (typeof KINDS)[number];

export const KIND_LABEL: Record<Kind, string> = {
  someone: 'Someone',
  somewhere: 'Somewhere',
  sometime: 'A stretch',
  aloop: 'A loop',
};

export const KIND_LABEL_PLAIN: Record<Kind, string> = {
  someone: 'Person',
  somewhere: 'Place',
  sometime: 'Time',
  aloop: 'Thought',
};

/** One mark each, in the app's second alphabet. */
export const KIND_MARK: Record<Kind, string> = {
  someone: '人',
  somewhere: '場',
  sometime: '時',
  aloop: '念',
};

export function kindLabel(kind: Kind, plain = false): string {
  return plain ? KIND_LABEL_PLAIN[kind] : KIND_LABEL[kind];
}

export function isKind(value: string): value is Kind {
  return (KINDS as readonly string[]).includes(value);
}

export type Stone = {
  id: number;
  kind: Kind;
  name: string;
  createdAt: number;
  /** Let go. It keeps every day it was ever named on. */
  retiredAt: number | null;
};

export type Hit = {
  id: number;
  /** The stone's `createdAt`, not its row id — see the schema's note. */
  stoneKey: number;
  day: DayKey;
  createdAt: number;
};

export const MAX_NAME = 60;

export function nameReady(text: string): boolean {
  return text.trim().length > 0;
}

/** The stones still on the list, in the order they were named. */
export function live(stones: Stone[]): Stone[] {
  return stones.filter((s) => s.retiredAt === null);
}

/**
 * The kinds that actually have something under them, in the fixed order.
 *
 * An empty kind draws no heading. Four headings on a list with two things in
 * it is a taxonomy showing through the furniture — the same reason the day's
 * watches do not draw a band with nothing in it.
 */
export function byKind(stones: Stone[]): { kind: Kind; stones: Stone[] }[] {
  return KINDS.map((kind) => ({ kind, stones: stones.filter((s) => s.kind === kind) })).filter(
    (group) => group.stones.length > 0,
  );
}

/**
 * The stones named today, by key.
 *
 * A stone is named today or it is not — there is no naming one twice. That
 * looks like a restriction and is actually "one flag, never a scale" doing its
 * job: a second tap on the same name is a severity dial with extra steps, and
 * it would quietly turn the day's count into a score for how bad the day was.
 * It also makes the chip an honest toggle, which is what lets taking one back
 * cost exactly what putting it there did — and it is why this screen draws one
 * list rather than a list of chips above a list of the same names again.
 */
export function namedToday(hits: Hit[], today: DayKey): Set<number> {
  return new Set(hits.filter((h) => h.day === today).map((h) => h.stoneKey));
}

/**
 * What today has had, said as a fact and never as a verdict.
 *
 * The count is of *this day's* named stones, the one number here that is not
 * a tally of anything: it does not accumulate, it does not compare to
 * yesterday, and nothing anywhere adds it up. It says what the Reserve is
 * about to subtract for, which is the only reason it is allowed to exist.
 */
export function todayLine(count: number, plain = false): string | null {
  if (count <= 0) return null;
  if (plain) return count === 1 ? '1 drain today.' : `${count} drains today.`;
  return count === 1 ? 'One took something today.' : `${count} took something today.`;
}

/**
 * The empty state is an offer, not an absence.
 *
 * The day's practice card set this rule and it binds hardest here: "nothing
 * logged" on a screen about what wears you down reads as a scold about not
 * having journalled your own bad day. What is on offer is somewhere to put it.
 */
export function emptyLine(plain = false): string {
  return plain
    ? 'Nothing logged today. Tap one if something took it out of you.'
    : 'Nothing has been named today. If something took it, it goes here.';
}

/** Before there are any stones at all. */
export function firstTimeLine(plain = false): string {
  return plain
    ? 'Name the people, places, times and thoughts that leave you with less.'
    : 'Kairoseki nullifies. Name what leaves you with less — a person, a place, a stretch of the day, a thought that goes round.';
}

/**
 * What letting one go is called, and what it is not.
 *
 * Not "delete" and not "forgive": nothing is destroyed, and the app has no
 * opinion about the thing itself. It comes off the list, and every day it was
 * ever named on stays exactly where it was.
 */
export const LET_GO_LABEL = 'Let it go';
export const LET_GO_NOTE = 'It comes off the list. The days it was named on stay.';

/**
 * The days that had something named on them, newest first, with what was
 * named — the log, read back.
 *
 * Chronological and never aggregated. This is `carried`'s rule: a source, not
 * a stick. You may read what you wrote; the app may not turn it into a
 * finding, and if it ever grows one it belongs in `foresight.ts` behind the
 * same t-gate as everything else that claims a pattern.
 *
 * A hit whose stone has gone from the list entirely is skipped rather than
 * drawn nameless — a row that says only "something" is a hole in the record
 * pretending to be a record.
 */
export function readBack(hits: Hit[], stones: Stone[]): { day: DayKey; named: Stone[] }[] {
  const byKey = new Map(stones.map((s) => [s.createdAt, s]));
  const days = new Map<DayKey, Stone[]>();
  for (const hit of [...hits].sort((a, b) => a.createdAt - b.createdAt)) {
    const stone = byKey.get(hit.stoneKey);
    if (!stone) continue;
    const list = days.get(hit.day) ?? [];
    list.push(stone);
    days.set(hit.day, list);
  }
  return [...days.entries()]
    .map(([day, named]) => ({ day, named }))
    .sort((a, b) => b.day.localeCompare(a.day));
}
