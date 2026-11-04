# 0044. Generative card system low near composer

**Date**: `2026-11-03`
**Status**: In Progress

## Summary

Tip keeps quiz practice high in the thread today so thumbs must scroll past a tall history to answer. This spec docks one card family low above the reply box for quiz plus flashcards plus diagrams in the same dots order. One item shows at a time with dots plus icon buttons for Back plus Next plus hint, taps lock at once, reload restores the same spot on any device through a light server backup.

## Requirements

**User stories**:
1. As a student, I want quiz plus flashcards plus diagrams in one low dock so my thumbs reach options without scrolling past a tall thread.
2. As a student on a small phone, I want one item at a time with dots plus Back plus Next plus hint so I can move freely and check hints without losing answers.
3. As a student with shaky network, I want taps to lock at once and survive reload plus stopped streams so no tap is ever lost.

**Acceptance criteria**:
1. **AC-1**: The runner pins low above the composer in normal flow on phone and desktop, matches the thread column width, sits directly above the composer with no overlap, and matches the approved reference shots shared for this feature.
2. **AC-2**: The card shows one item at a time with numbered dots plus Back plus Next plus Show hint, built as clean icon buttons with tooltip text on hover and focus.
3. **AC-3**: Dots show the spot in the set and jump on tap with answers kept. Back plus Next move freely with unanswered items left open for later.
4. **AC-4**: A tap locks the option at once locally and grades in background. The student can move on instantly with no stall.
5. **AC-5**: Reload rebuilds the same spot with answers plus marks plus current index plus hint open plus minimized state, from the browser snapshot first and the server backup when present.
6. **AC-6**: A stopped stream or a failed grade keeps the tap in the snapshot with a plain retry line placed directly under the question. No tap is dropped.
7. **AC-7**: Each quiz item carries its own short hint string. Show hint reveals it in place. The control hides when the hint is empty.
8. **AC-8**: A flashcard item hides options on the front but stays answerable by tap on numbered ghost targets or typed letter for choice items or by text box for open items. The front shows the question plus the text box plus the ghost targets. The back reveals the correct answer plus the short why after the mark lands.
9. **AC-9**: A diagram item in the same dots order points to a VisualArtifact row plus caption plus alt text, renders from the unified read, and on failed art shows caption plus text steps with plain notice plus retry so the answer never blocks.
10. **AC-10**: On a small phone the card caps at 52vh max height with inner scroll for long options while Back plus Next plus hint plus dots stay pinned below with no layout jump.
11. **AC-11**: Keyboard plus screen reader plus reduced motion all work. Dots plus Back plus Next plus hint sit in a clear focus order, score changes use the existing live region pattern, motion honors the reduced motion setting, tooltips read on focus.
12. **AC-12**: Submit writes the same QuizAttempt rows the quiz page writes with source chat plus conversation id plus client run id. Quiz plus flashcard items use the same answers array shape and count toward score and points. Diagram items ride in the same dots order but stay unscored with zero points. Client run id is made client side as a random id string per run. Duplicate run id returns the existing attempt plus duplicate true with no new row.

## Decision

**Chosen option**: Option 1: grow the runner in place into one family

Grow `components/chat/quiz-runner.tsx` plus `lib/chat/quiz-snapshot.ts` to hold quiz plus flashcard plus diagram items in one dots order, with two light backup endpoints for true resume. No new tables for scoring, no parallel history.

## Rationale

Reasoning and options: see rationale.md.

## Feature design

**Data model sketch**:
1. QuizSnapshot browser only version 4 in `lib/chat/quiz-snapshot.ts`. Keep all version 3 fields such as version plus quizId plus answers plus marks plus currentIndex plus count plus clientRunId plus updatedAt plus mode plus hint open map plus minimized flag. Add item list where each item has kind quiz or flashcard or diagram plus question id plus artifact id optional for diagram items. QuizQuestion read shape carries hint capped at 140 chars plus explanation for the back face. Old version 2 and 3 snapshots load with defaults for the new fields.
2. VisualArtifact existing rows for diagram items. Each diagram item stores artifact id plus caption plus alt text in the snapshot item. Reads resolve through the unified art read by note id or answer id. Rows stay immutable after create.
3. QuizAttempt existing rows for scoring. Add no columns. Submit sends quizId plus answers array plus source hint chat plus conversationId plus clientRunId. Server allowlists the hint to chat or page and writes the final value.
4. ChatRunBackup new server rows for true resume. Fields: id String primary key plus userId String owner plus conversationId String plus clientRunId String unique plus snapshot JSON Text plus updatedAt timestamp. Indexes on userId plus conversationId plus clientRunId. Rows clear on submit plus on close plus on a new run. Keep time is 7 days after the last write. Snapshot JSON caps at 200 KB. Writes pace to at most one per 2 seconds with last write wins when browser and server differ. Offline backup writes skip quietly and keep the browser copy, then retry on the next mark or move.

**Item build rule**:
The setup step asks for the mix choice quiz only or mixed quiz plus flashcards or full family with diagrams plus the count. Generate returns one item per requested slot in fixed order quiz items first then flashcard items then diagram items. Each item carries kind plus question id plus artifact id for diagram items only. Counts come from the setup count choice. This rule breaks the circle so the snapshot item list has one clear author.
**State transitions**:
1. Run phases stay as built: setup then generating then answering then marked then complete plus error. Nothing stored in the database mid run except the light backup copy.
2. Dock states: open then minimized then closed. The X control minimizes to a slim bar with a Restore button. A menu Close clears the run. Minimized keeps the snapshot plus the active pointer plus the server backup. New runs start from setup submit or a suggested reply new run or the Retake button and clear the prior snapshot plus pointer plus backup.
3. Per item states: unanswered then grading then marked, with failed grade as marked false plus a retry line reading Try marking again placed directly under the question. Retry is manual tap only.
4. Snapshot writes on every mark plus every index move plus every mode change plus every hint open plus every minimize. Submit plus close plus a new run clear it.

**API surface**:
1. Existing generate POST with noteId plus count plus types fixed to mixed plus timed false. Returns quiz id plus questions with per question hint. Auth bearer owner. Errors 401 plus 400 plus 402 plus 403. Satisfies **AC-7**.
2. Existing quiz read GET by quiz id. Returns quiz with questions. Auth bearer owner. Errors 401 plus 404. Satisfies **AC-1** plus **AC-3**.
3. Existing grade open answer POST with questionId plus question plus type plus userAnswer plus correctAnswer plus options. Returns correct or not plus short why. Auth bearer owner. Errors 401 plus 400. Satisfies **AC-4** plus **AC-6**.
4. Existing attempts submit POST with quizId plus answers array plus source hint chat plus conversationId plus clientRunId. Returns attempt plus score plus points plus duplicate flag when the run id repeats. Auth bearer owner. Errors 401 plus 400 plus 404 plus 422. Satisfies **AC-12**.
5. New backup upsert POST at `/api/chat/runs/backup` with conversationId plus clientRunId plus snapshot JSON. Returns ok plus updatedAt. Auth bearer owner. Errors 401 plus 400 plus 404 on foreign conversation. Satisfies **AC-5**.
6. New backup read GET at `/api/chat/runs/backup` with conversationId plus clientRunId query. Returns snapshot JSON or missing. Auth bearer owner. Errors 401 plus 400 plus 404 on foreign id. Satisfies **AC-5**.

No other new routes. Client sends the same shapes as spec 0031. Server allowlists source hint to chat or page and writes the final value, as today.

**Value sourcing**:
1. Dock placement plus pinned card plus thread width: source layout in `components/chat/chat-thread.tsx` plus `components/chat/quiz-runner.tsx`, no new data.
2. One item text plus options: source the item build rule plus the existing quiz read by quizId. The build rule sets kind plus order plus counts, the quiz read supplies text plus options plus hint per slot.
3. Dots spot plus jump target: source currentIndex plus item count from snapshot plus thread state.
4. Back plus Next moved spot: source currentIndex in snapshot clamped to range, free move with answers kept.
5. Hint text per item: source QuizQuestion hint field capped at 140 chars, model writes it, server trims and caps, whitespace only counts as empty and hides the control.
6. Flashcard front plus back: source same question plus options plus mark result plus question explanation from generate output. Front shows question plus text box plus numbered ghost targets for hidden options and stays answerable. Back reveals correct answer plus explanation after mark.
7. Diagram art plus caption plus alt text: source VisualArtifact row by artifact id through the unified read, caption written by the model per item and stored in the snapshot item, alt text from the artifact row, text steps beside art from the answer context. Art retry refetches the unified read, grade retry reposts the grade, each with its own control.
8. Tap locked answer: source option tap or typed letter mapped positionally, open answers from text box, same mapping as spec 0031.
9. Grade correct or not plus short why: source choice positional match locally plus question explanation from generate output for choice items, open answers through grade endpoint with same task plus timeout plus cost as page.
10. Score running correct count: source marks record in snapshot read as correct count among marked scored items. Denominator is total scored items only, quiz plus flashcard, diagrams excluded. Display reads Item X of N plus Y correct so far. The live region announces the same sentence on every mark.
11. Reload restored spot: source active pointer plus snapshot replay in sessionStorage version 4 with defaults for old rows, server backup JSON when present for a new device. Last write wins per run id when copies differ. Backup writes pace to one per 2 seconds. Offline backup writes skip and retry on the next mark or move.
12. Money caps plus debits: source PlatformSettings plus credit rows identical to page flow from spec 0031, over cap shows the page style plain message.

**Key invariants**:
1. Chat runs write the same rows as page runs. No parallel history.
2. Retrieval first: the student answers before Tip explains, every item.
3. Taps lock locally at once. Grade runs in background and never blocks movement.
4. Snapshot writes on mark plus move plus hint open plus minimize plus backup sync. Submit plus close plus a new run clear all copies.
5. Free movement: Back plus Next never force an answer. Unanswered stays open.
6. One family: quiz plus flashcard plus diagram items share the same dots plus Back plus Next plus hint. No separate tabs in v1.
7. Card caps at 52vh max height on small phones under 640px width with the options region scrolling inside while dots plus Back plus Next plus hint stay pinned below. No spinner outside a button that performs the student action.
8. Option controls plus dots are real buttons with tooltip text that reads on hover plus focus. Tooltip copy is fixed: Back means Go to previous card, Next means Go to next card, Show hint means Show hint for this card, Close means Minimize the dock. Score changes announce Item X of N plus Y correct so far through the existing live region pattern. Focus moves to the question heading on jump.
9. Loading follows the repo loading rule: shape matched skeleton owned by the runner for the first card area plus dots, thin progress while grading, fixed ratio skeleton while diagram art loads, plain notice plus retry on failure.
10. Concurrent tabs count as separate runs. A new tab mints a fresh client run id so backup keys never collide and last write wins applies per run id only.
11. Timed runs do not exist. No clock is shown and no cutoff enforced.
12. Owner only throughout. Every run call checks session plus note plus attempt plus conversation ownership exactly like the page routes.

**Security model**:
Owner only throughout, same as spec 0031. Every run plus backup call checks session plus note plus attempt plus conversation ownership. Foreign ids read as missing with 404 and no data. No shared threads, no public run reads. SVG plus Mermaid markup passes DOMPurify before store and render output is sanitized again after render. No new personal data. Study content the student already owns.

**Configuration required**:
No new env vars. No new providers. No new deps. Reuse `mermaid` plus `dompurify` from spec 0030 and the shared tooltip primitive for icon buttons. Snapshot version bump to 4 local to the browser plus one migration for the backup table.

**Critical test scenarios**:
1. Happy path: open dock low above composer, answer one by tap, dots jump with answers kept, Back plus Next free move, hint reveals, flashcard flips after mark, diagram item renders art, submit writes attempt rows with source chat, verifies **AC-1** through **AC-4** plus **AC-7** through **AC-9** plus **AC-12**.
2. Reload plus new device: reload mid run restores spot plus answers plus marks plus hint plus minimized, new device restores from server backup, minimize plus reopen restores, verifies **AC-5**.
3. Failure plus stop: failed grade keeps tap with retry line, stopped stream loses nothing, failed diagram shows text plus retry with answer intact, verifies **AC-6** plus **AC-9**.
4. Layout plus access: small phone caps height with inner scroll, desktop matches thread column, keyboard path plus live score plus tooltips on focus plus reduced motion all pass, verifies **AC-10** plus **AC-11**.
5. Auth plus money: foreign note or attempt or backup id receives not found, generation debit plus caps behave identically for dock and page runs, verifies **AC-12**.

## Build plan

Tracer Bullet: a thin docked family thread first, then depth, then hardening.

1. Docked shell plus one item plus dots plus Back plus Next icon buttons with tooltip text pinned above the composer in flow matching thread column width on phone and desktop, satisfies **AC-1** plus **AC-2**.
2. Free movement plus dots jump with answers kept plus progress plus running score, satisfies **AC-3**.
3. Instant tap lock plus background grade plus same dots order for quiz plus flashcard plus diagram items with answer then flip for flashcards, satisfies **AC-4** plus **AC-8**.
4. Per item hint from generate plus Show hint reveal plus hide when empty, satisfies **AC-7**.
5. Diagram item render from VisualArtifact id plus caption plus alt text through the unified read plus text plus retry fallback, satisfies **AC-9**.
6. Snapshot extend to version 4 with item kind plus diagram state plus hint open plus minimized plus reload rebuild, satisfies **AC-5** in browser.
7. Backup migration plus two light endpoints plus write on mark and move plus clear on submit and close plus new device restore, satisfies **AC-5** across devices.
8. Fail keep plus stopped stream rule plus retry line with no lost tap, satisfies **AC-6**.
9. Phone height cap with inner scroll plus desktop column match plus keyboard plus live region plus tooltip on focus plus reduced motion plus loading rule compliance, satisfies **AC-10** plus **AC-11**.
10. Submit writes same attempt rows with source chat plus conversation id plus client run id plus duplicate guard, satisfies **AC-12**.
11. Runner plus snapshot plus backup tests for happy path plus reload plus new device plus fail plus access for all ACs, satisfies **AC-1** through **AC-12**.

## Migration plan

**Strategy**: strangler
**Phases**:
1. Grow `components/chat/quiz-runner.tsx` plus `lib/chat/quiz-snapshot.ts` to version 4 in place while old version 2 and 3 snapshots keep loading with defaults. Ship dock UI with browser only resume first.
2. Add ChatRunBackup migration plus two light endpoints and sync writes. Prove new device resume, then retire any runner only code paths that assume browser only.
**Rollback**: Revert the backup sync commit to return to browser only resume. Old snapshots keep loading because defaults fill new fields. Backup table stays unused with no effect on scoring.
**Risks**: Snapshot shape growth may confuse old tabs open during deploy. Version check drops mismatched rows with a plain message plus retry. Backup writes add one light call per mark and move so volume stays low.

## Consequences

**Positive**:
1. Practice stays where study happens with thumbs on options and no long scroll.
2. One history everywhere with zero parallel scoring state to operate.
3. One family to learn: dots plus Back plus Next plus hint work the same for quiz plus flashcards plus diagrams.
4. True resume across devices without a heavy run engine.

**Negative or tradeoffs**:
1. Reload rebuild still depends on a snapshot copy. A cleared browser plus an expired backup loses the unsubmitted run.
2. Snapshot plus backup sync adds write traffic on every mark and move, small but nonzero.
3. The runner file grows layout plus backup duties until a later split if it gets heavy.
4. Diagram items in the same dots order lengthen the run count versus quiz only runs.

**Neutral**:
1. Timed practice stays out of scope. No clock code ships here.
2. The visual handoff rule from spec 0031 stays as is. Diagram heavy runs still link the full quiz page with a reason.
3. Share cards stay text only in v1.

## Follow up

1. Split the docked card into its own component file if the runner file grows past easy review.
2. Server held run state proved lossy or chatty in real use should trigger a revisit of sync frequency.
3. Timed practice in chat as a later phase with server clock decide and client countdown.
4. Consider a Diagrams only filter for runs where the student wants art review without quiz marks.
