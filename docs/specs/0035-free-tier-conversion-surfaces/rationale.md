# Rationale: 0035 free tier conversion surfaces

Decision history for spec 0035. Build contract lives in `index.md`.

## Context

The catalogue from spec 0033 sets Free plus a 7 day weekly pass plus a 5 month semester pass as the only offer, with plain counts and no Unlimited wording. Payment from spec 0034 runs through Fapshi with MTN first and Orange always present, calm waiting on PIN timeout, pending with recheck, receipt by email plus in app state.

What is missing is the path between free use and paid choice. Scope row 30 asks for free that works alone for notes plus quiz plus Tip within its counts, every limit notice naming the limit plus what weekly or semester adds, the prompt appearing when value is proven, the upgrade screen showing weekly and semester prices with mobile money marks visible, and notes staying open for a student who never pays. Research behind that row notes freemium converts near two percent near day 35, rest of world conversions land late and need reminders, and a soft pause at the moment of value beats a wall at the door.

The team is solo plus agents. The audience is Anglophone university students, phone first, living on 15000 to 25000 XAF a month. The upgrade must feel light like airtime. Habit must form before the ask. A missed webhook or a slow offer read must never lock study.

## Options considered

### Option 1: Inline plus page on KpiEvent with server day check

Inline notice at limit plus full upgrade page reusing the resolved offer, events as KpiEvent rows, server checks last prompt event for this user today in Africa Douala time to decide full or short form.

Pros:
1. No new table and no migration, smallest schema cost.
2. Server holds the once per day truth so clearing browser storage cannot spam.

Cons:
1. Every prompt needs a small read of recent events, one more query per limit hit.
2. Retry timing logic lives in app code not in a dedicated state row, so future complex journeys need rework.

### Option 2: Dedicated prompt state table

Add one UpgradePromptState row per user with last shown plus dismissed plus reminded flags, plus KpiEvent rows for admin counts.

Pros:
1. Once per day plus retry state is a single row read, fast and explicit.
2. Future journeys like streak or weekly digest have a clear home.

Cons:
1. New table plus migration plus unique handling for a solo team to own.
2. Two writes per prompt (state plus event) that can drift unless wrapped in care.

### Option 3: Client memory only

Keep last shown day in browser storage, server only logs events, no server gate.

Pros:
1. Least server code, no extra read on the hot path.

Cons:
1. Clearing storage or switching phones resets the quiet rule, so students see repeats.
2. Admin counts and actual prompt behavior can disagree, which hurts trust in the funnel.

## Rationale

The engineer chose reuse at every step: keep 0033 counts, reuse pricing copy, reuse KpiEvent, server side day check. Option 1 honors that with the least new surface. A dedicated table would make the state explicit but adds migration and dual write cost for a rule that is simply once per day plus one retry. Client memory only is cheapest but breaks the calm promise the moment storage clears. The extra event read is small, indexed by user plus time, and it keeps truth where admin counts already live.
