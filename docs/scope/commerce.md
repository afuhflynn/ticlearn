# Commerce

Slice 5, the money. Research is unusually clear here: a month to month subscription is the wrong shape for this audience, a semester pass is the right one, the free tier has to cap AI rather than the archive, and the paywall belongs at the moment of value rather than at the door.

(basis: research/audience-and-market.md §5, §6, §7, §8 · research/performance-and-database.md §4)

## Slice 5: Money

### 28. Semester pass plans and limits · GA · in-progress
Free plus small weekly passes plus one semester pass. The free tier never expires and never locks the student notes. Paid tiers state plain counts for notes plus quizzes plus Tip messages per term. No tier prints the word Unlimited. Credits stay inside as the cost meter only.
**Done when:** a stranger sees Free plus weekly plus semester only, each paid tier shows counts like 10 notes plus 20 quizzes plus 50 Tip messages a day, no screen prints Unlimited, free allows 5 notes plus 10 quizzes plus 15 Tip messages a day, overuse invites a weekly or semester upgrade, and admin can adjust counts without a code change.
- [x] Design it (spec): `/solution-architect semester pass plans and limits`
- [x] Build it: `/feature-build semester pass plans and limits`
  - [x] Catalogue plus limits plus resolved read (covers AC-1 to AC-6)
  - [x] Purchase thread plus poll (covers AC-7, AC-9)
  - [x] Student surfaces plus prompt (covers AC-5, AC-8, AC-11)
  - [x] Receipt plus trail plus overrides plus ledger (covers AC-10, AC-12, AC-13, AC-14)
- [ ] Verify it: `/verify-release semester pass plans and limits`
- [ ] Test it: `/test-engineer semester pass plans and limits`
- [ ] Review it (fresh model): `/peer-review semester pass plans and limits`
- [ ] Document it: `/tech-writer semester pass plans and limits`
Spec 0033 [0033](../specs/0033-semester-pass-plans-and-limits.md)

(basis: research/audience-and-market.md §7 and §8 · heavy AI use costs about 130 to 200 XAF a month per student against a 2,500 XAF pass, so the AI allowance is well over ninety percent margin, and September is the worst month to ask for money because registration has just drained the family)

### 29. Mobile money payments for the pass · GA · in-progress
Payments run through Fapshi today. Research is specific about the failure mode that loses the sale: a PIN timeout shown to the student as an error, and payment only working on WiFi. The webhook currently grants a subscription when its secret is unset, and that is fixed upstream in [Security](platform.md#2-security-and-integrity-hardening--ga).
**Done when:** MTN Mobile Money leads with Orange Money always present, amounts come from buttons, a timed out PIN reads as normal and invites a retry, a pending payment shows what happens next plus a recheck action, the receipt arrives by email, the webhook uses the stored amount, a retry reuses the same row, and no payment can be replayed to grant twice.

And given that we are having some kind of credit based business model, then users too can decide to type in the amount to pay and then purchase an amount of credits appropriate for what they paid for right?
- [x] Design it (spec): `/solution-architect mobile money payments for the pass`
- [x] Build it: `/feature-build mobile money payments for the pass`
  - [x] Migration plus resolved read (covers AC-1, AC-3)
  - [x] Pass plus credit threads with webhook guard (covers AC-1, AC-3, AC-7, AC-8, AC-9, AC-11)
  - [x] Student pending plus receipt plus feel (covers AC-2, AC-4, AC-5, AC-6, AC-12)
  - [x] Hardening plus admin plus trail (covers AC-10, AC-11)
- [ ] Verify it: `/verify-release mobile money payments for the pass`
- [ ] Test it: `/test-engineer mobile money payments for the pass`
- [ ] Review it (fresh model): `/peer-review mobile money payments for the pass`
- [ ] Document it: `/tech-writer mobile money payments for the pass`
Spec 0034 [0034](../specs/0034-mobile-money-payments/index.md) · code in `lib/mobile-money.ts`, `lib/subscription-fulfillment.ts`, `app/api/payment/`, `app/api/credits/purchase/`, `app/api/admin/payments/`, `app/(dashboard)/subscription/page.tsx`

(basis: research/design-reference.md §12 · PIN timeouts are the top payment failure in this market and should not be surfaced as errors; research/audience-and-market.md §3 · MTN dominates the Southwest and Anglophone student belt, so MTN is first, never Orange first)

### 30. Free tier conversion surfaces · GA · in-progress
The free tier has to work on its own and still lead somewhere. Research found freemium converts around two percent at thirty five days, that rest of world conversions land late and need reminders, and that a soft paywall at the moment of value outperforms a wall at the door. Our own advice said premium first, then let them sample.
**Done when:** free works alone for notes plus quiz plus Tip within its counts, every limit notice names the limit plus what weekly or semester adds, the upgrade prompt appears when value is proven, the upgrade screen shows weekly and semester prices with mobile money marks visible, and notes stay open for a student who never pays.
- [x] Design it (spec): `/solution-architect free tier conversion surfaces`
- [x] Build it: `/feature-build free tier conversion surfaces`
  - [x] Event plus notice plus upgrade page (covers AC-2, AC-5, AC-7)
  - [x] Value triggers plus quiet rules (covers AC-3, AC-4, AC-6)
  - [x] Proof plus hardening (covers AC-1, AC-7, AC-8)
- [ ] Verify it: `/verify-release free tier conversion surfaces`
- [ ] Test it: `/test-engineer free tier conversion surfaces`
- [ ] Review it (fresh model): `/peer-review free tier conversion surfaces`
- [ ] Document it: `/tech-writer free tier conversion surfaces`
Spec 0035 [0035](../specs/0035-free-tier-conversion-surfaces/index.md) · code in `app/api/prompts/event/`, `components/upgrade/`, `app/(dashboard)/subscription/`, `lib/day.ts`

(basis: research/audience-and-market.md §5 · showing premium first then letting the student sample is documented as increasing conversion, which directly challenges the default of hiding the paid tier)

### 31. Campus ambassadors · in-progress
A student who refers enough people earns a free semester pass. Costs nothing, pays in acquisition, and every ambassador becomes a trusted local advocate. A faculty or student union buying seats in bulk is the same mechanism at larger scale and is left for the [deferred](index.md#deferred) list.
**Done when:** a student can share a referral link over WhatsApp, a referred student who upgrades credits the referrer only after verified email, self referral never pays, a referrer who reaches the threshold receives a semester pass automatically, and the programme promises a pass for referrals only with no income claim.
- [x] Design it (spec): `/solution-architect campus ambassadors`
- [x] Build it: `/feature-build campus ambassadors`
  - [x] Attribution thread plus auto grant (covers AC-2, AC-3, AC-4, AC-5, AC-6, AC-12)
  - [x] Student plus admin surfaces plus copy honesty (covers AC-1, AC-9, AC-10, AC-11)
  - [x] Expiry plus fraud plus single grant guard (covers AC-7, AC-8)
- [ ] Verify it: `/verify-release campus ambassadors`
- [ ] Test it: `/test-engineer campus ambassadors`
Spec 0036 [0036](../specs/0036-campus-ambassadors/index.md) · code in `lib/ambassadors/`, `app/r/[code]/`, `app/api/ambassadors/`, `app/api/admin/ambassadors/`, `app/(dashboard)/ambassadors/`, `app/(admin)/admin/ambassadors/`

(basis: research/audience-and-market.md §7 · this is the hardship route as a business asset rather than charity, and it monetises the students who cannot pay through the students who can)

### 32. Conversion analytics · in-progress
Nothing today tells us whether the free tier converts, which tier converts, or which provider actually served each answer. Without this we are pricing on inference, and the research found no published Cameroonian student willingness to pay study at all.
**Done when:** sign up plus first note plus first Tip answer plus first quiz plus first limit hit plus first upgrade plus first completed purchase are tracked, weekly versus semester take rate is visible, pending to paid rate is visible, fallback rate between search providers is visible, per student AI cost in XAF is visible, and admin sees it without a manual query.
- [x] Design it (spec): `/solution-architect conversion analytics`
Spec 0037 [0037](../specs/0037-conversion-analytics/index.md)
- [x] Build it: `/feature-build conversion analytics`
  - [x] Funnel plus take rates on the monetization tab (covers AC-1, AC-2, AC-7)
  - [x] Money plus cost with zero plus note behavior (covers AC-3, AC-5, AC-8)
  - [x] Fallback plus hardening with totals only guard (covers AC-4, AC-6, AC-8)
  - code in `lib/kpi.ts`, `app/api/admin/metrics/route.ts`, `app/(admin)/admin/metrics/page.tsx`
- [ ] Verify it: `/verify-release conversion analytics`
- [ ] Test it: `/test-engineer conversion analytics`

### 43. Affiliate invites for partners · needs a decision · from spec 0014
Today any signed in student becomes a paying affiliate by loading `/affiliate`, and 500 credits are paid at signup before email verification. The owner wants the opposite: no student can create a link or see the page, an admin invites a chosen person, and only that person sees their partner stats.
**Done when:** only an admin can create an affiliate, the invite starts as PENDING and the admin approves to ACTIVE, no open route creates an affiliate row, an uninvited student sees no page and no entry, attribution needs verified email, the signup award cannot double pay on retry, payout moves REQUESTED to PAID and clears pending only while lifetime total stays intact, and partner screens never show referee emails.
- [ ] Design it (spec): `/solution-architect affiliate invites`

(basis: spec 0014 surface audit · the current GET creates a payable active affiliate on page load, the apply route updates outside its transaction so a parallel double submit pays twice, and admin payout decrements the lifetime total)

### 45. Dashboard subscription page reconciliation · needs a decision · from spec 0019
Spec 0019 rebuilds the public pricing page around Free plus one Semester Pass, but the in app subscription page still sells three monthly plans with its own price map, feature copy and credit discounts. A signed in student therefore sees a second, different offer from the one the public page just showed them.
**Done when:** the dashboard shows the same Free plus weekly plus semester offer as `/pricing`, the upgrade action leads to the same payment path, price plus feature copy plus credit notes all read `constants/plans.ts`, and no screen prints a plan the public page does not sell.
- [ ] Design it (spec): `/solution-architect dashboard subscription reconciliation`

(basis: spec 0019 follow-up · the dashboard grid and the public page would otherwise stay two offers, and the credits copy is a separate balance that must not be folded into the catalogue)
