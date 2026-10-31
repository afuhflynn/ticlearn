# Verify: agentic quiz setup wizard · spec 0033 · updated 2026-10-31
_Steps derived from spec 0033 acceptance criteria. `/verify-release` runs these; `/test-engineer` locks the durable ones._
## UI / manual
- [ ] In chat say setup a quiz → wizard opens at step 1 with numbered options plus inline Other box plus Or reply directly line plus Skip        → AC-1
- [ ] Step 1 pick a note topic by tap, then type a fresh topic in Other and send → step 2 opens both times        → AC-2, AC-6
- [ ] Step 2 pick each level (GCE, HND, PROF, MIXED) → format follows the level        → AC-3
- [ ] Step 3 pick each count preset (5 standard, 5 hard, 10 standard, 10 mixed) → marks preview reads 20, 25, 40, 45        → AC-4
- [ ] Press Back → picks stay; press Skip on each step → smart defaults (conversation note, MIXED, 5 standard); pager reads 1 of 3 to 3 of 3        → AC-5
- [ ] Type in the composer while the wizard is open → same step moves forward, identical to a tap        → AC-6
- [ ] Press X → card collapses to Quiz setup paused plus Resume; send any reply → wizard resumes where it stopped        → AC-7
- [ ] Reload mid wizard → same stepIndex rebuilds with picks kept        → AC-5, AC-7
- [ ] Complete all steps and start → runner opens with the generated quiz        → AC-8
- [ ] With no notes on the account step 1 shows the empty state with an upload link; typing a topic studies without a linked note        → AC-2
- [ ] Prefill check: type give me 10 hard HND questions → steps prefill count 10 plus hard plus HND for confirm        → AC-6
- [ ] Value source edge: vary the topic (note linked vs free text), the level, and the count, and confirm the ready quiz title plus marks follow the picks        → Value sourcing
## Commands
- [ ] `pnpm vitest run tests/lib/chat/quiz-wizard.test.ts tests/lib/chat/quiz-snapshot-v2.test.ts tests/app/api/quiz-wizard-generate.test.ts tests/components/chat-quiz.test.tsx` → all pass        → AC-2, AC-3, AC-4, AC-5, AC-7, AC-8
- [ ] `pnpm ui:check` → OK with no new violations        → AC-7 loading rule
## Acceptance-criteria coverage
- AC-1 … covered by step wizard opens at step 1 · AC-2 … covered by step topic tap plus Other plus empty state · AC-3 … covered by step level cards · AC-4 … covered by step count presets · AC-5 … covered by step Back Skip pager reload · AC-6 … covered by step Other plus composer plus prefill · AC-7 … covered by step X collapse resume · AC-8 … covered by step ready submit plus command endpoint test (401, 400, 404, caps) · AC-9 … covered by step retry smaller then handoff (code path, manual cutoff proof still owed)
