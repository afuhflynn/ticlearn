# Verify: durable quiz build with live progress · spec 0042 · updated 2026-11-02
_Steps derived from spec 0042 acceptance criteria. `/verify-release` runs these; `/test-engineer` locks the durable ones._
## UI / manual
- [ ] Create a 40 question note build on the quiz page, confirm QUEUED paints first, then GENERATING with done of total plus percent climbing, polling every 3 seconds, landing on READY with 40 ordered questions and no manual reload → AC-1, AC-3
- [ ] Force a batch cutoff, confirm one smaller retry runs on its own, then remaining batches continue with no tap → AC-2
- [ ] Open the same build in chat and on the quiz page, confirm both refresh to the runner with no manual reload → AC-3
- [x] Poll a foreign quiz id as another user, confirm 404 with no counts leaked → AC-4
- [ ] Age a GENERATING row past 10 minutes, confirm the sweeper flips it to failed, the card offers retry smaller plus a full page link, and a late batch landing after ERROR never flips it back to READY → AC-5
- [ ] Confirm the credit reserve row keys on quiz id at create, the refund runs once on terminal fail, retries never double charge, and a cache hit refunds the reserve → AC-6
- [ ] Confirm the progress card shows a thin bar plus stage name plus done of total, respects reduced motion, and uses no spinner → AC-7
- [x] Send 41 on the page and 11 on chat paths, confirm each rejects with a plain message → AC-8
- [ ] Value sourcing: buildTotal equals the capped request input; builtCount equals persisted rows; stage reads the column; percent is derived client side with zero total reading zero percent; elapsed reads buildStartedAt plus the client clock and appears after 10 seconds; retry smaller derives half rounded down with floor 5; refund derives the reserve amount by the same quiz id → AC-1, AC-2, AC-5, AC-6, AC-7
## Commands
- [x] `pnpm test --run tests/app/api/quizzes-generate.test.ts tests/app/api/quiz-wizard-generate.test.ts tests/app/api/quiz-grade.test.ts tests/app/api/quiz-attempts.test.ts tests/lib/ai/quiz-gen.test.ts tests/lib/ai/validators.test.ts tests/components/quiz-runner.test.tsx tests/lib/chat/quiz-snapshot.test.ts` → all pass → AC-1, AC-2, AC-3, AC-4, AC-8
- [x] `pnpm ui:check` → new file clean, spinner count zero → AC-7
- [x] `pnpm tsc --noEmit` → touched files clean → all ACs
## Acceptance-criteria coverage
- AC-1 … covered by steps 1, 9 and the command suite · AC-2 … covered by steps 2, 9 and the command suite · AC-3 … covered by steps 1, 3 and the command suite · AC-4 … covered by step 4 and the command suite · AC-5 … covered by step 5 · AC-6 … covered by step 6 · AC-7 … covered by steps 7, 9 and ui check · AC-8 … covered by step 8 and the command suite
