# Market

Slice 1, the first ten minutes. What a stranger lands on, understands, signs up for, and knows what to do with, without uploading anything. Four features.

(basis: research/design-reference.md §3 and §5 · research/audience-and-market.md §6)

## Slice 1: First ten minutes

### 14. Landing page rebuild · needs a decision · GA
The current page sells GCE A Level to secondary school students. Research on the Cameroonian market is blunt about what works: name the universities, show the mobile money logos above the fold, show a peer count you can defend, show the download size and the data cost, and put a live WhatsApp link on every page. A semester countdown to the next exam block is the cheapest conversion asset we own.
**Done when:** the first screen names Buea and Bamenda and states what is free, the mobile money logos and the semester price are visible without scrolling, a defensible student count appears, the download size and its rough cost in XAF are stated, and a working WhatsApp link and phone number are on the page and on the not found page.
- [ ] Design it (spec): `/solution-architect landing page rebuild`

### 15. Public page set · needs a decision
About, FAQ, contact, terms and privacy. Today the FAQ data lives in a constants file, the contact form injects raw user text into an admin email with no rate limit, and every page carries GCE metadata. Research found that every credible competitor publishes a real phone number and a working WhatsApp link, and that the ones with dead links lose trust immediately.
**Done when:** every public page carries working contact details and correct university metadata, the FAQ answers the questions research says students actually ask about cost, data use and offline access, and the contact form is escaped and rate limited.
- [ ] Design it (spec): `/solution-architect public page set`

### 16. Onboarding · needs a decision · GA
Today's wizard asks school level and subject, which is meaningless now. Research says ask institution, then faculty, then year, then courses, because that is how content partitions and because a first year student may not know their programme name yet. A published onboarding teardown shows a single role question losing about half the signups, so fold what can be folded and make the rest skippable.
**Done when:** a new student picks their institution, faculty, year of study and courses in a flow that takes under two minutes, can skip any step and come back, the profile is used by the tutor and the readiness engine, and every step is reachable from settings later.
- [ ] Design it (spec): `/solution-architect onboarding`

(basis: research/design-reference.md §1 · both local competitors identify students by WhatsApp number and not by email, and forty eight percent of signups were lost at one role question)

### 17. Pricing page · needs a decision · GA
Research is clear that a month to month subscription is the wrong shape here and that a semester pass around 2,500 XAF sits in the proven band. One local competitor's own pricing page shows identical bullets across three tiers, which the research calls the single biggest trust destroyer in this market. Ours will not ship that way.
**Done when:** the page shows genuinely different contents per tier, the semester is the default unit with the monthly equivalent shown as a secondary line, there is no auto renewal language anywhere, the payment gateway and both mobile money providers are named, and the free tier is described honestly rather than hidden.
- [ ] Design it (spec): `/solution-architect pricing page`

(basis: research/audience-and-market.md §8 · a proven consumer band of 1,600 to 5,000 XAF a month and a hard floor of 500 XAF and a ceiling of 18,500 XAF observed in the market)
