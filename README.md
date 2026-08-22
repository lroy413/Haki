# Haki

A private journaling, habit, and mental-health app for an audience of one.

> Every other app tracks what you *did*. This one tracks the state of your *will*.

Built on the idea borrowed from One Piece's Haki system: willpower isn't infinite.
It depletes, it recovers, and almost nobody measures theirs.

- [`docs/CONCEPT.md`](docs/CONCEPT.md) — the concept doc: failure modes, mechanics, build order
- [`docs/concept.html`](docs/concept.html) — the same thing as a designed page

---

## v0 — the spine

**Definition of done, written before a line of code:**

| | Done |
|---|---|
| Open the app | ✅ |
| Log a Daily Read in under 30 seconds | ✅ four dials, one tap each |
| Write a journal entry | ✅ Markdown, autosaving |
| See your Will Reserve | ✅ |
| Get a Den Den Mushi warning the morning after a bad night's sleep | ✅ |

Plus two additions past the line, both on request: **Inherited Will**, and
**Training** — the downstream end of the cascade, so the thing sleep was
already declared to carry is now actually tracked.

That's the finish line. Everything else is v1+ and deliberately absent.

### Verified

`npm run typecheck` clean · `npm test` 72 passing · `npx expo export` bundles · `npx expo-doctor` 21/21.

**Not yet run on a device.** The domain logic is tested and the app compiles and
bundles end-to-end, but no one has held it in their hand. First real check is
`npx expo start`.

---

## Running it

```bash
npm install
npx expo start
```

Then scan the QR with Expo Go, or `npx expo run:android` / `run:ios` for a dev build.

Notifications need a dev build to fire properly — Expo Go's support is limited.

`.npmrc` pins `legacy-peer-deps=true`. Expo SDK 57 pins React 19.2.3 while a
transitive `react-dom` wants 19.2.8; without it a fresh `npm install` fails.

---

## How it's put together

```
app/                      expo-router routes
  (tabs)/
    index.tsx             Home — Will Reserve, keystone warning, training strip
    log.tsx               Ship's Log — entry list
    training.tsx          武装色 Armament — sessions, hardness, gaps
    carried.tsx           Inherited Will
    settings.tsx          keystone + training config, plain mode
  read.tsx                Daily Read (modal)
  session.tsx             log a training session (modal)
  entry/[id].tsx          entry editor

src/
  domain/                 pure logic, no React Native imports — this is the part that matters
    willReserve.ts        the gauge
    cascade.ts            keystone → downstream detection
    training.ts           sessions, rolling hardness, gaps and Returns
    date.ts               local-timezone day keys
  db/
    schema.ts             Drizzle schema
    bootstrap.ts          versioned DDL via PRAGMA user_version
    repo.ts               typed queries
    settings.ts           typed key/value accessors
  state/HakiProvider.tsx  today's read + reserve + cascade + training + intensity
  theme/                  tokens, and the one label map behind plain mode
  notifications/          Den Den Mushi channels
  components/
```

`src/domain` is deliberately free of React Native imports so it tests on plain
Node. Every piece of real logic in v0 is verifiable without a simulator.

### The four mechanics that are actually implemented

**Keystone & Cascade** (`src/domain/cascade.ts`) — sleep is declared as a
keystone with training wired downstream. One bad night is a watch; two
consecutive is a breach and fires a notification. A gap in logging *ends* the
run rather than being counted across — a two-night streak either side of an
unlogged night is not a two-night streak, and the loudest warning in the app
should never fire on invented data.

**Will Reserve** (`src/domain/willReserve.ts`) — a gauge, not a score. Nothing
asks you to make it go up. Weights live in one place at the top of the file so
tuning it is a one-line edit. When there's no read yet it returns `null` and
says so, rather than showing a stale number as though it were current.

**Training** (`src/domain/training.ts`) — no streak counter and no target you
can fail. Hardness is sessions over a trailing four weeks against what four
weeks of your target would be; it dips when you miss and climbs when you come
back, and it cannot be zeroed. A gap of three days or more makes the next
session a **Return** — logged, named, and given its own screen, because coming
back is the skill that decides whether a gap costs a week or a year.

Note the ordering in `app/session.tsx`: the gap is computed *before* the insert.
Write first and the new session becomes its own "previous session", so every
Return would read as a gap of zero.

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
Ship, mined Foresight. Hardness exists for training only — the general habit
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
- **Export.** Entries are Markdown in SQLite. A real export button is v1.
