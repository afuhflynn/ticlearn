# Verify: campus ambassadors · spec 0036 · updated 2026-11-01
_Steps derived from spec 0036 acceptance criteria. `/verify-release` runs these; `/test-engineer` locks the durable ones._
## UI / manual
- [ ] Open `/ambassadors` signed in → see personal link plus code plus WhatsApp button → AC-1
- [ ] Tap WhatsApp share → preset text names Semester Pass, no income words → AC-1, AC-11
- [ ] Open `/r/YOURCODE` signed out → lands on `/sign-up?ref=YOURCODE` with invite code prefilled → AC-1, AC-2
- [ ] Sign up with password through link → verify email → progress shows 1 pending friend → AC-2, AC-6
- [ ] Repeat through Google signup → same attribution and progress shape → AC-6
- [ ] Ambassador progress: qualified count plus remaining plus pending and expired rows read clearly → AC-9
- [ ] Sign up with own code (same email) → never counts, stays unqualified → AC-4
- [ ] Friend verifies email plus pays for pass or credits → row turns Qualified → AC-3
- [ ] Third friend qualifies → referrer receives Semester Pass automatically with notice, no admin step → AC-5
- [ ] Fourth friend qualifies after grant → nothing changes, still one pass → AC-8
- [ ] Admin opens `/admin/ambassadors` → sees referrers plus counts → flags one row → revoke ends pass now → AC-10
- [ ] Share text on student, progress, and admin screens contains pass promise and no income words → AC-11
- [ ] Fire the Fapshi webhook twice with the same transId → one grant, friend counted once → AC-12
- [ ] Share link value matches `User.referralCode` plus site origin plus `/r/<code>` → Value sourcing 1
- [ ] Remaining value equals 3 minus qualified count floored at zero → Value sourcing 4
- [ ] Expired row (attach plus 180 days passed) never qualifies after expiry → Value sourcing 7, AC-7
## Commands
- [ ] `pnpm vitest run tests/lib/ambassadors/copy.test.ts` → 1 passed → AC-11
- [ ] `pnpm tsc --noEmit` → clean → build integrity
- [ ] `pnpm ui:check` → OK, spinner-loader 0 → loading rules
## Acceptance-criteria coverage
- AC-1 covered by steps 1, 2, 3 · AC-2 covered by steps 3, 4 · AC-3 covered by step 8 · AC-4 covered by step 7 · AC-5 covered by step 9 · AC-6 covered by steps 4, 5 · AC-7 covered by expiry step · AC-8 covered by step 10 · AC-9 covered by step 6 · AC-10 covered by step 11 · AC-11 covered by steps 2, 12 · AC-12 covered by step 13
