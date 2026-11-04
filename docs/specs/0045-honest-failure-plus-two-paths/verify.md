# Verify: honest failure plus two paths · spec 0045 · updated 2026-11-04
_Steps derived from spec 0045 acceptance criteria. `/verify-release` runs these; `/test-engineer` locks the durable ones._
## UI / manual
- [ ] Start a chat quiz with count 10, inject a length cutoff on first pass → smaller retry runs, questions render with same note plus topic plus format → AC-2
- [ ] Inject cutoff on both passes → card shows Practice paused, cause That set came out too long, two links Try smaller quiz plus Open full quiz, both open /quizzes with small and asked counts → AC-1, AC-3
- [ ] Ask count 3 with cutoff → no retry, card at once with only Open full quiz plus short line → AC-2, AC-3
- [ ] Inject draw failure → shared frame, text steps beside miss, manual retry works, max two taps with 1s debounce, then retry hides while text stays → AC-4
- [ ] Inject grading error on submit → card at once with both exits, no retry progress → AC-5
- [ ] Reload on card → both exits rebuild from snapshot plus backup, no resumed auto retry → AC-6
- [ ] Go offline, tap a card link → card stays with short offline line → AC-6
- [ ] Open card with foreign noteId in /quizzes query → reads as not found, no content leaked → AC-7
- [ ] Card announces politely, focus lands on title first show only, reduced motion instant, no spinner → AC-9
- [ ] Quiz plus Flashcards stay available on both exits with chosen format → AC-8
## Commands
- [ ] `pnpm test --run tests/lib/ai/validators.test.ts tests/components/quiz-build-progress.test.tsx tests/components/quiz-runner.test.tsx` → all pass → AC-2, AC-3
- [ ] `pnpm ui:check` → spinner-loader 0 new (raw-aria failures elsewhere are pre-existing) → AC-9
## Acceptance-criteria coverage
- AC-1 covered by manual card plus cutoff steps · AC-2 by cutoff plus count 3 steps · AC-3 by two-link plus hidden-small steps · AC-4 by draw steps · AC-5 by grade step · AC-6 by reload plus offline steps · AC-7 by foreign id step · AC-8 by format parity step · AC-9 by live-region plus focus plus no-spinner steps · AC-10 by sampled log (1 in 10, once per run id, cause plus count plus format only)
## Value sourcing
- [ ] Generate smaller count derives half rounded down floor 3, hidden at 3 or less
- [ ] Card links carry canonical keys noteId topic count format level difficulty, empty topic omitted
- [ ] Draw retry uses snapshot handoff concept plus hint, budget 2 taps in snapshot
- [ ] Grade exits rebuilt from Quiz row length plus snapshot topic plus format plus note
- [ ] Card log carries cause plus count plus format plus owner id only, no note title or topic text
