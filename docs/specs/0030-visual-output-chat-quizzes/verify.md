# Verify: visual output in chat and quizzes · spec 0030 · updated 2026-10-30
_Steps derived from spec 0030 acceptance criteria. `/verify-release` runs these; `/test-engineer` locks the durable ones._
## UI / manual
- [x] Seeded note with diagram pages, asked Tip about that diagram in the note chat → saved page image appears inline beside the answer with a page tag; tapping enlarges it → AC-1
- [x] Same answer on a small phone width → art stacks under the text, no sideways scroll, caption readable → AC-1, AC-7
- [x] Open quiz review for a question with sourcePages → first 3 page cards in sourcePages order plus an overflow count; retry panel shows drawn retry art beside the retry that produced it → AC-2
- [ ] Draw one fresh Mermaid diagram, open the page that shows it → nodes render with plain text labels, no empty boxes → AC-4
- [ ] Open the note reader, tap a page thumbnail → the view scrolls to that page scan with its drawn art underneath in reading order; unassigned art sits under Other diagrams → AC-3, AC-7
- [ ] Open the note reader → scan thumbnails scroll to the page; drawn art sits under its page block in reading order → AC-3
- [ ] Ask for a diagram with no matching note figure → fresh Mermaid or SVG diagram renders inline with caption; break the payload once (invalid SVG) → text answer still lands with a retry control → AC-4
- [x] Repeat the same draw 4 times in one UTC day → 4th returns the plain limit line with retry disabled → AC-6
- [ ] Open a screen reader pass on one art card and one failure notice → art alt text reads, notice reads as a live message → AC-7
## Commands
- [x] `pnpm vitest run tests/lib/visual-artifacts.test.ts` → 6 passed → AC-4, AC-5, AC-6
- [x] `pnpm ui:check` → OK → AC-7
- [x] `GET /api/artifacts?noteId=<foreign-id>` as another student → 404 with no data → AC-5
- [x] `POST /api/artifacts/generate` with a foreign noteId or answerId → 404 → AC-5
- [x] After a draw, check `AiUsageEvent` has one row with model plus latency and no `CreditTransaction` row → AC-6
- [ ] Submit markup carrying `<script>` through generate → stored payload has the script stripped → AC-5
## Acceptance-criteria coverage
- AC-1 covered by chat scan and zoom steps · AC-2 covered by quiz review step · AC-3 covered by note reader step · AC-4 covered by draw and invalid-output steps · AC-5 covered by foreign-id and script-strip steps · AC-6 covered by cap and usage-row steps · AC-7 covered by skeleton, notice, and screen-reader steps
