# Rationale for 0044. Generative card system low near composer

## Context

Tip runs quiz practice inside the chat thread today and the runner sits high in the message flow. Students on small phones must scroll past a tall history to reach options, and flashcards plus diagrams live on separate surfaces with separate controls. The scope row for this feature asks for one docked card family low above the reply box with dots plus Back plus Next plus hint so thumbs reach options without that scroll. Reference shots from a modern clean chat UI show a low docked question tool with numbered dots plus Back plus Next plus icon buttons with tooltip text, one item at a time, taps that answer at once, and reload that rebuilds the same spot. The repo already owns a low docked quiz runner from spec 0034, a scripted quiz flow from spec 0031, visual art from spec 0030, and a clean activity plus true answer split from spec 0043. This spec grows that base into one family without adding a parallel scoring history.

## Options considered

### Option 1: Grow the runner in place into one family

Extend `components/chat/quiz-runner.tsx` plus `lib/chat/quiz-snapshot.ts` to version 4 with an item list that holds quiz plus flashcard plus diagram items in one dots order, reuse the unified art read for diagrams, reuse the Radix tooltip primitive for icon buttons, and add two light backup endpoints plus a ChatRunBackup table for true resume.

**Pros**:
1. Smallest review surface because endpoints plus validation plus money rules stay untouched except the light backup pair.
2. One control model to learn and test across all three kinds.
3. True resume across devices with only one small table to operate.

**Cons**:
1. The runner file grows until a later split if the family gets heavy.
2. Backup sync adds a light write on every mark and move.

### Option 2: New docked family beside the runner

Build a fresh docked card shell plus three small card files for quiz plus flashcard plus diagram, keep the old runner for old runs, migrate incrementally, retire the old when proven.

**Pros**:
1. Clean files with no legacy snapshot baggage.
2. Old runs keep working untouched during rollout.

**Cons**:
1. Two patterns for the same job live side by side, which the repo rules forbid for a clear slice.
2. Larger review surface with duplicated dots plus Back plus Next logic to keep in sync.

### Option 3: Browser only with no server backup

Keep the version 4 snapshot browser only, skip the backup table and endpoints, accept that a new device starts fresh.

**Pros**:
1. Least new code with no migration to operate.
2. No extra write traffic at all.

**Cons**:
1. Loses the true resume the engineer asked for in this session.
2. Cleared storage loses the unsubmitted run with no second copy.

## Rationale

Option 1 fits the forces best. The repo rules ask that a new abstraction replace the old one for a clear slice rather than sit beside it, so growing the proven runner in place beats a parallel family. The engineer chose all three kinds in one family plus pinned low placement plus icon buttons with tooltip text plus inline diagrams in the same dots order, all of which the in place growth serves directly. Server backup answers the explicit ask for both browser plus server copies so reload restores on any device, while scoring still reuses the same QuizAttempt rows so history stays single. Reuse of the art read plus the tooltip primitive plus the loading plus live region patterns keeps new deps at zero and honors the boring technology rule.

## References

Omitted by choice. The engineer chose no references level so this record carries reasoning only with no citation tags and no links.
