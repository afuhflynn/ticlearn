# 0034. Low docked runner card

**Date**: 2026-10-31
**Status**: In Progress

## Summary

Tip keeps the whole quiz inside the chat thread today and the runner sits high in the message flow. This spec moves that runner low so it pins just above the reply box as a docked card. One question shows at a time with numbered dots plus Back plus Next plus Show hint plus a Quiz and Flashcards toggle, taps mark at once, and reload restores the same spot with answers kept.

## Requirements

**User stories**:
1. As a student, I want the quiz card pinned just above the reply box so my thumbs reach options without scrolling past a tall thread.
2. As a student, I want one question at a time with dots plus Back plus Next plus hint plus a mode toggle so I can move freely and check hints without losing answers.
3. As a student on a phone with shaky network, I want taps to answer at once and survive reload plus stream stops so no tap is ever lost.

**Acceptance criteria**:
- **AC-1**: The runner pins low above the composer in normal flow on phone and desktop, matches the thread column width, and matches the approved reference placement.
- **AC-2**: The card shows one question at a time with numbered dots plus Back plus Next plus Show hint plus a Quiz and Flashcards toggle.
- **AC-3**: Dots show the spot in the set and jump on tap with answers kept. Back plus Next move freely with unanswered questions left open for later.
- **AC-4**: A tap locks the option at once locally and grades in background. The student can move on instantly with no stall.
- **AC-5**: Reload rebuilds the same spot with answers plus marks plus mode plus hint state from the extended browser snapshot. No server schema change ships in this slice.
- **AC-6**: A stopped stream or a failed grade keeps the tap in the snapshot with a plain retry line. No tap is dropped.
- **AC-7**: Each question carries its own short hint string from generate. Show hint reveals it in place. The control hides when the hint is empty.
- **AC-8**: The Quiz and Flashcards toggle flips the view only and keeps spot plus answers. Close or minimize keeps state so reopen restores the same spot.
- **AC-9**: On a small phone the card caps height near half the viewport with inner scroll for long options so options stay reachable. Content already on screen stays calm with no layout jump.
- **AC-10**: Keyboard plus screen reader plus reduced motion all work. Dots plus Back plus Next plus hint plus toggle sit in a clear focus order, score changes use the existing live region pattern, and motion honors the reduced motion setting.

## Decision

**Chosen option**: Option 1: Fix in place and move the current runner low

Move the proven runner low as a docked card with no new endpoints and no new tables.

## Rationale

Reasoning and options: see rationale.md.

## Feature design

**Data model sketch**:
- `QuizSnapshot` (browser only, in `lib/chat/quiz-snapshot.ts`): keep all current fields such as version plus quizId plus answers plus marks plus currentIndex plus count plus clientRunId plus updatedAt plus wizard fields. Add mode as `quiz` or `flashcards` (required, default `quiz`). Add hintOpen as a record from question id to true or false (required, default empty). Add minimized as true or false (required, default false). Bump `QUIZ_SNAPSHOT_VERSION` from 2 to 3. Old version 1 and 2 snapshots load and fill the new fields with defaults. Session storage keys stay the same: active pointer key per conversation plus snapshot key per conversation plus run id.
- `QuizQuestion` (generate output shape): add hint as string optional with a short max near 140 characters. Empty or missing hides the Show hint control. Old quizzes without this field hide the control with no flicker.
- `QuizAttempt` plus `Quiz` plus `QuizAttemptAnswer`: no change. No new tables. No new columns.

**Flashcards view**:
Front shows the question text only with options hidden. The student can still answer from the front by tap or typed letter for MCQ or by text box for open. Back reveals the correct answer plus the short why after the mark lands. Before the mark lands the back shows the same hint affordance as quiz view. Toggle never clears answers or marks.

**Minimized dock**:
A slim bar shows the quiz title plus Q i of N plus running correct count plus a Restore button. Restore is a real button in the focus order. Minimized keeps the snapshot and the active pointer.

**Composer while dock is open**:
The chat composer stays live for normal chat. The dock owns its own inputs for letters plus open answers plus hint plus toggle. Sending a chat message never pauses plus never hides plus never clears the run.

**State transitions**:
- Run phases stay as built: setup then generating then answering then complete plus error. Nothing stored in the database mid run.
- Dock states: open then minimized then closed. Minimized keeps the snapshot and the active pointer. X on setup closes that run only and clears its snapshot plus pointer. Submit clears the snapshot plus pointer. A new run clears the prior snapshot plus pointer. Switching conversations keeps each snapshot under its own conversation key so returning restores that conversation spot.
- Per question states: unanswered then grading then marked, with failed grade as marked false plus a retry line reading Try marking again placed directly under the question. Retry is manual tap only and costs the same as a normal grade. An MCQ tap locks locally at once so a stopped stream loses nothing. An open answer stopped mid grade shows the same retry line. Text drafts and pending grades stay out of the snapshot until marked, as today.
- Dots are real buttons labeled Question i of N plus answered or unanswered plus correct or incorrect where marked. Activating a dot or Back or Next moves focus to the question heading. Score changes use the existing live region pattern.
- Snapshot writes on every mark plus every index move plus every mode flip plus every hint open plus every minimize. Submit plus close plus a new run clear it, as today.

**API surface**:
| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| existing generate | POST | noteId, count, types fixed to mixed, timed false | quiz id, questions with per question hint | bearer owner | 401 no session, 400 bad input, 402 low balance, 403 limit reached |
| existing quiz read | GET | quiz id | quiz with questions | bearer owner | 401 no session, 404 missing quiz |
| existing grade open answer | POST | questionId, question, type, userAnswer, correctAnswer, options | isCorrect, why | bearer owner | 401 no session, 400 bad input |
| existing attempts submit | POST | quizId, answers array plus source hint chat plus conversationId plus clientRunId | attempt, score, points, duplicate flag | bearer owner | 401 no session, 400 bad input, 404 missing quiz, 422 bad answers |

No new routes. Client sends the same shapes as spec 0031. Server allowlists source hint to chat or page and writes the final value, as today.

**Value sourcing**:
| Action | Value produced or displayed | Source |
|---|---|---|
| Dock | pinned card above composer | layout in `components/chat/chat-thread.tsx` plus `components/chat/quiz-runner.tsx`, no new data |
| Question | one question text plus options | existing quiz read by quizId from the snapshot |
| Dots | spot in set plus jump target | currentIndex plus questions length from snapshot and thread state |
| Back plus Next | moved spot | currentIndex in snapshot, clamped to range, free move with answers kept |
| Hint | short hint text per question | `QuizQuestion` hint field from generate, short max near 140 chars, empty or missing hides the control |
| Toggle | quiz view or flashcards view | mode field in snapshot, same questions and answers both ways |
| Tap | locked answer plus local mark | option tap or typed letter mapped positionally, MCQ positional match after normalization, same as 0031 |
| Grade | correct or not plus short why | MCQ local match, open through grade endpoint with same task plus timeout plus cost as page |
| Score | running correct count | marks record in snapshot, read as correct count among marked |
| Reload | restored spot plus answers plus marks plus mode plus hint | active pointer plus snapshot replay in sessionStorage, version 3 with defaults for old rows |
| Close | kept or cleared run | minimized keeps snapshot plus pointer, close event clears per current close rule |
| Handoff | link plus reason | visual count rule from 0031, unchanged |
| Money | caps plus debits | PlatformSettings plus credit rows identical to page flow from 0031, unchanged |

**Key invariants**:
1. Chat runs write the same rows as page runs. No parallel history.
2. Retrieval first: the student answers before Tip explains, every question.
3. Taps lock locally at once. Grade runs in background and never blocks movement.
4. Snapshot writes on mark plus move plus mode flip plus hint open plus minimize. Submit plus close plus a new run clear it. Conversation switch keeps each snapshot under its own key.
5. Free movement: Back plus Next never force an answer. Unanswered stays open.
6. Toggle never clears answers. View flips, data stays. Flashcards stay answerable with back reveal after mark.
7. Card caps at half the viewport height with the options region scrolling inside while Back plus Next plus hint plus toggle stay pinned below. No spinner outside a button that performs the student action.
8. Option controls plus dots are real buttons. Score changes use the existing live region pattern. Focus moves to the question heading on jump.
9. Loading follows the repo loading rule: skeleton for the first question area, thin progress while grading, plain notice plus retry on failure.
10. Concurrent tabs count as separate runs, keyed by run id.
11. Timed runs do not exist. No clock shown and no cutoff enforced.

**Security model**:
Owner only throughout, same as spec 0031. Every run call checks session plus note and attempt ownership exactly like the page routes. No shared threads. No public run reads. No new personal data. Study content the student already owns.

**Configuration required**:
No new env vars. No new providers. No new deps. Snapshot version bump only, local to the browser.

**Critical test scenarios**:
- Happy path: open dock low above composer, answer one by tap, dots jump with answers kept, Back plus Next free move, hint reveals, toggle keeps spot, submit writes attempt rows with source chat, verifies **AC-1**, **AC-2**, **AC-3**, **AC-4**, **AC-7**, **AC-8**.
- Reload plus close: reload mid run restores spot plus answers plus marks plus mode plus hint, minimize plus reopen restores, verifies **AC-5**, **AC-8**.
- Failure plus stop: failed grade keeps tap with retry line, stopped stream marks per 0031 rule with no lost tap, verifies **AC-6**.
- Layout plus access: small phone caps card height with inner scroll, desktop matches thread column, keyboard path plus live score plus reduced motion all pass, verifies **AC-9**, **AC-10**.

## Build plan

Tracer Bullet: a thin docked thread first, then depth, then hardening.

1. Docked shell plus one question plus dots plus Back plus Next pinned above the composer in flow, matching thread column width on phone and desktop, satisfies **AC-1**, **AC-2**.
2. Free movement plus dots jump with answers kept plus progress plus running score, satisfies **AC-3**.
3. Instant tap lock plus background grade plus mode toggle that keeps spot plus answers, satisfies **AC-4**, **AC-8**.
4. Per question hint from generate plus Show hint reveal plus hide when empty, satisfies **AC-7**.
5. Snapshot extend to version 3 with mode plus hint open plus minimized plus reload rebuild plus minimize and reopen keep, satisfies **AC-5**, **AC-8**.
6. Fail keep plus stopped stream rule plus retry line with no lost tap, satisfies **AC-6**.
7. Phone height cap with inner scroll plus desktop column match plus keyboard plus live region plus reduced motion plus loading rule compliance, satisfies **AC-9**, **AC-10**.
8. Runner component tests plus snapshot helper tests plus reload plus fail plus access tests for all ACs, satisfies **AC-1** through **AC-10**.

## Consequences

**Positive**:
- Practice stays where study happens with thumbs on options and no long scroll.
- One history everywhere with zero new server state to operate.
- Smallest review surface because endpoints plus validation plus money rules stay untouched.

**Negative / tradeoffs**:
- Reload rebuild still depends on the browser snapshot. A cleared snapshot loses the unsubmitted run.
- Snapshot stays on one device. A new device starts fresh.
- The thread runner component grows layout duties until a later split if it gets heavy.

**Neutral**:
- Timed practice stays out of scope. No clock code ships here.
- The visual handoff rule from 0031 stays as is. Diagram heavy runs still link the full quiz page.

## Follow-up

- [ ] Server held run state for true cross device resume if the browser snapshot proves lossy in real use.
- [ ] Timed practice in chat as a later phase with server clock decide and client countdown.
- [ ] Split the docked card into its own component file if the runner file grows past easy review.
