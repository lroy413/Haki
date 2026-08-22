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

Plus one screen past the line, added on request: **Inherited Will**.

That's the finish line. Everything else is v1+ and deliberately absent.

### Verified

`npm run typecheck` clean · `npm test` 42 passing · `npx expo export` bundles · `npx expo-doctor` 21/21.

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
    index.tsx             Home — Will Reserve, keystone warning
    log.tsx               Ship's Log — entry list
    carried.tsx           Inherited Will
    settings.tsx          keystone config, plain mode
  read.tsx                Daily Read (modal)
  entry/[id].tsx          entry editor

src/
  domain/                 pure logic, no React Native imports — this is the part that matters
    willReserve.ts        the gauge
    cascade.ts            keystone → downstream detection
    date.ts               local-timezone day keys
  db/
    schema.ts             Drizzle schema
    bootstrap.ts          versioned DDL via PRAGMA user_version
    repo.ts               typed queries
    settings.ts           typed key/value accessors
  state/HakiProvider.tsx  today's read + reserve + cascade + effect intensity
  theme/                  tokens, and the one label map behind plain mode
  notifications/          Den Den Mushi channels
  components/
```

`src/domain` is deliberately free of React Native imports so it tests on plain
Node. The two pieces of real logic in v0 are verifiable without a simulator.

### The three mechanics that are actually implemented

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

**The app loses its power when you do** (`effectIntensity`) — the reserve drives
a 0–1 intensity that fades the glow and flattens the gauge. It only ever touches
decoration; text contrast, hit targets, and every number stay exactly as legible
at 5 as at 95.

### Plain mode

One `strings.ts` label map and one effects flag. There is one design system
here with a mute button, not two design systems. Keep it that way.

---

## Not built yet, on purpose

Hardness, the Break List, Gears, the Calm Belt, the Return, Log Pose,
finish-or-abandon, Bounty, the Ship, mined Foresight. Armament (武装色) and
Conqueror's (覇王色) have no tabs because they have nothing in them yet — empty
placeholder tabs are the classic unfinished-project smell.

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
