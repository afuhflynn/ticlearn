# Commerce

Slice 5, the money. Research is unusually clear here: a month to month subscription is the wrong shape for this audience, a semester pass is the right one, the free tier has to cap AI rather than the archive, and the paywall belongs at the moment of value rather than at the door.

(basis: research/audience-and-market.md §5, §6, §7, §8 · research/performance-and-database.md §4)

## Slice 5: Money

### 28. Semester pass plans and limits · needs a decision · GA
Replace the current four monthly plans with a free tier and three semester passes. Every tier resets on the academic calendar rather than on the purchase date, so buying in November runs to the end of the academic year. The free tier never expires and never gates the past paper archive, because that is where the habit and the reputation live. Each tier gets its own honest allowance stated in human terms rather than as credits.
**Done when:** the tiers are a free tier plus a semester pass, a larger pass and a year pass, each resetting on the academic calendar, the free tier allows unlimited viewing and a real but limited number of AI questions per semester, an internal meter protects the AI cost, and top ups are available in round mobile money friendly amounts when a student runs out.
- [ ] Design it (spec): `/solution-architect semester pass plans and limits`

(basis: research/audience-and-market.md §7 and §8 · heavy AI use costs about 130 to 200 XAF a month per student against a 2,500 XAF pass, so the AI allowance is well over ninety percent margin, and September is the worst month to ask for money because registration has just drained the family)

### 29. Mobile money payments for the pass · needs a decision · GA
Payments run through Fapshi today. Research is specific about the failure mode that loses the sale: a PIN timeout shown to the student as an error, and payment only working on WiFi. The webhook currently grants a subscription when its secret is unset, and that is fixed upstream in [Security](../platform.md#2-security-and-integrity-hardening).
**Done when:** MTN Mobile Money is the primary path with Orange Money always present, the amount is chosen from buttons rather than typed, an abandoned or timed out PIN reads as normal rather than as an error, a payment that is pending shows the student what happens next, the receipt arrives by email, and no payment can be replayed.
- [ ] Design it (spec): `/solution-architect mobile money payments for the pass`

(basis: research/design-reference.md §12 · PIN timeouts are the top payment failure in this market and should not be surfaced as errors; research/audience-and-market.md §3 · MTN dominates the Southwest and Anglophone student belt, so MTN is first, never Orange first)

### 30. Free tier conversion surfaces · needs a decision · GA
The free tier has to work on its own and still lead somewhere. Research found freemium converts around two percent at thirty five days, that rest of world conversions land late and need reminders, and that a soft paywall at the moment of value outperforms a wall at the door. Our own advice said premium first, then let them sample.
**Done when:** the free tier is genuinely useful on its own, every place a student hits a limit explains the limit and what the pass adds, the prompt to upgrade appears at the moment the value is proven rather than at sign up, the upgrade screen shows the semester price with mobile money visible, and a student who can never pay is not blocked from the archive.
- [ ] Design it (spec): `/solution-architect free tier conversion surfaces`

(basis: research/audience-and-market.md §5 · showing premium first then letting the student sample is documented as increasing conversion, which directly challenges the default of hiding the paid tier)

### 31. Campus ambassadors · needs a decision
A student who refers enough people earns a free semester pass. Costs nothing, pays in acquisition, and every ambassador becomes a trusted local advocate. A faculty or student union buying seats in bulk is the same mechanism at larger scale and is left for the [deferred](../index.md#deferred) list.
**Done when:** a student can share a referral link, a referred student who upgrades credits the referrer, a referrer who reaches the threshold receives a semester pass automatically, and the programme is described honestly with no income promise dressed as a prize.
- [ ] Design it (spec): `/solution-architect campus ambassadors`

(basis: research/audience-and-market.md §7 · this is the hardship route as a business asset rather than charity, and it monetises the students who cannot pay through the students who can)

### 32. Conversion analytics · needs a decision
Nothing today tells us whether the free tier converts, which tier converts, or which provider actually served each answer. Without this we are pricing on inference, and the research found no published Cameroonian student willingness to pay study at all.
**Done when:** sign up, first note, first AI answer, first quiz, first limit hit, first upgrade and first completed purchase are all tracked, the fallback rate between the two search providers is measurable, per student AI cost in XAF is visible, and the admin can answer what converts without running a query by hand.
- [ ] Design it (spec): `/solution-architect conversion analytics`
