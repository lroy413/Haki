/**
 * One label map, two modes.
 *
 * Haki mode is the default and the real app. Plain mode is a mute button for
 * waiting rooms and screenshares — it swaps labels and kills effects, and that
 * is all it does. There is exactly one design system here; do not grow a
 * second one behind this flag.
 */

/**
 * A tab carries both scripts: the kanji sits above, the English word below it.
 * `glyph` is empty in plain mode, which collapses the tab to the English word
 * alone rather than needing a second layout.
 */
export type Tab = { glyph: string; label: string };

export type Strings = {
  appName: string;
  tabs: {
    home: Tab;
    log: Tab;
    training: Tab;
    carried: Tab;
    settings: Tab;
  };

  homeTitle: string;
  reserveLabel: string;
  reserveUnknown: string;
  dailyReadCta: string;
  dailyReadDone: string;

  logTitle: string;
  logEmpty: string;
  logLine: string;
  newEntry: string;

  courseTitle: string;
  coursePlaceholder: string;
  stillnessTitle: string;

  carriedTitle: string;
  carriedBlurb: string;
  carriedEmpty: string;
  carriedAdd: string;
  carriedName: string;
  carriedRelationship: string;
  carriedDream: string;
  carriedWhatICarry: string;

  todayLoad: string;
  taskPlaceholder: string;
  addToToday: string;
  addToLater: string;
  backlogLabel: string;
  backlogEmpty: string;
  nextStrikeEmpty: string;

  trainingTitle: string;
  gearsTitle: string;
  trainingLog: string;
  trainingEmpty: string;
  trainingThisWeek: string;
  trainingConsistency: string;
  trainingSinceLast: string;
  trainingNever: string;
  trainingToday: string;
  trainingKind: string;
  trainingMinutes: string;
  trainingIntensity: string;
  trainingNote: string;

  keystoneTitle: string;
  keystoneBlurb: string;
  downstreamLabel: string;

  dials: { energy: string; mood: string; clarity: string; tension: string };
  sleepPrompt: string;
  daysAtSea: (n: number) => string;
};

const haki: Strings = {
  appName: 'Haki',
  tabs: {
    home: { glyph: '覇気', label: 'Home' },
    log: { glyph: '日誌', label: 'Logbook' },
    training: { glyph: '武装色', label: 'Do' },
    carried: { glyph: '継承', label: 'Carried' },
    settings: { glyph: '設定', label: 'Settings' },
  },

  homeTitle: 'Will Reserve',
  reserveLabel: 'Reserve',
  reserveUnknown: 'No reading yet today',
  dailyReadCta: 'Daily Read',
  dailyReadDone: 'Read logged',

  logTitle: 'Logbook',
  logEmpty: 'Nothing logged yet. The first entry is the hardest.',
  logLine: 'Log it',
  newEntry: 'New entry',

  courseTitle: 'Course',
  coursePlaceholder: 'What today is for.',
  stillnessTitle: 'Stillness',

  carriedTitle: 'Inherited Will',
  carriedBlurb:
    'The people whose dreams you carry. Nothing here nags, scores, or reminds you — it opens only when you open it.',
  carriedEmpty: 'No one recorded yet.',
  carriedAdd: 'Add someone',
  carriedName: 'Their name',
  carriedRelationship: 'Who they were to you',
  carriedDream: 'What they wanted',
  carriedWhatICarry: "What of it you're carrying",

  todayLoad: "Today's load",
  taskPlaceholder: 'One thing. What is it?',
  addToToday: 'Carry today',
  addToLater: 'Later',
  backlogLabel: 'Waiting',
  backlogEmpty: 'Nothing waiting.',
  nextStrikeEmpty: 'Nothing pulled in for today. Tap to add one.',

  trainingTitle: 'Armament',
  gearsTitle: 'Gears',
  trainingLog: 'Log a session',
  trainingEmpty: 'Nothing logged yet.',
  trainingThisWeek: 'This week',
  trainingConsistency: 'Hardness',
  trainingSinceLast: 'Days off',
  trainingNever: 'No sessions yet',
  trainingToday: 'Trained today',
  trainingKind: 'What did you do',
  trainingMinutes: 'Minutes',
  trainingIntensity: 'How hard it actually was',
  trainingNote: 'Notes',

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
  tabs: {
    home: { glyph: '', label: 'Today' },
    log: { glyph: '', label: 'Log' },
    training: { glyph: '', label: 'Training' },
    carried: { glyph: '', label: 'People' },
    settings: { glyph: '', label: 'Settings' },
  },

  homeTitle: 'Energy',
  reserveLabel: 'Level',
  dailyReadCta: 'Check in',
  dailyReadDone: 'Checked in',

  logTitle: 'Journal',
  courseTitle: 'Intention',
  stillnessTitle: 'Meditation',
  carriedTitle: 'People I carry',
  trainingTitle: 'Training',
  gearsTitle: 'Focus',
  trainingConsistency: 'Consistency',
  todayLoad: "Today's list",

  keystoneTitle: 'Keystone habit',

  daysAtSea: (n) => `Day ${n}`,
};

export function strings(plainMode: boolean): Strings {
  return plainMode ? plain : haki;
}
