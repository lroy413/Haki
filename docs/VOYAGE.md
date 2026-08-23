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

It took nine drawing passes, and the ones that mattered came after the owner
sent silhouette references mid-build. Those settled four things every earlier
pass had wrong: **she faces left**, lion at the bow; the hull is a **deep
crescent** with both ends swept up, not a bowl and certainly not the four-unit
canoe of the third pass; the sails hang **clear of the deck**, because canvas
set flush to a hull merges with it and the rig reads as two buildings on a
barge; and she has **crow's nests**, the one detail that says _this_ ship
rather than any ship.

Everything else was faults invisible in the code and obvious in a screenshot: a
figurehead that was unmistakably a duck (a circle with a pointed muzzle is a
beak — the mane spikes are what make it a lion, and they are also a sun), sails
drawn as lenses that rendered as leaves, sails so wide they merged into a
deckhouse, furled canvas drawn as its own ellipse that blobbed into the
platform above it, and a wake of three level rules that read as a barcode. One
pass silently did nothing at all: a string replacement whose target prettier
had reflowed, applied without checking it matched. The band is full-bleed to
both screen edges, which is what the previous session's edge-to-edge work
bought.

## The weather, and a seam for a better hand

The owner's verdict on the ship and the fist was fair: _"I may draw the SVGs
myself in Illustrator and add them later, because no offense but you're
struggling with accurate renderings."_ True, and worth building for rather
than arguing with. Both drawings now carry a **REPLACING THIS DRAWING** block
naming the viewBox, the aspect, the colour props and what the composition has
to keep — so a proper redraw drops in without touching a line above it.

The more useful half of that was separating what is a _drawing_ from what is a
_system_. The Sunny's water moved into its own file, because swell,
wavelength, phase and how much of it is running are not things anyone redraws
by hand — and because throwing away a working sea to replace a boat would be
absurd. The two stack in one coordinate system and align exactly.

Which freed the sea to get good. It is three runs of swell now, at different
depths and wavelengths and opposed phases, so they never line up into stripes —
shorter and deeper as they come toward you, which is the whole of perspective
at this size. At zero amplitude every segment is flat, so **calm water is the
same code with the wind taken out of it** rather than a special case. Caps ride
on the runs instead of floating between them, which is where they were reading
as clutter.

And the lightning came inside. It leaks now, as the day hardens: nothing at all
on an unhardened morning, a flicker every half-minute or so once there is
something in the day, something closer to a storm by the end of one that had a
lot. Thin bolts thrown from somewhere different each time, over the content
rather than behind it — every screen paints its own opaque ground, so behind
would be invisible — at an opacity low enough to read as distant sky rather
than as interface.

Two limits are in the domain with tests behind them, because this is the one
effect in the app that could genuinely hurt somebody. It is **never a strobe**:
a floor on the interval sits far above the three-flashes-a-second line that
photosensitive-seizure guidance draws, and a future level that wanted to be
exciting has to argue with a test. And it stays decoration: plain mode,
reduced motion, and a low Will Reserve each turn it off completely.

## Two corrections, and a lens that was missing

Both came from the owner using the thing, and both were right.

**"The Armament system is weird — it shouldn't be working off just workouts. I
only work out one major time a day."** Correct, and worse than it sounds. The
Hardness figure was sessions-per-week over four weeks, which meant the lens for
_everything you do on purpose_ was measuring the gym — and for somebody who
trains once a day it is a number with about two useful values. Hardness now
reads every act of doing: a task struck, a block of focus, a session logged. It
counts **days that had any**, never how much, because three tasks is not a
better day than one and a measure that said so would pay for busywork. Training
kept its own honest section underneath: sessions, gaps, Returns. One input
among several rather than the whole of a lens.

**"Stillness and meditation are part of the Observation system, as Observation
Haki only works in times of mental clarity."** This one exposed a category
error: sitting was hardening the app, and hardening was framed as Armament
coating. So Observation got built — the lens that had a practice feeding it and
nowhere for it to go.

The design is in the second half of that sentence. Sitting is the **practice**
and clarity is the **condition**, and they are deliberately not stirred into
one number: they are reported separately so the state can name whichever is
doing the limiting. Which means the app can say _"the practice is there — today
is loud, and that is a day, not a verdict"_. Most habit apps can only tell you
that you missed something.

Hardening itself was reframed rather than changed. It reads the whole day
across every lens, and sitting still darkens the app — because a day with
stillness in it is a day that got used, and a mental-health app withholding its
one piece of visual feedback from meditation would be punishing somebody for
meditating.

## The Log Pose — 覇王色 opens

The owner's ask was for the goal tracker, and the shape came out of one long
answer to one question. Should there be a hard WIP limit — one active goal at a
time?

> _"I like the one goal idea, we need to find a middle ground… No, I need 1
> core dream, but multiple big things need to happen in order to make that
> happen. To be the pirate king you not only have to be strong enough to beat
> who's along the way, but also have to find the road poneglyphs to even
> navigate to the island. Everything all leads to the One Piece but the
> journey's just as important."_

That is the whole architecture, and it is not the one the concept doc had. The
doc said four pillars each with a next milestone. The owner said one **dream**
above the pillars, and the pillars are what the dream _requires_ — which is why
they are Road Poneglyphs rather than categories. Four is the target, because
four of them triangulate Laugh Tale; seven is the ceiling, because life
sometimes genuinely has five fronts and a system that refuses to admit it just
gets lied to.

**Conqueror's turned out to be the lens with no meter.** Observation reports a
state, Armament reports a hardness, and the instinct was to give this one a
figure too. Canon says no: Conqueror's cannot be trained, only refined — it is
knowing exactly who you are — so a number rising as you knew yourself better
would be a lie about what the thing is. What the screen gives back is a
**bearing**, which is also the honest answer to a question this app had already
answered once: _a journey has no denominator._ Nobody sailing knows how many
islands are left, so there is no percentage, no bar, no "3 of 8" — only what is
astern, counted, with nothing beside it. Hardening reached the same rule from
the other end.

**Finish or sail past.** The fourth failure mode from the concept doc, and the
only one still unbuilt: projects go unfinished almost never because anyone
decided to quit, but because the loop never closed and nothing ever made you
say so. So there is one island under each pillar and no way forward except to
close it — enforced in `openPoneglyph` as well as in the UI, because a limit
that only holds while the screen is open is not a limit.

The part that was not in the plan is the **asymmetry**. Reaching is one tap.
Sailing past is one tap and then a written line, and the button stays dead
until it is typed — the only place in this app that deliberately makes anything
harder. Arriving has already cost weeks; a decision you cannot be bothered to
write down is drift wearing a different coat.

The second unplanned thing was about vocabulary rather than mechanics. The
_event_ has to be a real, logged abandonment or it is not a decision. The
_record_ of it sits in this app for years, and a column of things marked
ABANDONED is a monument to being someone who quits. Stored as `passed`,
displayed as **"Sailed past"**. You did not fail the island. You went past it,
on purpose, and kept sailing.

**The burst finally has a caller.** `Lightning.tsx` was written months earlier
with a note in its header that the second lightning — Conqueror's, in colour,
thrown further — would be a call site rather than a rewrite. It was: three
fields turned against each other, black cores with violet rims, on a screen
that darkens rather than inverts. It has exactly one trigger, an island
reached, and it stays rare because an island is weeks of work. Four times a
year it is electric; weekly it would be a screen transition.

Two things the screenshots caught that nothing else would have. The bolts came
out as grey angular tubing the first time, because `width` is in the drawing's
own hundred-unit box and gets multiplied twice on the way to a phone — and
scaling a field past about 1.5 stretches the _geometry_ too, so six segments
become six long wires. Coverage had to come from more bolts, not bigger ones.
And the wash was written as `palette.ink`, which is near-black on paper and
near-**white** on all three hardened palettes, because it is the text colour
and the text is light on a dark ground. The Conqueror's burst flashed the whole
display white on every palette the app actually spends its day in. That one is
now a `darkest()` helper with a test across all four palettes, and a note in
`CLAUDE.md`, because the name is a trap and three separate effects had been
working it out by hand.

Inherited Will moved into the tab rather than losing one. The whole argument of
the source material is that a dream outlives the person who held it as long as
somebody keeps carrying it — which makes the people you carry part of where you
are going, not a drawer beside it. Still five tabs, still a record and never a
mechanic.

## The lenses become the tools

The owner, using the app, handed back its information architecture in one
message: _"Armament is the time management and life tracking portion… this is
my productivity portion. The observation page is my mental health space… my
journaling and meditation live there. The conquerors Haki is what we were
already building. Those are the labels to the pages and tools."_

So the tabs stopped being features and became the three lenses, in canon's own
order: 見聞色 Observation is the mental-health space — the reading at the top,
Stillness as the practice's door, and the journal, which moved off its own tab
and in. 武装色 Armament is the productivity tool — the list, the workouts, the
schedule. 覇王色 is the Journey. The home screen keeps a one-line way into the
journal, because the door that asks nothing should be one tap from where the
day starts.

Two sharpenings came with it. First, the scope of a lens's measure, corrected
in both directions inside a week: hardness once read workouts alone (too
narrow), and a rewrite reached for every act in the app (too wide — the sits
are Observation's, and a lens that reads everything is not a lens). The rule
that survives: **whatever is done under a tool hardens that tool's Haki.**
Armament's figure now reads struck tasks and logged sessions, because that is
what its tool holds.

Second, the Gears left the Armament page. _"Haki is will, Devil Fruit is
ability"_ — the Gears are the owner's coming ability page, not a lens, and
they wait on a pushed screen reached from the practice card until that page's
vision forms. Nothing about their costs changed, and a gear block still
darkens the day: hardening reads the whole day, whichever tool it happened in.

And each tool got a face. The owner asked for the gauges to be _visual_, with
references: Armament's hardness is now **one bolt filling across the frame** —
crimson with a black filament, the unlit channel waiting ahead of it — and
Observation is **a pair of eyes** that open as the tool is used. Closed until
the Daily Read, because the reading is literally what opens them; heavy-lidded
on a clouded day however long the practice; and the future-sight glint lights
at exactly the moment the lids finish, because openness and the sharp
threshold are the same line in `domain/observation.ts`. Both drawings carry
the REPLACING THIS DRAWING contract, both are seeded so they never re-roll,
and the eyes mask with the ground colour rather than a clip — a flat ground
makes cover-up exact in every renderer.

## Where it stands

**Live at [haki-lac.vercel.app](https://haki-lac.vercel.app).** Fourteen pull
requests merged, 477 tests, one principle held everywhere: the app rewards the
act and never punishes the absence.

What is actually in it:

|                     |                                                                                                                                                                                                                                         |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Sense**           | The Daily Read — four dials, thirty seconds. Will Reserve as a gauge that is never a score. The keystone cascade, which warns on the first bad night rather than after the week is gone.                                                |
| **Act**             | Tasks shaped for a brain that shuts down facing forty of them: minute estimates, a small deliberate today, one Next Strike on the home screen. Gears at 25, 90 and 120 minutes with honest costs. Training with Returns.                |
| **Still**           | Stillness at five, ten or fifteen minutes, with a ring that breathes — Observation's counterpart to the Gears, and the only thing here that costs nothing at all.                                                                       |
| **Record**          | The Logbook, with a second door: one line, folded into today, asking nothing. Inherited Will. Export and import that merges and never deletes.                                                                                          |
| **The day**         | A course set for today or tomorrow and never marked. Six practices, each showing its offer rather than its absence. Hardening across four palettes, from paper to black, and the Sunny reading it back as a state and never a position. |
| **The journey**     | The Log Pose. One dream that never scales down, four to seven Road Poneglyphs beneath it, one island at a time under each — finish it or sail past it with a reason, and nothing counted against a total.                               |
| **The performance** | An emission on every strike, reaching further with consistency. Two-frame impact frames with black lightning. Ambient weather that starts once hardened. The Conqueror's burst, fired by exactly one thing. Seven sounds, sixty quotes. |

**Charted next**, roughly in the order they make sense:

1. **Setting Sail** — the Sunday ritual. Read the week, check the Flag, name
   the next island. Everything else in this app is data collection _for_ this,
   and it is the one thing that would make the Log Pose recalibrate on a
   rhythm rather than only when something closes.
2. **The Flag** — three to five values in your own words, and the thing a Road
   Poneglyph can be checked against. Small, and the only piece of Conqueror's
   from the concept doc still missing.
3. **The Zoro theme** — the field keeps the violence, the instrument becomes a
   sword. The seam is already cut; this is one file and a picker.
4. **Native.** The PWA has carried it this far, but iOS cannot do reliable
   notifications or a home-screen widget, and the Den Den Mushi taxonomy in
   the concept doc needs real notification channels.

And two debts worth naming. The ship and the fist are hand-plotted and it
shows — both carry a **REPLACING THIS DRAWING** contract so a proper redraw
drops in. And the web import ceiling moved rather than vanished: the old
"about six tasks corrupts everything" turned out to be a payload limit, fixed
by chunked transactions that yield between batches — twelve hundred rows now
import in seconds — but a multi-megabyte backup (a year of long entries) can
still wedge expo-sqlite's channel. Native does not share the limit, and import
is idempotent, so a partial import is completed by running the same file
again.
