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

The tab bar floats: `src/components/GlassTabBar.tsx`, blurred and translucent,
inset from the edges. Anything scrollable must leave `TAB_BAR_CLEARANCE` at the
bottom or its last item ends up underneath. Floating buttons stack _above_ the
bar, never behind it.

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
  renders it too, or displaying it undoes it.

## Before pushing

```bash
npm run typecheck && npm test && npm run build:web && npx prettier --check .
```

Then screenshot the change. CI runs the same checks plus a native bundle.

Work on a branch, open a PR into `main`, let CI and the Vercel preview run.
`main` deploys to production on merge.
