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
the instrument owns the shape. Luffy's is a fist. Zoro's is a sword — a
promise this note carried for a long time before it was kept.

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

## Foresight, and the number that nearly shipped

The payoff 見聞色 was named for: the app has been collecting reads, sleep, sits,
sessions and struck tasks for months and had never once said what it could see
in them.

The engine is deliberately unclever. Every question has one shape — split the
days in two and compare the dial — because a difference of half a point on a
1–5 scale is a number the owner has already felt, and a correlation coefficient
is a number nobody has ever felt. Sleep gets in because `sleep_log` is keyed to
the morning you woke, so the night is always _before_ the day it is compared
against: the one direction in the whole engine that cannot be argued with, and
the app's founding failure mode besides.

**Then the simulation ran.** Before any of it reached a screen, a test threw
three hundred simulated lives at the engine in which nothing whatsoever was
related to anything. It reported a confident pattern on **254 of them.**

That is the whole story of this feature. The first version — a half-point
difference and a median sanity check — would have shipped something that
invented a rule about the owner's own mind roughly six times out of seven, and
handed it over with the authority of arithmetic. In a mental-health app that is
worse than shipping nothing. Nothing about the code looked wrong; it typechecked,
its unit tests passed, and its sentences read beautifully.

The fix is a Welch t across the two groups — a difference measured in units of
its own uncertainty, which unlike a raw gap scales with how noisy and how
numerous the days are. The threshold is **calibrated rather than tabulated**,
and that is the honest part: the textbook value would be a Bonferroni-corrected
critical value, which assumes each day is independent of the last, and daily
self-reports are nothing of the kind — a bad week is one event, not seven. So
the bar was raised by simulation until the engine kept its mouth shut. At
`MIN_T = 3.5` it speaks on 1 life in 300. A planted-signal test sits beside the
noise test so the gates can never simply be cranked until nothing survives.

Driven with a hundred days of synthetic history carrying exactly two real
signals buried in noise, it found exactly those two — sleep against energy,
sitting against clarity — and said nothing at all about training, tasks,
entries, mood or tension. Seventy days of pure noise gets _"nothing stands out
in them. That is an ordinary result."_

Two rules hold the copy. **It never claims a cause**: sitting on clear days and
being clear on days you sit look identical in this data, and `directionNote`
says so at the same weight as the finding rather than shrinking it into fine
print, because it is half of what is actually known. And **it never gives
advice** — the moment a readout starts recommending, it is a coach, and this
app does not have a coach in it. Both are tests.

The screen ends by explaining its own method in four lines. Somebody reading a
sentence about their own mind is owed the arithmetic that produced it, and an
engine that cannot explain itself in a paragraph has no business telling anyone
anything about themselves.

## Four small things from the comparison

The competitive read ranked ten possible features; the first three became the
rhythm, Setting Sail and Foresight. This pass took the next four — three
smalls and a medium, shipped together because each is one honest idea.

**The island's wake.** A task born from "Strike it" now remembers its island
(`island_key`, the same natural-key linking every child row here uses), so
the needle card shows what has been struck under the open island while the
work is happening, and the pillar screen stamps each astern island with what
it took — "14 struck · 6h 20m in its wake". Counts with no denominator: the
progress language the Log Pose is allowed, applied to the one question an
arrival always raises. An empty wake says nothing at all, because six
"nothing yet"s on a record screen is a scoreboard of absences.

**The breath, and the loud-day door.** The sit screen grew three two-minute
patterns under the sits — the long exhale, box, 4-7-8 — same ring, different
cadence, the cadence itself the caption. They write ordinary sit rows, so
the minutes count; at two minutes they sit deliberately under
`SAT_COUNTS_FROM`, so no pattern ever claims a day of sitting practice. And
when the Daily Read comes back clouded, the observation tab now offers one
exit: a Settle card whose tap lands you already breathing — `/sit?begin=settle`,
no second menu. Offered only on clouded days, because on any other day it
would be a nag about nothing.

**Naming the weather.** One optional word after the dials — Calm, Bright,
Swell, Overcast, Fog, Restless, Squall, Heavy. Sea weather rather than
emotion labels, because a squall is not a failure of the ocean. It engages
the faculty the dials cannot, stores as one nullable column, echoes quietly
on the practice card ("Logged · Squall"), and is never counted, streaked, or
read by Foresight — a word is not a dial, and the engine only speaks
arithmetic.

**A place for tomorrow, and the watches.** The capture row gained Tomorrow
between Carry today and Later — the night-before flow the course already
had — and every open task on today offers a one-tap Tomorrow beside Later,
because end-of-day stragglers deserve a kinder move than the backlog.
Tomorrow's list is a quiet disclosure that only exists while something is in
it, and at the day boundary it simply _becomes_ today: nothing moves, the
key under it changes meaning. And tasks can now take a watch — morning,
afternoon, evening, the day divided the way a crew divides it. Optional on
every task; the list grows watch headings only once something actually
carries one, so an unplaced day renders exactly the flat list it always was.

One repair went along: the backup validator required fields that older
backups could not have (a pre-rhythm export would have silently dropped
every task on import). New columns now validate as absent-or-null, which is
what "added later" honestly means.

## Zoro's flag

The theme seam was cut a long way back, when the impact frame was built: the
field owns the violence, the instrument owns the shape. Luffy's is a fist;
the note in `Fist.tsx` has said "Zoro's is a sword" ever since. This is that
note being cashed.

The owner set the terms: **his Haki is black and purple, and Conqueror's adds
the green** — and instead of Gears he has his sword styles. Both halves of
that turned out to matter. Because only 覇王色 changes colour, the swap is
_scoped_: the Journey tab, the Dream, the Flag and the burst turn Enma's
green, and 見聞色 stays violet, because Observation is violet under both
crews. A global find-and-replace would have turned the reading card and the
eyes green as well and lost the whole point.

The mechanism is one function. A crew carries a colour _key_ rather than a
colour — the palette moves through four levels and a hex would be right on
one of them — and `underCrew` applies that key to the palette once. The
Conqueror's screens go on writing `c.violet` and it now means "the lens's
colour", which is what they always meant. Six screens changed by one line
each.

The Gears become **一刀流 Ittoryu, 二刀流 Nitoryu, 三刀流 Santoryu** — one
blade, two, three — mapped onto the three lengths that already existed, by
commitment rather than by canon power level. And the load-bearing rule: **the
keys never move.** A session is `second | third | fourth` under either flag,
so a year logged as Gear 3 reads as Nitoryu the moment you switch and as Gear
3 again if you switch back. A theme that rewrote history would be a theme you
could not try.

Two things were caught by looking rather than by testing. The first sword ran
corner to corner and pushed both ends out of frame — which left a long grey
diagonal, a stick. What makes a katana legible at a glance is the _ends_: the
tsuba and the wrapped hilt at one, the angled kissaki at the other. The second
was that renaming the three cards left the word "gear" in every cost line
underneath them. Both are now the subject of a test — the second literally:
neither crew may speak the other's vocabulary.

## The flag, the depth, and a year ago today

Three from the chart, and what unites them is that all three are records
rather than mechanics — none of them can be won, and none of them counts
anything you did not do.

**The Flag** is the last piece of 覇王色 from the concept doc: pirates raise a
flag to say what they stand for, and then everything else can be checked
against it. Three to five values, in your own words, on one violet plate with
旗 riding its corner. It sits on the Journey tab directly under the Dream,
which is the order those two actually stand in — where you are going, then
what you sail under, then the fronts it takes.

It surfaces at exactly two moments and behaves differently at each. Naming a
Road Poneglyph, it **asks**: "does this front serve the flag?", with the
values on a violet rail beneath. There is no wrong answer, nothing records
what you decided, and naming the pillar anyway costs nothing — it is four
seconds of thinking against something you already wrote down. At Setting
Sail, it is **read** rather than asked; the ritual has enough decisions in it
already. And a value that no longer holds is deleted rather than retired —
the one place this app does not keep the record, because a list of former
values would be a monument to having changed your mind.

**Soundings** are for the islands that are numeric by nature — a savings
figure, a bodyweight, a word count — where done-or-not throws away everything
that happened in between. Give such an island a unit and it grows a depth: the
latest reading at display size, the line behind it drawn as a sparkline, and
the readings listed with their dates. What is deliberately absent is the whole
design: no target, and nowhere in the schema to put one; no delta, no pace, no
projection, because "up two this week" invites the question of whether that
was fast enough. **And no direction is good** — savings rising and a
bodyweight rising are the same event to this module, so nothing is coloured,
arrowed or worded by which way it went. There is a test for that specifically,
because a helpful green arrow is exactly the kind of thing that arrives in a
later pass and goes unnoticed.

**Astern in the log** is the feature the "memory is a source, never a stick"
law was written for. On a date an earlier year happens to have an entry, the
Logbook grows one dashed card: _A year ago today, you wrote:_ and the words.
Only years — a month ago is recent enough to remember, and the whole value is
the distance. That means it is invisible for the first year, which is correct
rather than a problem to solve with a shorter horizon. It counts nothing: not
the anniversaries, not the years kept up. It hands back one thing you wrote
and stops.

## The audit, and unequal chrome

Two jobs in one pass: prove the tracking, then earn the screens their looks.

The proof came first because it had to — polishing a card that miscounts is
paint on a wrong number. A scripted browser drove the whole day on a fake
clock: set a course, save a read, log a line, sit five minutes, run a gear,
strike a task, take a rhythm, log a session, name a dream, reach an island,
set sail, reload. Thirty-four assertions about what the screen says back, and
every one held. The only failures the audit ever produced were its own — a
selector that matched a hidden minute-chip on the tab scene still mounted
under a pushed screen — which is the right way round: the harness should be
the thing that breaks first.

Then the cards. Every container in the app had grown the same recipe —
surface fill, hairline border, glint along the top, six-point corners — and a
screen of them read as a template, because the day's identity card, a task
row and an untaken offer all carried identical weight. The fix was not more
chrome but _unequal_ chrome, written down once in `theme/surfaces.ts` as
three surfaces. A **plate** is raised: it keeps the specular glint and drops
a real shadow, from a new per-palette token — warm ink on paper, heavier
black as the ramp descends, because a shadow on a near-black ground has to
work harder to read as depth at all. A **row** is flat: no glint, no shadow —
working material, not an object. An **offer** is dashed and unfilled: a thing
that does not exist yet, which is the rhythm's whole model drawn instead of
explained — the standing offer sits dashed above the solid committed rows and
becomes one the moment it is taken.

Each screen now holds one or two plates and no more: the hardness readout,
the reserve, the reading, the dream — which got a faint 夢 riding its corner,
clipped by the card. Section labels grew a rule running off their end, so
"TRAINING ───" opens a region instead of captioning a box. The live island
in a needle card carries a violet rail down its left edge: the one part of
the card at sea rather than on record. And everything pressable now presses
the same way — a slight sink instead of a grey-out, because bare opacity
reads as disabled, and the difference between "acknowledged" and "broken" is
the whole reason the checkbox chapter above exists.

## Legible, and lit

Three notes in one message, and the first two were the same note: _"the app is
not reaching the bottom again… let's make sure the contrast is good, even with
my full brightness it was a little difficult for me to see."_

**The bottom, for the last time.** The dead band under the tab bar had already
been fixed once, by measuring the viewport with better units — and it came
back, because every unit that claims to be the height of the screen is
negotiable on iOS. A percentage resolves against a layout viewport that a
translucent status bar shrinks. `-webkit-fill-available` settles a frame late.
Even `dvh` is only as honest as the browser's idea of what is dynamic. Three
different answers to one question, and the app had now been wrong with two of
them.

So the shell stopped asking. The root is `position: fixed` pinned to all four
sides: placed against the viewport itself, no number to get wrong and no
reflow to be late for. Nothing here ever scrolled the document — every screen
scrolls inside its own view — so pinning costs nothing and closes the whole
class of bug. Verified pinned, with zero document overflow, on four viewports
from an SE to a Pro Max. And the shell now wears the day's ground rather than
a constant: hardening means the correct opening colour is a fact about your
day, so the app writes it down and the boot script paints it before the bundle
parses. On paper, every edge the phone keeps for itself used to be a black
seam.

**The contrast, with arithmetic.** The palettes had been held to a contrast
floor since the day they were written, so the honest thing was to check the
floor rather than the eyes. `inkFaint` — the colour under nearly every date,
unit, cadence and stat label in the app — measured **2.9:1** on the palette the
app spends most of its day in. That is under the minimum for _normal_ text, and
it was being set at ten and eleven points. Forty-two separate styles had reached
past the type scale to shrink something; each defensible alone, and the sum was
a squint.

Both halves were raised by solving rather than nudging: every ink and accent
was walked up its own lightness until it cleared 4.5:1 on all three grounds it
can sit on _and_ on the two tinted plates, then pinned there by tests that now
check surface2 and the soft tints as well. Nothing is set below eleven points
any more, and a guard test holds that too — with exactly one documented
exception, the five tab labels, which truncate at eleven and sit under a glyph
that is already doing the naming. The signature violet moved about four percent
lighter, which is the only visible change and is recorded in the test that pins
it.

**And the light.** _"I like some colors or glows that fit the Haki theming in
the appropriate places. Let's be creative."_

The app already had one idea about light: hardened Armament is glossy, so cards
catch a specular glint along their top edge that brightens as the day fills.
This extends that idea outward. A lens's identity plate now throws its own
colour into the air around it — the hardness readout burns crimson, the reading
violet, Foresight cyan, the Dream the king's violet. Same colours those lenses
already use for their own labels; the aura just says which Haki you are looking
at without writing the word.

Two rules keep it honest, and both are tested. **Paper catches nothing** —
level 0 returns no glow at all, because unhardened Haki does not shine and an
aura on parchment would say the opposite of everything the ramp says. And it
**grows with the day and stops there**: strength follows the hardening level,
the same curve the glint already climbs, and it is never a figure, a bar or a
count. You cannot read a score off a halo. Plain mode gets none of it — an aura
is a performance, and plain mode is the switch that stops the app performing.

The tab bar became the legend for all of it. Each tab now burns its own lens
colour when you are standing in it — the day and its record cyan, 見聞色 violet,
武装色 crimson, 覇王色 the signature violet, settings in plain ink because it is
not a lens — with the pill washed in that colour and the kanji itself lit. Each
screen's mark in its top corner wears the same light. One screen, one colour,
all the way from the glyph in the corner to the tab you arrived by.

## The settings archipelago

The owner asked for a modern settings screen — categories with their own pages
— and then for the direction it should grow: the settings should eventually
read as islands on the sea, the islands themselves the buttons. Since the hub
was being rebuilt anyway, it was built that way from the start.

The settings tab is now a chart. Six islands, each a category, each with its
own landmark drawn in the same stroke language as the Sunny: **Whose will** is
a peak flying a pennant in whatever colour 覇王色 currently burns — the one
spot of colour on the chart, because it is data. **Quiet** is a low atoll with
a palm, holding the two mute switches. **Daybreak** is a lighthouse, where the
day turns over. **Keystone** is a stone arch with the keystone set in its
crown. **Armament** is twin crags. **Your data** is a harbour with a jetty,
because it is where things are loaded on and off. A dashed course is pencilled
from island to island, and pressing anywhere in an island's band of sea goes
ashore to its page, which carries the same island small and becalmed at its
top.

The water is the Sunny's own — same `swellPath`, same swell-by-hardening
amounts, exported from `instruments/Sea.tsx` rather than copied — so the chart
is flat calm on paper and running in the settled dark, and the two screens can
never disagree about the weather. The water pools around each island rather
than ruling across the screen, because six stacked full-width waterlines read
as a ledger, which is exactly the template the chart exists to escape. The
landmasses live in `instruments/Isles.tsx` behind the usual REPLACING THESE
DRAWINGS contract; the row, the water and the plotted course are the system,
in `IslandRow.tsx`.

Plain mode gets no archipelago: the same six categories render as a plain
list, same order, same pages. The pages themselves are the old settings
cards, one category each — the crew picker, the two switches, the day-start
stepper, the keystone and training forms, the backup card — with save buttons
that now say "Saved" until you edit again, since on a pushed page you save
and leave.

## Where it stands

**Live at [haki-lac.vercel.app](https://haki-lac.vercel.app).** Twenty-six
pull requests merged, 704 tests, one principle held everywhere: the app
rewards the act and never punishes the absence.

What is actually in it:

|                     |                                                                                                                                                                                                                                                                               |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Sense**           | The Daily Read — four dials, thirty seconds. Will Reserve as a gauge that is never a score. The keystone cascade, which warns on the first bad night rather than after the week is gone.                                                                                      |
| **Act**             | Tasks shaped for a brain that shuts down facing forty of them: minute estimates, a small deliberate today, one Next Strike on the home screen. Gears at 25, 90 and 120 minutes with honest costs. Training with Returns.                                                      |
| **Still**           | Stillness at five, ten or fifteen minutes, with a ring that breathes — Observation's counterpart to the Gears, and the only thing here that costs nothing at all.                                                                                                             |
| **Record**          | The Logbook, with a second door: one line, folded into today, asking nothing. Inherited Will. Export and import that merges and never deletes.                                                                                                                                |
| **The day**         | A course set for today or tomorrow and never marked. Six practices, each showing its offer rather than its absence. Hardening across four palettes, from paper to black, and the Sunny reading it back as a state and never a position.                                       |
| **The journey**     | The Log Pose. One dream that never scales down, the Flag it sails under, four to seven Road Poneglyphs beneath it, one island at a time under each — finish it or sail past it with a reason, soundings on the ones that carry a number, and nothing counted against a total. |
| **The week**        | Setting Sail: the week read back, every needle looked at once, one heading named. And the rhythm — things that come back round, creating nothing until taken, so a day you let one pass leaves nothing behind.                                                                |
| **The reading**     | Foresight: two kinds of day compared, and the difference reported only when it outruns the scatter. Calibrated by simulation to stay quiet — it never claims a cause and never gives advice.                                                                                  |
| **Settings**        | A chart: six islands, each a category with its own page, the course pencilled between them, the whole archipelago on the Sunny's own sea. Plain mode folds it into a list.                                                                                                    |
| **The performance** | An emission on every strike, reaching further with consistency. Two-frame impact frames with black lightning. Ambient weather that starts once hardened. The Conqueror's burst, fired by exactly one thing. Seven sounds, sixty quotes.                                       |

**Charted next**, roughly in the order they make sense:

1. **Native.** The PWA has carried it this far, but iOS cannot do reliable
   notifications or a home-screen widget, and the Den Den Mushi taxonomy in
   the concept doc needs real notification channels.
2. **The Eternal Pose** — the concept doc's one goal that never recalibrates,
   still unbuilt and still arguably covered by the Dream. Worth deciding
   about rather than leaving on a list.
3. **Encounters** — a light log of who you saw and how it went. The concept
   doc's own argument for it is that loneliness is the largest untracked
   variable in most people's mental health, and Foresight now exists to find
   it if it is there.

And the Gears are still parked on `/gears`, waiting on the page the owner has
a clearer vision for than this record does: Haki is will, a Devil Fruit is
ability, and the ability page is the career one. Nothing about it is designed
yet, and that is the correct amount.

And two debts worth naming. The ship and the fist are hand-plotted and it
shows — both carry a **REPLACING THIS DRAWING** contract so a proper redraw
drops in. And the web import ceiling moved rather than vanished: the old
"about six tasks corrupts everything" turned out to be a payload limit, fixed
by chunked transactions that yield between batches — twelve hundred rows now
import in seconds — but a multi-megabyte backup (a year of long entries) can
still wedge expo-sqlite's channel. Native does not share the limit, and import
is idempotent, so a partial import is completed by running the same file
again.
