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
    observation: Tab;
    armament: Tab;
    conquerors: Tab;
    settings: Tab;
  };

  homeTitle: string;
  reserveLabel: string;
  reserveUnknown: string;
  dailyReadCta: string;
  dailyReadDone: string;

  observationTitle: string;
  entriesLabel: string;
  logTitle: string;
  logEmpty: string;
  logLine: string;
  newEntry: string;

  courseTitle: string;
  coursePlaceholder: string;
  stillnessTitle: string;
  breathLabel: string;
  breathBlurb: string;
  settleTitle: string;
  settleLine: string;

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
  /** Section label over the pillar's own fields, on its screen. */
  roadEditLabel: string;
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

  flagTitle: string;
  flagBlurb: string;
  flagAdd: string;
  flagField: string;
  flagEmpty: string;

  eternalTitle: string;
  eternalBlurb: string;
  eternalSetCta: string;
  eternalField: string;
  eternalPlaceholder: string;
  eternalTakeNew: string;
  eternalLetGoField: string;
  eternalCarriedLabel: string;

  asternLabel: string;
  soundingsLabel: string;
  soundingTake: string;
  soundingField: string;
  soundingUnitField: string;
  soundingUnitCta: string;
  carriedTitle: string;
  carriedBlurb: string;
  carriedEmpty: string;
  carriedAdd: string;
  carriedName: string;
  carriedRelationship: string;
  carriedDream: string;
  carriedWhatICarry: string;

  rhythmTitle: string;
  rhythmLabel: string;
  rhythmManage: string;
  rhythmAdd: string;
  rhythmEmpty: string;
  rhythmBlurb: string;
  rhythmName: string;
  rhythmDays: string;
  rhythmEvery: string;
  rhythmRetire: string;
  rhythmUnretire: string;
  rhythmRetired: string;
  rhythmKindWeek: string;
  rhythmKindInterval: string;

  foresightTitle: string;
  foresightLabel: string;
  foresightBlurb: string;
  foresightWatching: string;
  foresightEvidence: string;
  foresightOpen: string;

  sailTitle: string;
  sailCta: string;
  sailWeekLabel: string;
  sailNeedlesLabel: string;
  sailHeadingLabel: string;
  sailNoteLabel: string;
  sailSave: string;
  sailCarriedLabel: string;
  sailPastLabel: string;

  todayLoad: string;
  taskPlaceholder: string;
  addToToday: string;
  addToLater: string;
  addToTomorrow: string;
  tomorrowLabel: string;
  watchPrompt: string;
  backlogLabel: string;
  backlogEmpty: string;
  bellsTitle: string;
  dayEndTitle: string;
  dayEndDoor: string;
  dayEndBlurb: string;
  dayStripLabel: string;
  nextStrikeLabel: string;
  nextStrikeEmpty: string;

  trainingTitle: string;
  trainingSection: string;
  gearsTitle: string;
  stylesTitle: string;
  crewTitle: string;
  crewBlurb: string;
  trainingLog: string;
  trainingEmpty: string;
  trainingThisWeek: string;
  trainingPlanned: (n: number) => string;
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

  settingsBlurb: string;
  quietTitle: string;
  dayTurnTitle: string;
  dataTitle: string;
  /** The shell readout on the data page — see `ShellReport`. */
  shellTitle: string;
  shellFilling: string;
  shellShort: (points: number) => string;
  shellBand: (points: number) => string;
  shellNote: string;
  shellAgain: string;
  shellNative: string;

  dials: { energy: string; mood: string; clarity: string; tension: string };
  weatherPrompt: string;
  weatherHint: string;
  sleepPrompt: string;
  daysAtSea: (n: number) => string;
};

const haki: Strings = {
  appName: 'Haki',
  // The three lenses are the tools, and the labels are the owner's: 見聞色 is
  // the mental-health space, 武装色 the productivity one, 覇王色 the dreams.
  // English words under the kanji stay short — the kanji is the identity and
  // the word is a caption, and "Observation" at tab size wraps.
  tabs: {
    home: { glyph: '覇気', label: 'Home' },
    observation: { glyph: '見聞色', label: 'Sense' },
    armament: { glyph: '武装色', label: 'Do' },
    // The tab word is Journey rather than Log Pose because the journal sits
    // two tabs away and two labels starting with "Log" is a coin flip every
    // time you reach for one.
    conquerors: { glyph: '覇王色', label: 'Journey' },
    settings: { glyph: '設定', label: 'Settings' },
  },

  homeTitle: 'Will Reserve',
  reserveLabel: 'Reserve',
  reserveUnknown: 'No reading yet today',
  dailyReadCta: 'Daily Read',
  dailyReadDone: 'Read logged',

  observationTitle: 'Observation',
  entriesLabel: 'Logbook',
  logTitle: 'Logbook',
  logEmpty: 'Nothing logged yet. The first entry is the hardest.',
  logLine: 'Log it',
  newEntry: 'New entry',

  courseTitle: 'Course',
  coursePlaceholder: 'What today is for.',
  stillnessTitle: 'Stillness',
  breathLabel: 'The breath',
  breathBlurb: 'Two minutes at a set cadence. A pace to follow, never a thing that is checked.',
  // The loud-day door. It opens only when the read already says today is
  // loud, and it offers exactly one thing.
  settleTitle: 'Settle',
  // The reading card directly above has already said today is loud, so this
  // line carries only the offer — the same fact twice in two stacked cards
  // reads as the app repeating itself.
  settleLine: 'Two minutes of long exhales, right here. It asks nothing else.',

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
  roadEditLabel: 'The pillar itself',
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

  // 旗 — the flag a ship sails under. Three to five things, in your words.
  flagTitle: 'The Flag',
  flagBlurb:
    'What you stand for, in your own words. Nothing here is ever completed, counted or checked off — it is what the rest of this gets measured against.',
  flagAdd: 'Raise one',
  flagField: 'In your own words',
  flagEmpty: 'Nothing raised yet.',

  // 不変 — the Eternal Pose. One bearing, and it does not recalibrate.
  eternalTitle: 'The Eternal Pose',
  eternalBlurb:
    'A Log Pose finds the next island. An Eternal Pose points at one place forever, so you can always find your way back to it. One line: the thing you come back to when the week has gone sideways. Nothing here is ever ticked, counted or scored.',
  eternalSetCta: 'Take a bearing',
  eternalField: 'The one thing',
  eternalPlaceholder: 'I do not go a day without…',
  eternalTakeNew: 'Take a new bearing',
  eternalLetGoField: 'Why this one is being let go',
  eternalCarriedLabel: 'Carried before',

  // 過去 — what is behind you in the log. Only ever a source.
  asternLabel: 'Astern',

  // 測深 — a depth taken by dropping a line. No target, ever.
  soundingsLabel: 'Soundings',
  soundingTake: 'Take a sounding',
  soundingField: 'The reading',
  soundingUnitField: 'Measured in',
  soundingUnitCta: 'Give it a unit',

  carriedTitle: 'Inherited Will',
  carriedBlurb:
    'The people whose dreams you carry. Nothing here nags, scores, or reminds you — it opens only when you open it.',
  carriedEmpty: 'No one recorded yet.',
  carriedAdd: 'Add someone',
  carriedName: 'Their name',
  carriedRelationship: 'Who they were to you',
  carriedDream: 'What they wanted',
  carriedWhatICarry: "What of it you're carrying",

  // 律動 — the beat a thing keeps. Not a schedule: a schedule is when you
  // must, and this is when a thing comes back round and offers itself.
  rhythmTitle: 'The Rhythm',
  rhythmLabel: 'Comes back',
  rhythmManage: 'The rhythm',
  rhythmAdd: 'Add a rhythm',
  rhythmEmpty: 'Nothing set to come back yet.',
  rhythmBlurb:
    'Things that come back round. Nothing is created until you take it, so a day you let one pass leaves nothing behind — it simply comes round again.',
  rhythmName: 'What comes back',
  rhythmDays: 'Which days',
  rhythmEvery: 'How many days between',
  rhythmRetire: 'Stop this one',
  rhythmUnretire: 'Start it again',
  rhythmRetired: 'Stopped',
  rhythmKindWeek: 'On days',
  rhythmKindInterval: 'Every so often',

  // 未来視 — future sight, which is what 見聞色 reaches at its far end and
  // what the eyes' glint is for.
  foresightTitle: 'Foresight',
  foresightLabel: 'Foresight',
  foresightBlurb:
    'What your own record has been saying. Two kinds of day, and how they read differently — drawn from your history, never from anyone else\u2019s advice.',
  foresightWatching: 'Still watching',
  foresightEvidence: 'Read from',
  foresightOpen: 'All of it',

  sailTitle: 'Setting Sail',
  sailCta: 'Set sail',
  sailWeekLabel: 'The week behind',
  sailNeedlesLabel: 'The needles',
  sailHeadingLabel: 'The heading',
  sailNoteLabel: 'Anything worth writing down',
  sailSave: 'Set the heading',
  sailCarriedLabel: 'Carried',
  sailPastLabel: 'Astern',

  todayLoad: "Today's load",
  taskPlaceholder: 'One thing. What is it?',
  addToToday: 'Carry today',
  addToLater: 'Later',
  addToTomorrow: 'Tomorrow',
  tomorrowLabel: 'Tomorrow',
  watchPrompt: 'The watch',
  backlogLabel: 'Waiting',
  backlogEmpty: 'Nothing waiting.',
  bellsTitle: 'The Bells',
  dayEndTitle: 'Day’s End',
  dayEndDoor: 'Close the day',
  dayEndBlurb: 'Read it back, decide what is left, say how it went.',
  dayStripLabel: 'The watches',
  nextStrikeLabel: 'Next strike',
  nextStrikeEmpty: 'Nothing pulled in for today. Tap to add one.',

  trainingTitle: 'Armament',
  // The gym, specifically — one input to Armament rather than the whole of
  // it. Calling this section Armament was what made the lens look like a
  // workout tracker.
  trainingSection: 'Training',
  gearsTitle: 'Gears',
  // 刀流 — the sword styles, under Zoro's flag.
  stylesTitle: 'Sword Styles',
  crewTitle: 'Whose will',
  crewBlurb:
    'Changes the instrument the impact frame draws, and what 覇王色 burns. Nothing recorded changes — a session logged under one flag reads under the other.',
  trainingLog: 'Log a session',
  trainingEmpty: 'Nothing logged yet.',
  trainingThisWeek: 'This week',
  trainingPlanned: (n: number) => `${n} planned`,
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

  // The settings chart. Each category is an island; the names are places,
  // because that is what they are — you sail to one, change something, sail
  // back. Quiet is the pair of mute switches, Daybreak is where the day
  // turns over.
  settingsBlurb: 'Every setting is an island. Tap one to go ashore.',
  quietTitle: 'Quiet',
  dayTurnTitle: 'Daybreak',
  dataTitle: 'Your data',
  shellTitle: 'This install',
  shellFilling: 'The app is filling the screen.',
  shellShort: (points) =>
    `The app is stopping ${points} points short of the bottom of the screen.`,
  shellBand: (points) =>
    `iOS gives this app ${points} points less than the screen, so the strip along the bottom is outside it. The ground you can see there is the browser extending this page's own colour.`,
  shellNote:
    'Screenshot this if the app is not reaching the bottom. The build is what tells us whether a fix has actually arrived on this phone yet.',
  shellAgain: 'Measure again',
  shellNative:
    'These numbers are the web shell\u2019s. This is the native app, which has no shell.',

  dials: { energy: 'Energy', mood: 'Mood', clarity: 'Clarity', tension: 'Tension' },
  weatherPrompt: 'The weather',
  weatherHint: 'One word for the sky today. Optional, every day.',
  sleepPrompt: 'Hours slept',
  daysAtSea: (n) => `Day ${n} at sea`,
};

const plain: Strings = {
  ...haki,
  appName: 'Daybook',
  tabs: {
    home: { glyph: '', label: 'Today' },
    observation: { glyph: '', label: 'Journal' },
    armament: { glyph: '', label: 'Tasks' },
    conquerors: { glyph: '', label: 'Goals' },
    settings: { glyph: '', label: 'Settings' },
  },

  homeTitle: 'Energy',
  reserveLabel: 'Level',
  dailyReadCta: 'Check in',
  dailyReadDone: 'Checked in',

  observationTitle: 'Journal',
  entriesLabel: 'Entries',
  logTitle: 'Journal',
  courseTitle: 'Intention',
  stillnessTitle: 'Meditation',
  flagTitle: 'Values',
  flagBlurb:
    'What you stand for, in your own words. Nothing here is completed, counted or checked off — it is what the rest of this gets measured against.',
  flagAdd: 'Add one',
  eternalTitle: 'The one thing',
  eternalBlurb:
    'One line: the thing you come back to when a week has gone sideways. It is never ticked, counted or scored — it is here to be read.',
  eternalSetCta: 'Set it',
  eternalTakeNew: 'Change it',
  eternalCarriedLabel: 'Before this',
  asternLabel: 'From the archive',
  soundingsLabel: 'Readings',
  soundingTake: 'Log a reading',
  breathLabel: 'Breathing',
  settleTitle: 'Settle',
  settleLine: 'Two minutes of slow breathing, right here. Nothing else attached.',
  logPoseTitle: 'Goals',
  logPoseBlurb:
    'One big goal, the things it needs, and the next step under each. Nothing here is scored.',
  dreamLabel: 'The big one',
  dreamPlaceholder: 'The one everything else is for.',
  dreamSetCta: 'Name it',
  roadLabel: 'Main goals',
  roadAdd: 'Add a main goal',
  roadWhyField: 'Why the big one needs it',
  roadEditLabel: 'The goal itself',
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
  bellsTitle: 'Appointments',
  dayEndTitle: 'End of day',
  dayEndDoor: 'Review the day',
  dayEndBlurb: 'What happened, what is left, how it went.',
  dayStripLabel: 'Today',
  nextStrikeLabel: 'Next up',
  strikeIt: 'Add a task',
  strikePlaceholder: 'One thing today that moves this.',

  carriedTitle: 'People I carry',
  trainingTitle: 'Training',
  // The tab is already called Training in plain mode, so the section inside it
  // needs its own word or the two read as the same heading twice.
  trainingSection: 'Workouts',
  gearsTitle: 'Focus',
  stylesTitle: 'Focus',
  crewTitle: 'Style',
  crewBlurb: 'Changes the artwork and the accent colour. Nothing recorded changes.',
  hardnessLabel: 'Consistency',

  rhythmTitle: 'Repeating',
  rhythmLabel: 'Repeats',
  rhythmManage: 'Repeating tasks',
  rhythmAdd: 'Add a repeating task',
  rhythmEmpty: 'Nothing repeating yet.',
  rhythmBlurb:
    'Tasks that repeat. Nothing is created until you tick it, so a day you skip one leaves nothing behind — it just comes back on its next day.',
  rhythmName: 'What repeats',

  foresightTitle: 'Patterns',
  foresightLabel: 'Patterns',
  foresightBlurb:
    'What your own check-ins have been saying. Two kinds of day, and how they read differently.',
  foresightWatching: 'Still watching',
  foresightOpen: 'All of it',

  sailTitle: 'Weekly review',
  sailCta: 'Start the review',
  sailWeekLabel: 'The week behind',
  sailNeedlesLabel: 'Your goals',
  sailHeadingLabel: 'This week',
  sailSave: 'Save it',
  sailCarriedLabel: 'People',
  sailPastLabel: 'Past weeks',

  todayLoad: "Today's list",

  keystoneTitle: 'Keystone habit',

  settingsBlurb: 'Every setting, by category.',
  quietTitle: 'Sound & effects',
  dayTurnTitle: 'Day start',

  daysAtSea: (n) => `Day ${n}`,
};

export function strings(plainMode: boolean): Strings {
  return plainMode ? plain : haki;
}
