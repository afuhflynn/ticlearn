# 0033 rationale. Agentic quiz setup wizard

Decision record for spec 0033. Build spec lives in `index.md`.

## Context

> Premise note: This topic spans four related decisions in scope. This spec focuses on setup only. Runner docking, marking plus mark scheme, and reliability each need their own spec. Recommend separate specs for those three so each stays buildable.

Tip already runs quizzes inside chat through reused reply chips. That flow asks topic then count only, with no level, no format, no marks preview, and no clear Back plus Skip path. The reference flow shows three numbered steps with an inline Other box, an Or reply directly line, Skip plus Back plus Next, and a 1 of 3 pager. Students expect that shape now. Without it setup feels thin and stalls when a tap never comes. The consequence of not deciding is a second competing setup pattern beside the shipped one, which is how drift starts in this repo.

## Options considered

### Option 1: Fix in place

Extend the current reply chips flow with level and count steps, no new card.

**Pros**:

- Least code; reuses the shipped chips and snapshot keys.

**Cons**:

- Cannot match the approved reference layout with numbered rows plus inline Other plus pager.
- Chips stack tall on phones and push options past the thumb zone.

### Option 2: Strangler card beside chips

Build a new low docked wizard card that lives beside the old chips flow, cut over intent by intent, then retire the chips setup once proven.

**Pros**:

- Matches the reference placement low near the composer.
- Old flow keeps working while the new card proves itself; rollback is a flag flip.
- Snapshot extension is additive and versioned, so old snapshots still load.

**Cons**:

- Two setup paths coexist briefly, so tests must cover both until cutover.
- Slightly more code than a direct replace during the overlap window.

### Option 3: Direct replace

Delete the chips setup and ship only the wizard card.

**Pros**:

- One path only, no overlap to maintain.

**Cons**:

- Any gap in the new card blocks all chat quiz setup with no fallback.
- Harder to compare old versus new in production before commit.

## Rationale

The repo rule says a new abstraction must replace an existing one for a clear slice, not sit beside it forever. Strangler honors that while avoiding a risky cut. The wizard is UI heavy with pager plus Skip plus Back plus draft resume, so proving it beside the shipped chips keeps quiz setup working during the switch. Snapshot only storage keeps day 1 shippable with no migration, and the hybrid prefill keeps agency without handing flow control to the model.
