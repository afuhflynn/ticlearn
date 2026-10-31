# Verify: quiz practice inside chat · spec 0031 · updated 2026-10-31
_Steps derived from spec 0031 acceptance criteria. `/verify-release` runs these; `/test-engineer` locks the durable ones._
## UI / manual
- [ ] Open a chat with a note attached, tap "Quiz me" → setup card shows the note title and count chips 5 / 10 / Custom → AC-1
- [ ] Start the quiz → first question renders alone, MCQ shows lettered cards, OPEN shows a text box, progress line reads "Question 1 of N · 0 correct" → AC-2
- [ ] Tap an MCQ option → mark lands at once with a short why, running score increments, Next enables → AC-2, AC-3
- [ ] Type a letter (B, 2, or option B) in the letter box → the matching option marks; type nonsense twice → the fixed reprompt shows, nothing is marked and nothing is skipped → AC-2, AC-6
- [ ] Answer an OPEN question with one character → reprompt asks for more; answer again → it grades anyway → AC-6
- [ ] Answer an OPEN question → Mark answer grades through the model, the why names correctness before any explanation → AC-3
- [ ] Confirm no clock, timer, or cutoff appears anywhere in the run → AC-4
- [ ] Start a quiz where 2 or more questions cite note pages → the handoff card names the reason and links the full quiz page → AC-7
- [ ] Submit the last answer → attempt row written with `source: "chat"`, score/correct/points shown, per-question correction lists your answer, correct answer (when wrong), and explanation → AC-3
- [ ] Retake from the result card → answers clear, same quiz restarts → AC-3
- [ ] Free-plan student over the quiz limit starts a chat quiz → same 403 plain message as the quiz page → AC-8
- [ ] While generating, the thread shows the plain progress line, not a spinner → repo loading rule
- [ ] Answer two questions with one marked, reload mid run → position plus answers plus marks rebuild, Next stays gated the same way, restart happens only on your ask → AC-5
- [ ] Reload with a deleted quiz or cleared keys → plain message plus retry, setup shows, no dead run → AC-5
- [ ] Submit, then reload the thread → result stays from the server attempt, no resurrected run → AC-5
- [ ] Retake from the result card → answers clear, same quiz restarts under a fresh run id → AC-3, AC-5
- [ ] In a chat with a practiced quiz, ask to review or print it → Tip links the full quiz page with one line on why the page fits better, never inventing the id → AC-7

## Commands
- [ ] `pnpm typecheck` → no errors in `components/chat/quiz-runner.tsx`, `app/api/quizzes/grade/route.ts`, `hooks/useQuizzes.ts` → AC-3
- [ ] `pnpm ui:check` → OK (no palette, dark-utility, or spinner violations in new files) → repo loading rule
- [ ] `pnpm build` → green → all ACs
- [ ] Submit the same `clientRunId` twice to `/quizzes/attempts` → second response returns the existing attempt with `duplicate: true`, no second row → AC-3
- [ ] POST `/quizzes/attempts` with another user's `quizId` → 404 → AC-7
- [ ] `pnpm vitest run tests/lib/chat/quiz-snapshot.test.ts` → 8 passed (round trip, separate runs, version drop, clear rules) → AC-5
- [ ] `pnpm vitest run tests/components/quiz-runner.test.tsx` → 4 passed (setup, happy path with handoff link, fixed reprompt, note gate, reload rebuild) → AC-1, AC-2, AC-3, AC-5, AC-6, AC-7
- [ ] `pnpm vitest run tests/app/api/quiz-grade.test.ts tests/app/api/quiz-attempts.test.ts tests/app/api/quizzes-generate.test.ts` → 22 passed → AC-3, AC-7, AC-8
- [ ] POST `/quizzes/attempts` with `source: "evil"` → row writes `source: null`, quiz taken event carries no chat source → AC-3
- [ ] POST `/quizzes/grade` without a session → 401 → AC-7
- [ ] `pnpm prompts:check` → ok (chat_system v13 with the review or print handoff rule) → AC-7

## Known gaps (not yet verifiable)
- none (the review or print ask trigger now lives in the tutor prompt as chat_system v13; the live model check still needs keys)

## Trigger bridge (startQuiz tool plus ChatQuiz card, landed after the first build)
- [ ] Fresh chat, type a quiz ask naming a note topic → model asks at most one setup question, then the runner card mounts in setup phase with no free typed Q1 → AC-1
- [ ] Complete the run from the mounted card → per answer marks, running score, full correction, attempt row written with source chat → AC-2, AC-3
- [ ] Quiz ask with no note anywhere → runner empty state, no invented questions → AC-1
- [ ] `pnpm vitest run tests/lib/ai/start-quiz.test.ts` → passed (surface, conversation note fallback, foreign note missing, empty mount) → AC-1, AC-7
- [ ] `pnpm vitest run tests/components/chat-quiz.test.tsx` → passed (static plus dynamic part mount, missing notice, silent without parts) → AC-1, AC-2
- [ ] `pnpm vitest run tests/prompts/quiz-in-chat.test.ts tests/prompts/tutor-voice.test.ts` → passed (v15 script, runner owns questions, trigger wording) → AC-1
- [ ] `pnpm exec tsc --noEmit` → clean; `pnpm ui:check` → OK → all ACs

## Acceptance-criteria coverage
- AC-1 covered by setup step · AC-2 covered by runner step (lettered cards, typed letters, progress plus running score) · AC-3 covered by mark/submit/correction/dedupe/source allowlist/retake run rotation steps · AC-4 covered by untimed step · AC-5 covered by snapshot reload plus deleted quiz plus submit clear plus retake steps and the snapshot helper command · AC-6 covered by reprompt step · AC-7 covered by owner checks plus visual handoff plus the tutor prompt review or print rule and its prompts check · AC-8 covered by caps parity step
