# Verify: UI foundation tokens and primitives · spec 0047 · updated 2026-11-04
_Steps derived from spec 0047 acceptance criteria. `/verify-release` runs these; `/test-engineer` locks the durable ones._
## UI / manual
- [ ] Add PageHeader to any page → title reads as the page h1 with actions beside it on wide screens → AC-2
- [ ] Render TrioPicker empty → Day, Month, Year placeholders show; pick 31 Jan 2023, switch month to Feb → day clamps to 28 → AC-8
- [ ] Emulate a small touch screen → native date input appears and a picked date reports back → AC-8
## Commands
- [ ] `pnpm vitest run tests/components/trio-picker.test.tsx tests/components/page-header.test.tsx` → 13 pass → AC-2, AC-8
- [ ] `pnpm ui:check` → hex-literal plus bespoke-radius show zero new, inventory 66 of 66 → AC-4
- [ ] `git diff app/globals.css` → primary tokens untouched, shadow opacity moved 0.16 to 0.12 → AC-1
- [ ] `pnpm typecheck` → no errors in new files → all AC
## Acceptance-criteria coverage
- AC-1 … covered by diff step · AC-2 … covered by render plus tests · AC-3 … human reviewer rule at page builds · AC-4 … covered by ui check step · AC-5 … covered by code read of reused shapes · AC-6 … covered by token grep with zero raw values · AC-7 … deferred to example page proof in page specs · AC-8 … covered by tests · AC-9 … covered by clean status with no migration and no env change
