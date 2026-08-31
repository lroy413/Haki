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
- **Nothing is smaller than 12pt, and nothing is fainter than 6:1.** Both
  floors are tested (`typeSizes.test.ts`, `palettes.test.ts`), and both have
  now been raised twice. The first round: `inkFaint` measured 2.9:1 on the
  palette the app spends its day in, under forty-two styles that had each
  shaved a point off the type scale. The second: _"a little hard to read for
  me, and when the phone brightness isn't all the way up it's a little
  difficult to see"_ — which is two problems in one sentence. Size was the
  whole scale being one step small (body 16, small 14, label 11); brightness
  is contrast, because **4.5:1 is a full-output standard** and lowering a
  screen compresses the range the eye has to work with. The weakest pair
  measured 4.61. If something needs to recede, use colour, weight or space —
  never another point off a figure that is already small.
- **Raise the whole scale, never one step of it.** Lifting the body and
  leaving the labels flattens the hierarchy, and a screen where everything is
  nearly the same size is harder to read than a small one that is ranked.
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
  yet". A dash at display weight looks like data. **And where there is
  something on offer, say the offer rather than the absence** — the day's
  practice card established this ("5, 10 or 15", never "not yet") and it binds
  everywhere: the home screen's course row reads "Where today points", and a
  week with no session yet reads "4 planned" rather than a `0/4` in the
  lens's red. `Stat` takes an `empty` prop for exactly this, because a figure
  that borrows another row's empty phrase ends up saying "Days off — Not yet".
- **Dates are said, not stored.** `shortDay()` in `domain/date.ts` renders a
  day key as "Aug 27", with the year only when it is not this one. The ISO
  form sorts and belongs in the database; printed next to "Day 3 at sea" it is
  a schema showing through the app's own voice.

## The screen answers the finger, not the write

**And `refresh()` has two halves, in that order.** Leaving a screen that just
wrote something runs two refreshes at once — the save's own, and the one the
screen behind it fires as it regains focus — and they queue on expo-sqlite's
single channel. Two rules came out of the day the Daily Read looked like it
had not saved:

- **Only the newest refresh may write.** The one that started first reads the
  _older_ database, so without a guard its stale answer can land last and put
  the old number back on screen. `refreshes` is a monotonic counter and every
  stage checks it before calling a setter.
- **Today's own numbers do not wait behind three months of history.** The
  trailing windows — twelve weeks of acts across seven tables for the voyage,
  a month of sits for Observation — are the most expensive thing the provider
  does and they change nothing already on screen, so they run in a second
  stage. The read, the Reserve, the load, the bells and **the palette** land
  first. Anything added to the first stage slows down every act in the app;
  put it in the second unless the screen is visibly waiting on it.

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
- **A Save closes its form in the same frame as the tap**, with
  `useSingleFlight` (`src/state/useSingleFlight.ts`) held against re-entry
  until the write lands — a ref, because state is exactly what is too slow
  here. The road form closed only after the insert and the reload came back
  down the single sqlite channel; the button read as dead, a reasonable
  second tap queued a second insert, and one pillar arrived five times. The
  synchronous acknowledgement goes first, inside the flight, before the
  first await. Every form and stepper in the app runs through this now;
  a new one that does not is a regression.
- **`Toggle` is optimistic by construction** — it shows the tapped position
  immediately and reconciles when the stored value comes back, so no screen
  can reintroduce the stuck-switch feel by forgetting to.
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

**The web shell is pinned, not measured — and the viewport gets put back.**
`#root` is `position: fixed` on all four sides (`tools/pwa-head.mjs`). Every
unit that claims to be the height of the screen — percentages,
`-webkit-fill-available`, `dvh` — has cost this app the same bug twice: a dead
band under the tab bar on an iPhone. Nothing scrolls the document here, so
pinning costs nothing. **Do not reintroduce a height calculation on the
root.** `height: auto` on `#root` is not one — it is the absence of one, and
it is load-bearing: Expo's own reset ships `#root { height: 100% }` above
ours, and CSS 2.1 §10.6.4 says that when `top`, `bottom` and `height` are all
given on a fixed element, **`bottom` is ignored**. So the pin sat inert
underneath a measurement through three rounds of this bug, and every fix in
the family was written assuming it was in charge. The build now fails if
Expo's reset ever moves below the injection, and `shell.test.ts` reads the
rule. The bug then came back a third way that pinning cannot close: iOS
standalone pans the layout viewport up for the keyboard and does not always
pan it back, leaving the whole app — pinned root included — stranded above
the bottom of the phone. The shell now scrolls any leftover pan to zero on
`focusout` and visual-viewport resize (same file) — and **never while an
input is focused**: while typing, the pan is iOS bringing the field into
view, and putting it back mid-keyboard snapped the app to the top of the
page on every field tap. And a fourth form the pin
cannot see at all: in a Safari _tab_ the toolbars overlay the layout viewport
instead of shrinking it, so a correctly pinned app runs its last sixty points
underneath them. The shell keeps a safety net for that — but **the net never
touches the installed app**, and that rule was bought at the cost of a fifth
round: the net shipped in the same commit as the pin, read
`visualViewport.height`, got 812 on an 874-point phone, and shrank the app to
it. Eight hundred and seventy-four minus eight hundred and twelve is
sixty-two, which is exactly that phone's _top_ inset — in a black-translucent
standalone app iOS reports a visual viewport with the status bar's strip taken
off it. **In standalone the shell measures nothing.** It owns the screen, the
pin already puts it there, and every number iOS has offered as a second
opinion has now been wrong at least once. The net runs only in a browser tab,
only when the visible box is genuinely shorter than the layout viewport, only
downward, and never while an input is focused.

**And the last sixty-two points are not the app's to paint.** Round six grew
the root to `screen.height` and the tab bar's labels went off the bottom of
the phone. Two measurements settle it and are worth keeping, because the next
person will want to try growing it again: the wordmark's cap sits at exactly
`insets.top + space.lg` (so the viewport is anchored at screen y = 0), and the
tab bar's rounded rect reaches its full left edge at 811.3 and then **stops
dead at 812.0** — a clip, not a corner completing. iOS gives this app a web
view positioned full-screen and sized as though it were inset at the top:
812 tall on an 874 screen. Nothing can be put in the band; the browser
extends the page's own background colour into it, which is why the ground
looks continuous down there and why this took six rounds to see.

What the app can do is stop wasting the space it _does_ have.
`env(safe-area-inset-bottom)` is 34 because the home indicator sits at screen
858 — out in the band, not inside the viewport — so reserving 34 points at the
foot of an 812-point box guards against a hazard that is not in the box.
`theme/viewport.ts` publishes the band's depth and `usableBottom()` drops the
inset when the hazard is outside; **every screen takes its bottom padding
through it**, and on a device given its whole screen the band is zero and
nothing changes. `ShellReport` reports the band beside the verdict rather than
as a shortfall, because it is not one the app can close.

**The app starts below the status bar, and that is the fix.** Eighth round,
closed by measurement instead of theory: `/probe` holds seven pages,
identical except for how each declares itself an app, and the owner installed
them all. On current iOS **every translucent full-bleed install is short 62
points at the bottom** — including an exact clone of the owner's older apps
that still fill their screens, which is how we know the geometry is decided
at install time by the iOS version doing the installing, and why "my first
apps never did this" was true and misleading at once. The below-the-bar
installs (manifest-only `display: standalone`, probe C) **end at the true
physical bottom**: the probes' gold bar measured at 858–874 on an 874-point
screen. Probes X and Y acquitted the two other suspects outright: the
COOP/COEP isolation headers (which the database needs — never sacrifice them
chasing the viewport) and the portrait lock change nothing. So Haki declares
the manifest alone — no legacy capable meta, no translucent status-bar meta,
and a test asserts they never come back. iOS
paints the strip behind the clock with the page's `theme-color` — and reads
it **from the statically parsed HTML only**. Measured twice on the phone: with
the boot script rewriting the meta synchronously in the head _and_ the
provider keeping it live, the strip still wore the constant baked into the
exported file. Script writes are invisible to it, whatever their timing. The
one thing upstream of that parse is the served bytes, so **the service worker
paints them**: the provider reports the ground and the next voyage-day
boundary after every palette change (`haki-ground` message), and the worker
rewrites the meta in every navigation response — stored ground within the
day, paper past the boundary, both branches of the navigation handler
(network and offline fallback). When touching `paint()` mind the headers: the
body has been decoded, so `content-encoding`/`content-length` must be
dropped, and the isolation headers must survive the copy — verified, because
losing them kills the database. The provider stays the only runtime writer
of the DOM meta (kept for browsers that do track it), and plain mode pins
the palette and reports no boundary. And
`__HAKI_UNREACHABLE__` reports a stranded bottom **only when the viewport is
top-anchored** (`env(safe-area-inset-top) > 0`): below the bar the home
indicator is back inside the box and the bottom inset is real again.

**And `innerHeight` is not the screen.** Sixth round, and this is the number
every earlier round was groping for — the phone finally said it: `Screen 402 ×
874`, `Window 402 × 812`, app box 812 ending at 812, safe area 62/0/34/0,
height pinned. iOS hands a standalone app a layout viewport **62 points
shorter than the screen — exactly the top inset** — while still reporting that
inset through `env()` and still painting from y = 0 (the status bar's clock
draws over the app's own text). So the pin was doing exactly what it should
and the thing it was pinned to was wrong, and every fix that trusted
`innerHeight` was fixing the wrong number. In standalone the shell still
only ever grows the root, and only to `innerHeight` — the screen is what it
measures the band against, never what it aims at.

**The two cases are opposites now, and neither can cause the other's
failure.** Installed, the shell may only ever _grow_ the root, and only to
the screen — a floor under whatever the seventh cause turns out to be. In a
browser tab it may only ever _shrink_ it, and only on the signature of
overlaid toolbars. There is a test reading each branch for the direction it
is allowed to move.

**And the phone is the only thing that knows.** Five rounds were diagnosed by
inference from a screenshot and three of those inferences were wrong, so the
app says it now: the shell exposes `window.__HAKI_SHELL__()` and a build stamp
taken from the bundle's content hash, and `ShellReport` prints both on the
settings data page — a sentence first ("filling the screen" / "stopping N
points short"), then the numbers. **It has to measure against the box the app
is supposed to fill**, which installed is the screen: the first cut compared
against `innerHeight` and therefore reported "filling the screen" while
sixty-two points short of it, and a readout that agrees with the bug is worse
than none. **A PWA updates silently**, so "did the fix
reach the phone" is otherwise unanswerable exactly when it matters most; the
build stamp is the answer. The worker is network-first for navigations, which
is enough on the web, but a standalone app on iOS is resumed for days without
ever navigating again — so the shell asks for an update on every return to the
foreground and reloads once when a new worker takes over.

**Read the pixels, not the layout.** Every round of this was diagnosed from a
screenshot in the end, and the tell is always the same: the tab bar's shadow
faded smoothly and then stopped dead, with every row below it byte-identical
ground. A blur does not end in a hard line — it was clipped, at a height
something had set. Measure the gap and check it against the device's insets
before touching anything; the number names the culprit.

If the band ever returns, work down the list before touching a number: is the
pin actually winning, is the viewport _displaced_, is the visible box the same
one the pin measured, and is anything setting an explicit height at all? The shell's background follows the live
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

## The settings chart

Settings is an archipelago: six islands, each a category, each pressing
through to its own page. `src/components/IslandRow.tsx` is the system — the
band of sea, the pooled water, the dashed course, the horizon and the light —
and `src/components/instruments/Isles.tsx` holds the landmass drawings behind
the usual replacing-drawings contract. Four rules:

- **The water is the Sunny's water.** `SWELL` and `swellPath` come from
  `instruments/Sea.tsx`; never draw settings water with its own numbers, or
  the chart and the home screen will disagree about the weather.
- **One spot of colour**: the crew island's pennant flies `conquerors`
  because it is data. Everything else on the chart is ink — settings is not
  a lens.
- **Plain mode gets a plain list**, same categories, same order, same
  routes. The chart is a performance.
- **At night the chart is a scene, and the light is lamplight.** As the day
  hardens the sky fills with stars behind a moonlit massif
  (`instruments/Skyline.tsx`), each island becomes a dark landmass whose
  landmark keeps a light — the lamp, the lanterns, the beacon — in a warm
  pool on the water (hot ring at the shore, falling off in shells), and the
  name sits beneath the island the way a camp labels its tents. Lamplight
  is always `warn` — one warmth for the whole chart, never a lens colour —
  so the crew pennant stays the chart's one lens-coloured mark. Same law as
  `lit()`: paper catches nothing (the pencilled chart stays), the light
  only grows, and plain mode gets the list.

Adding a category = one entry in the hub's `islands` array, a page under
`app/`, a `Stack.Screen` in `app/_layout.tsx`, and a landmass in `Isles.tsx`
with a landmark you can name in one word.

## Drawings are replaceable; systems are not

`src/components/instruments/` holds the two hand-plotted SVGs — the Sunny and
the fist. Both carry a **REPLACING THIS DRAWING** block at the top naming the
viewBox, the aspect, the colour props and what the composition has to keep, so
a proper redraw drops in without touching anything above them.

**A drawing takes its colours and never chooses one** — no literals, no
palette reads, every hue a prop (`instruments.test.ts` reads all fifteen).
The trap is not the literal, it is taking the right prop for the wrong job:
the Observation eyes handed the pupil `palette.ink`, which is the _text_
colour, so on the three palettes the app spends its day on the pupil was a
white disc covering half the iris and the catchlight beside it — `palette.bg`
— was black. An eye drawn for parchment, inverted everywhere else. **An eye
is an object rather than a mood**, so like the poneglyph its own colours are
fixed across all four: `onStone` is the app's near-white, `darkest()` its
near-black, and only the iris (the lens) and the brow (which sits on the
page, not on the eye) move. And where a line has to read on the ground _and_
on the eye, it is stroked twice — a wider `ink` edge under a narrower
near-black one, the same construction the burst and the charge use, because
one stroke cannot be visible on two grounds.

Keep that seam clean. The Sunny's _water_ lives in `instruments/Sea.tsx`
because it is a system — swell, wavelength, phase, how much is running — and
systems do not get thrown away when someone redraws the boat. Same rule for
the impact frame: the field owns the violence, the instrument owns the shape.

## A crew renames; it never restructures

`domain/crew.ts` is the theme, and it is allowed to change exactly five
things: what 覇王色 burns, what 武装色 burns, which instrument the impact
frame draws, what the focus sessions are called, and the word for the room
they live in. Luffy flies by default because the app was drawn for him.

- **The keys never move.** A focus session is `second | third | fourth` under
  every flag, so a year logged as Gear 3 reads as Nitoryu the moment you
  switch and as Gear 3 again if you switch back. A theme that rewrote history
  would be a theme you could not try. There is a test.
- **A crew carries a colour _key_, not a colour** (`'violet' | 'jade'`). The
  palette moves through four levels; a crew holding a hex would be right on
  one of them. `underCrew(palette, …)` applies it once and hands the result to
  the Conqueror's screens, which go on writing `c.violet` meaning "the lens's
  colour" — which is what they always meant.
- **Two lenses move; 見聞色 never does.** Zoro's Haki is black and purple —
  so his 武装色 burns the amethyst (the hardness aura, the Do tab, the
  strike's rim and corona, the weather's halo) — and the green is what
  Conqueror's _adds_, so the Journey tab, the Dream, the Flag and the burst
  turn jade. 見聞色 is violet under both crews, and crimson doubles as
  semantic red (a breach, a delete, the Sunny's own flag), which is why
  `underCrew` is applied per screen rather than globally: a screen takes the
  lens palette only where it means the lens. The Return keeps the signature
  violet under both flags — it is not a lens's light.
- **Neither crew may speak the other's vocabulary.** The first pass renamed
  the three cards and left "gear" in every cost line under them. Tested.

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

That rule breaks in two ways, so there is a test for each
(`oneLight.test.ts`). The first: a control written on one screen and reused on
another carries its birthplace's colour with it. The Do tab spent months crimson with
teal chips, a teal checkbox and a teal primary button, while the crimson watch
chips sat directly under them — the file disagreed with itself, which is the
tell that nobody chose it. **A shared control takes `tint` from the screen
that mounts it, and the prop has no default**: a control that cannot be
mounted without naming its light cannot drift.

The second: a screen paints one of its own parts in a colour that means
something. The Daily Read's four dials were violet, violet, cyan and crimson —
and the crimson one sat under a label reading _"low is better"_, so a good
answer lit up in the colour this app reserves for **something has gone
wrong**. Four dials are four facets of one reading, not four lenses.

**And there is one glow, not several.** `lit()` is it. The Reserve gauge used
to roll its own — a 24-point radius at 0.55 — so retuning the constant did
nothing to the loudest element in the app. Anything that wants a lens's light
goes through `lit()` and may scale what it returns; nothing writes its own
`shadowColor`.

## The ramp does not stop at black

Level 3 is where the palette runs out of dark, and for a long time that was
where the day stopped mattering: eight weight points is a morning, and
everything after it landed on a screen that had already finished responding.
The owner: _"Haki gets stronger and harder the stronger the will and drive.
The more things I do should continue to harden the app. Maybe the cards start
to shine more and showing the static haki electricity."_

A fifth palette is not the answer — it would be black on black, and four
states exist in the first place because a continuous fade passes through a
mid-grey no ink is readable on. So the ramp continues **into the surfaces**.
`chargeOf` in `domain/hardening.ts` is the day's weight past `CHARGE_FROM`,
saturating at `CHARGE_FULL`; `lit()` takes it as a third argument and grows;
`instruments/Crackle.tsx` lights the plate's edge and settles arcs onto it.

- **Continuous, on purpose, and that is what stops it being a score.** The
  level has four states because contrast forced it. The charge has none
  because nothing forces it, and a value with no rungs has nothing to count —
  you cannot tell 0.6 from 0.7 by looking.
- **Linear between the two ends.** Every curve with a knee makes some region
  of the day worth more than another; an ease-out would spend the whole effect
  on the first act past black and leave the afternoon doing nothing, which is
  the complaint it was built to answer.
- **It saturates**, so there is nothing to be had from a sixteenth task — and
  `CHARGE_FULL` has to stay genuinely reachable, or the top half of the ramp
  is dead and the app has only moved the point at which it stops answering.
- **Paper catches nothing, and here that is arithmetic rather than a guard**:
  too little weight to charge means too little to have hardened. Plain mode
  still has to be pinned by hand, in the provider, once — it pins `hardening`
  to the settled dark, which is exactly the value that would burn brightest.
- **It never goes backwards inside a day.** The mark carries the day's
  _weight_ now (`hardening.weight`, appended beside the level) so the two can
  never disagree about what the day held.
- **Four plates, one per tab** — the hardness readout, the reading, the Dream,
  the Reserve. Charging every card would be the "if everything is raised,
  nothing is" bug that `surfaces.ts` exists to fix.

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
  through it rather than reading a `Date` itself. One deliberate exception:
  `domain/moon.ts` takes a plain `Date`, because the settings chart's moon
  shows the sky's real phase and the sky does not keep the voyage's clock. `loadSettings` applies the
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

## The hold, and asking the browser to keep it

The app's whole promise is that everything lives on this device and the export
is the only way anything moves. That promise had a hole in it for the app's
entire life: on the web the database is OPFS under one origin, and by default
that is **best-effort** storage — a browser under disk pressure may evict the
whole origin, silently, with no error to catch and no event to handle. You open
the app one morning and it is a fresh install. `navigator.storage.persist()` is
the one line that changes it and it had never been called.

- **`keep.anchor()` runs on every cold start**, from `db/client.tsx` right
  after `bootstrap`. Every start rather than once, because the answer changes:
  an uninstalled app is usually refused and an installed one is usually
  granted, and asking again is how the app picks that up without having to
  notice it was installed.
- **It never throws and never blocks.** An origin with storage disabled throws
  on the _accessor_, not just the call. Losing the database is the risk being
  managed here; refusing to open is not a better outcome than running
  unanchored.
- **Then it says what the answer was**, on the settings data page, directly
  under the export — because when the answer is "not anchored", the thing to
  do about it is the card above. Same argument as `ShellReport` beside it: a
  guarantee you cannot verify is not one, and the phone is the only thing that
  knows.
- **The quota is stated and never drawn as a fraction.** It is a browser
  implementation detail that moves on its own — 1.0 GB on one launch and 924 MB
  on the next — and this app's data against it would be a denominator nobody
  chose. Not red either: an origin the browser has not promised to keep is a
  fact about a browser, not a failure of the person reading it.
- One implementation per platform (`files/keep.ts`, `files/keep.web.ts`), both
  `satisfies Keep`, exactly like `Transfer` next door. Native has nothing to
  ask for and nothing to measure — the file is in the app's own container — so
  it says so rather than inventing a number.

## Day's End is a ritual you cannot fail

`domain/dayEnd.ts` and `app/dayend.tsx`. The app had a morning (the Daily
Read) and a week (Setting Sail) and nothing between them, so a day's leftovers
rolled into tomorrow without anybody looking at them once. The owner asked for
the look: _"At the end of the day I want it to ask how it went, if I moved
something or didn't do something I want it to ask why."_

Three movements — the day read back, what is still open and what moved, and
one question — and five rules:

- **Nothing here is required.** Every field closes empty. A ritual you can
  fail is a ritual you stop opening, and this one has to survive the bad days
  to be worth anything on them.
- **The course is read back and never marked.** `app/course.tsx` promises in
  as many words that nothing asks at the end of the day whether you held it.
  Showing the heading is not asking about it; a tick beside it would break a
  promise the app makes to your face. There is a test forbidding the question.
- **An empty day gets an offer, not an audit.** `readBack` returns an empty
  list and the screen says the watch is not over — the day's practice card's
  rule at day scale. It never says "0 tasks struck".
- **The ritual is where the writing debt is collected.** The Do tab lets a
  first-day carry through on one tap on purpose; the wordless moves it lets
  through are asked about here, once, somewhere you came on purpose. A task
  shows up once and never twice: a wordless move on a task that is still open
  rides under that task's own row rather than repeating its title in a
  section below.
- **`made_on`, not `from_day`.** A move is stamped with the day the decision
  was made on, because carrying something that had been at sea since Thursday
  is a decision you made today — and it is exactly the move the ritual most
  wants to ask about. The first cut queried `from_day` and missed every one of
  them. A timestamp cannot stand in: a day here does not end at midnight.

The door on the home screen (`DayEndDoor`) exists only during the evening
watch. A "close the day" card standing open at nine in the morning is a nag
about a day that has not happened, and worse, a thing you learn to scroll
past. It wears the signature violet like the Return — this belongs to the day
rather than to any one lens.

## Loose pages, and the writing bar

Two things the owner asked for together: _"I want a free notes separate from
journal and I want a toolbar in journal and the notes."_

**Separate is the specification.** `note` (migration v15) is not `entry`. The
Logbook is dated — listed by day, feeding the acts a day is measured by, read
back a year later by "astern". A note is none of that: a list, a draft, a thing
you looked up and will want again. Folding them together would cost both — notes
would start counting toward how used a day was, which is untrue, and the Logbook
would fill up with shopping lists. Loose Pages hangs off the Observation tab
(writing belongs beside writing) and is `Notes` in plain mode.

- **The name is optional and usually empty.** `firstLine()` reads one off the
  body, because making you name a thing before you can write it is how a quick
  list never gets written. The list strips markdown off both the name and the
  preview (`plainLine`) — `- [ ] bread` in a row is the syntax leaking into the
  furniture.
- **No Done button.** A note is not an act you finish; nothing counts it and the
  back arrow is the whole exit. The journal keeps its Done, because an entry is
  a thing you write and then have written.
- **One debounce timer, two fields, so the patch must accumulate.** The first
  cut replaced it, and every title was silently lost: typing a name and then the
  body cleared the title's timer and wrote `{ body }` alone.

`domain/markdown.ts` is the bar's actual work — every button is either wrapping
a selection or prefixing the lines it touches, both toggling, all pure and
tested on plain Node. `WritingBar` edits text and does not own it, which is what
lets the same bar sit under the journal, under a note, and under anything
written later.

- **The edit carries a selection back.** A toolbar that formats and then drops
  the caret at the end is a toolbar you press once.
- **`selection` is pinned for exactly one render.** Asserting it every render
  fights the caret — you cannot type past a selection the component keeps
  reasserting — so it is released the moment `onSelectionChange` agrees.
  Dictation inserts a whole phrase at the caret through the same path, so this
  is what keeps it working too.
- **Wrapping tightens off whitespace.** A double-click takes the trailing space
  and dragging to a line end takes the newline; wrapping those verbatim gives
  `**milk\n**`, a marker on the wrong side of a line break. Only found by
  selecting a line in a browser and pressing the button.
- **A prefix leaves a caret as a caret** and a range covering the same lines, so
  a second press toggles it off.
- Removal happens only when **every** selected line already carries the prefix;
  two of three bulleted means the finger wanted the third bulleted too.
- **A line is one kind of thing at a time.** Heading, bullet, checkbox and
  quote are four answers to the same question, so applying one _replaces_
  whatever the line had. The first cut looked only for its own two characters,
  so Bullet on `- [ ] bread` found the `- `, took it off and left `[ ] bread` —
  the syntax leaking through a button that was trying to help. `PREFIX_PATTERNS`
  is what a line counts as carrying (a `# ` is a heading, a ticked box is still
  a box, and a bullet is a bullet **only when it is not a checkbox**) and
  `ANY_BLOCK` is what comes off before the new one goes on.
- **The bar says whether each format is on**, and that is the half that teaches
  it. `activeMarks` and `activePrefixes` read what the caret is sitting in —
  including the common case the two wrapped forms miss, a caret simply put down
  in the middle of a bold word. They share `carries()` with `togglePrefix` on
  purpose: a key that says it is on and then turns itself on again is worse
  than a key that says nothing.
- **The lit key is the only colour on the bar.** The resting marks are `ink`,
  not the lens — eight keys all burning the screen's light said nothing eight
  times over and left no colour in reserve for the one thing the bar needed to
  say. Lit is the lens on `tintSoft` **with a rim in `tint`**: on the second
  palette the soft fill and the bar sit at 1.05:1 and differ only in hue, so
  the fill alone cannot carry it. Every key wears that border in the bar's own
  colour when resting, or lighting one would move it.

### The marks are drawn, never typed

The bar shipped with five characters standing in for icons, and the owner's
verdict is the whole reason `WritingIcons.tsx` exists: _"This is not a toolbar
I understand."_ Bold and italic were fine. The rest were a backtick, a `•`, a
`☐`, a `▌` and an em-dash — and `▌` rendered as a solid teal block
indistinguishable from a missing glyph, while the backtick was a speck in the
corner of an otherwise empty button.

**This is `domain/moon.ts`'s law one screen over**, and it had already been
learned twice: ◐ came out as a clipped sliver and an em-dash as a filled bar. A
character is set at a font's size, on a font's baseline, in whatever face
happens to have it; a drawing is the shape you drew.

- **A letter or a drawing, and nothing else.** B, I and H stay as type because
  they are letters in every editor anybody has used and a Latin capital is the
  one glyph no loaded face is missing. `writingBar.test.ts` holds both halves:
  every letter key is `/^[A-Z]$/`, and the bar's code carries no character
  above ASCII at all.
- **Draw the shape the button makes, not the mark it writes.** A lone `•` is a
  full stop; the button makes a _list_, so the drawing is a list. The checkbox
  is one box at half the icon's width, because the first redraw drew the whole
  checklist and at twenty points the two boxes touched and read as a figure 8
  with an equals sign beside it.
- **Three horizontal lines is an equals sign.** The rule was drawn with two
  faint paragraph stubs above and below to say "between things"; the top one
  was lost against paper and the bottom read as the second bar of an `=`. One
  line, centred, full width, at a rule's weight — which is what every editor
  draws, and the shape this button cannot be mistaken in.
- **A quotation mark, not a blockquote bar.** The bar down the left edge is
  what a blockquote _renders_ as and it was still the wrong drawing: with
  nothing beside it, it is a bar — and drawing the quoted lines too would have
  made a third icon in the same grammar as the bullets and the checkbox, which
  at twenty points is one icon in three costumes.
- Read the pixels at true size, then zoom. Every one of the three faults above
  was invisible in the source, invisible to the typecheck, and obvious in a
  crop of the rendered bar.

## Priority, and a date you have to make

`domain/pressing.ts`. The owner's words: _"If I set a date I want to have
something done by I need it to be in my face and emphasized if labeled
priority."_ Everything else here is elastic on purpose — a task is for today,
a rhythm comes round, an island takes weeks — and that elasticity is exactly
what let a real deadline slide past without the app ever raising its voice.

- **`dueBy` is not `committedFor`, and keeping them apart is the design.** One
  is when the thing has to be done, the other is when you plan to do it.
  Conflating them is what every task app does and why "due date" ends up
  meaning nothing: a thing due Friday you plan to do Tuesday is one task with
  a plan and a deadline. `planNote` is the sentence the split buys, and it is
  the whole return on the second column.
- **Priority is one flag, never a scale.** Three levels is a system you spend
  Sunday administering, and the middle one always comes to mean "not really".
- **`warn`, never crimson.** The app's one warmth is _look at this_; crimson
  is _something has gone wrong_, and a date arriving is not a breach. The Calm
  Belt settled this same question first.
- **Loud by weight, edge and position — never by alarm.** A bar down the
  leading edge, the title a weight heavier, and the top of the list. Nothing
  rings, badges, or counts how many dates have gone past. The count runs
  toward and keeps running ("3 days", "Due today", "2 days past"), the same
  figure an island at sea wears.
- **An island gets the same date one size up.** `portLine` is a port of call —
  "12 days to port", "Port today", "2 days past port" — sharing `daysUntil`
  with the task list rather than growing a second module that would drift.
  Optional by design and rare by intent: a journey has no denominator, and an
  app that asked for a date on every island would be a project plan. It is cut
  in the stone's own light on the card, and it goes on the pillar _row_ rather
  than the chart drawing, because the rows carry the words and the lamp is the
  chart's whole status system.
- **Two horizons, and they are different numbers on purpose.** `SOON_DAYS`
  decides what is drawn warm in the list; `BEARING_DAYS` is tighter and
  decides what reaches the home screen. A card announcing three things are
  bearing down when one of them is Thursday teaches you to ignore the card,
  which is the only way this feature can really fail.
- **The home card reads across every day, and that is why it exists.** A task
  due today that you planned for Saturday lives in Saturday's list — the one
  list you will not open today — so filtering by `committedFor` would hide
  precisely the case this was built to catch. It is capped at `BEARING_SHOWN`
  with the rest counted in one line, because a wall of undone things above
  everything else is the ADHD failure this app exists to avoid.
- **One task is never drawn twice on one screen.** `nextStrike` takes what is
  already shown elsewhere and skips it, and the Next-up card does not render
  at all when the bearing card has covered the day.
- **`strikeToday` lands it on today**, whatever day it was filed under — the
  same rule the at-sea strike holds, for the same reason.
- `parseDay` reads `15`, `9/15`, `sep 15`, `2026-09-15`, and **refuses rather
  than guessing**. A bare day rolls forward to the next time it comes round; a
  _named_ month within `BACKDATE_GRACE_DAYS` is taken at face value, because
  recording something that was due last week is ordinary and the first cut
  silently turned `9/19` typed on the 20th into September of the next year.

## Nothing committed is quietly dropped

`domain/atSea.ts` closes a hole rather than adding a feature. `todaysLoad`
wants `committedFor` to be today and `backlog` wants it to be null, so a task
committed to yesterday and left undone **appeared nowhere at all** — still in
the database, never shown, never decided about. The owner's words were "it
shouldn't just drop it"; the app was doing something worse, which was losing
it silently.

It is the Log Pose's model one size down, and the concept doc's own claim that
**showing the count is most of the intervention**.

- **Striking is always one tap, and always free.** Doing the thing is the one
  act this must never make more expensive. `needsLine` cannot even be asked
  about a strike — its second argument is a destination, and a struck task has
  none.
- **A move can cost a written line, and which ones do is graded.** Leaving the
  day entirely always costs one — that is the decision, and it is "sailed past"
  at task scale. Carrying forward costs one only after `LINE_AFTER_DAYS`,
  because a first-day carry is a Tuesday and a writing tax on every leftover is
  how a list gets expensive enough to abandon — which is the exact failure the
  feature exists to treat.
- **A struck at-sea task lands on today, not on the day it was committed to.**
  Everything in the app counts a task against its `committedFor` — hardening,
  the voyage's used days, Armament's window — so leaving it where it was would
  rewrite a day that has already been read. `strikeAtSea` in `db/repo.ts` is
  the one place that knows this.
- **Days at sea are never a score.** No colour turns as the figure grows,
  nothing is ranked by it, and there is no total anywhere of how much has been
  carried. Same figure an island wears, read the same way.
- **The reasons are kept and never counted.** `task_move` holds every move with
  whatever was written about it (an empty line is a real record of a real
  move, and it round-trips through the backup — there is a test). Nothing
  displays how many times a task has moved; that number is derivable and
  showing it would turn a record into a rap sheet.
- **Name the list, not the mood.** The actions are `Today` and `Waiting`,
  because those are the two lists the task can land in. Not "Carry today" —
  the capture form's primary button already says that and means something else,
  and two controls with one name on one screen is how a row gets mis-tapped.
  Not "drop it" or "let it go" either: nothing is destroyed, and the row it
  lands in has its own delete.

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

## The day has three watches, and a shape

`domain/watches.ts` draws the day the way a crew divides it — three bands, not
twenty-four rows. Tasks have carried a watch since the capture row grew its
second chip line; what never existed was the _shape_, so "what does today look
like" could only be answered by opening the Do tab and reading a list.

- **Load is a fact in minutes, never a capacity.** No bar filling toward a
  limit, no percentage of the day planned, no colour that changes when a watch
  is "too full". The app does not know how much you can do, and a figure that
  implied it would be inventing a denominator.
- **The hold is the ordinary place to be.** A task with no watch is not
  unscheduled or late; placing one is an offer. Nothing counts how many were
  placed.
- **One horizon.** The Sunny used to sail in a band of her own directly above
  the strip, on her own sea, over a second waterline the strip drew as its
  baseline — two oceans forty points apart on one screen. She is inside the
  strip now, about a quarter of its width, on the water that _is_ the baseline;
  the sea's own range had to widen (`Sea.tsx`) because the scale that shrinks
  her shrinks the water with her, and the alternative — a second scale for the
  sea — would strand the wake, the only part of that file that has to know
  where the ship is. The merge cost the screen about forty points less than
  the two of them did.
- **The sun moves and the ship does not.** The Sunny is at anchor because a
  ship travelling somewhere is a progress bar in fancy dress. The sun is not
  progress — it is the time, and a day getting late is a fact. It is the
  strip's only variable, and it is a position rather than a quantity. What she
  gained in the merge is a _heading_, not a journey: she faces the way the day
  runs, which is one `scaleX` on the pair — the wake trails from her stern, so
  flipping the ship alone would put it in front of her.
- **Nothing tall stands where she sits.** The bells were a hanging stem and a
  lamp through the middle of the strip, which is exactly where she now is: a
  `warn` disc landed on her topmast and read as a second sun in her rigging.
  They are ticks on the waterline, and she passes in front of them.
- **The small hours belong to the evening watch.** Someone working at one in
  the morning is in tonight's evening, and the sky above them is dark: the
  voyage's `dayStartHour` decides which _day_ an act lands on, `watchAt`
  decides which band of it, and neither needs the other.
- Plain mode keeps the bands, the names, the loads **and the ship** — she is
  the app's own picture of the day rather than an effect — and loses the sky.
  It reserves no height for the sky it is not drawing, either.

## The Bells

`domain/bells.ts` holds the one shape the app could not: a thing that happens
at a time on the clock. Everything else here is elastic — a task is for today,
a rhythm comes round, an island takes weeks — and none of it happens at three,
so the day's picture was a picture with its fixed points missing, which is the
one way such a picture can actively mislead.

- **A bell does not ring.** No sound, no notification. It is a mark on a
  chart, and the Den Den Mushi taxonomy is explicit that an escalation channel
  only means something if it is almost never used.
- **A bell that has passed is not missed.** It sits astern. There is
  deliberately **no done column and none coming** — an appointment is not a
  task, and ticking one off would turn the day's fixed points into a
  checklist. The only way a bell ends is that you take it down.
- **It belongs to a watch by arithmetic, never by choice**, so the strip and
  the list can never disagree about when a thing is.
- **Today and tomorrow only.** Anything further out is the Log Pose's job, and
  it does it in islands rather than appointments — a bells screen that let you
  fill in next March would be a calendar, which this is not.
- Bells are in the backup. A table outside the export is a data-loss trap when
  the app's own promise is that the export is the only way anything moves.

## The Sea Prism Log, and naming what nullifies

`domain/seaPrism.ts` and `app/seaprism.tsx`. The concept doc's biggest hole,
and the Reserve's missing input: the burn read _output only_, so the gauge
could explain an empty evening after four hours of deep work and had nothing
whatever to say about the commoner one — a day you did almost nothing in and
are flat anyway. There was nowhere to record that something cost you and no way
for the number to know.

Kairoseki is the right name and the reason is worth being exact about. Sea
Prism Stone is not evil and it does not make you weak — it **nullifies**, and
only while you are in contact with it. **Naming something here is not an
accusation.** A person on this list is not a bad person; a room is not a bad
room. They are things that, for you, cost something to be near, and every rule
below exists to hold that distinction — because this is the one module in the
app whose data is about other people.

- **Nothing is ever counted per stone.** No tally beside a name, no ordering by
  how often, no "your worst", no "eleven times this month". `task_move` holds
  the same line for the same reason: the number is derivable and displaying it
  turns a record into a rap sheet — bad enough pointed at a task, indefensible
  pointed at a person. The fact that you would have written it yourself does
  not make it one you should have to look at.
- **A stone is named today or it is not.** No second tap, no severity dial. A
  "how bad was it" scale asks you to score your own suffering, and the day's
  count would quietly become that score. It also makes the chip an honest
  toggle — the same tap takes it back — which is what let the screen become one
  list instead of a list of chips above a list of the same names again.
- **Logging is one tap and there is nothing to write.** This gets opened on the
  days there is least will available to open it, so it has to be cheaper than
  not using it. Naming a new stone costs a word and that is the only writing in
  the feature — the `note` column was cut before it shipped, because an
  optional field with no cheap way to fill it makes the tap look expensive, and
  the journal and Day's End already collect the words.
- **Letting one go keeps every day it had.** `retired_at`, never a delete: the
  days it was named on are real days that really did cost something. The
  read-back looks names up in the whole list, retired ones included — there is
  a test, and it is visible on the screen, which is the point.
- **A drain spends the Reserve and does not harden the app.** Both halves
  matter. It spends because the morning's read cannot know about the
  afternoon — that is the whole term. It does not harden, because hardening
  reads the day being _used_, and a day whose only entry is two drains is not
  a day you used. `PER_STONE` is a flag's worth and caps at three: a day you
  have named four things on is a day you already know about, and a gauge that
  kept falling would be the app piling on.
- **It never says what to do about any of it.** `foresight.ts` holds that line
  against its own statistics; this holds it against your own report. There are
  tests forbidding "because", "avoid", "toxic" and their neighbours.
- 見聞色's light, and the door sits on the Observation tab beside the sit and
  the loose pages — this tab is noticing your own state, and this is the half
  of it the app could never hear.

## Finding a line, and the weather you named

Two halves of one problem: a journal you cannot read back, and a question with
no answer behind it.

**Search** (`domain/search.ts`, `components/SearchField.tsx`). The Logbook
listed a hundred entries newest first and there was no way to reach the
hundred-and-first — which made "read it back a year later", half of what the
Logbook is _for_, impossible. It is deliberately small: substring,
case-insensitive, no ranking, no stemming, no index. A search that quietly
decides one match is better than another is a search that hides things.

- **Search reads the whole archive, not the visible hundred.** The list is
  capped because a hundred rows is all a screen can scroll, but the entry you
  are looking for is nearly always older than that — so a search over the cap
  would silently fail at exactly its job. `allEntries` runs once, when the
  field first has something in it.
- **The excerpt is the feature.** Showing an entry's first two lines under a
  search for "dentist" is not a result, it is the same list, shorter. The
  window is cut to whole words at both ends — "…he dentist appointmen…" reads
  as a rendering fault — and the ellipsis keeps a space off the word it elides.
  The match is marked by face and colour, never a highlight block.
- **On a note the excerpt reads the preview, not the body.** The body still
  holds the line printed above as the name, so excerpting it drew the name
  twice: the tab-labels-drawn-twice bug reintroduced one row down.
- **One of them speaks at a time.** The line under the field is the feedback;
  the list's empty state is for a log that is genuinely empty. The first cut
  printed "Nothing with that in it." twice, four inches apart.
- `SearchField` and `Excerpt` stand on two screens, so **`tint` has no
  default** — the shared-control rule from `oneLight.test.ts`.

**Inner Weather** (`domain/weather.ts`, `components/SkyRun.tsx`). The word was
asked for every morning and shown nowhere but that morning's own read row,
which is a question with nothing behind it. The run of the last fortnight is
the answer, and the whole feature is that you can look along it.

- **Not counted, not ranked, not averaged, no trend.** `WEATHER_WORDS` is
  ordered settled-to-rough for layout and nothing maps it to numbers. A
  leaderboard of your own bad days is exactly what the vocabulary was chosen to
  avoid — sea weather carries no verdict.
- **A morning with no word is a gap, never Calm.** Drawn as a rule rather than
  as an empty bordered box, because a bordered blank reads as a value.
- **It scrolls to today on mount.** The run reads left-to-right in time, so the
  informative end is the right-hand one; opening on a fortnight ago is a screen
  of empty columns that reads as a broken chart.
- **The weather shifts, and a day is a run of readings.** The owner: _"Currently
  I set the weather when I wake up but then what happens if it shifts
  throughout the day? I'm trying to learn to be better aware of my emotions and
  what triggers them."_ The morning's word still lives on `daily_read` because
  that is the row it is given in and it is already in every backup ever
  exported; the shifts live in `weather_reading` (v19), keyed by day and
  stamped, so the watch is arithmetic (`watchAt`) rather than a second column
  that can disagree. `app/weather/[day].tsx` is the day, reached by tapping any
  column of the run.
- **Nothing counts the readings, and that is the whole hazard here.** A tally of
  how often the day moved answers "how steady was I" with a figure, and a run
  of low numbers becomes a thing to keep low — which would make the feature
  punish the exact noticing it was built for. A column shows what the day
  _came to_ and wears a **leaf** when it got there by more than one reading: a
  mark that says "there is more inside" and refuses to say how much.
- **The settled word is the last one, never an average and never the worst.**
  There is nothing to average — `WEATHER_WORDS` has no numbers behind it — and
  taking the roughest would make every day with one bad hour a bad day.
- **The note says what was happening, never why.** `NOTE_PLACEHOLDER` ends "if
  you know", because the honest answer often is that you do not, and an app
  that insists on a cause teaches you to invent one. Same line `foresight.ts`
  holds against its own statistics, and there are tests forbidding "because",
  "trigger" and their neighbours on the screen.
- **A reading is a moment, so naming again never overwrites** — Fog at two and
  Bright at six are two true readings. The _note_ can be written whenever it
  comes to you, because working out what was going on is the slow part.
- **The empty run is a door.** A run with nothing in it draws no columns, and a
  column is the only way into a day — so on a fresh install the one thing you
  could not do was name the weather at four in the afternoon. The offer line
  itself opens today.
- **Foresight still does not read it, and that is the standing decision.** A
  categorical word is not a dial. Using it as a _grouping_ would fit the
  existing Welch machinery, but it multiplies the hypotheses that `MIN_T` was
  calibrated against — and `foresightNoise.test.ts` is explicit that a change
  moving the noise rate is the wrong change. If it is ever done, it is done by
  re-running that simulation first, not by adding a call site.

### The Logbook is bound

The archive was a column of cards — the same rectangle the rest of the app is
made of, stacked eight deep — and the owner's verdict was _"Not sure I like
this. I'm trying to make things more visually interesting. Can we make the old
entries look like an actual journal that I can flip through the pages?"_ So it
is a book: `components/Volume.tsx`, one entry to a page, swiped rather than
scrolled. **Right is astern**, because the newest page is the one lying open.

- **The page is made of the palette, not of paper.** A cream leaf is right at
  level 0 and a lit rectangle at eleven at night, in an app whose identity is
  that it hardens. The book-ness is the furniture — the sewn gutter, the
  stitching, the ruling, the fore-edge — so it reads as paper in the morning
  and as a dark bound journal after dark. The poneglyph is the one object
  allowed fixed colours, because it is eight hundred years old; a logbook is a
  thing you are holding.
- **No page numbers and no leaf count.** "4 / 112" is a tally of how much you
  have written, which is a streak in a different costume. The fore-edge draws
  a fixed three leaves — a book's edge, never a measure of the block — and the
  line under the volume says which way is _home_, never where you are. It said
  the open page's date for one round, which is the tab-labels-drawn-twice bug
  one line lower: the head already carries it.
- **The ruling has to land under the writing.** The first cut put the first
  rule fifteen points high and it struck through the first sentence.
  `FIRST_RULE` is the block's own top offset plus one line height, and the
  screenshot is the only thing that showed it.
- **A sewn gutter is a shadow, not a border.** One hard line reads as a card
  edge; it is drawn as rules of falling opacity running out from the spine —
  opacity rather than a second colour, the same way every instrument keeps to
  the colours it is handed.
- **Plain mode keeps the pages and loses the paper.** The ruling and the
  stitching are ornament, so they go; the pages are how you reach an entry, so
  they stay. The page is shorter there, because an unruled leaf at the full
  height is not a page — it is a large empty card.
- Searching filters which pages are in the volume, and a search with no
  matches gives a blank leaf rather than a second copy of the field's own
  "nothing with that in it" — the one-of-them-speaks-at-a-time rule.

**And the focus ring is the app's now.** Every text field on the web wore
Chromium's two-pixel gold outline, in a palette with no gold in it, drawn over
borders that were chosen — it reads as a validation error on a form that is
fine. `tools/pwa-head.mjs` clears `:focus` and gives `:focus-visible` the
signature violet at the app's own radius: a pointer gets no ring, a keyboard
still gets one, because taking that away to tidy a screenshot is the wrong
trade.

## The Break List: urges, not failures

`domain/breakList.ts` and `app/breaklist.tsx`. The concept doc's line is the
whole brief: _most apps only let you record the loss._ Every quit-tracker ever
built is a counter that climbs while you hold and resets when you do not, so
the only thing it can say about the hardest thing you did all week is that you
eventually stopped doing it. **There was nowhere in this app to record a win
that consists of not doing something.**

So the unit is the _urge_, never the day and never the run.

- **There is no streak and nowhere to put one.** Not "14 days clean", not a
  longest run, not days-since — there is no column for it, no figure derived
  from one, and the tests forbid the words. This is the shame machine the whole
  app was built to avoid and it is worse here than anywhere: a number whose
  only move is to zero turns one bad hour into the erasure of a month.
- **A slip is data.** Same table, same list, same weight, same colour. Nothing
  turns red, nothing resets, nothing says "again" — and `outcome` is drawn in
  ink rather than in the lens, because crimson is this app's _something has
  gone wrong_ and a hold printed in it says the opposite of what happened. A
  green Held beside a red Went is a scoreboard; this is a record.
- **The three endings are the same size, in the same row, in the same
  colour.** "Went with it" is not smaller, greyer or further away than "Held".
  A list you can only be honest in one direction is a list that lies.
- **"Went with it", never "gave in", "relapsed" or "slipped".** Three of those
  are clinical vocabulary borrowed to make a person feel like a case.
- **An urge you are still in is a real state.** "Riding it out" records one with
  no ending yet, because opening the app mid-urge is itself the coping act and
  the concept says to log the craving _the moment it lands_. Its two endings sit
  on its own row. It is never nagged and never rolled into tomorrow: an urge
  that stayed open is a true record of an evening, not a task you failed to
  close.
- **Several urges against one break in a day is several urges.** Unlike the Sea
  Prism Log's stones, which are one-per-day flags, these do not collapse —
  deciding how many times somebody is allowed to have wanted something is not
  the app's business.
- **An urge spends the Reserve whichever way it went**, because the wanting is
  the expensive part. Charging more for a slip would be a punishment with
  arithmetic on it; charging more for a hold would tax the thing the feature is
  for. `spendNote` names the count and never the outcome.
- **A held urge is `resisted()`, and nothing else.** It breaks the Calm Belt's
  run of easy days, which is the only thing in the app it feeds — and since the
  Calm Belt can only ever _lose_ run by finding resistance, there is nothing
  there to farm. It deliberately does **not** feed hardening: a day whose only
  entry is three urges is not a day you _used_, and a level that rose as they
  were logged would corrupt the one dataset that has to be honest. That is why
  `held` lives on `ActDay` and not in `Acts`.
- 武装色's light, and it moves with the crew — the door is on the Do tab,
  because armament is the tool for what you do and holding an urge is the
  hardest thing it has to hold.

## A backup row is its table's row — except once

The import inserts backup rows **straight into Drizzle**, so a backup type is
not a description of a table, it _is_ the table's insert shape. Two consequences
that have both drawn blood:

- **Types must match columns**, booleans included — a flag is 0 or 1 here,
  because that is what the INTEGER column holds.
- **A child is keyed by its parent's `created_at`, never by a row id.** Ids are
  autoincrement values reassigned on import, so a child keyed on one arrives
  pointing at nothing or at somebody else's row. `poneglyph.road_created_at`,
  `sounding.island_key`, `task.rhythm_key` and `sea_prism_hit.stone_key` all
  hold the stamp in the column, which is what lets them round-trip untouched.

`task_move` is the exception, and it had never once been driven: the file
carries `taskCreatedAt` and the column is a NOT NULL `task_id`, so **every
restore of a backup that had ever recorded a move died on that table** — which,
on any device that has carried a task, is every backup. On the one screen whose
whole job is telling you your data is safe, the only thing it said about the
failure was `[object Object]`, because `e.message` is not reliably a string.
Both are fixed: `linkMoves` looks the task up by its stamp (and `taskMove` sits
after `task` in `TABLE_NAMES` so the tasks it looks up are already in), and
`said()` in `BackupCard` never renders a non-string. The lesson for the next
table: if the backup row is not the table row, it needs a translation and a
place in the order — and a round-trip through the real database, not just
through `parseBackup`.

## Will Reserve is a level, a burn and a recovery

The concept doc calls this the one idea worth stealing — will modelled as a
resource rather than as unlimited — and for a long time only half of it was
here. The Daily Read and recent sleep say how full the tank started; **what
the day took out of it was not counted**, so the gauge described a mood.
`domain/willReserve.ts` has all three parts now.

- **Only real output spends, and no act ever adds.** Gear minutes, training
  sessions, and struck tasks (capped, so clearing twenty small things never
  arithmetically becomes four hours of deep work). Reading, writing and
  **sitting cost nothing** — noticing your own state is not an expenditure of
  will, and a practice that raised the number would be a practice with a score
  attached. They still darken the app, because hardening reads the day being
  _used_; they simply do not empty the tank.
- **Spend is subtracted, never averaged in.** It is what has gone, not another
  opinion about what was there — and it is capped at `SPEND_MAX`, because a
  day cannot take more out of the tank than the morning put in it.
- **Recovery is sleep**, which was already weighted toward recent nights. That
  is why a spent day reads full again after a good one instead of compounding.
- **The number must say what took it.** A figure that fell without explaining
  itself is worse than none: forty having spent two hours in gear is a
  different day from forty on a Tuesday morning, and `spendNote` is the line
  that tells them apart. Descriptive only — it names the acts and stops. There
  is no version of it that says what to do about them, and a spent evening is
  never treated as a mistake.
- The gauge and hardening move in opposite directions on the same acts, and
  both are true: the app goes **darker** as the day is used and **quieter** as
  the reserve drains, which is the concept's "the interface runs out of Haki
  alongside you" doing exactly what it was written to do.

## The Return and the Calm Belt

`domain/voyage.ts` holds the two failure modes the concept doc named and the
app never answered. Both read one thing — the days that had something in them
— and neither has a table, for the reason Ryuo does not: a day counts when
rows that already exist say it counted.

- **A gap is silent.** Nothing counts the days away, nothing greets you with
  how long it has been, and no screen shows a gap length. The app's first word
  after an absence is about the return. The figure it carries is how long it
  took to come back — a number that only exists because you did.
- **No trend is claimed.** The returns are listed with their times and the arc
  is left to the reader. Two returns is not a trend, and "your comebacks are
  getting quicker" off three points is the exact overreach `foresight.ts`
  exists to refuse.
- **The Calm Belt fires on ease, not on failure.** Its run counts days that
  were _used_ and had nothing hard in them, so a gap, a bad week, or a day you
  did not open the app all break it. It can only ever speak to somebody whose
  week is going fine — which is why an app with no shame mechanics is allowed
  to have it, and it is non-negotiable #7 finally made operative. It asks a
  question rather than giving a verdict, because the app does not know whether
  an easy week was the rest or the drift.
- **Resistance is a training session or time in gear**, and it lives in one
  predicate (`resisted`) so the definition is retuned in one place. A struck
  task is the day being used, not resistance — it is one tap.
- **The Return keeps the signature violet under both flags**; it is not a
  lens's light. The Calm Belt takes `warn`, the app's one warmth — crimson
  would say something has gone wrong, and nothing has. Note that screens
  built on `underCrew` have a crew-coated `violet` that is jade under Zoro,
  so the Return takes the raw palette's.
- Neither card can appear on paper, and that falls out of the rule rather than
  being enforced: both need today to have been used, and a used day has
  hardened.

## The week: ink behind, outlines ahead

`domain/week.ts` and `components/WeekChart.tsx`. Setting Sail reads the week
_behind_ and asks for a heading; there was nowhere to see the week **in front
of you**, which is the half you can still do something about. Chart the Week is
that half, reachable all week rather than once at the ritual.

- **Two marks, never one channel.** A day that has happened is solid, at the
  darkness it earned. A day that has not is a dashed outline holding what is
  placed on it. A bar meaning "used" on Monday and "planned" on Friday is a
  chart you cannot read, and one that quietly counts intentions as work. The
  dashed grammar is already the rhythm's: not in the database, not counted.
- **Two scales, because they are not the same unit.** Ink is absolute against
  the darkest a day can come out, so a light week cannot draw its best day as
  tall as a heavy week's. Outlines are relative to this week's busiest day,
  because there is no capacity to scale against and the app will not invent
  one. The first cut shared a scale and drew Wednesday's plans twice as tall as
  Monday's work.
- **Never `flexGrow` for a bar.** It distributes _free_ space rather than
  setting a size, so every column came out the same height whatever the day had
  earned. Explicit percentage heights, anchored to the bottom.
- **No total, no capacity, nothing red.** Setting Sail is the one screen
  allowed to put a denominator on a week and it earns that by saying it once in
  the ritual; a chart repeating it daily would turn a bounded honest count into
  a target.
- **Monday starts the week**, and Sunday ends the one it belongs to — the
  off-by-one that puts a seventh of all weeks a day out. There is a test.

## The month is where a streak would grow

`domain/tide.ts` and `app/tide.tsx`. The strip is the day, Chart the Week is
the week, and the Tide Calendar is the size above both — the one question
neither can answer is _what has this month actually been like_, and the answer
is a shape rather than a figure. Reached from the home screen, beside the week.

- **It is the screen where the temptation is strongest, so it is the screen
  with the most refusals.** A run of used days is _visible_ here in a way it is
  nowhere else, and a calendar is where every other app grows a streak counter.
  There is none, no longest run, no percentage and no denominator: `monthLine`
  says "16 days with something in them" and stops. Setting Sail is still the
  only place allowed a total, and a week is what it is allowed one _of_.
  `tideScreen.test.ts` reads the screen for the words, with the comments
  stripped first — the prose is where the law is written down, so it is allowed
  the words the code is not.
- **Nothing is red and nothing counts backwards.** An empty day is a day that
  was not used, which is a fact about a day the app has nothing to add to. A
  port of call keeps `warn` like every other date.
- **Three ink steps, told apart across the room.** The first cut ran
  0.46/0.70/0.94 and a busy day was indistinguishable from a full one — two
  measured greys where there should have been three. Same law as the week
  chart's bars: a shape, never a score.
- **The grid pads out to whole weeks and the padding days keep their boxes.** A
  neighbouring day is a real day that really did hold something, so it draws
  its ink at half strength and its date goes faint; dropping its box left five
  holes in the top row, which is the thing padding the grid out was for.
- **`setSailAt` is not the floor on its own.** A restore deliberately holds that
  setting back — day one belongs to the install, not to the file — so a phone
  with three months imported into it this morning would refuse to show any of
  them. `earliestAct` is the other half of the bound.
- **A month ahead is a calendar, and this is not one.** Forward stops at the
  month you are in; the week chart is where the future lives, because a week
  ahead is something you can still act on. Nothing on this screen writes.
- **The moon is drawn, never typed.** ◐ and ◑ are not in the mono face and came
  out as clipped slivers — the em-dash-as-filled-bar bug with a different
  glyph. `litPath` in `domain/moon.ts` is the terminator geometry, lifted out
  of the settings chart's night sky so both draw the same moon; the chart's
  `Moon` and the calendar's `MoonMark` can no longer disagree about which way
  a crescent points. Only the four principal phases are marked: a moon on all
  thirty is noise with a nautical excuse.
- Plain mode keeps the grid, the ink and the ports, and loses the sky.

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

## One material per lens

A lens is not a colour applied to a card — it is made of something. The
Journey tab made the case by accident: one card there was cut into stone and
the four above it were made of `borderRadius`, on the same screen.

| Lens               | Material        | Drawn in                |
| ------------------ | --------------- | ----------------------- |
| 見聞色 Observation | still water     | `instruments/Water.tsx` |
| 武装色 Armament    | hardened steel  | `instruments/Steel.tsx` |
| 覇王色 Conqueror's | poneglyph stone | `instruments/Stone.tsx` |

These are not textures chosen to look expensive — they are what each Haki
_is_. Observation reads surfaces, Armament coats in black, Conqueror's is
written in rock that outlasts everyone. The material carries the meaning, so
the paragraph explaining the meaning can go.

- **Water and steel obey the performance licence; stone does not.** A plate
  on paper is paper (`!plainMode && hardening > 0`), because paper catches
  nothing and the material colours are hand-set against near-white ink.
  Stone is the exception on purpose: a poneglyph is an object, not a mood.
  `materials.test.ts` reads the screens and holds both halves of that gate.
- **Each material has exactly one variable**, and it is light, never a
  figure: water's rings spread with the reading's openness, steel's sheen
  comes up with hardness. Same licence as `lit()` — you cannot read a score
  off a surface.
- Materials take their colours as props and never touch the palette, like
  every other instrument.

## The poneglyph stone

The Log Pose cards are cut into rock, and canon hands the hierarchy over
free: **Road Poneglyphs are red, ordinary Poneglyphs are blue.** So a pillar
is a red slab and the island at sea under it is a blue slab set into it, and
the two can never be confused. `instruments/Stone.tsx` draws it under the
usual replacing-drawings contract; the inscription is seeded from the
pillar's own title, so each carries permanent glyphs of its own.

- **The stone does not move with the ramp.** It is the only colour set in
  the app spread unchanged into all four palettes, because a poneglyph is an
  object rather than a mood — eight hundred years old and indifferent to
  what time it is. There is a test.
- **Text on stone comes from the stone**, never the palette's ink: `onStone`
  at a few opacities, held to AAA on both slabs. The lens colour survives
  only on the kanji marks — a violet label on dark rock measures under the
  floor, and the call to action is cut in the stone's own light instead.
- A cut is a shadow with a lit near edge: every glyph is stroked twice,
  `carve` then `lip` one unit below. Drop the lip and the slab flattens into
  wallpaper.
- **Never build an SVG id out of user text.** A pillar called "Master the
  blade" produced `url(#face-Master the blade)`, which resolves to nothing
  and paints _black_. Both slabs shipped near-black through a screenshot
  review because the text on top stayed bright — an opacity bug dims
  everything, a bad paint reference dims only what it paints. Ids are hashed
  now. Read the pixels back rather than trusting the render.

## Three lightnings, and they are not interchangeable

`Lightning.tsx` is a **burst**: hard, mitred, thrown radially off a contact
point. It is a fist landing and it belongs to the impact frame.
`instruments/SkyBolt.tsx` is **weather**: one long bolt falling from above,
thin and faint with a soft halo, forking once or twice. The ambient layer
spent months rotating the burst around the screen, which reads as a firework
going off behind the app rather than as a storm over the horizon.
`instruments/Crackle.tsx` is the **charge**: it neither throws nor falls, it
**clings** — short high-frequency arcs running _along_ a plate's border and
kicking a couple of points off it, never across the face and never out into
the middle. That is the read to keep if it is redrawn. It is also the one
stroked the opposite way round: the burst puts a dark core inside a hot rim,
which is right at the width an impact draws at, but under three points the
same construction inverts and reads as an outlined squiggle — so the crackle
is a wide near-transparent halo with a thin bright line on it. There is no
light ground to worry about, because the charge cannot exist below level 3.

The bolt is the concept document's own — `docs/concept.html` has run it
behind the pages from the start. **The jag is enveloped by a sine**, so the
deviation is zero at both ends and greatest in the middle: it leaves the
cloud clean, wanders, and arrives clean. That is the whole difference
between struck and scribbled. Every flicker generates a new one; the burst
stays fixed, on purpose.

## The Eternal Pose

The concept doc lists it beside the Log Pose and then calls it "the dream",
which is why it sat unbuilt: read that way it is the Dream with a second
name. The canon settles it — a Log Pose finds the next island, an **Eternal
Pose points at one place forever so you can always find your way back**. So:
the Dream is what you sail toward, the Eternal Pose is what you come back
to, and for someone whose stated problem is consistency the second one is
the more useful on a bad week.

- **It is never tracked, ticked or counted, and there is nowhere to add it.**
  A non-negotiable with a streak attached is a shame machine pointed at the
  one thing somebody promised themselves. The only figure it carries counts
  days since it was taken — it cannot be made smaller by anything you do,
  and there is a test asserting exactly that.
- **Replacing one costs a written line**, the same asymmetry as sailing past
  an island. The first is free. Rewording is not replacing: the days it has
  been held are the same days, because only the sentence changed.
- **The record is kinder than the event.** A bearing you let go was
  _carried_, and it keeps the days it had.
- It reads on the Journey tab, at Setting Sail, and — the moment it exists
  for — when every needle is spinning and the Log Pose has nothing to point
  at.

## Motion

`components/Rise.tsx` is the whole vocabulary: fade up a short distance,
quickly, and settle. Nothing bounces, slides in from off-screen, or spins. A
screen of cards staggered forty milliseconds apart reads as the page
assembling itself; a hundred and fifty apart reads as a wait.

Same law as `lit()`: **plain mode gets none of it**, and neither does anyone
who asked the OS for less motion. It only ever runs on arrival — a card that
replayed its entrance on re-render animates under every keystroke in the
form inside it.

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

## The chart table

The Journey tab is one picture and then a list of rows. It used to be six
stacked cards, four of them paragraphs with two buttons each — the worst
screen in the app for words per screen, and the shape of the journey nowhere
in it. `components/logpose/ChartTable.tsx` draws the pillars as standing
stones on a sea; `PillarRow` beside it carries the names.

- **A stone's height is its work astern**, and nothing else varies. Same rule
  the Log Pose already holds about denominators, arrived at as a picture: a
  stone that has _grown_ is the only honest way to draw distance covered when
  nobody knows how many islands are left. It saturates at `MAX_ISLANDS`,
  which is also what fixes the waterline — the box is sized to the tallest
  stone that can exist, so a short pillar is not standing under a band of
  empty sky.
- **A lamp at the waterline means an island is at sea.** That is the whole
  status system. Lamplight is `warn` under both crews, like the settings
  chart's — one warmth, never a lens colour.
- **The drawing carries no words.** The first cut hung each title under its
  stone, which at four columns is seven mono characters a line. A picture
  that has to be captioned in fragments is two bad things instead of one good
  one, so the rows carry the words and the stones carry the shape.
- **The geometry is a system and lives apart from the drawing**
  (`logpose/chartMarks.ts`, pure, tested): how tall a stone stands, and where
  a carved glyph may go. A mark that leaves its rock paints a red dash on the
  water, which reads as a rendering fault — and is the size of thing a
  screenshot review walks straight past. There is a test that walks every
  width and height the chart can produce.
- **One stonecutter.** The alphabet and the mason live in
  `instruments/glyphs.ts`, shared by the chart's stones and the card-sized
  slab, so a pillar reads as the same rock in both places. The chart's first
  cut invented a second, sparser vocabulary — four or five loose strokes — on
  the theory that a real inscription would be mud at forty points wide. It
  was not mud, it was empty: five scratches read as a damaged rectangle
  rather than as writing. Same alphabet, quarter pitch.
- **Paper catches nothing here either.** At level 0 the chart is pencilled:
  no sea fill, no reflections, no halo under the lamp. The stone stays,
  because a poneglyph is an object rather than a mood.
- **The Log Pose is furniture, and its needle never moves.** It fills the
  open water the stones do not. The first cut put a mariner's compass rose
  there — the right idea and the wrong instrument, a stock nautical mark
  standing in for the thing this screen is named after. 覇王色 is the lens
  with no meter and what this screen gives back is a bearing, so a needle
  that swung with the day would be exactly the meter the screen refuses to
  have. Canon agrees: a Log Pose locks onto an island and holds. What is at
  sea is said by the lamps. Its colours are fixed across all four palettes
  like the stone's, because it is an object rather than a mood
  (`instruments/LogPose.tsx`).
- **Plain mode gets the plain list**, unchanged — the same law the settings
  archipelago holds, and `plainList.test.ts` reads both screens to keep it.

**And the cards grow back.** Four stacked paragraph cards were the reason for
the chart, and four more had appeared around it — Setting Sail, the Eternal
Pose, the Flag and Inherited Will, a label and a glyph and a paragraph each,
three hundred points of screen above the picture to report that two features
had not been used yet. A reference is a **door**: glyph, name, chevron, and
what is currently true said once. Setting Sail keeps a due state because it is
the only one of the four that has one; the rest group at the foot under a rule.
The paragraph explaining the model shows only to somebody who has not built
one — copy describing the shape of a screen that is already showing that shape
is onboarding that never leaves.

Tapping a stone or a row opens `app/pillar.tsx`, and **that screen is where
the acts live now**: it mounts the same `NeedleCard` the plain list does, so
there is one island card in this app rather than two that drift. The card
drops its own title there — the navigation header is already carrying it, and
the same words twice at display weight is the tab-labels-drawn-twice bug with
a different label in it.

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
