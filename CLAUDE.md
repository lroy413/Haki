# Haki — working notes

A private journaling, habit, and mental-health app for one person. Read
`docs/CONCEPT.md` for what it is and why; this file is how to work on it.

---

## Visual quality is a requirement, not a finishing touch

The owner asked for this explicitly and it is standing: **every change ships
looking polished.** A feature that works but looks unfinished is not done.

- **Never ship a UI change you have not looked at.** Build the web target and
  screenshot it. `innerText` and a passing typecheck prove nothing about
  layout — every visual bug in this repo's history was invisible to both:
  buttons with no background, kanji wrapping through their own labels, an
  em-dash rendering as a filled bar, tab labels drawn twice.
  ```bash
  npm run build:web && npm run serve:web    # then drive it in a browser
  ```
- Check **both modes** — Haki (default) and plain — and the empty state as
  well as the populated one. Most of the bugs above only appeared in one.
- **Nothing is smaller than 11pt, and nothing is fainter than 4.5:1.** Both
  floors are tested (`typeSizes.test.ts`, `palettes.test.ts`). They exist
  because the owner said the app was hard to read at full brightness and the
  arithmetic agreed: `inkFaint` measured 2.9:1 on the palette the app spends
  its day in, under forty-two styles that had each shaved a point off the type
  scale. If something needs to recede, use colour, weight or space — never
  another point off a figure that is already small.
- **Colour comes from `useHaki().palette`, never from a literal.** The app
  runs four palettes: it opens on paper and hardens as the day is used
  (`src/domain/hardening.ts`). A hex in a screen looks fine until the ground
  moves under it — fifteen accent labels were near-black and invisible the
  first time paper rendered. There are tests for both halves: every palette is
  held to a contrast floor, and no source file may contain a colour literal.
- A screenshot at one hardening level proves nothing about the others. Level 0
  is the one to check first: it is the only light palette, so it is where
  anything colour-blind to the ground shows up.
- Cards in a row must end up the same height. Labels that wrap where their
  neighbours do not are a bug.
- An empty value is not a dash. Say what it means: "Not yet", "No sessions
  yet". A dash at display weight looks like data.

## The screen answers the finger, not the write

Striking a task writes one row and then reloads the whole provider. On the web
every one of those queries goes through expo-sqlite's single synchronous
channel, so the tick took long enough to appear that the checkbox read as
broken — and a second tap on a checkbox is a perfectly good "undo", so it
landed as one. Three taps to check a box, none of them missed.

- **Anything that toggles holds its own optimistic state**, shown immediately
  and dropped when the stored value agrees. See `TaskRow` in
  `app/(tabs)/training.tsx`.
- **Never read-modify-write from a row the screen is holding.** Pass the value
  you want (`onToggle(next)`), not "flip whatever is there" — two quick taps
  both read the stale row and both write the same thing.
- **44pt is the floor for anything you tap.** A 26pt box with `hitSlop={8}`
  comes to 42, which is under it. Prefer making the whole row the target over
  growing the hit slop.
- **Every `Pressable` carries an `accessibilityRole`.** Without one it renders
  as a plain `div` and a screen reader walks straight past it. There is a test.

## Type

Three faces, carried over from the concept doc. They are the identity:

| Role    | Face                | Used for                                               |
| ------- | ------------------- | ------------------------------------------------------ |
| Display | Bricolage Grotesque | the wordmark, headings, big numbers                    |
| Body    | Newsreader          | prose, journal text, anything read rather than scanned |
| Utility | IBM Plex Mono       | labels, dates, stats, tab words                        |

**Never set `fontWeight`.** Each weight is a separate loaded family
(`font.display`, `font.displayBold`, …). Pairing one with `fontWeight` makes
React Native synthesise a bolder face on top of an already-bold one, which
renders as smeared letterforms on Android. Use `type.*` tokens from
`src/theme/tokens.ts`, or `font.*` directly.

New faces load in `app/_layout.tsx` behind the splash screen, so there is no
flash of the system font on a cold start.

## Chrome

**The web shell is pinned, not measured.** `#root` is `position: fixed` on all
four sides (`tools/pwa-head.mjs`). Every unit that claims to be the height of
the screen — percentages, `-webkit-fill-available`, `dvh` — has now cost this
app the same bug twice: a dead band under the tab bar on an iPhone. Nothing
scrolls the document here, so pinning costs nothing. **Do not reintroduce a
height calculation on the root.** The shell's background follows the live
palette (see `HakiProvider`), and the boot script paints the last known ground
before the bundle parses.

**The app runs edge to edge.** The tabs have no navigation header — a fixed
band across the top cost 64pt on the web and about 103 on an iPhone, on every
screen, to hold one word. Each tab draws its own title inside its scroll view
(`PageHeading`) so it scrolls away, and takes its padding from `useTabInsets`,
which adds the notch at the top and `TAB_BAR_CLEARANCE` plus the home indicator
at the bottom. **Use that hook rather than padding a tab screen by hand**, or
the scene starts in the wrong place on exactly one class of phone.

The tab bar floats: `src/components/GlassTabBar.tsx`, blurred and translucent,
inset from the edges. Anything scrollable must clear it at the bottom or its
last item ends up underneath. Floating buttons stack _above_ the bar, never
behind it.

Screens pushed on top of the tabs — the Daily Read, a session, the course, an
entry — keep their headers: they need a way back.

## Drawings are replaceable; systems are not

`src/components/instruments/` holds the two hand-plotted SVGs — the Sunny and
the fist. Both carry a **REPLACING THIS DRAWING** block at the top naming the
viewBox, the aspect, the colour props and what the composition has to keep, so
a proper redraw drops in without touching anything above them.

Keep that seam clean. The Sunny's _water_ lives in `instruments/Sea.tsx`
because it is a system — swell, wavelength, phase, how much is running — and
systems do not get thrown away when someone redraws the boat. Same rule for
the impact frame: the field owns the violence, the instrument owns the shape.

## The light a lens throws

`lit(tint, level)` in `theme/surfaces.ts` puts a lens's own colour into the air
around its identity plate — crimson on the hardness readout, violet on the
reading and the Dream, cyan on Foresight. It is the only decoration allowed to
follow hardening, and the licence has conditions, all tested:

- **Paper catches nothing.** Level 0 returns no glow. Unhardened Haki does not
  shine, and an aura on parchment says the opposite of what the ramp says.
- **It only grows.** Strength climbs with the level, the same curve the
  specular glint takes, and it is never a figure, a bar or a count — you
  cannot read a score off a halo.
- **Plain mode gets none of it.** Pass `plainMode ? 0 : hardening`; an aura is
  a performance and plain mode stops the app performing. `lit` cannot work
  this out for itself, because plain mode pins the level to the settled dark —
  the value that glows brightest.

The tab bar is the legend: each tab burns its own lens colour when focused
(cyan, violet, crimson, violet, plain ink for settings), and each screen's mark
in its top corner wears the same one. **One screen, one light.**

## Sound

Effects live in `assets/sounds/` and are declared in `src/sound/sounds.ts` —
adding one is a line there plus a file. Play with `play('name')` from
`src/sound`. `docs/SOUNDS.md` records what each one was cut from; **add a row
there when you cut a new one**, or the next person re-cutting it is guessing.

- **Cut every source with `tools/make_sound.py`.** Raw sound-effect exports are
  mastered for video: stereo, 48kHz, several seconds, often with leading
  silence. The Armament source was 4.54s and 871KB; the cut is 0.70s and 33KB.
  Anything that fires on a tap belongs under a second.
- **Never commit the raw source into `assets/`** — everything under it is
  bundled and shipped to the phone.
- **Sound never blocks and never throws.** A file that will not load must not
  stop a task being marked done.
- **Mix, never interrupt.** The audio session is set to `mixWithOthers`, so
  the app cannot pause someone's music.
- Plain mode mutes everything, sound included.

## Architecture

- **A day does not end at midnight.** `todayKey()` respects a configurable
  boundary (`voyage.dayStartHour`), so anything asking "what day is it" must go
  through it rather than reading a `Date` itself. `loadSettings` applies the
  boundary before it computes anything, because everything after that line is
  wrong until it does.
- **`src/domain/` is pure TypeScript with no React Native imports.** That is
  what lets the real logic be tested on plain Node with no simulator. Keep it
  that way — if something needs a React Native import, it does not belong here.
- `src/db/` — Drizzle schema, hand-rolled DDL versioned by `PRAGMA
user_version` in `bootstrap.ts`. **Append migrations, never edit a shipped
  one**; it has already run on a device holding real journal entries.
- `src/files/` — one implementation per platform, both `satisfies Transfer`.

## The three lenses

Each act belongs to exactly one, and getting this wrong is easy — it has been
got wrong once already, by measuring 武装色 from workouts alone.

The lenses are the tools, and each is a tab. The owner's framing, given while
using the thing: Armament is the productivity portion, Observation is the
mental-health space, Conqueror's is the dreams. **A lens's own measure reads
what is done under its tool** — not the whole app, and never another tool's
acts.

| Lens               | The tool                                  | Its measure reads             | Lives in                |
| ------------------ | ----------------------------------------- | ----------------------------- | ----------------------- |
| 見聞色 Observation | mental health: journal, sits, the reading | sitting, gated by clarity     | `domain/observation.ts` |
| 武装色 Armament    | productivity: tasks, workouts, schedule   | struck tasks, sessions        | `domain/armament.ts`    |
| 覇王色 Conqueror's | the dreams: Log Pose, Inherited Will      | nothing — a bearing, no meter | `domain/logpose.ts`     |

Three rules fall out of that:

- **A workout is one input to Armament, never the measure of it.** The owner
  trains once a day, so a figure built on session count has about two useful
  values. Hardness reads everything done under the tool, and counts **days
  that had any** rather than how much — three tasks is not a better day than
  one.
- **Observation only works in clarity.** Sitting is the practice and clarity is
  what lets you use it, so `observation.ts` reports the two separately and
  names whichever is limiting. "The practice is there, today is loud" is a
  sentence this app should be able to say.
- **The Gears belong to none of the lenses.** Haki is will and a Devil Fruit is
  ability; the Gears are the owner's coming ability page, and until it forms
  they wait on `/gears` (pushed, reached from the practice card) rather than
  sitting on the Armament tab. Do not put them back.

Hardening is not one of the lenses. It reads the whole day across all of the
tools — a gear block or a sit still darkens the app — see
`domain/hardening.ts`.

## Foresight is tuned to stay quiet

`domain/foresight.ts` reads the owner's own history back to him, which makes it
the one module that can do real harm: **a mental-health app that confidently
reports a pattern which is actually noise has invented a rule about somebody's
mind and handed it over with the authority of arithmetic.**

The first honest attempt — half a dial point of difference plus a median check
— reported a confident finding on **254 of 300 simulated lives in which nothing
was related to anything.** With a Welch t gate it speaks on 1. That simulation
is `foresightNoise.test.ts` and it is the most important test in the repo; the
planted-signal test beside it is the other half of the bargain, so the gates
cannot simply be cranked until nothing survives.

- **`MIN_T` is calibrated, not tabulated.** A Bonferroni critical value assumes
  independent days, and daily self-reports are nothing of the kind — a bad week
  is one event, not seven. The threshold was raised by simulation until the
  engine shut up. If a change moves either the noise rate or the planted-signal
  test, the change is wrong.
- **Never a cause, never advice.** Every sentence describes two kinds of day.
  `directionNote` says which-way-round is unknowable and renders at the same
  weight as the finding, because it is half of what is known — not fine print.
  There are tests forbidding "because", "you should" and their neighbours.
- **Quiet is the ordinary answer**, and the copy says so rather than treating
  an empty result as a failure of the app or of the life.

## The rhythm is an offer, not a queue

Recurring things (`domain/rhythm.ts`) create **nothing** until you take them.
Every other task app materialises a row when a recurrence comes due, and by
Friday the list is a rap sheet for the week — which is a shame mechanic with a
calendar attached. Here the offers are computed for the day and rendered as
rows that do not exist; taking one writes an ordinary struck `task` carrying
the rhythm's `createdAt`, so it counts toward hardening and Armament like
anything else. Un-ticking **deletes** that row rather than clearing `doneAt`:
a rhythm is either taken today or standing today, and a committed-but-undone
rhythm row is the rotting artefact the whole model exists to avoid.

Two consequences worth keeping: an interval rhythm counts from the **last time
it was taken**, never a fixed anchor, so letting one pass never pushes the next
one away; and nothing anywhere reports how many times a rhythm has been taken
or skipped. That number is derivable and displaying it would turn a set of
offers into a set of scores.

## Setting Sail is the one place that totals anything

Everywhere else a count needs a denominator the app does not have — a journey
has no total, hardening has no score. A week is different: seven days is real,
bounded and honest, so `domain/sail.ts` may say "four of the seven days had
something in them". The tone rules still bind, and the top of the range is
where they bite hardest: **a full week gets a question, never a trophy**, because
coasting is the thing to notice. There is a test asserting the seven-day
message contains a question mark and no congratulation.

Inherited Will surfaces here and nowhere else — the concept doc's rule kept
exactly: at the weekly ritual, never on a schedule, never on a failure screen.

## The Log Pose

覇王色 is **the lens with no meter**, and that is a decision rather than an
omission. Observation reports a state and Armament reports a hardness;
Conqueror's cannot be trained, only refined — it is knowing exactly who you are
— so a number that rose as you knew yourself better would be a lie about what
the thing is. What the screen gives back is a _bearing_.

Three sizes, and the relationship between them is the whole design: **one
Dream**, never scaled down for a bad month; **four to seven Road Poneglyphs**,
the big things it actually requires (four triangulates, seven is the ceiling);
**one Poneglyph at a time** under each, weeks wide and concrete.

- **A journey has no denominator.** No percentage, no bar, no "3 of 8" — nobody
  sailing knows how many islands are left, so any total would be invented.
  Progress is reported as what is astern, counted, with nothing beside it. Same
  rule hardening holds, arrived at from the other end.
- **One island at a time per pillar.** The WIP limit is the treatment for the
  failure mode the feature exists to treat: things go unfinished because the
  loop never closed and nothing made you say so. Enforced in `openPoneglyph` as
  well as in the UI — a limit that only holds while the screen is open is not a
  limit.
- **Finish or sail past, no third option**, and the asymmetry between them is
  the only place this app deliberately makes something harder. Reaching is one
  tap; sailing past costs one written line. A decision you cannot be bothered
  to write down is drift wearing a different coat.
- **The record is kinder than the event.** The event has to be a real choice
  with a reason attached, but a list of things labelled ABANDONED sits in this
  app for years and is a monument to being someone who quits. Stored as
  `passed`, displayed as "Sailed past".
- **The burst is rare by construction.** `fireConquerors()` has exactly one
  caller — an island reached — and stays rare because an island is weeks of
  work. If it ever starts firing weekly, the thing to fix is what is calling
  it, not the effect.

## `palette.ink` is not the dark one

It is the **text** colour: near-black on paper and near-white on all three
hardened palettes. Anything wanting "the darkest thing here" — black lightning,
a full-screen wash — must call `darkest(palette)` from `src/theme/palettes.ts`,
which is `lightSurface ? ink : bg` and is tested against every palette. Reading
`palette.ink` for it flashed the whole display white on the three palettes the
app spends its day in, and nothing in the name suggested it would.

## Tone

This is a mental-health app for someone whose stated problem is consistency.

- **No shame mechanics.** No red for failure, no zeroed streaks, no "you
  missed". A miss is data. There are tests asserting the copy never contains
  "failed", "should", "lazy", or "finally" — keep them passing.
- **Never congratulate a frictionless week.** Coasting is the thing to notice.
- **Memory is a source, never a stick.** Nothing in Inherited Will may nag,
  score, or appear on a failure screen.
- **An untouched practice shows its offer, not its absence.** The day's
  practice card (`src/domain/practice.ts`) says "5, 10 or 15" under a sit that
  has not happened, never "not yet". Six things you have not done is a
  checklist; six things available is a card. That difference is one string per
  row, and it is the whole feature.
- **Hardening is never displayed as a score.** No count, no percentage, no
  bar, no "2 of 6" — the rule in `domain/hardening.ts` binds anything that
  renders it too, or displaying it undoes it. The Sunny at the top of the home
  screen obeys it by never moving: it is **at anchor** and then under way, a
  state and not a position. A ship travelling toward somewhere is a progress
  bar in fancy dress, and a ship adrift is a picture of failure.

## Before pushing

```bash
npm run typecheck && npm test && npm run build:web && npx prettier --check .
```

Then screenshot the change. CI runs the same checks plus a native bundle.

Work on a branch, open a PR into `main`, let CI and the Vercel preview run.
`main` deploys to production on merge.
