# Haki

A private journaling, habit, and mental-health app for an audience of one.

> Every other app tracks what you _did_. This one tracks the state of your _will_.

Built on the idea borrowed from One Piece's Haki system: willpower isn't infinite.
It depletes, it recovers, and almost nobody measures theirs.

- [`docs/CONCEPT.md`](docs/CONCEPT.md) — the concept doc: failure modes, mechanics, build order
- [`docs/concept.html`](docs/concept.html) — the same thing as a designed page
- [`docs/DEPLOY.md`](docs/DEPLOY.md) — **start here** to get it on your phone

---

## v0 — the spine

**Definition of done, written before a line of code:**

|                                                                   | Done                        |
| ----------------------------------------------------------------- | --------------------------- |
| Open the app                                                      | ✅                          |
| Log a Daily Read in under 30 seconds                              | ✅ four dials, one tap each |
| Write a journal entry                                             | ✅ Markdown, autosaving     |
| See your Will Reserve                                             | ✅                          |
| Get a Den Den Mushi warning the morning after a bad night's sleep | ✅                          |

Plus two additions past the line, both on request: **Inherited Will**, and
**Training** — the downstream end of the cascade, so the thing sleep was
already declared to carry is now actually tracked. Plus **export/import**,
which the PWA-then-native plan makes load-bearing rather than optional.

That's the finish line. Everything else is v1+ and deliberately absent.

### Verified

`npm test` 96 passing · `npm run typecheck` clean · `npx expo-doctor` 21/21 ·
web and native both bundle · **driven end-to-end in a real browser**: Daily
Read saved, Reserve computed, keystone warning fired on 5h sleep, training
session logged, data survived a reload, zero console errors.

**Migration verified across two browser profiles** — exported from one, imported
into a genuinely empty second one, journal entry and training session both came
back, and a repeat import reported `0 added, 4 already here`.

**Not yet run on iOS Safari or a physical device.** The browser test was
headless Chromium. Safari is the one that matters for you and it has not been
checked — see _iOS requirements_ below.

---

## Running it

Haki ships two targets from one codebase. **Start on web**; go native when
you want widgets and the Den Den Mushi.

### Web (PWA) — no laptop needed after deploy

```bash
npm install
npm run build:web     # exports to dist/ and injects the PWA head
npm run serve:web     # local preview at :8080
```

Deploy `dist/` anywhere that can set custom headers — `vercel.json` and
`public/_headers` (Netlify / Cloudflare Pages) are both committed. Then open
the URL on your phone and **Share → Add to Home Screen**.

> **Hosting requirement, not optional.** `expo-sqlite`'s web build drives its
> worker over `SharedArrayBuffer`, which browsers only expose to a
> cross-origin-isolated page. Without `Cross-Origin-Opener-Policy: same-origin`
> and `Cross-Origin-Embedder-Policy: require-corp` the database never opens and
> the app boots to an error. **This rules out GitHub Pages**, which cannot set
> custom headers. `npm run serve:web` sets them locally; plain `npx serve dist`
> will not work.

### iOS requirements

Persistence uses OPFS, which needs a reasonably current Safari — **iOS 17+** is
the safe floor. On first launch, if the app shows the database error screen
instead of the home screen, that is what went wrong.

### Native

```bash
npx expo start                       # Expo Go, needs this machine running
npx expo run:ios                     # dev build, needs Xcode
```

Notifications only fire properly in a dev build; Expo Go's support is limited.
The keystone warning always renders on the home screen regardless, so nothing
depends on a notification arriving.

`.npmrc` pins `legacy-peer-deps=true`. Expo SDK 57 pins React 19.2.3 while a
transitive `react-dom` wants 19.2.8; without it a fresh `npm install` fails.

---

## How it's put together

```
app/                      expo-router routes
  (tabs)/
    index.tsx             Home — course, reserve, next strike, the day's practice
    log.tsx               Logbook — entry list
    training.tsx          武装色 Armament — tasks, today's load, gears, sessions
    carried.tsx           Inherited Will
    settings.tsx          keystone + training config, day boundary, plain mode
  read.tsx                Daily Read (modal)
  session.tsx             log a training session (modal)
  course.tsx              set the day's heading — today or tomorrow (modal)
  gear.tsx                a focus block, running
  sit.tsx                 見聞色 Stillness — pick a length, then the breath ring
  entry/[id].tsx          entry editor

public/                   copied verbatim into the web build
  manifest.json           PWA manifest
  sw.js                   service worker (runtime caching, offline shell)
  _headers, _redirects    Netlify / Cloudflare Pages config
  pwa-*.png               PWA + iOS icons

assets/sounds/            short effects, cut for UI use

tools/
  make_icons.py           regenerates every icon from one glyph
  make_sound.py           trims, folds to mono and normalises a source effect
  pwa-head.mjs            injects the PWA head into the exported index.html
  serve-web.mjs           local preview WITH the isolation headers

src/
  domain/                 pure logic, no React Native imports — this is the part that matters
    willReserve.ts        the gauge
    cascade.ts            keystone → downstream detection
    training.ts           sessions, gaps and Returns — the gym, and only the gym
    armament.ts           武装色 — Hardness, read over every act of doing
    observation.ts        見聞色 — the practice, and the clarity to use it
    tasks.ts              today's load, capacity, the next strike
    gears.ts              focus blocks and their honest costs
    stillness.ts          sits, and the breath the ring is drawn to
    course.ts             the day's heading
    logbook.ts            folding one captured line into today's entry
    ambient.ts            how often the weather comes, and how hard
    hardening.ts          what the day has had in it, and how dark that makes it
    practice.ts           the six, and what each one says
    ryuo.ts               how far the emission reaches
    quotes.ts             one line a day, deterministic
    backup.ts             export format, validation, merge planning
    date.ts               day keys, honouring a configurable day boundary
  db/
    schema.ts             Drizzle schema
    bootstrap.ts          versioned DDL via PRAGMA user_version
    repo.ts               typed queries
    settings.ts           typed key/value accessors
  files/                  saving and picking files — one impl per platform
  sound/                  the sound library and playback
  state/HakiProvider.tsx  today's read + reserve + cascade + training + intensity
  theme/                  tokens, and the one label map behind plain mode
  notifications/          Den Den Mushi channels
  components/
    GlassTabBar.tsx       the floating, blurred tab bar
    PageHeading.tsx       a tab's own title, and the inset hook every tab uses
    SeaBand.tsx           the masthead: water and ship, stacked
    DayPractice.tsx       the six, and hardening made legible
    Emission.tsx          the corona a struck task throws
    ImpactLayer.tsx       two frames, 110ms, the whole screen
    AmbientHaki.tsx       the weather — lightning as the day hardens
    Lightning.tsx         bolts: black core, hot rim, deterministic
    ScratchField.tsx      56 torn speed-lines behind an impact frame
    BreathRing.tsx        4s out, 1 held, 6 back in
    instruments/          the two hand-drawn SVGs, each with a swap contract
      Sunny.tsx           the ship — a state, never a position
      Sea.tsx             the water — a system, and not a drawing
      Fist.tsx            Luffy's instrument. Zoro's will be a sword
```

`src/domain` is deliberately free of React Native imports so it tests on plain
Node. Every piece of real logic in v0 is verifiable without a simulator.

### The mechanics that are actually implemented

**Keystone & Cascade** (`src/domain/cascade.ts`) — sleep is declared as a
keystone with training wired downstream. One bad night is a watch; two
consecutive is a breach and fires a notification. A gap in logging _ends_ the
run rather than being counted across — a two-night streak either side of an
unlogged night is not a two-night streak, and the loudest warning in the app
should never fire on invented data.

**Will Reserve** (`src/domain/willReserve.ts`) — a gauge, not a score. Nothing
asks you to make it go up. Weights live in one place at the top of the file so
tuning it is a one-line edit. When there's no read yet it returns `null` and
says so, rather than showing a stale number as though it were current.

**Armament** (`src/domain/armament.ts`) — Hardness, read over **every act of
doing**: a task struck, a block of focus, a session logged. It counts _days
that had any_, never how much, so three tasks is not a better day than one. It
dips when you miss, climbs when you come back, and cannot be zeroed. It used to
be sessions-per-week, which quietly redefined the lens for everything you do on
purpose as a workout tracker — and gave a figure with two useful values to
somebody who trains once a day.

**Observation** (`src/domain/observation.ts`) — sitting is the practice,
clarity is what lets you use it. Canon's rule and the owner's: Observation only
works in times of mental clarity. So the two are reported separately and the
state names whichever is limiting — _"the practice is there, today is loud"_ is
a thing this app can say and most cannot.

**Training** (`src/domain/training.ts`) — the gym, and only the gym: sessions,
gaps, and Returns. A gap of three days or more makes the next session a
**Return** — logged, named, and given its own screen, because coming back is
the skill that decides whether a gap costs a week or a year.

Note the ordering in `app/session.tsx`: the gap is computed _before_ the insert.
Write first and the new session becomes its own "previous session", so every
Return would read as a gap of zero.

**Tasks** (`src/domain/tasks.ts`) — a to-do list built against one failure: an
ADHD brain facing forty things does none of them. Every task carries a minute
estimate, because time blindness is the core problem and a list with no
durations cannot be planned against. Today is a small explicit set; the backlog
is a separate place you visit on purpose. The home screen shows exactly **one**
next thing, since starting is the hard part and a list of options is where
starting dies. Going over capacity is named plainly and never punished — it is
information about the plan, not a verdict on you.

**Backup** (`src/domain/backup.ts`) — export and import, because the PWA and the
native app are two separate databases and data does not cross on its own.
Import **merges and never deletes**, and every table dedupes on a natural key so
importing twice is a no-op. A malformed file is rejected at the envelope; a
single corrupt row is dropped and counted rather than costing you the other two
thousand. Row `id`s are never exported — they are autoincrement values that mean
nothing in another database.

**Hardening and the day's practice** (`src/domain/hardening.ts`,
`practice.ts`) — the app opens pale and goes dark as the day gets used, through
four hand-set palettes. Everything counts toward it: a heading set, the Daily
Read, a sit, an entry, a struck task, a gear. The card that displays it shows
each practice's **offer** when it has not happened yet ("5, 10 or 15") rather
than its absence, because six things you have not done is a checklist and six
things available is a card. Never a count, never a percentage, never a bar.

**Stillness** (`src/domain/stillness.ts`) — 見聞色 as the counterpart to the
Gears: five, ten or fifteen minutes, named Presence, Intent and A moment ahead.
Unlike a gear it costs nothing at all — no cooldown, no daily maximum — and
like a gear, ending early costs nothing and the minutes still count.

**The course** (`src/domain/course.ts`) — one line saying where the day is
pointed, settable for today or for tomorrow. It is never marked: nothing asks
at the end of the day whether it was held, because a graded intention is just a
task you failed to finish.

**The Logbook's second door** (`src/domain/logbook.ts`) — the editor is a full
screen with a cursor in an empty document, and an empty document is a demand.
So the Logbook tab carries a one-line field that asks for nothing and folds
what you type into today's entry. Lines through a day accumulate into one
entry, because that is what a day's log is.

**The weather** (`src/domain/ambient.ts`) — lightning leaks in the background
as the day hardens: silent until something has been done, then a flicker every
half-minute or so, then closer to a storm. Two limits are in the domain with
tests behind them, because it is the one effect here that could genuinely hurt
somebody: a floor on the interval that sits far above the three-flashes-a-second
line photosensitive-seizure guidance draws, and no gating of anything on it —
plain mode, reduced motion and a low Will Reserve each turn it off completely.

**The app loses its power when you do** (`effectIntensity`) — the reserve drives
a 0–1 intensity that fades the glow and flattens the gauge. It only ever touches
decoration; text contrast, hit targets, and every number stay exactly as legible
at 5 as at 95.

### Plain mode

One `strings.ts` label map and one effects flag. There is one design system
here with a mute button, not two design systems. Keep it that way.

---

## Not built yet, on purpose

The Break List, Gears, the Calm Belt, Log Pose, finish-or-abandon, Bounty, the
Ship, mined Foresight. Estimate-vs-actual calibration is designed for but not
built — it needs the Gears timer to measure against. Hardness exists for training only — the general habit
engine is still v1. Conqueror's (覇王色) has no tab because it has nothing in it
yet; empty placeholder tabs are the classic unfinished-project smell.

See the build order in [`docs/CONCEPT.md`](docs/CONCEPT.md).

**Before building any of it: use this for three weeks.** You can't design the
rest until three weeks of your own data are sitting in it.

## Loose ends

- **The purupuru.** Drop a `denden.wav` in `assets/sounds/`, reference it in
  `app.json`, and uncomment the `sound` line in `src/notifications/denDenMushi.ts`.
- **Migrations.** v0 creates tables with hand-written DDL versioned by
  `PRAGMA user_version` rather than the drizzle-kit pipeline, which needs a Babel
  plugin and a Metro config change to load generated `.sql` at runtime. Append to
  `MIGRATIONS` in `src/db/bootstrap.ts`; never edit a shipped entry.
- **`+html.tsx` does not work here.** Expo Router only honours it when
  `web.output` is `"static"`, and Haki exports as `"single"` because static
  export pre-renders routes that all need a browser-only database. The head is
  injected by `tools/pwa-head.mjs` instead, chained into `npm run build:web`.
  Running `expo export` on its own produces a non-installable page.
