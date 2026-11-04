# Verify for 0044. Generative card system low near composer

Manual pass on phone plus desktop against the approved reference shots.

## Setup

1. Seed the demo account plus an Operating Systems note plus a READY quiz using `pnpm db:seed`.
2. Sign in as the demo student and open Tip chat with the note in context.
3. Start a mixed run with at least one quiz item plus one flashcard item plus one diagram item.

## Checks

1. Dock placement: the runner pins low above the composer in normal flow on phone width near 375 px and desktop width near 1280 px, matches the thread column width, no overlap with the composer.
2. One at a time: only one item shows with numbered dots plus Back plus Next plus Show hint as icon buttons. Hover shows tooltip text on desktop. Focus shows the name to keyboard plus screen reader users.
3. Dots plus free move: tap dots to jump with answers kept. Back plus Next move freely with unanswered items left open.
4. Instant tap: tap an option. It locks at once. Move on before the grade lands. Grade lands in background with no stall.
5. Hint: open Show hint on an item with hint text. It reveals in place. Items with empty hint hide the control with no flicker.
6. Flashcards: front hides options but stays answerable by tap or typing. After the mark lands the back reveals the correct answer plus the short why.
7. Diagrams: diagram item shows art plus caption in the same dots order. Block art by offline or bad markup and confirm caption plus text steps stay readable with plain notice plus retry.
8. Reload: answer two items, open hint on the third, minimize, reload. Confirm same index plus answers plus marks plus hint open plus minimized return. Repeat on a second device or second browser and confirm server backup restores the same spot.
9. Fail: force a grade failure or stop the stream mid grade. Confirm the tap stays saved with a retry line reading Try marking again under the question. Tap retry and confirm the mark lands.
10. Height: on a small phone confirm the card caps near half the viewport with inner scroll for long options while dots plus Back plus Next plus hint stay pinned below.
11. Access: keyboard only path through dots plus Back plus Next plus hint plus toggle free path. Score changes announce through the live region. Reduced motion on shows no slide or pulse.
12. Submit: finish the run and confirm QuizAttempt rows write with source chat plus conversation id plus client run id. Resubmit the same run id and confirm duplicate true with no new row.

## Sign off

Pass when all twelve checks above hold on phone plus desktop with no console errors and no spinner outside a button that performs the student action.

## Build slice 2026 11 03 dock shell plus free movement plus phone cap

Steps derived from spec 0044 acceptance criteria. Run these to confirm Box 1.

## UI plus manual

- [ ] Open Tip chat, start a quiz run, confirm the runner pins low above the composer in normal flow on phone near 375 px and desktop near 1280 px, matches the thread column width, sits directly above the composer with no overlap → AC-1
- [ ] Confirm one item shows at a time with numbered dots plus Back plus Next plus Show hint, hover each icon button to see tooltip text Go to previous card plus Go to next card plus Show hint for this card plus Minimize the dock, tab through them to confirm focus order dots then Back then Next then hint → AC-2
- [ ] Tap dots to jump between items with answers kept, use Back plus Next to move freely with unanswered items left open for later → AC-3
- [ ] On a small phone confirm the card caps at 52vh max height with inner scroll for long options while dots plus Back plus Next plus hint stay pinned below with no layout jump → AC-10
- [ ] Keyboard only path through dots plus Back plus Next plus hint, confirm score changes announce Item X of N plus Y correct so far through the live region, tooltips read on focus, reduced motion shows no slide → AC-11

## Commands

- [x] `pnpm test --run tests/components/quiz-runner.test.tsx` → all 25 pass → AC-1 through AC-4 plus AC-7
- [x] `pnpm ui:check` → no new violation for `components/chat/quiz-runner.tsx` → AC-10 plus AC-11

## Acceptance criteria coverage

- AC-1 covered by dock placement step
- AC-2 covered by one item plus tooltip step
- AC-3 covered by dots plus free move step
- AC-10 covered by height cap step
- AC-11 covered by access step plus ui check command

## Build slice 2026 11 03 instant tap plus hint plus flashcards plus diagrams

Steps derived from spec 0044 acceptance criteria. Run these to confirm Box 2.

## UI plus manual

- [ ] Start a quiz run, tap an option, confirm it locks at once locally and you can move on before the grade lands → AC-4
- [ ] Open Show hint on an item with hint text, confirm it reveals in place, confirm items with empty hint hide the control → AC-7
- [ ] Switch to Flashcards, confirm the front hides options but shows numbered ghost targets plus a letter box, answer by ghost tap, confirm the back reveals the correct answer plus the short why after the mark → AC-8
- [ ] With a note that has drawn figures, confirm diagram dots join the same dots order with dashed style, open one, confirm caption plus alt text plus unscored note render, block art and confirm plain notice plus retry with the answer never blocked → AC-9

## Commands

- [x] `pnpm test --run tests/components/quiz-runner.test.tsx` → all 25 pass → AC-4 plus AC-7 plus AC-8 plus AC-9
- [x] `pnpm ui:check` → no new violation for `components/chat/quiz-runner.tsx` → AC-10 plus AC-11

## Acceptance criteria coverage

- AC-4 covered by instant tap step plus runner tests
- AC-7 covered by hint step plus question hint fallback test
- AC-8 covered by flashcard front plus back test
- AC-9 covered by diagram dot plus retry test

## Build slice 2026 11 03 snapshot plus server backup plus fail keep

Steps derived from spec 0044 acceptance criteria. Run these to confirm Box 3.

## UI plus manual

- [ ] Answer two items, open hint on the third, minimize, reload mid run, confirm the same index plus answers plus marks plus hint open plus minimized return with the same dots order → AC-5
- [ ] On a second device or a second browser with no local copy, open the same conversation, confirm the run restores from the server backup at the same spot → AC-5
- [ ] Force a grade failure or stop the stream mid grade, confirm the tap stays saved with a retry line reading Try marking again under the question, tap retry and confirm the mark lands and no tap is ever dropped → AC-6

## Commands

- [x] `pnpm test --run tests/lib/chat/quiz-snapshot.test.ts tests/app/api/chat-runs-backup.test.ts tests/components/quiz-runner.test.tsx` → all 59 pass → AC-5 plus AC-6
- [x] `pnpm db:migrate` → reports in sync, `chat_run_backups` exists with the owner plus conversation plus run id keys → AC-5

## Acceptance criteria coverage

- AC-5 covered by reload plus new device steps plus snapshot v6 plus backup endpoint tests
- AC-6 covered by fail plus stop step plus existing retry tests

## Build slice 2026 11 03 submit plus access plus loading plus tests

Steps derived from spec 0044 acceptance criteria. Run these to confirm Box 4.

## UI plus manual

- [ ] Keyboard only path through dots plus Back plus Next plus hint plus ghost targets, confirm a sighted focus ring on each stop and focus landing on the question heading after every jump → AC-11
- [ ] Answer two items, confirm the live region announces Item X of N plus Y correct so far on each mark → AC-11
- [ ] Turn on reduced motion in the OS, finish a run, confirm the results jump cuts with no smooth glide and no pulse animation lingers → AC-11
- [ ] Finish a run with a diagram dot in the order, confirm the attempt rows carry only the quiz answers with source chat plus conversation id plus client run id, diagrams unscored at zero points → AC-12
- [ ] Submit the same run id twice, confirm the second answer returns the existing attempt plus duplicate true with no new row → AC-12

## Commands

- [x] `pnpm test --run tests/components/quiz-runner.test.tsx tests/lib/chat/quiz-snapshot.test.ts tests/app/api/chat-runs-backup.test.ts` → all 59 pass → AC-11 plus AC-12
- [x] `pnpm ui:check` → no new violation for `components/chat/quiz-runner.tsx` → AC-11
- [x] `pnpm tsc --noEmit` → no new error in the runner, snapshot, backup, route, or client files → AC-11 plus AC-12

## Acceptance criteria coverage

- AC-11 covered by focus plus live region plus reduced motion plus tooltip steps and the focus test
- AC-12 covered by submit shape plus duplicate plus diagram exclusion tests and the server duplicate test
