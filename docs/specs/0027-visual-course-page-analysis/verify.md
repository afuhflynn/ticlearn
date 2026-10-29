# Verify: Visual course page analysis · spec 0027 · updated 2026-10-29
_Steps derived from spec 0027 acceptance criteria. `/verify-release` runs these; `/test-engineer` locks the durable ones._
## UI / manual
- [ ] Upload a course PDF with one diagram page and one text-only page → confirm a `Page` row per page, `hasVisual=true` only on the diagram page, and a `VisualAnalysis` row only for the diagram page        → AC-1 AC-2 AC-4 AC-8
- [ ] In Prisma Studio or `psql`, confirm the diagram page's `pageImageUrl` is a public Blob URL and its `VisualAnalysis` carries `visualType`, a non-empty `description`, `confidence` 0 to 1, and status `COMPLETED`        → AC-2 AC-3
- [ ] Force one page to fail (Baseten key removed, or an unusable model response) → confirm that page is marked `FAILED` while the remaining pages still complete, and the student sees no error        → AC-6
- [ ] Confirm the student's credit balance is unchanged after analysis and no `CreditTransaction` rows were written for the Baseten calls        → AC-5
## Commands
- [ ] `curl GET /api/visual-analysis/[noteId]` as the owner → 200 with pages in `pageNumber` order, each carrying its analysis (`visualType`, `description`, `confidence`, `status`)        → AC-3 AC-7
- [ ] `curl GET /api/visual-analysis/[noteId]` as a different signed-in user → 404, no page data leaked        → AC-7
- [ ] `curl GET /api/visual-analysis/[noteId]` with no session → 401        → AC-7
- [ ] Query `ai_usage_events` for `task = 'visual_analysis'` → one row per visual page with `modelId = 'meta-models/muse-spark-open-1026'`, flat XAF cost, no student debit        → AC-5
- [ ] `pnpm test --run tests/lib/ai/page-scan.test.ts tests/app/api/visual-analysis.test.ts` → all tests pass. Automated: AC-1 scan detection and AC-7 owner auth. Rendering half of AC-2. Manual: AC-3 through AC-6 and AC-8 need a live upload        → AC-1 AC-2 AC-7
## Acceptance-criteria coverage
- AC-1 covered by step upload PDF with diagram page · AC-2 covered by step Blob URL plus model call · AC-3 covered by step stored result with page number · AC-4 covered by step text page never sent · AC-5 covered by steps no credit change plus usage row check · AC-6 covered by step forced page failure · AC-7 covered by steps owner 200, stranger 404, anonymous 401 · AC-8 covered by step scan gates Baseten call
