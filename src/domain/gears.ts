import type { DayKey } from './date';
import type { CrewName } from './crew';

/**
 * Gears — focus sessions with honest costs.
 *
 * The point of naming a block is that it removes a decision. "Go focus for a
 * while" is an open question, and an open question is where starting dies.
 * "Gear 2" is twenty-five minutes and nothing else, which is a thing you can
 * simply agree to.
 *
 * Each gear costs what it costs in canon, and the costs are the reason this is
 * not just a timer:
 *
 *   Gear 2  — twenty-five minutes. No cost, no limit. The everyday one.
 *   Gear 3  — ninety minutes, and then half an hour before the next gear.
 *             It takes something out of you and pretending otherwise is how
 *             three good hours turn into a wasted evening.
 *   Gear 4  — two hours at maximum, and that is the day's gears finished.
 *
 * Gear 4's lockout is the whole anti-hustle position in one rule. Two hours of
 * genuine maximum focus *is* a full day of deep work, and an app that would
 * happily sell you a fourth one is lying to you.
 *
 * Two hard limits on those limits:
 *
 * 1. **A cost is only ever paid by a finished session.** Abandoning a gear
 *    costs nothing at all — no cooldown, no lockout, no record of shame. An
 *    app that punished you for stopping early would teach you not to start.
 * 2. **A locked gear locks nothing else.** Journalling, tasks, training, the
 *    Daily Read: all untouched. It is a timer, not a curfew.
 */

export type GearName = 'second' | 'third' | 'fourth';

export type Gear = {
  name: GearName;
  /**
   * 速 is the counter for a vehicle's gear ratios, which is exactly the
   * metaphor Luffy's gears are built on. It also gives each one two characters
   * instead of one: a lone 二 set at display size is two floating bars that
   * read as a rule, not a word, and every other kanji in this app is two or
   * three characters wide.
   */
  kanji: string;
  label: string;
  minutes: number;
  /** What it is for. */
  blurb: string;
  /** What it costs, stated plainly. Null when it costs nothing. */
  cost: string | null;
};

export const GEARS: Record<GearName, Gear> = {
  second: {
    name: 'second',
    kanji: '二速',
    label: 'Gear 2',
    minutes: 25,
    blurb: 'One sprint. Short enough that starting is not a decision.',
    cost: null,
  },
  third: {
    name: 'third',
    kanji: '三速',
    label: 'Gear 3',
    minutes: 90,
    blurb: 'Deep work. Long enough to reach the part that needs quiet.',
    cost: 'Half an hour before the next gear.',
  },
  fourth: {
    name: 'fourth',
    kanji: '四速',
    label: 'Gear 4',
    minutes: 120,
    blurb: 'Maximum. Everything you have, on one thing.',
    cost: "That is the day's gears finished.",
  },
};

export const GEAR_ORDER: GearName[] = ['second', 'third', 'fourth'];

/**
 * The same three sessions, under Zoro's flag.
 *
 * One blade, two, three — his styles in the order he escalates them, mapped
 * onto the three lengths that already exist. The mapping is by *commitment*
 * rather than by canon power level: Ittoryu is what he fights with when the
 * fight is not worth two swords, and Santoryu is everything he has.
 *
 * The keys, the minutes and the costs are untouched. A crew renames; it does
 * not restructure. See `domain/crew.ts`.
 */
const ZORO_STYLES: Record<GearName, Gear> = {
  second: {
    name: 'second',
    kanji: '一刀流',
    label: 'Ittoryu',
    minutes: GEARS.second.minutes,
    blurb: 'One blade. Short enough that drawing it is not a decision.',
    cost: GEARS.second.cost,
  },
  third: {
    name: 'third',
    kanji: '二刀流',
    label: 'Nitoryu',
    minutes: GEARS.third.minutes,
    blurb: 'Two blades. Long enough to reach the part that needs quiet.',
    cost: 'Half an hour before the next draw.',
  },
  fourth: {
    name: 'fourth',
    kanji: '三刀流',
    label: 'Santoryu',
    minutes: GEARS.fourth.minutes,
    blurb: 'Three blades, the third in his teeth. Everything, on one thing.',
    cost: "That is the day's blades sheathed.",
  },
};

/** How one focus session is named under a given crew. */
export function styleFor(crew: CrewName, gear: GearName): Gear {
  return crew === 'zoro' ? ZORO_STYLES[gear] : GEARS[gear];
}

/**
 * The line above the list, in the crew's own vocabulary.
 *
 * Kept here rather than in `strings.ts` because it is the crew that decides
 * the nouns, not the mode — plain mode says the same sentence about the same
 * three lengths whichever flag is flying.
 */
export function focusBlurb(crew: CrewName): string {
  return crew === 'zoro'
    ? 'Focus, with honest costs. Finishing the second style needs half an hour before the next draw; the third sheathes the day.'
    : 'Focus, with honest costs. A finished third gear needs half an hour of recovery; the fourth locks the rest of the day.';
}

/** How long Gear 3 leaves you unable to shift again. */
export const THIRD_COOLDOWN_MINUTES = 30;

const MINUTE = 60_000;

export type GearSession = {
  gear: GearName;
  day: DayKey;
  startedAt: number;
  /** Null while it is still running. */
  endedAt: number | null;
  /** True only if it ran the full duration. */
  completed: boolean;
};

export function durationMs(gear: GearName): number {
  return GEARS[gear].minutes * MINUTE;
}

/** When a session would end if left alone. */
export function endsAt(session: GearSession): number {
  return session.startedAt + durationMs(session.gear);
}

/** Milliseconds left, floored at zero. */
export function remainingMs(session: GearSession, now: number): number {
  return Math.max(0, endsAt(session) - now);
}

/**
 * A session is running until it is ended or its time is up.
 *
 * Derived from the clock rather than from a ticking counter on purpose: the
 * app can be closed, backgrounded, or reloaded mid-session and the answer has
 * to still be right when it comes back.
 */
export function isRunning(session: GearSession, now: number): boolean {
  return session.endedAt === null && now < endsAt(session);
}

/** A started session whose time has run out but which nothing has closed yet. */
export function isRipe(session: GearSession, now: number): boolean {
  return session.endedAt === null && now >= endsAt(session);
}

export function runningSession(sessions: GearSession[], now: number): GearSession | null {
  return sessions.find((s) => isRunning(s, now)) ?? null;
}

export type Availability = { ready: true } | { ready: false; reason: string };

/**
 * Whether a gear can be shifted into right now, and if not, why.
 *
 * The reason is shown to a person, so it says what is true and stops. None of
 * these are refusals of effort — they are the cost of the last thing, already
 * agreed to when it was started.
 */
export function availability(
  gear: GearName,
  sessions: GearSession[],
  now: number,
): Availability {
  const running = runningSession(sessions, now);
  if (running) {
    return { ready: false, reason: `${GEARS[running.gear].label} is still running.` };
  }

  const finished = sessions.filter((s) => s.completed);

  if (finished.some((s) => s.gear === 'fourth')) {
    return { ready: false, reason: "Gear 4 is done. That was the day's maximum." };
  }

  const lastThird = finished
    .filter((s) => s.gear === 'third')
    .reduce<number | null>((latest, s) => Math.max(latest ?? 0, s.endedAt ?? 0), null);

  if (lastThird !== null) {
    const readyAt = lastThird + THIRD_COOLDOWN_MINUTES * MINUTE;
    if (now < readyAt) {
      const left = Math.ceil((readyAt - now) / MINUTE);
      return {
        ready: false,
        reason: `Gear 3 takes it out of you. ${left} ${left === 1 ? 'minute' : 'minutes'} to go.`,
      };
    }
  }

  return { ready: true };
}

/** Minutes actually spent in gear today, counting a running session so far. */
export function minutesToday(sessions: GearSession[], now: number): number {
  let total = 0;
  for (const session of sessions) {
    const finish = session.endedAt ?? Math.min(now, endsAt(session));
    total += Math.max(0, finish - session.startedAt);
  }
  return Math.round(total / MINUTE);
}

/**
 * What the app says when a gear runs out.
 *
 * It names what happened and stops. No praise for finishing a timer — sitting
 * still for ninety minutes is not a virtue, it is just the thing that was
 * agreed to.
 */
export function completionMessage(gear: GearName): string {
  if (gear === 'fourth') {
    return "Two hours at maximum. That's the day's gears — the rest of the app is still yours.";
  }
  if (gear === 'third') {
    return 'Ninety minutes. Half an hour before the next one.';
  }
  return 'Twenty-five minutes. Shift again whenever you want.';
}

/**
 * What the app says when a gear is ended early.
 *
 * Stopping early is a legitimate outcome, so this is deliberately flat. It
 * costs nothing, records nothing against you, and does not ask why.
 */
export function abandonMessage(minutes: number): string {
  if (minutes <= 0) return 'Ended. Nothing counted, nothing owed.';
  return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} in gear. Logged, and nothing owed.`;
}

/** The cue that announces each gear. */
export const GEAR_SOUND = {
  second: 'gearSecond',
  third: 'gearThird',
  fourth: 'gearFourth',
} as const;
