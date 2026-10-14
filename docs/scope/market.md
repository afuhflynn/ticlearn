# Market

Slice 1, the first ten minutes, plus the search surface that brings people to it. Nine features: what a stranger lands on, understands, signs up for, and knows what to do with, without uploading anything, and the public pages that let a student find us and an assistant quote us.

(basis: research/design-reference.md §3 and §5 · research/audience-and-market.md §6 · research/seo-and-rendering.md)

## Slice 1: First ten minutes

### 14. Landing page rebuild · needs a decision · GA
The current page sells GCE A Level to secondary school students. Research on the Cameroonian market is blunt about what works: name the universities, show the mobile money logos above the fold, show a peer count you can defend, show the download size and the data cost, and put a live WhatsApp link on every page. A semester countdown to the next exam block is the cheapest conversion asset we own.
**Done when:** the first screen names Buea and Bamenda and states what is free, the mobile money logos and the semester price are visible without scrolling, a defensible student count appears, the download size and its rough cost in XAF are stated, and a working WhatsApp link and phone number are on the page and on the not found page.

NOTE: This is just a suggestion and not an absolute design to recopy but just for inspiration. You can reference this image to steal tips from in: "../../template_images/ticlearn.png"
- [ ] Design it (spec): `/solution-architect landing page rebuild`

### 15. Public page set · needs a decision
About, FAQ, contact, terms and privacy. Today the FAQ data lives in a constants file, the contact form injects raw user text into an admin email with no rate limit, and every page carries GCE metadata. Research found that every credible competitor publishes a real phone number and a working WhatsApp link, and that the ones with dead links lose trust immediately.
**Done when:** every public page carries working contact details and correct university metadata, the FAQ answers the questions research says students actually ask about cost, data use and offline access, and the contact form is escaped and rate limited.
- [ ] Design it (spec): `/solution-architect public page set`

### 16. Onboarding · needs a decision · GA
Today the wizard asks school level and subject, which is meaningless now. A first pass shipped: one question, year of study, then straight to uploading a note. Institution, faculty and course are deliberately not collected, because the schema holds one academic fact and a four question form loses signups before it starts. Research says ask institution, then faculty, then year, then courses, so treat that as the shape only if a later slice earns it.
**Done when:** the level only flow is the shipped default and takes under a minute, the level reaches the tutor and the readiness engine, it is skippable and correctable from settings, and any return to institution, faculty or course is a separate decision with its own spec.
- [ ] Design it (spec): `/solution-architect onboarding`

(basis: research/design-reference.md §1 · both local competitors identify students by WhatsApp number and not by email, and forty eight percent of signups were lost at one role question)

### 17. Pricing page · needs a decision · GA
Research is clear that a month to month subscription is the wrong shape here and that a semester pass around 2,500 XAF sits in the proven band. One local competitor's own pricing page shows identical bullets across three tiers, which the research calls the single biggest trust destroyer in this market. Ours will not ship that way.
**Done when:** the page shows genuinely different contents per tier, the semester is the default unit with the monthly equivalent shown as a secondary line, there is no auto renewal language anywhere, the payment gateway and both mobile money providers are named, and the free tier is described honestly rather than hidden.
- [ ] Design it (spec): `/solution-architect pricing page`

(basis: research/audience-and-market.md §8 · a proven consumer band of 1,600 to 5,000 XAF a month and a hard floor of 500 XAF and a ceiling of 18,500 XAF observed in the market)

### 36. Technical SEO foundation · needs a decision · GA
Today no page emits a social image, so every share into a WhatsApp group, which is how sharing actually happens here, renders with no picture. Six of seven public pages ship a secondary school description, three of them cannot even carry metadata because they are marked as client components, and there are no canonicals, no alternate language links, and one structured data component that is dead code. Authed pages are simultaneously blocked in robots and marked indexable, which is contradictory.
**Done when:** every public page emits a title, a description written for this audience, a canonical, a share image at the size WhatsApp wants and a Twitter card, the sitemap lists every public URL and nothing authed, one central rule keeps signed in pages out of the index without hiding pages we want, alternate language links treat English and French as separate markets rather than translations, and the structured data on each page is a type that genuinely applies.
- [ ] Design it (spec): `/solution-architect technical SEO foundation`

(basis: research/seo-and-rendering.md §1 and §3 · eight competitors ship zero structured data, so it is uncontested ground, and the WhatsApp share image is the single highest return fix in the set)

### 37. Public course and faculty catalogue · needs a decision · GA
This is the thing that wins the market. There is no university, faculty, department or course model in the schema today, everything hangs off a school level, and without it there is nothing for a student or a search engine to land on. The competitor ranked first for the main query has one page, no sitemap, no canonicals and no internal links. The market is winnable on structure alone.
**Done when:** a public indexable page exists for each university, each faculty, each department and each course, each names its parent in the chain and links sideways to its siblings, each is reachable from the sitemap and from internal links, each prerenders or caches rather than rendering per request, and the chain matches the taxonomy in feature 5.
- [ ] Design it (spec): `/solution-architect public course and faculty catalogue`

(basis: research/seo-and-rendering.md §2 and §8 · no search volume data is available at Cameroon level for any tool, so the strategy is deliberately built on structure and internal linking rather than on guessed keyword volume)

### 38. Public guides and study content · needs a decision
A full long form guide model already exists in the schema with markdown, and it has no public page and an API route that refuses anonymous requests, so a built asset is entirely invisible. Guides are how a student finds us, how they share us, and how an AI assistant quotes us. We do not need a public past paper archive, because there is none, so this is the content surface that carries first hand material instead.
**Done when:** a guide is published by an admin, appears on a public indexable page under the right course, is reachable from the sitemap and from the course page, is shareable with a correct preview, can be revised without a rebuild, and every passage is structured so an answer engine can quote it cleanly.
- [ ] Design it (spec): `/solution-architect public guides and study content`

(basis: research/seo-and-rendering.md §4 and §6 · first hand material nobody else has is the main lever for being cited by an answer engine, and keyword stuffing was measured as no help while citing sources and adding statistics gives a real lift)

### 39. GEO and AI answer readiness · needs a decision
Students increasingly ask an assistant instead of a search engine. The rules are specific and mostly opposite to the folklore: citing sources, adding statistics and quoting sources measurably help, keyword stuffing and an authoritative tone measurably do not. Allow the search bots for every provider and block the training bots, and note that each provider sends three distinct bots, not one.
**Done when:** the robots rules allow every AI search crawler and block every training crawler, the edge guard actually reaches those rules rather than short circuiting before them, the organisation and course entities are described consistently everywhere they appear, and we can see which of our pages get cited by an answer engine.
- [ ] Design it (spec): `/solution-architect GEO and AI answer readiness`

(basis: research/seo-and-rendering.md §4 · blocking the search bots has a named traffic cost while blocking the training bots has none, so the default is not to block)

### 40. Metadata and sharing cards · needs a decision · GA
Sharing happens over WhatsApp here, and WhatsApp reads the social image, not the Twitter one. The one page built specifically to be shared, the result card, has no metadata generation at all and an image with no declared size, so it shifts layout as it loads. Decide what a title and description say for this audience, whether social images are generated per course or per result, and at what size.
**Done when:** every shareable surface has an authored or templated title and description that name the university and the course rather than speaking in generalities, share images are the size WhatsApp renders without cropping, images declare their dimensions so nothing shifts as they load, and a share card is generated per course rather than per individual result.
- [ ] Design it (spec): `/solution-architect metadata and sharing cards`

(basis: research/seo-and-rendering.md §5 · the research recommends per course over per result, because per result is unbounded and a student's result is not what makes another student sign up)
