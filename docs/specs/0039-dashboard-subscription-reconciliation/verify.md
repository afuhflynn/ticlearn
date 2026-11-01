# Verify: dashboard subscription reconciliation · spec 0039 · updated 2026-11-01
_Steps derived from spec 0039 acceptance criteria. `/verify-release` runs these; `/test-engineer` locks the durable ones._
## UI / manual
- [ ] Open `/pricing` signed out → three cards Free plus Weekly Pass plus Semester Pass, each with label plus price plus period plus features plus CTA → AC-1
- [ ] Sign in, open `/subscription` → same three passes with identical prices and counts, no retired plan, no Unlimited word → AC-1, AC-3, AC-6
- [ ] Press Start Weekly Pass on `/pricing`, then on `/subscription` → Fapshi link followed, no phone or provider inputs on either page → AC-2
- [ ] With an ACTIVE pass, press buy again → message names the current plan and its end date (Douala format), API returns 409 → AC-7
- [ ] Confirm the credit top up card is gone (no amount, provider, or phone inputs) → AC-4
- [ ] Confirm the manual Mobile Money card is gone (no plan picker, paid-with picker, or transaction ID input) → AC-5
- [ ] Start a payment and wait → pending box reads Finish the payment on your phone, then come back to this page, shows the full transId with a copy button, Still waiting on the phone prompt, and Recheck now → AC-8
- [ ] After the webhook lands → receipt reads plan label plus amount FCFA plus paid date plus full Transaction id plus keep it for support → AC-8
- [ ] First visit shows the subscription skeleton; refresh keeps content with a thin bar at the top; any spinner sits only inside the acting button → AC-9
- [ ] Period line reads per 7 days under Weekly, per semester under Semester, forever under Free — per week never appears → value sourcing
- [ ] FREE row shows Current plan when current, else Included in every account and disabled; paid rows show Current plan when current, else the catalogue CTA → value sourcing
- [ ] Usage card counts match `/api/usage` and the reset line reads Africa Douala midnight → value sourcing
- [ ] Credits line is info only with no buy action → value sourcing
- [ ] End date math: WEEKLY is activatedAt plus 7 days, PRO plus 5 months, null activatedAt reads as contact support with the transId → value sourcing
## Commands
- [ ] `pnpm tsc --noEmit` → clean → AC-1…AC-9 (build integrity)
- [ ] `pnpm vitest run tests/constants/plans.test.ts tests/lib/plan-limits.test.ts tests/app/api/payment/initiate.test.ts tests/app/api/subscription/manual.test.ts tests/components/marketing/pricing-plans.test.tsx tests/app/\(dashboard\)/subscription/page.test.tsx` → 61 passed → AC-1, AC-2, AC-5, AC-6, AC-7
- [ ] Confirm no STARTER, STANDARD, or PREMIUM subscription rows exist in production before release, and the manual route returns 410 → migration plan
## Acceptance-criteria coverage
- AC-1 … covered by pricing grid step, subscription grid step, copy truth step
- AC-2 … covered by plan-only initiate step on both pages
- AC-3 … covered by identical-counts step (no local strings)
- AC-4 … covered by top-up-gone step
- AC-5 … covered by manual-gone step and manual 410 command
- AC-6 … covered by three-keys catalogue step and plans test
- AC-7 … covered by ACTIVE 409 step and initiate test
- AC-8 … covered by pending and receipt steps
- AC-9 … covered by skeleton plus refresh-bar step
