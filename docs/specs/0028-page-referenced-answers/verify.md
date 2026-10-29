# Verify: grounded question generation from course material · spec 0028 · updated 2026-10-30
_Steps derived from spec 0028 acceptance criteria. `/verify-release` runs these; `/test-engineer` locks the durable ones._
## UI / manual
- [ ] Upload a course PDF with one diagram page, generate a grounded quiz, open the quiz, confirm each question shows a page tag like Page 3 → AC-1 AC-2
- [ ] Generate a grounded quiz from a note with no Page rows, confirm it still reaches READY from text only → AC-5
- [ ] Open the admin platform settings page, confirm Grounded per question and Page lookup per useful lookup fields save → AC-4
- [ ] Ask Tip which page covers a topic in a conversation linked to a note, confirm the answer cites a real page number from the tool result → AC-3
## Commands
- [ ] `pnpm test --run tests/lib/grounded-questions.test.ts` → input assembly, ref persistence, degrade paths pass → AC-1 AC-2 AC-5
- [ ] `pnpm test --run tests/app/api/quizzes-generate.test.ts` → owner check, GENERATING placeholder, queue failure path pass → AC-7 AC-4
- [ ] POST /api/quizzes/generate with grounded true and balance below grounded total → 402 with requiredCredits and balance → AC-4
- [ ] POST /api/quizzes/generate with a foreign noteId → 404, no pages leak → AC-7
## Acceptance-criteria coverage
- AC-1 covered by step grounded quiz page tag and grounded questions test
- AC-2 covered by step page tag on card and sourcePages persistence
- AC-3 covered by step chat citation (tool plus prompt line, feature 54 remainder)
- AC-4 covered by step 402 path, admin prices, one debit row per quiz id
- AC-5 covered by step text only degrade with no Page rows
- AC-6 covered by step Muse failure falls through to OpenRouter, failed pages excluded
- AC-7 covered by step foreign note 404 and owner scoped reads
