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
    conquerors: Tab;
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

  logPoseTitle: string;
  logPoseBlurb: string;
  dreamLabel: string;
  dreamEmpty: string;
  dreamPlaceholder: string;
  dreamSetCta: string;
  dreamNamedOn: (day: string) => string;
  roadLabel: string;
  roadAdd: string;
  roadTitleField: string;
  roadWhyField: string;
  roadWhyLabel: string;
  roadRetire: string;
  roadUnretire: string;
  roadRetired: string;
  islandLabel: string;
  islandAdd: string;
  islandPlaceholder: string;
  islandReached: string;
  islandPass: string;
  islandPassReason: string;
  islandPassConfirm: string;
  islandReopen: string;
  islandHistory: string;
  strikeIt: string;
  strikePlaceholder: string;
  strikeAdded: string;

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
  trainingSection: string;
  gearsTitle: string;
  trainingLog: string;
  trainingEmpty: string;
  trainingThisWeek: string;
  hardnessLabel: string;
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
    // 覇王色 — the third lens, and the one with no meter. The tab word is
    // Journey rather than Log Pose because Logbook is two tabs away and two
    // labels starting with "Log" is a coin flip every time you reach for one.
    conquerors: { glyph: '覇王色', label: 'Journey' },
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

  logPoseTitle: 'Log Pose',
  logPoseBlurb:
    'One dream, the things it needs, and the next island under each. Nothing here is scored — a journey has no denominator.',
  dreamLabel: 'The Dream',
  dreamEmpty: 'Not named yet.',
  dreamPlaceholder: 'The enormous one. Never scaled down for a bad month.',
  dreamSetCta: 'Name the dream',
  dreamNamedOn: (day) => `Named ${day}`,
  roadLabel: 'Road Poneglyphs',
  roadAdd: 'Add a Road Poneglyph',
  roadTitleField: 'What has to happen',
  roadWhyField: 'Why the dream needs it',
  roadWhyLabel: 'Why',
  roadRetire: 'Retire this pillar',
  roadUnretire: 'Bring it back',
  roadRetired: 'Retired',
  islandLabel: 'Poneglyph',
  islandAdd: 'Name the next island',
  islandPlaceholder: 'One concrete thing. Weeks, not years.',
  islandReached: 'Reached',
  islandPass: 'Sail past',
  islandPassReason: 'Why you are sailing past',
  islandPassConfirm: 'Sail past it',
  islandReopen: 'Put back to sea',
  islandHistory: 'Astern',
  strikeIt: 'Strike it',
  strikePlaceholder: 'One thing today that moves this.',
  strikeAdded: 'On today.',

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
  // The gym, specifically — one input to Armament rather than the whole of
  // it. Calling this section Armament was what made the lens look like a
  // workout tracker.
  trainingSection: 'Training',
  gearsTitle: 'Gears',
  trainingLog: 'Log a session',
  trainingEmpty: 'Nothing logged yet.',
  trainingThisWeek: 'This week',
  hardnessLabel: 'Hardness',
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
    conquerors: { glyph: '', label: 'Goals' },
    settings: { glyph: '', label: 'Settings' },
  },

  homeTitle: 'Energy',
  reserveLabel: 'Level',
  dailyReadCta: 'Check in',
  dailyReadDone: 'Checked in',

  logTitle: 'Journal',
  courseTitle: 'Intention',
  stillnessTitle: 'Meditation',
  logPoseTitle: 'Goals',
  logPoseBlurb:
    'One big goal, the things it needs, and the next step under each. Nothing here is scored.',
  dreamLabel: 'The big one',
  dreamPlaceholder: 'The one everything else is for.',
  dreamSetCta: 'Name it',
  roadLabel: 'Main goals',
  roadAdd: 'Add a main goal',
  roadWhyField: 'Why the big one needs it',
  roadRetire: 'Retire this goal',
  roadUnretire: 'Bring it back',
  islandLabel: 'Milestone',
  islandAdd: 'Set the next step',
  islandPlaceholder: 'One concrete thing. Weeks, not years.',
  islandReached: 'Done',
  islandPass: 'Set aside',
  islandPassReason: 'Why you are setting it aside',
  islandPassConfirm: 'Set it aside',
  islandReopen: 'Reopen it',
  islandHistory: 'Done and set aside',
  strikeIt: 'Add a task',
  strikePlaceholder: 'One thing today that moves this.',

  carriedTitle: 'People I carry',
  trainingTitle: 'Training',
  // The tab is already called Training in plain mode, so the section inside it
  // needs its own word or the two read as the same heading twice.
  trainingSection: 'Workouts',
  gearsTitle: 'Focus',
  hardnessLabel: 'Hardness',
  todayLoad: "Today's list",

  keystoneTitle: 'Keystone habit',

  daysAtSea: (n) => `Day ${n}`,
};

export function strings(plainMode: boolean): Strings {
  return plainMode ? plain : haki;
}
