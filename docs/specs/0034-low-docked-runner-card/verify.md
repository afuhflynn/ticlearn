# Verify: low docked runner card · spec 0034 · updated 2026-10-31
_Steps derived from spec 0034 acceptance criteria. `/verify-release` runs these; `/test-engineer` locks the durable ones._
## UI / manual
- [ ] Open a chat, start a quiz → runner pins low above the composer in the thread column on phone plus desktop → AC-1
- [ ] Answer Q1, tap a dot → lands on that question with Q1 answer kept; Back plus Next move with unanswered left open → AC-3
- [ ] Tap an option → locks at once, grade lands in background, move on instantly with no stall → AC-4
- [ ] Reload mid run → same spot with answers plus marks plus mode plus hint state → AC-5
- [ ] Flip Quiz versus Flashcards → same spot plus answers, front hides options, back reveals correct plus why after mark → AC-8
- [ ] Tap Show hint → hint reveals in place; move to a question with no hint → control hidden → AC-7
- [ ] Minimize → slim bar with title plus spot plus score; Restore → same spot back → AC-8
- [ ] Disconnect or fail an open grade → tap stays with Try marking again; retry marks without loss → AC-6
- [ ] Small phone → card caps near half the viewport with inner scroll; nav stays pinned → AC-9
- [ ] Keyboard only → full path through dots plus Back plus Next plus hint plus toggle with visible focus and focus moving to the question on jump; screen reader → dot labels name spot plus state; reduced motion on → no animation → AC-10
- [ ] Close with X on setup → run clears; switch conversation away and back → snapshot restores per conversation → AC-5, AC-8
## Commands
- [ ] `pnpm exec tsc --noEmit` → clean → AC-1 through AC-10
- [ ] `pnpm vitest run tests/components/quiz-runner.test.tsx tests/lib/chat/quiz-snapshot.test.ts tests/lib/chat/quiz-snapshot-v2.test.ts` → green → AC-1 through AC-10
- [ ] `pnpm ui:check` → OK with zero new violations → AC-9, AC-10
## Acceptance-criteria coverage
- AC-1 … covered by dock pin step · AC-2 … covered by one question plus dots plus Back plus Next plus hint plus toggle step · AC-3 … covered by dots jump plus free move step · AC-4 … covered by instant tap step · AC-5 … covered by reload plus conversation switch steps · AC-6 … covered by fail retry step · AC-7 … covered by hint steps · AC-8 … covered by toggle plus minimize steps · AC-9 … covered by height cap step · AC-10 … covered by keyboard plus screen reader plus motion step
