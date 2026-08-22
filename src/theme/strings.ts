/**
 * One label map, two modes.
 *
 * Haki mode is the default and the real app. Plain mode is a mute button for
 * waiting rooms and screenshares — it swaps labels and kills effects, and that
 * is all it does. There is exactly one design system here; do not grow a
 * second one behind this flag.
 */

export type Strings = {
  appName: string;
  tabHome: string;
  tabLog: string;
  tabCarried: string;
  tabSettings: string;

  homeTitle: string;
  reserveLabel: string;
  reserveUnknown: string;
  dailyReadCta: string;
  dailyReadDone: string;

  logTitle: string;
  logEmpty: string;
  newEntry: string;

  carriedTitle: string;
  carriedBlurb: string;
  carriedEmpty: string;
  carriedAdd: string;
  carriedName: string;
  carriedRelationship: string;
  carriedDream: string;
  carriedWhatICarry: string;

  keystoneTitle: string;
  keystoneBlurb: string;
  downstreamLabel: string;

  dials: { energy: string; mood: string; clarity: string; tension: string };
  sleepPrompt: string;
  daysAtSea: (n: number) => string;
};

const haki: Strings = {
  appName: 'Haki',
  tabHome: '覇気',
  tabLog: '見聞色',
  tabCarried: '継承',
  tabSettings: '設定',

  homeTitle: 'Will Reserve',
  reserveLabel: 'Reserve',
  reserveUnknown: 'No reading yet today',
  dailyReadCta: 'Daily Read',
  dailyReadDone: 'Read logged',

  logTitle: "Ship's Log",
  logEmpty: 'Nothing logged yet. The first entry is the hardest.',
  newEntry: 'New entry',

  carriedTitle: 'Inherited Will',
  carriedBlurb:
    'The people whose dreams you carry. Nothing here nags, scores, or reminds you — it opens only when you open it.',
  carriedEmpty: 'No one recorded yet.',
  carriedAdd: 'Add someone',
  carriedName: 'Their name',
  carriedRelationship: 'Who they were to you',
  carriedDream: 'What they wanted',
  carriedWhatICarry: "What of it you're carrying",

  keystoneTitle: 'Keystone',
  keystoneBlurb:
    'When this slips, everything below it slips too. The warning fires on the first bad night, not after the week is gone.',
  downstreamLabel: 'What it carries',

  dials: { energy: 'Energy', mood: 'Mood', clarity: 'Clarity', tension: 'Tension' },
  sleepPrompt: 'Hours slept',
  daysAtSea: (n) => `Day ${n} at sea`,
};

const plain: Strings = {
  ...haki,
  appName: 'Journal',
  tabHome: 'Today',
  tabLog: 'Log',
  tabCarried: 'People',
  tabSettings: 'Settings',

  homeTitle: 'Energy',
  reserveLabel: 'Level',
  dailyReadCta: 'Check in',
  dailyReadDone: 'Checked in',

  logTitle: 'Journal',
  carriedTitle: 'People I carry',
  keystoneTitle: 'Keystone habit',

  daysAtSea: (n) => `Day ${n}`,
};

export function strings(plainMode: boolean): Strings {
  return plainMode ? plain : haki;
}
