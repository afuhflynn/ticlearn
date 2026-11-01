# Verify: mobile money payments for the pass · spec 0034 · updated 2026-11-01
_Steps derived from spec 0034 acceptance criteria. `/verify-release` runs these; `/test-engineer` locks the durable ones._
## UI / manual
- [ ] Buy a WEEKLY pass with MTN plus a valid phone → Fapshi page → approve PIN → return → pending panel shows waiting words with no error term plus recheck plus transaction id → ACTIVE plus receipt (plan label plus amount plus reference plus Douala paid date) plus receipt email → AC-1, AC-5, AC-6, AC-7
- [ ] Type 1000 XAF in the credit box → preview reads 5000 credits → buy with Orange → same flow → balance rises by 5000 → AC-1, AC-3
- [ ] Ignore the PIN until it times out → panel still reads normal waiting, never the word error → press Recheck now → row reused, no new row, no double grant → AC-4, AC-8
- [ ] Leave a pending buy for 5 minutes → auto poll stops at Recheck 60 of 60 → support hint with the transaction id plus help link → AC-5
- [ ] Upgrade dialog shows MTN first then Orange, amounts from plan buttons only, no typed pass amount → AC-2, AC-3
- [ ] First load of the subscription page shows a skeleton; the PIN wait shows a numbered bar; the only spinner is inside the pressed button → AC-12
- [ ] Change a plan price in PlanOverride → new initiate charges the new price while old rows keep the stored amount → AC-3, AC-7
## Commands
- [ ] `pnpm exec tsc --noEmit` → clean → AC-1…AC-12
- [ ] `pnpm vitest run tests/app/api/payment tests/app/api/webhooks tests/lib/fapshi.test.ts tests/lib/mobile-money.test.ts` → pass → AC-3, AC-4, AC-7, AC-8, AC-9, AC-11
- [ ] `pnpm ui:check` → OK (no raw aria, no outside-button spinner) → AC-12
- [ ] Webhook with bad secret → 401; with secret unset → 503; with mismatched amount → 200 with PENDING plus support note → AC-7
- [ ] Status poll on another student's transId → 403; unknown transId → 404; `GET /api/admin/payments` as non admin → 403 → AC-11
## Acceptance-criteria coverage
- AC-1 covered by pass buy step, credit buy step, Commands suite
- AC-2 covered by provider order step
- AC-3 covered by credit math step (500 gives 2500, 3000 gives 15000), price override step, Commands suite
- AC-4 covered by timeout step
- AC-5 covered by pending plus 5-minute steps
- AC-6 covered by receipt plus email step
- AC-7 covered by webhook secret plus mismatch steps, Commands suite
- AC-8 covered by retry reuse step, Commands suite
- AC-9 covered by Commands suite (one award per row, replay guard)
- AC-10 covered by missed-webhook heal: confirm SUCCESSFUL on Fapshi with no webhook → status poll marks ACTIVE once
- AC-11 covered by 403 plus 404 plus admin steps, Commands suite
- AC-12 covered by skeleton plus numbered bar plus spinner step
