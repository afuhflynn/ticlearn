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
## Chat page lookup (feature 54)
- [ ] Ask Tip which page covers a topic in a conversation linked to a scanned note, confirm the answer cites a real page number from the tool result → AC-3
- [ ] Ask in a conversation with no note, confirm a plain no note answer and no crash → AC-5
- [x] Ask about a note with no Page rows, confirm no page named and no debit row → AC-4 AC-5
- [x] Spend down below the lookup price and ask again, confirm the plain insufficient credits message → AC-4
- [x] Confirm the tool takes no note id and a foreign note stays unreachable → AC-7
## Page scan self heal (lazy backfill)
- [ ] Upload a PDF note with Inngest running, confirm Page rows appear for it → AC-3
- [ ] Ask Tip which page covers a topic on a READY PDF with zero Page rows, confirm the first answer names no page and writes no debit row, then confirm Page rows appear after the job runs and a later ask cites a real page → AC-3 AC-4 AC-5
- [ ] Ask about a non PDF note, confirm pending with no invented page number and no scan event → AC-5
- [ ] Ask about a PROCESSING note with no pages yet, confirm pending and no duplicate scan event → AC-5
- [ ] `pnpm vitest run tests/lib/ai/tools.test.ts` → self heal block passes (requeue on settled PDF, skip on PROCESSING and non PDF and touched notes, send failure still pending) → AC-3 AC-5
## Explicit note id on getNotePages
- [ ] Ask for a page in general chat on a note the search already identified, confirm the answer cites a real page with no failure UI → AC-3
- [ ] Call with a foreign note id, confirm not found with no leak and no debit row → AC-7 AC-4
- [ ] Call with no id and no conversation note, confirm the plain no note message → AC-5
- [ ] Useful lookup writes one PAGE_LOOKUP debit keyed on the tool call id → AC-4
- [ ] `pnpm vitest run tests/lib/ai/tools.test.ts` → explicit id block passes (serves search resolved note, prefers explicit id, foreign reads not found) → AC-3 AC-7
## Acceptance-criteria coverage (feature 54)
- AC-3 covered by step real page citation from the tool result
- AC-4 covered by step useful lookup debit and insufficient credits message
- AC-5 covered by step pending shape with no pages and no debit
- AC-7 covered by step owner scoped conversation note read
