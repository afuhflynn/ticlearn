# Verify: free tier conversion surfaces · spec 0035 · updated 2026-11-01
_Steps derived from spec 0035 acceptance criteria. `/verify-release` runs these; `/test-engineer` locks the durable ones._
## UI / manual
- [ ] Free student studies notes plus quiz plus Tip within counts, all open, no invite shows → AC-1
- [ ] Free student passes a quiz with 60 percent, sees full invite with used plus cap plus weekly plus semester plus both prices plus link → AC-2, AC-3
- [ ] Same student hits Tip cap, sees soft pause with dismiss, notes still open and read, second hit same Douala day shows short link only → AC-4, AC-6
- [ ] Dismiss the invite, reload same day, no full prompt returns, next active day shows at most one retry → AC-6
- [ ] Block the offer read, reload upgrade dialog, see saved offer plus retry note, payment waits for fresh read, study keeps working → AC-8
- [ ] Hit the quiz cap, response carries upgrade code plus used plus cap → AC-4
- [ ] Open `/subscription`, confirm Free plus Weekly 500 XAF plus Semester 3000 XAF, MTN first, Orange present, same copy as public pricing → AC-5
- [ ] Sign out, POST `/api/prompts/event` returns 401 → AC-7
## Commands
- [ ] `pnpm test --run tests/lib/day.test.ts tests/lib/upgrade-prompt-state.test.ts tests/app/api/prompts-event.test.ts tests/app/api/admin-conversion.test.ts` → all pass → AC-1, AC-6, AC-7, AC-8
- [ ] `pnpm ui:check` → passes with no new raw aria → loading rules
- [ ] `pnpm exec tsc --noEmit` → passes → build health
## Acceptance-criteria coverage
- AC-1 covered by free study step plus free counts test · AC-2 covered by pass plus cap steps · AC-3 covered by pass step · AC-4 covered by cap plus upgrade code steps · AC-5 covered by subscription step · AC-6 covered by dismiss plus short form steps · AC-7 covered by auth plus admin conversion steps · AC-8 covered by blocked offer step
## Value sourcing
- [ ] Inline used plus cap reads from `/api/usage`, lifetime quiz plus daily Tip, note used counts uploads only, vary a fresh versus capped account
- [ ] Weekly plus semester counts plus prices read from `/api/plans` resolved offer, never hardcoded, change an admin override and reload both notice and upgrade page
- [ ] Full versus short reads showFull from server Douala day check, never browser storage, clear storage and reload, form stays short
- [ ] First pass triggers once per quiz at 50 percent plus, retakes do not retrigger, retake same quiz
- [ ] Dismiss quiet uses last dismissed date, dismiss today then check quiet
- [ ] Upgrade page renders from same resolved offer plus MTN first marks, compare with `/pricing`
- [ ] Upgrade start writes upgrade_start with plan, click pass then check admin conversion
- [ ] Admin counts group KpiEvent per day last 30 days plus ACTIVE subs, open metrics monetization tab
- [ ] Resets at label uses Douala midnight ISO, check near midnight Douala
- [ ] Offer cache uses 5 minute stale, failed events retry once in background, go offline then online
