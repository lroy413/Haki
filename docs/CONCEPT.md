# Haki — Concept v0.1

> Every other app tracks what you **did**. This one tracks the state of your **will**.

A private journal, habit forge, and mental-health instrument built for an audience of one.

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
| **v0** | The Spine | Daily Read + The Log + Will Reserve on a home screen. Nothing else. Then **use it for three weeks before writing another line of code.** You can't design the rest until you have three weeks of your own data in it — not a delay, the requirement. |
| **v1** | Armament | Hardening habits, the Break List with urge logging, the Gears timer. |
| **v2** | Conqueror's | The Flag, Log Pose, Road Poneglyphs, the Setting Sail weekly ritual — the thing that converts six days of logging into a decision. |
| **v3** | Observation | Correlations, Inner Weather chart, the Foresight rules engine. Deliberately last; it needs history to say anything true. |
| **v4** | Reward | Bounty, wanted posters, gear transitions, Haki lightning. Pure delight, zero utility, do not build early. |

*Anything not on this list is v5.*

---

## Stack

**Recommendation: Expo (React Native) + SQLite + Drizzle, local-first.** Entries stored as Markdown in the database, exportable to real files.

The reasoning is boring but decisive: this app lives on a phone. Check-ins and journaling happen in bed, on a walk, in a parked car. iOS still can't do reliable notifications or home-screen widgets from a PWA, and a habit app without a widget and a nudge is one you stop opening in week three. One codebase gets a desktop build later via Expo Web.

**Honest alternative:** a Vite + React PWA with SQLite in the browser is ~3× faster to build and iterate on. If what you actually want is the *journaling* half far more than the *nudging* half, that's the better call.

---

## Open questions

1. **Phone-first or desktop-first?** Changes the stack, the build order, and roughly half the interaction design.
2. **How hard do we lean on the theme?** Full commitment (kanji, Den Den Mushi notifications, wanted posters) or a clean app that only whispers it, openable in a waiting room without explaining yourself?
3. **What's actually breaking right now?** The most useful design input available: what's the one thing you'd want this app to have caught last month?
