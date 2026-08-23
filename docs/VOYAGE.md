# The voyage so far

How Haki went from a blank repo to what it is now. Kept as a record — for
future reference, and as raw material for telling the story of building it.

---

## Night 0 — the brainstorm

Started from one sentence: _"journaling, note taking, productivity,
accountability, habit forming and breaking app just for me… like Evernote or
Monday meets Headspace."_ And one instruction that shaped everything after:
lean **heavily** into the One Piece power system. Haki — willpower made
visible — as the actual mechanics of a mental-health app.

The concept doc landed on:

- **Three lenses.** 見聞色 Observation (know your own state), 武装色 Armament
  (do the thing), 覇王色 Conqueror's (the will that affects the world).
- **Four failure modes** designed against, not around: the cascade (one bad
  night takes the week), the comfort backslide, the return (coming back is
  harder than starting), unfinished projects.
- **No shame mechanics** as a hard rule with tests. No red for failure, no
  zeroed streaks, no "you missed". A miss is data.
- **Inherited Will** — the people whose dreams you carry. A source, never a
  stick.

## The PWA decision

Phone-first, native later. Three weeks as a PWA for testing and refining,
then Apple. One technical fact drove the hosting: expo-sqlite's web build
needs `SharedArrayBuffer`, which needs cross-origin isolation headers —
which GitHub Pages cannot set. Vercel can. The whole local-first stack:
Expo + Drizzle + SQLite in the browser via OPFS, everything on-device,
export/import as the only way data moves.

## v0 — the working core

Daily Read (four dials, thirty seconds), Will Reserve as a gauge that is
never a score, the Keystone cascade that warns on the first bad night
instead of after the week is gone, training with **Returns** — a gap closed
is the event, stated plainly and left alone. Export merges and never
deletes. CI runs typecheck, 100+ tests, and a native bundle on every PR.

## The polish rule becomes law

Tab kanji got English under them ("I haven't learned Japanese yet").
The concept doc's type came into the app — Bricolage Grotesque, Newsreader,
IBM Plex Mono — with the floating glass tab bar. And a standing order was
given: **every change ships looking polished.** CLAUDE.md now enforces
screenshot-verification because typechecks prove nothing about layout; the
session that followed proved it right over and over.

## Tasks, quotes, and the first sounds

The three-week "no new features" rule bent for a reason: an app too thin to
open gathers no data. Tasks arrived shaped for an ADHD brain — every task
carries a minute estimate, today is a small deliberate set, the home screen
shows exactly **one** next thing (the Next Strike), overload is named and
never punished. Sixty One Piece quotes rotate daily — and the guard test
written the same hour caught the hash only ever reaching 37 of them.

Then the sounds started arriving as uploads. `tools/make_sound.py` grew out
of necessity — pure-stdlib audio cutting because the container's ffmpeg had
no audio support, an `--map` envelope readout because nobody working on the
files could listen to them. The Armament strike went from 871KB/4.5s to
33KB/0.7s. Observation became the Daily Read's save. The Drums of
Liberation, 104 seconds of theme, became six seconds that play only on a
Return. The Den Den Mushi became one ring cycle for the notification
channel.

## Gears — 二速 三速 四速

The focus timer from the concept doc, built with honest costs: Gear 2 is
25 minutes and free, Gear 3 is 90 and costs a half-hour cooldown, Gear 4 is
two hours and ends the day's gears — the anti-hustle position as a rule.
The load-bearing decision: **ending early costs nothing.** An app that
punished stopping would teach you not to start. Time derives from the
clock, never a counter, so closing the app mid-gear loses nothing.

## Hardening — the owner's best idea

"The app should open a lighter color and darken when I do something.
Armament is invisible until you harden it." That one message became the
app's defining mechanic: it opens on **paper** — a ship's-log parchment —
and snaps dark on the first act of the day, deepening through four
hand-set palettes to the black it was designed in. The high-water mark
never goes backwards inside a day, and yesterday's black is dropped at the
(configurable) day boundary, because an unused day has to look unused.

The engineering that made it safe: a contrast-floor test on every palette
(it caught two typo'd colours before they ever rendered), a no-colour-
literals test (it found fifteen invisible-on-paper labels), and pixel-
sampled verification of every level. The gloss followed — hardened
Armament is glossy, so cards catch light along their top edge, brighter as
the day deepens, none at all on paper.

## The emission, and Ryuo

The references settled it: the veining is a **transition**, not a state —
so striking a task fires a corona that blooms and is gone, riding the same
intensity that fades all the app's Haki when Will Reserve drops. Then Ryuo
gave it a growth axis: **days when the top of the list got struck** extend
the corona's reach, over a trailing window, never as a streak. Clearing
three easy things while the one from Tuesday sits open does not count —
that distinction is the entire feature.

Building it surfaced the session's deepest bug: drizzle's expo driver runs
transactions synchronously, an async callback made imports commit before
their inserts ran, and on web the racing sync calls corrupted the shared
result buffer. Found because a test harness needed to seed data; fixed with
a one-line-shaped change and a guard test so it can never come back.

## Impact frames — the reference loop at full speed

"One thing the anime has are impact frames. Help me achieve this."
Two frames, 110ms, the screen inverting twice with the instrument of the
strike drawn full-bleed — photographable only under a frozen clock.

The fist itself went through **eight drawing passes**, each one driven by
reference images sent mid-build: from a mitten, to manga light-licks on a
black mass, to a scratch-field of 56 torn speed-lines, to a side-profile
punch, and finally — after the how-to-draw sheets — a receiving-end punch
with complete contours: finger columns, the jagged fold, a thumb with its
nail seated on it, tendons, wrist creases. Every fault was invisible in
code and obvious in a screenshot.

The architecture is the theme system's seam: the field owns the violence,
the instrument owns the shape. Luffy's is a fist. Zoro's will be a sword.

## The day, said out loud

The next session opened on a real problem, stated plainly: _"Anything I do
should count toward some tracking… journaling once in the morning or at night,
a 5 or 10 or 15 minute meditation, and setting the day's intention. Not sure
how to tie it in to our system."_

The answer was already half-built and completely invisible. Hardening had been
counting every act since the day it shipped — and you could watch the app go
black without ever learning what had done it. So the three new practices got
built, and the mechanic got a face.

**The course** is one line saying where the day is pointed, set in the morning
or the night before (two buttons, because the night-before version is the one
that actually works). It is never marked. Nothing asks at the end of the day
whether it was held, because the moment an intention is graded it becomes a
task you failed to finish.

**Stillness** is 見聞色 sat down — the other lens, five, ten or fifteen minutes,
named for what Observation gives you as it deepens: Presence, Intent, and A
moment ahead. Where the Gears carry honest costs, this carries none: nobody has
ever been harmed by sitting quietly a second time. A ring breathes at four
seconds out, one held, six back in, with no words on it. The Den Den Mushi,
uploaded weeks earlier and never given a home, became the bell.

**The day** is the card that makes hardening legible — six practices, two to a
row, each a way in. The one rule that took the longest to find: an untouched
practice shows its **offer**, not its absence. Not "not yet" — _"5, 10 or 15"_.
Six things you have not done is a checklist, which is a machine for producing
six small failures every morning. Six things available is a card. That
difference is one string per row, and it is the entire feature. At the top
level it says there is nothing left to darken, because the failure mode of
making a mechanic visible is that someone starts farming it.

The weights were set so the daily practice alone reaches the settled black —
course, read, a sit, an entry, one struck task — with no training and no gears
in it. A day made entirely of small things is a full day, and the palette had
to agree or the card would have been lying.

The same session fixed a bug that had been quietly eating the habit it was
supposed to build: **the checkbox took three taps.** Not one of them missed. A
strike writes one row and then reloads eleven queries down a single synchronous
channel, and until all of it landed the tick was not drawn — so the box read as
broken, got tapped again, and a second tap on a checkbox is a perfectly good
undo. The fix is now a standing rule: the screen answers the finger, not the
write.

## The ship, the lightning, and the second door

Three from the charted list, in one pass.

**The Logbook got a second door.** The editor was the only way in: a full
screen with a cursor blinking in an empty document, which is a demand for a
subject, a length and a reason to have opened it. So the tab now carries a
one-line field that asks for none of that. Type a line, tap once, it folds into
today's entry and you have not left the screen. Lines through a day accumulate
into one entry rather than one each, because that is what a day's log is — and
because the practice card counts entries, so three lines on a Tuesday is one
Tuesday.

**The black lightning landed on the impact frame**, which is where the
reference puts it: bolts crackling off the contact point around the coated
fist, thrown further the longer the top of the list has been getting struck.
Two things had to be got right and both took a screenshot to see. The bolts
were first drawn round-capped and four units wide, and rendered as fat pink
tubes; lightning has corners, so they are mitred and butt-capped now. And the
core was taking the fist's colour — but the frame _inverts_, so on the flash
where the fist is pale the black lightning came out white. The core is now the
darkest colour the palette owns, whichever frame is up: black with a hot rim
against the light frame, and against the dark one the core sinks into the
ground and the rim is all you see, exactly as the animators draw it.

Catching it at all needed a lesson about the tooling: `clock.install()` fakes
the timers but leaves them ticking with real time, and a screenshot takes
longer than a 110ms flash. `clock.pauseAt()` freezes it. Both frames
photographed on the first try after that.

**The Thousand Sunny sails the top of the home screen** — and never moves. The
obvious hardening meter is a bar with a boat on it, which is a progress bar in
fancy dress, and the rule against scoring hardening binds the thing that draws
it. So the ship stays where it is and its _state_ changes: at anchor with the
canvas furled, then under way, then making way, then running with spray off the
bow. At anchor, not adrift — a ship at anchor at seven in the morning is a ship
about to leave, and this app does not own a picture of failure.

It took five drawing passes, every fault invisible in the code and obvious in a
screenshot: a figurehead that was unmistakably a duck (a circle with a pointed
muzzle is a beak; the mane spikes are what make it a lion, and they are also a
sun), sails drawn as lenses that rendered as leaves, then sails so wide they
merged into a deckhouse, a hull four units deep that read as a canoe, and a
wake of three level rules that read as a barcode. The band is full-bleed to
both screen edges, which is what the previous session's edge-to-edge work
bought.

## Where it stands

**Live at [haki-lac.vercel.app](https://haki-lac.vercel.app).** 390 tests,
four palettes, seven sounds, sixty quotes, one principle held everywhere: the
app rewards the act and never punishes the absence.

**Charted next:** the second lightning — Conqueror's, which leaks colour
continuously and grows with the will behind it, and which needs the
Conqueror's unlock before it means anything; that unlock itself, rare to have
and rarer to master; the Log Pose as the finish-one-thing mechanic; and the
Zoro theme, where the field keeps the violence and the instrument becomes a
sword.
