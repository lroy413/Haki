# Haki — Concept v0.2

> Every other app tracks what you **did**. This one tracks the state of your **will**.

A private journal, habit forge, and mental-health instrument built for an audience of one.

## Decisions locked

| | |
|---|---|
| **Platform** | Phone-first. Expo (React Native) + expo-sqlite + Drizzle, local-first. Desktop via Expo Web later if wanted. |
| **Theme** | **Haki mode is the default and is the real app.** Plain mode exists as a one-tap toggle for waiting rooms and screenshares — a label map and effects-off, nothing more. |

---

## The one idea worth stealing

In One Piece, Haki isn't a power you *have*. It's a capacity you develop — and it **runs out**. Luffy gases out.

That's the detail every productivity app gets wrong: they model willpower as unlimited and treat you as lazy when it isn't. Streaks reset to zero. Checkboxes stay unchecked and stare at you.

**Haki models will as a resource with a level, a burn rate, and a recovery curve.** The whole app exists to teach you yours — what fills it, what drains it, and what you reliably do when it's low.

That single reframe is what makes this a mental-health app rather than another habit tracker with a coat of paint on it.

### Rule for the theme

Every One Piece term has to earn its place by mapping to a real mechanic. If a name is just a reskinned "streak," cut the name. **Scaffolding, not costume.**

---

## Structure: the three Haki are the three lenses

The app has exactly three rooms. One is what comes in, one is what goes out, one is what it's all for. Nothing gets built that doesn't live in one of them.

### 見聞色 Kenbunshoku — Observation → *Sense*

> Canon: perceive presence, emotion, intent. At the highest level — see slightly into the future.

| Module | What it is |
|---|---|
| **The Log** | Journaling, properly. Markdown, tags, backlinks, voice notes with transcription. Evernote-grade capture, no Evernote bloat. |
| **Daily Read** | Four dials — Energy, Mood, Clarity, Tension. Thirty seconds. The heartbeat of the whole app. |
| **Inner Weather** | Grand Line weather turns with no warning; so does your head. You're not "good" or "bad" — you're squall, clearing by afternoon. |
| **Sea Prism Log** | Kairoseki nullifies power. Track your kryptonite: the people, hours, rooms, and thought-loops that take your will away. |
| **Foresight** ⚡ | *Killer feature.* Advanced Observation sees seconds ahead. Having watched you for months, this sees **days** ahead — and warns you before the slip, not after. |

### 武装色 Busoshoku — Armament → *Act*

> Canon: harden yourself into armor. Also: the only way to strike something you otherwise cannot touch.

| Module | What it is |
|---|---|
| **Hardening** ⚡ | *Killer feature.* Habits to build — with **no streak counter**. Each habit has a Hardness %. Missing Tuesday cracks the armor; showing up Wednesday starts closing it. |
| **The Break List** | Habits to quit, tracked by **urge**, not just failure. Log the craving the moment it lands. Resisting one is a recorded win — most apps only let you record the loss. |
| **Strike the Intangible** | Armament's defining trick. Vague goal in ("be less anxious"), one concrete strikeable action out. Nothing vague is allowed to sit in this app. |
| **Gears** | Focus sessions with honest costs. Gear 2: 25-min sprint. Gear 3: 90-min deep work. Gear 4: maximum intensity — and then the app locks you out for the day. |

### 覇王色 Haoshoku — Conqueror's → *Will*

> Canon: one in a million. Cannot be trained, only refined. It isn't effort — it's knowing exactly who you are.

| Module | What it is |
|---|---|
| **The Flag** | Pirates raise a flag to declare what they stand for. Three to five values, in your words. Everything else can be checked against it. |
| **Road Poneglyphs** | Four long-horizon pillars. In canon, four of them triangulate the location of Laugh Tale. Here, progress across all four triangulates on yours. |
| **Log Pose** | A Log Pose points to the next island only, then recalibrates on arrival. That's how goals should work. One next milestone per pillar — never a forty-item list. |
| **Eternal Pose** | The one goal that never recalibrates. Your single non-negotiable. |
| **Setting Sail** | The Sunday ritual: read the week, check the Flag, name the next island. Everything else in the app is data collection *for this*. |

---

## Connective tissue

- **Will Reserve** — the number on the home screen, derived from your Daily Read, your sleep, and what you spent today. Explicitly **not** a score to maximize — a fuel gauge to read.
- **Haki Exhaustion** — if the Reserve stays low for days while output stays high, the app says so out loud: *"You've been running on empty for six days. That isn't discipline, it's debt."* No other productivity app will ever tell you to stop.
- **Bounty** — progression that rises for things that are hard *for you*, not for volume. Brushing your teeth is zero. Making the call you've dodged for three weeks is a lot. The framing: the world is starting to notice you're dangerous to the person you used to be. Wanted posters at thresholds.
- **Encounters** — a light log of who you saw and how it went. Loneliness is the largest untracked variable in most people's mental health, and it will show up in your correlations immediately.

---

## Haki Mode — what "lean heavy" actually means

Not labels. Mechanics and sensory design that could only exist in this app.

### The Den Den Mushi notification taxonomy

Canon already has a notification hierarchy; use it exactly as written. This is the single best piece of theming available, because it gives you an escalation channel that *means* something.

| Snail | Canon | In Haki |
|---|---|---|
| **Regular** | Ordinary calls | Daily Read nudge, habit reminders. The purupuru you already have as a ringer. |
| **Black** | Records without alerting anyone | Passive logging — health data, screen time, sleep. Never notifies. |
| **White** | Counters the Black | Privacy mode / lock. Nothing is recorded while it's on. |
| **Baby** | Tracks the parent snail | Background sync from your watch or health app. |
| **Golden** | **Buster Call** | Reserved for exactly one thing: your Sea Prism Log hits a crisis pattern. Fires maybe twice a year. You will never ignore it, because it only ever means one thing. |

### The app loses its power when you do

The best idea in this document. When Will Reserve drops low, **the app's own Haki effects stop working.** The lightning doesn't fire. The armor renders dull and grey. Gear transitions don't animate. Nothing is disabled and nothing scolds you — the interface just visibly runs out of Haki alongside you.

Every other app describes your state in a chart. This one *embodies* it. You'll feel it before you read a number.

### Armor you can see

- **Hardening** renders as literal Busoshoku coating. A habit at 20% Hardness is bare skin; at 100% it's full black sheen. Miss a day and a visible crack appears; return and it seals.
- **Ryuo** is the mastery tier — a habit held above 90% for 30+ days starts to flow red. Earned, rare, obvious at a glance.
- **Conqueror's burst** — black-violet lightning across the whole screen. Fires *only* on a Road Poneglyph milestone or an Eternal Pose step. Maybe four times a year. If it fires weekly it's worthless; at four times a year it's electric.
- **Gear 5** — unlocked by a week where Will Reserve stayed **high** and output stayed high. Nika's power is joy and freedom, the literal opposite of grinding — so the app's most celebratory state is the reward for *sustainable* excellence, never for burning yourself down. This is the anti-hustle mechanic and it's thematically perfect.

### The Ship

The Going Merry developed a Klabautermann because it was loved and cared for. **Your ship is your body and your space** — sleep, food, movement, the state of your room.

Care for it and it thrives. Neglect it and it visibly degrades. Anyone who's seen the Merry's send-off knows exactly what that mechanic means, and no wellness app on earth can land that emotional hit. This is the self-care module.

### Smaller ones

- **Log Pose** — a real animated compass on the goals screen. The needle spins and re-locks when you reach an island.
- **Ship's Log** — journal entries dated in *days at sea* from the day you set sail.
- **Inner Weather** — your mood history rendered as an actual Grand Line weather map.
- **Devil Fruit** — name your defining strength *and* what it costs you. Every power in One Piece has a price; naming yours is real self-knowledge. *"Hyper-focus — can't swim in unstructured days."*
- **Voice of All Things** — the gratitude prompt: "What spoke to you today?"
- **Wanted poster** — a real generated image at bounty thresholds (30M → 100M → 300M → 500M → 1.5B).

---

## What's actually novel

Journaling apps exist. Habit apps exist. Mood trackers are everywhere. Three things here don't exist together anywhere — these three *are* the app, everything else is table stakes:

1. **Will as a depleting resource**, with an exhaustion warning that tells you to back off. Every competitor optimizes for more output, forever.
2. **Hardness instead of streaks.** Streaks are shame machines — one miss zeroes ninety days and you delete the app. Hardness dips and recovers. Mechanically faithful to Armament Haki *and* it removes the worst failure mode in the category.
3. **Foresight** — warnings fired *before* the slip, from your own history. Not AI magic, just correlation over your data surfaced when it can still change something.

---

## Non-negotiables

1. **No shame mechanics.** No red. No "you failed." No zeroed streaks. A miss is data, and the tone never changes when you have a bad week.
2. **Capture under ten seconds.** If logging takes longer, it won't happen at 11pm — which is exactly when it matters.
3. **The app should want you to leave.** No feed, no infinite scroll. Time-in-app is a cost, not a metric.
4. **Local-first and encrypted.** Works with no internet, exports to plain Markdown and JSON. Non-negotiable for a mental-health journal.
5. **Two speeds.** Usable in thirty seconds a day. Rewarding at twenty minutes. Never punishing for choosing the thirty seconds.
6. **It's for one person.** Ship ugly, ship fast, change it constantly. Don't build a single setting you'd only need if you had users.

---

## Build order

The ordering matters more than the feature list. The temptation is to build Foresight first because it's the exciting part. It's last, because it's worthless without a year of you in the database.

| | Stage | Scope |
|---|---|---|
| **v0** | The Spine | Daily Read + The Log + Will Reserve on a home screen. Kanji navigation, the dark palette, and the Den Den Mushi nudge sound ship here — identity is cheap and it's what makes you open the thing. Elaborate effects do not. Then **use it for three weeks before writing another line of code.** You can't design the rest until you have three weeks of your own data in it — not a delay, the requirement. |
| **v1** | Armament | Hardening habits, the Break List with urge logging, the Gears timer. |
| **v2** | Conqueror's | The Flag, Log Pose, Road Poneglyphs, the Setting Sail weekly ritual — the thing that converts six days of logging into a decision. |
| **v3** | Observation | Correlations, Inner Weather chart, the Foresight rules engine. Deliberately last; it needs history to say anything true. |
| **v4** | Reward | Bounty, wanted posters, gear transitions, Conqueror's lightning, the Ship, Gear 5. Pure delight, zero utility — and the reason you'll still be using this in a year. Late, but not optional. |

*Anything not on this list is v5.*

---

## Stack

**Expo (React Native) + expo-sqlite + Drizzle, local-first.** Entries stored as Markdown in the database, exportable to real files.

This app lives on a phone — check-ins and journaling happen in bed, on a walk, in a parked car. iOS can't do reliable notifications or home-screen widgets from a PWA, and a habit app without a widget and a nudge is one you stop opening in week three. The Den Den Mushi taxonomy above is only possible with real native notification channels. Desktop later via Expo Web if it's ever wanted.

Known cost of this choice: roughly 3× slower to iterate than a web build, and you need a device/build loop. Worth it here.

### Theming architecture

Build Haki mode as the real UI from day one. Plain mode is a **label map plus an effects kill-switch** — one `strings.plain.ts`, one `effectsEnabled` flag. Do not build two design systems; build one, with a mute button.

---

## Open question

**What's actually breaking right now?** The most useful design input available: what's the one thing you'd want this app to have caught last month? Build v0 aimed at that, and the rest of the spec writes itself.
