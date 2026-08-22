# Haki — Concept v0.3

> Every other app tracks what you **did**. This one tracks the state of your **will**.

A private journal, habit forge, and mental-health instrument built for an audience of one.

## Decisions locked

|              |                                                                                                                                                                         |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Platform** | Phone-first. Expo (React Native) + expo-sqlite + Drizzle, local-first. Desktop via Expo Web later if wanted.                                                            |
| **Theme**    | **Haki mode is the default and is the real app.** Plain mode exists as a one-tap toggle for waiting rooms and screenshares — a label map and effects-off, nothing more. |

---

## The brief

> _"A man's dreams never die."_

This is not a general-purpose productivity app and should never be designed like one. It exists to keep one person pointed at their dreams and to catch the specific ways they come off track. Everything below is built from real observed failure, not from a feature list.

### Failure mode 1 — the cascade

Sleep slipped. Sleep breaks training. A full week of the gym gone.

Note what actually happened: **the gym was never the lever.** A normal habit app would show seven red marks on "gym" — which is both useless and shaming, because it names the symptom and misses the cause. The failure was upstream and it was mechanical.

**Keystone & Cascade.** One or two habits get marked as _keystone_, and downstream habits are explicitly linked to them. When a keystone destabilizes, the app fires **immediately** — on the first bad night, not on day three of missed training when the week is already gone.

> **This moves Foresight's core to v0, and I was wrong to put all of it at v3.** Mined patterns still need a year of history. But a _declared_ cascade needs none — the mechanism is already known, so it just gets typed in on day one. Ship it in the spine.

### Failure mode 2 — the comfort backslide

Lofty goals, then a slide once things get comfortable.

This inverts the usual design. Every productivity app is built to detect **struggle**. This one has to detect **coasting** — because a green, frictionless week is not a success signal here, it's the leading indicator of a backslide.

**The Calm Belt.** Windless water where a ship goes nowhere. When several days pass with no resistance logged and nothing hard attempted, the app says so:

> _Six days. No resistance logged, nothing hard attempted. Not a storm — a dead calm. This is the water you drift in._

The danger was never the storm. It's the windless week.

### Failure mode 3 — the return

A week off is a week off. The thing that decides whether it costs a week or a year is **how fast you come back** — and no habit app on earth tracks returning, because they're all built around never having left.

**The Return is a first-class event.** Coming back after a gap gets logged, counted, and weighted more heavily than an ordinary day. Your comeback time becomes a tracked number that gets shorter. Sabaody, then two years, then Sabaody again — the comeback _is_ the arc.

This also settles the Hardness model's job: it exists to make the return cheap. Zeroed streaks make the return feel pointless, which is precisely how one missed week becomes three.

### Failure mode 4 — unfinished projects

Distinct from consistency and needing its own machinery. Consistency is about showing up daily; finishing is about closing a loop that stays open for weeks. The same fix does not work on both.

The real cause is almost never a decision to quit. It's **silent drift** — you never choose to stop, you just stop, and the project stays technically open forever. So the mechanic has to convert drift into a decision.

**An island has an ending.** In One Piece you arrive, there's a conflict, it resolves, you leave. The Log Pose does not recalibrate until the island is done.

- **A hard WIP limit.** One active island per pillar. You physically cannot start a new project while one is open.
- **Finish or abandon — no third option.** Want to start something new? Either finish the open one or explicitly **abandon** it. Abandoning is a real, logged event with a reason, not a silent fade. It is always allowed and never shamed — but it must be _chosen_.
- **Open islands are always visible,** with days-at-sea on each. Most people who don't finish things have no idea how many open loops they're carrying. Showing the count is itself most of the intervention.
- **Bounty pays for finishing, not starting.** Starting is worth almost nothing. Completion is worth a lot. This deliberately inverts the dopamine of the shiny new project — and it's canon: the bounty raise and the newspaper article come _after_ the arc resolves, never during.

> **The meta-risk, said plainly:** this app is a project. It is exactly the kind of ambitious, exciting project that becomes number thirteen on the unfinished list — and the theming makes it _more_ dangerous, not less, because there's no end to how much of it there is to build.
>
> That's the real reason v0 is four screens and the rule is _use it for three weeks before writing more code._ Not craftsmanship — self-defense. **Write down what "done" means for v0 before starting it**, and treat that line as the finish line. If Haki can't be finished, it has no business telling you to finish anything else.

---

## Dreams stay lofty

The instinct after a backslide is to shrink the goal. **Don't.** That's the wrong lesson and it's the opposite of what you love about the source.

The dream stays enormous. The _unit of action_ shrinks:

- **Eternal Pose** — the dream. Never revised, never made "realistic," never scaled down for a bad month.
- **Log Pose** — points at the next island **only**. One milestone. It recalibrates when you arrive.

Lofty goals never caused the backslide. Acting on a lofty goal directly did, because there's no move that touches something that big — which is exactly what Armament Haki is for. Vague and enormous in; one concrete strikeable thing out.

## Inherited Will

> _"People don't die when they are shot. They die when they are forgotten."_

The most One Piece thing possible, and the most personal: a place for the people whose dreams you carry. Who they were, what they wanted, what of it you're carrying forward. Confirmed in, and shipped in v0 as a place to write it down; the surfacing logic (at Road Poneglyph milestones and at the weekly Setting Sail, never on a schedule) lands in v2 alongside the things it would surface against.

Chopper carries Hiluluk. Luffy carries Ace. The whole series argues that a dream outlives the person who held it, as long as someone keeps carrying it.

**Hard rule: memory is a source, never a stick.** The app must never use a person's memory to push, guilt, or "motivate" — no "they'd be disappointed," no grief on a streak-break screen, nothing that turns loss into a lever. It's there to be drawn from, and only ever on the days you choose to open it.

---

## The one idea worth stealing

In One Piece, Haki isn't a power you _have_. It's a capacity you develop — and it **runs out**. Luffy gases out.

That's the detail every productivity app gets wrong: they model willpower as unlimited and treat you as lazy when it isn't. Streaks reset to zero. Checkboxes stay unchecked and stare at you.

**Haki models will as a resource with a level, a burn rate, and a recovery curve.** The whole app exists to teach you yours — what fills it, what drains it, and what you reliably do when it's low.

That single reframe is what makes this a mental-health app rather than another habit tracker with a coat of paint on it.

### Rule for the theme

Every One Piece term has to earn its place by mapping to a real mechanic. If a name is just a reskinned "streak," cut the name. **Scaffolding, not costume.**

---

## Structure: the three Haki are the three lenses

The app has exactly three rooms. One is what comes in, one is what goes out, one is what it's all for. Nothing gets built that doesn't live in one of them.

### 見聞色 Kenbunshoku — Observation → _Sense_

> Canon: perceive presence, emotion, intent. At the highest level — see slightly into the future.

| Module            | What it is                                                                                                                                                     |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **The Log**       | Journaling, properly. Markdown, tags, backlinks, voice notes with transcription. Evernote-grade capture, no Evernote bloat.                                    |
| **Daily Read**    | Four dials — Energy, Mood, Clarity, Tension. Thirty seconds. The heartbeat of the whole app.                                                                   |
| **Inner Weather** | Grand Line weather turns with no warning; so does your head. You're not "good" or "bad" — you're squall, clearing by afternoon.                                |
| **Sea Prism Log** | Kairoseki nullifies power. Track your kryptonite: the people, hours, rooms, and thought-loops that take your will away.                                        |
| **Foresight** ⚡  | _Killer feature._ Advanced Observation sees seconds ahead. Having watched you for months, this sees **days** ahead — and warns you before the slip, not after. |

### 武装色 Busoshoku — Armament → _Act_

> Canon: harden yourself into armor. Also: the only way to strike something you otherwise cannot touch.

| Module                    | What it is                                                                                                                                                             |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Hardening** ⚡          | _Killer feature._ Habits to build — with **no streak counter**. Each habit has a Hardness %. Missing Tuesday cracks the armor; showing up Wednesday starts closing it. |
| **The Break List**        | Habits to quit, tracked by **urge**, not just failure. Log the craving the moment it lands. Resisting one is a recorded win — most apps only let you record the loss.  |
| **Strike the Intangible** | Armament's defining trick. Vague goal in ("be less anxious"), one concrete strikeable action out. Nothing vague is allowed to sit in this app.                         |
| **Gears**                 | Focus sessions with honest costs. Gear 2: 25-min sprint. Gear 3: 90-min deep work. Gear 4: maximum intensity — and then the app locks you out for the day.             |

### 覇王色 Haoshoku — Conqueror's → _Will_

> Canon: one in a million. Cannot be trained, only refined. It isn't effort — it's knowing exactly who you are.

| Module              | What it is                                                                                                                                                      |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **The Flag**        | Pirates raise a flag to declare what they stand for. Three to five values, in your words. Everything else can be checked against it.                            |
| **Road Poneglyphs** | Four long-horizon pillars. In canon, four of them triangulate the location of Laugh Tale. Here, progress across all four triangulates on yours.                 |
| **Log Pose**        | A Log Pose points to the next island only, then recalibrates on arrival. That's how goals should work. One next milestone per pillar — never a forty-item list. |
| **Eternal Pose**    | The one goal that never recalibrates. Your single non-negotiable.                                                                                               |
| **Setting Sail**    | The Sunday ritual: read the week, check the Flag, name the next island. Everything else in the app is data collection _for this_.                               |

---

## Connective tissue

- **Will Reserve** — the number on the home screen, derived from your Daily Read, your sleep, and what you spent today. Explicitly **not** a score to maximize — a fuel gauge to read.
- **Haki Exhaustion** — if the Reserve stays low for days while output stays high, the app says so out loud: _"You've been running on empty for six days. That isn't discipline, it's debt."_ No other productivity app will ever tell you to stop.
- **Bounty** — progression that rises for things that are hard _for you_, not for volume. Brushing your teeth is zero. Making the call you've dodged for three weeks is a lot. The framing: the world is starting to notice you're dangerous to the person you used to be. Wanted posters at thresholds.
- **Encounters** — a light log of who you saw and how it went. Loneliness is the largest untracked variable in most people's mental health, and it will show up in your correlations immediately.

---

## Haki Mode — what "lean heavy" actually means

Not labels. Mechanics and sensory design that could only exist in this app.

### The Den Den Mushi notification taxonomy

Canon already has a notification hierarchy; use it exactly as written. This is the single best piece of theming available, because it gives you an escalation channel that _means_ something.

| Snail       | Canon                           | In Haki                                                                                                                                                             |
| ----------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Regular** | Ordinary calls                  | Daily Read nudge, habit reminders. The purupuru you already have as a ringer.                                                                                       |
| **Black**   | Records without alerting anyone | Passive logging — health data, screen time, sleep. Never notifies.                                                                                                  |
| **White**   | Counters the Black              | Privacy mode / lock. Nothing is recorded while it's on.                                                                                                             |
| **Baby**    | Tracks the parent snail         | Background sync from your watch or health app.                                                                                                                      |
| **Golden**  | **Buster Call**                 | Reserved for exactly one thing: your Sea Prism Log hits a crisis pattern. Fires maybe twice a year. You will never ignore it, because it only ever means one thing. |

### The app loses its power when you do

The best idea in this document. When Will Reserve drops low, **the app's own Haki effects stop working.** The lightning doesn't fire. The armor renders dull and grey. Gear transitions don't animate. Nothing is disabled and nothing scolds you — the interface just visibly runs out of Haki alongside you.

Every other app describes your state in a chart. This one _embodies_ it. You'll feel it before you read a number.

### Armor you can see

- **Hardening** renders as literal Busoshoku coating. A habit at 20% Hardness is bare skin; at 100% it's full black sheen. Miss a day and a visible crack appears; return and it seals.
- **Ryuo** is the mastery tier — a habit held above 90% for 30+ days starts to flow red. Earned, rare, obvious at a glance.
- **Conqueror's burst** — black-violet lightning across the whole screen. Fires _only_ on a Road Poneglyph milestone or an Eternal Pose step. Maybe four times a year. If it fires weekly it's worthless; at four times a year it's electric.
- **Gear 5** — unlocked by a week where Will Reserve stayed **high** and output stayed high. Nika's power is joy and freedom, the literal opposite of grinding — so the app's most celebratory state is the reward for _sustainable_ excellence, never for burning yourself down. This is the anti-hustle mechanic and it's thematically perfect.

### The Ship

The Going Merry developed a Klabautermann because it was loved and cared for. **Your ship is your body and your space** — sleep, food, movement, the state of your room.

Care for it and it thrives. Neglect it and it visibly degrades. Anyone who's seen the Merry's send-off knows exactly what that mechanic means, and no wellness app on earth can land that emotional hit. This is the self-care module.

### Smaller ones

- **Log Pose** — a real animated compass on the goals screen. The needle spins and re-locks when you reach an island.
- **Ship's Log** — journal entries dated in _days at sea_ from the day you set sail.
- **Inner Weather** — your mood history rendered as an actual Grand Line weather map.
- **Devil Fruit** — name your defining strength _and_ what it costs you. Every power in One Piece has a price; naming yours is real self-knowledge. _"Hyper-focus — can't swim in unstructured days."_
- **Voice of All Things** — the gratitude prompt: "What spoke to you today?"
- **Wanted poster** — a real generated image at bounty thresholds (30M → 100M → 300M → 500M → 1.5B).

---

## What's actually novel

Journaling apps exist. Habit apps exist. Mood trackers are everywhere. Three things here don't exist together anywhere — these three _are_ the app, everything else is table stakes:

1. **Will as a depleting resource**, with an exhaustion warning that tells you to back off. Every competitor optimizes for more output, forever.
2. **Hardness instead of streaks.** Streaks are shame machines — one miss zeroes ninety days and you delete the app. Hardness dips and recovers. Mechanically faithful to Armament Haki _and_ it removes the worst failure mode in the category.
3. **Foresight** — warnings fired _before_ the slip. Declared cascades from day one, mined patterns once there's history.
4. **The Calm Belt** — an alarm for coasting. Everything else in the category only knows how to detect struggle, and congratulates you for the frictionless week that's actually the warning sign.
5. **The Return as a tracked skill.** Every other app is built around never having left, so none of them can help you on the one day that decides whether a gap costs a week or a year.
6. **Finish-or-abandon.** A WIP limit that converts silent drift into a logged decision, and a progression score that pays for completion rather than for starting.

---

## Non-negotiables

1. **No shame mechanics.** No red. No "you failed." No zeroed streaks. A miss is data, and the tone never changes when you have a bad week.
2. **Capture under ten seconds.** If logging takes longer, it won't happen at 11pm — which is exactly when it matters.
3. **The app should want you to leave.** No feed, no infinite scroll. Time-in-app is a cost, not a metric.
4. **Local-first and encrypted.** Works with no internet, exports to plain Markdown and JSON. Non-negotiable for a mental-health journal.
5. **Two speeds.** Usable in thirty seconds a day. Rewarding at twenty minutes. Never punishing for choosing the thirty seconds.
6. **It's for one person.** Ship ugly, ship fast, change it constantly. Don't build a single setting you'd only need if you had users.
7. **A green week is not automatically a good week.** Never congratulate frictionlessness. The app's job is to notice the dead calm, not to hand out a gold star for it.
8. **Memory is a source, never a stick.** Nothing in this app may use a person's memory to push, guilt, or motivate. It is drawn from on the days you choose to open it, and it never appears on a failure screen.

---

## Build order

The ordering matters more than the feature list. The temptation is to build the whole Haki system first because it's the exciting part — and that temptation is the same one that leaves projects unfinished.

**Definition of done for v0, written before a line of code:** you can open the app, log a Daily Read in under thirty seconds, write a journal entry, see your Will Reserve, and get a Den Den Mushi warning the morning after a bad night's sleep. That's the finish line. Nothing else counts, nothing else gets built, and v0 is _done_ when those five things work — not when it feels impressive.

|        | Stage       | Scope                                                                                                                                                                                                                                                                                                                  |
| ------ | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **v0** | The Spine   | Daily Read + The Log + Will Reserve + **sleep as a declared keystone with the training cascade wired to it.** Kanji nav, dark palette, Den Den Mushi nudge — identity is cheap and it's what makes you open the thing. Elaborate effects are not. Then **use it for three weeks before writing another line of code.** |
| **v1** | Armament    | Hardening habits, the Break List with urge logging, the Gears timer.                                                                                                                                                                                                                                                   |
| **v2** | Conqueror's | The Flag, Log Pose, Road Poneglyphs, the Setting Sail weekly ritual — the thing that converts six days of logging into a decision.                                                                                                                                                                                     |
| **v3** | Observation | Correlations, Inner Weather chart, the Foresight rules engine. Deliberately last; it needs history to say anything true.                                                                                                                                                                                               |
| **v4** | Reward      | Bounty, wanted posters, gear transitions, Conqueror's lightning, the Ship, Gear 5. Pure delight, zero utility — and the reason you'll still be using this in a year. Late, but not optional.                                                                                                                           |

_Anything not on this list is v5._

---

## Stack

**Expo (React Native) + expo-sqlite + Drizzle, local-first.** Entries stored as Markdown in the database, exportable to real files.

This app lives on a phone — check-ins and journaling happen in bed, on a walk, in a parked car. iOS can't do reliable notifications or home-screen widgets from a PWA, and a habit app without a widget and a nudge is one you stop opening in week three. The Den Den Mushi taxonomy above is only possible with real native notification channels. Desktop later via Expo Web if it's ever wanted.

Known cost of this choice: roughly 3× slower to iterate than a web build, and you need a device/build loop. Worth it here.

### Theming architecture

Build Haki mode as the real UI from day one. Plain mode is a **label map plus an effects kill-switch** — one `strings.plain.ts`, one `effectsEnabled` flag. Do not build two design systems; build one, with a mute button.

---

## Answered

_What's actually breaking right now?_ — **A sleep slip cascading into a lost week of training; backsliding once things get comfortable; and projects that stay open instead of getting finished.**

v0 is aimed directly at the first one, because it's the one with a known mechanism and it can be caught on day one. The Calm Belt lands in v1 with the habit engine. Finish-or-abandon lands in v2 with Log Pose, where it belongs.

Everything in this document should be read against those three. If a feature doesn't help with a cascade, a drift, or a finish, it's v5.
