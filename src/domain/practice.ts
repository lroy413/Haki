import type { Acts, HardeningLevel } from './hardening';

/**
 * The day's practice — hardening, said out loud.
 *
 * Everything you do in this app already counts: the acts feed a weight, the
 * weight settles a level, the level picks the palette and the whole interface
 * goes darker. The mechanic worked and was completely invisible. You could
 * watch the app go black without ever learning what had made it do that, which
 * makes it decoration rather than a system.
 *
 * So this is the readout. Six things, what each one is, and which of them the
 * day has had in it.
 *
 * The hard part is that a list of six things you have not done yet is a
 * checklist, and a checklist is a machine for producing six small failures
 * every morning. Three rules keep it from becoming one:
 *
 * 1. **An untouched practice shows its offer, not its absence.** Not "not
 *    yet" — *"5, 10 or 15"*. The line under a thing you have not done says
 *    what it would be, so an empty grid reads as six things available rather
 *    than six things missing. This is the entire difference between this card
 *    and a habit tracker, and it is one string per row.
 * 2. **Nothing is counted or ranked.** No "2 of 6", no percentage, no bar, no
 *    order of importance. Hardening's own rule — never a score — applies to
 *    the thing that displays it, or displaying it undoes it.
 * 3. **Black is an end, not a target.** At the top level the card says there
 *    is nothing left to darken, because the failure mode of making a mechanic
 *    visible is that someone starts farming it.
 */

export type PracticeKey = 'course' | 'read' | 'stillness' | 'logbook' | 'strike' | 'gear';

export type Practice = {
  key: PracticeKey;
  /** Empty in plain mode, exactly like a tab's glyph. */
  kanji: string;
  label: string;
  /** What happened, or — when nothing has — what is on offer. */
  line: string;
  done: boolean;
  route: string;
};

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

/**
 * The six, in the order a day tends to go: point it, read it, sit, write,
 * strike, focus. Not an order of importance — there isn't one.
 */
export function practice(acts: Acts, plain = false): Practice[] {
  const k = (glyph: string) => (plain ? '' : glyph);
  return [
    {
      key: 'course',
      // 針路 is a ship's heading, which is the thing this literally is.
      kanji: k('針路'),
      label: plain ? 'Intention' : 'Course',
      line: acts.course ? 'Set' : 'Where today points',
      done: acts.course,
      route: '/course',
    },
    {
      key: 'read',
      kanji: k('見聞色'),
      label: plain ? 'Check in' : 'Daily Read',
      line: acts.read ? 'Logged' : '30 seconds',
      done: acts.read,
      route: '/read',
    },
    {
      key: 'stillness',
      // 黙想 — sitting in silence. The word a dojo uses before it starts.
      kanji: k('黙想'),
      label: plain ? 'Meditation' : 'Stillness',
      line: acts.satMinutes > 0 ? `${acts.satMinutes} min` : '5, 10 or 15',
      done: acts.satMinutes > 0,
      route: '/sit',
    },
    {
      key: 'logbook',
      kanji: k('日誌'),
      label: plain ? 'Journal' : 'Logbook',
      line: acts.entries > 0 ? plural(acts.entries, 'entry', 'entries') : 'One entry',
      done: acts.entries > 0,
      route: '/entry/new',
    },
    {
      key: 'strike',
      kanji: k('武装色'),
      label: plain ? 'Tasks' : 'Strike',
      line: acts.struck > 0 ? `${acts.struck} struck` : 'Anything on the list',
      done: acts.struck > 0,
      route: '/armament',
    },
    {
      key: 'gear',
      kanji: k('二速'),
      label: plain ? 'Focus' : 'Gear',
      line: acts.gearMinutes > 0 ? `${acts.gearMinutes} min` : '25 minutes',
      done: acts.gearMinutes > 0,
      route: '/gears',
    },
  ];
}

/**
 * What the ship at the top of the home screen is doing.
 *
 * The obvious version of a hardening meter is a bar with a boat on it, and
 * that is a progress bar wearing a hat — the rule in `domain/hardening.ts`
 * forbids it and is right to. So the Sunny never moves along anything. It sits
 * where it sits and its *state* changes: furled and anchored at dawn, under
 * way once the day has something in it, running by the end of one that had a
 * lot.
 *
 * "At anchor" rather than "becalmed" or "adrift", and the distinction is the
 * entire reason this list was written carefully. A ship at anchor at seven in
 * the morning is a ship about to leave. A ship adrift has failed at something.
 */
export function seaState(level: HardeningLevel): string {
  return (['At anchor', 'Under way', 'Making way', 'Running'] as const)[level];
}

/**
 * The one line above the grid.
 *
 * Describes the state of the day and stops. Level 0 says what would change it
 * rather than what is missing from it, and level 3 closes the loop instead of
 * dangling a next thing — there is no fifth palette to chase and the card
 * should not imply one.
 */
export function dayMessage(level: HardeningLevel): string {
  return [
    'Nothing has hardened it yet. Any of these does.',
    'Hardened. It goes darker as more of the day goes in.',
    'Set. Darker still with more in it.',
    'Black. Nothing left to darken — the rest of the day is yours.',
  ][level];
}
