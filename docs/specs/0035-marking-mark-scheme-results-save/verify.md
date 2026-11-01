# Verify: marking plus mark scheme plus results plus save · spec 0035 · updated 2026-11-01
_Steps derived from spec 0035 acceptance criteria. `/verify-release` runs these; `/test-engineer` locks the durable ones._
## UI / manual
- [ ] Start a chat quiz and answer one choice, see correct or incorrect styling plus the mark scheme plus earned of total → AC-1
- [ ] Answer a typed question with one letter, see one fixed reprompt then a graded mark → AC-2
- [ ] Answer two questions, see the running line update question i of N plus correct among marked plus earned of total marks with no reload → AC-3
- [ ] Move with Next then Back, picks and marks stay, reload the page, same index plus marks return → AC-4
- [ ] Finish the run, see percent plus correct count plus totals plus per question review with you answered plus correct answer plus scheme plus Start over plus weak area offers → AC-5
- [ ] Press Start over, same questions return, marks clear, network shows no generate call, run id changes → AC-6
- [ ] Open attempts for the quiz, one row exists with source chat plus conversation id, submit again with the same run id, response has duplicate true and no new row → AC-7
- [ ] Compare setup estimate with results total, results total equals the sum of per question marks stored → AC-8
- [ ] After results press the harder set offer then the open written set offer, each builds a new run → AC-9
- [ ] Force grade failure by stopping the network once, see plain notice plus Try marking again with the answer kept → AC-10
- [ ] Start a 10 question chat quiz with a forced length cutoff, see one retry at 5 then answering, force both to fail and see the full quiz page link with a reason and no dead card → AC-10
- [ ] Call grade plus attempts plus weak areas with a foreign quiz or note id, each reads as not found → AC-11
- [ ] Confirm quiz only with no flashcards tabs plus no study toggle, options always visible, plus no clock shown and no cutoff fires during a run → AC-12
- [ ] Setup total reads as estimate only, change count and difficulty and see the estimate change while results use the server sum → value sourcing setup row
- [ ] Generate with a linked note then without a linked note, both write the same quiz rows → value sourcing generate row
- [ ] Check that percent equals earned sum divided by total sum times one hundred, rounded → value sourcing percent row
## Commands
- [ ] `pnpm test --run tests/components/quiz-runner.test.tsx tests/lib/chat/quiz-snapshot.test.ts` → 17 plus snapshot passed → AC-1, AC-3, AC-4, AC-6, AC-10, AC-12
- [ ] `pnpm test --run tests/app/api/quiz-grade.test.ts tests/app/api/quiz-attempts.test.ts tests/app/api/quizzes-generate.test.ts tests/app/api/quiz-wizard-generate.test.ts tests/components/quiz-setup-wizard.test.tsx` → all passed → AC-7, AC-10, AC-11, caps parity
- [ ] `pnpm ui:check` → OK with zero spinner files → loading rule
## Acceptance-criteria coverage
- AC-1 … covered by step 1 … · AC-2 … covered by step 2 … · AC-3 … covered by step 3 … · AC-4 … covered by step 4 … · AC-5 … covered by step 5 … · AC-6 … covered by step 6 … · AC-7 … covered by step 7 … · AC-8 … covered by step 8 … · AC-9 … covered by step 9 … · AC-10 … covered by steps 10 and 11, retry once then handoff … · AC-11 … covered by step 12, owner only plus new 404 tests … · AC-12 … covered by step 13, quiz only plus no clock
