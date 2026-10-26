# 0022. Web search tooling: rationale

## Context

Tip is a tutoring agent for Cameroonian university students, and its only web search today is a single Tavily call inside `lib/ai/tools.ts`, opened with a `basic` or `advanced` depth. That call is a dead end when Tavily is degraded, it returns whichever shape Tavily happens to send, and nothing records which provider answered. There is also no second opinion available to the model, and no way to tell a rate limit from a genuinely empty answer.

Three forces shape what replaces it. The first is cost and quality together: Firecrawl returns clean markdown of the actual result pages in the same call and is three to ten times cheaper per call, which makes it the obvious primary rather than a preference. The second is the student's data allowance and phone, on a network where a 270,000 character page is not a convenience problem but a broken feature, so every result must be capped before the model reads it. The third is truth: when no provider can find anything, the answer has to say so, because a tutor that invents a citation is worse than a tutor that admits it could not check.

The consequence of not deciding is a search path that silently degrades, a bill nobody can attribute, and a model that reasons about infrastructure it cannot see.

## Options considered

### Option 1: Firecrawl only, degrade to the model's own knowledge

Drop the fallback and let a Firecrawl failure become an honest "I could not check online" answer.

**Pros**: One provider, one shape, one error set, and the simplest possible path. The cheapest option to build and operate.

**Cons**: Firecrawl's `429` at roughly 20 requests per minute was observed during research against a documented ceiling, so rate limits are real. A student would then get an answer with no web grounding at exactly the moment they asked for current information.

### Option 2: Firecrawl primary, Tavily fallback, provider hidden

One chain inside the code, two tools for two jobs, one normalised shape out.

**Pros**: The cheap and better shaped provider answers almost always, and the rare failure still produces a grounded answer. The fallback is measurable, so it stays rare. Provider choice never becomes a prompt problem.

**Cons**: Two response shapes, two error sets, a merge rule and a second set of keys to keep alive, forever. Roughly double the surface of option 1.

### Option 3: Tavily primary, Firecrawl fallback

Keep what runs today and add Firecrawl behind it.

**Pros**: No change to the current path, and the existing key already works.

**Cons**: Tavily is the expensive path and the worse shaped one for page text, and its `raw_content` is uncapped, which is the exact hazard this slice exists to remove. Putting the expensive provider first means paying the premium on the common case.

### Option 4: Two visible tools, one per provider

Let the model choose between a Firecrawl tool and a Tavily tool.

**Pros**: Maximum transparency in the trace, and no hidden logic.

**Cons**: Provider health is a runtime fact the model cannot observe, so it will retry the broken one, narrate the attempt, and answer differently run to run for no reason. It also splits the context cap across two places.

## Rationale

Option 2 wins because the two failing modes here are different in kind and deserve different responses. An error is a provider problem, so the next provider should answer. An empty or thin answer is usually a mode problem, so the same provider should try once more with pages fetched. That distinction is the whole design, and it is invisible to the model by intent: a student asking about the law of sines does not care which company answered, and telling the model invites it to narrate infrastructure instead of teaching.

The measured numbers settled the rest. Firecrawl's `highlights` default returns whole passages, 5,099 characters from one result of three, at the same two credits as a plain search, so it must be off explicitly rather than left alone. Tavily's `raw_content` measured 272,524 characters for one Wikipedia page and is not capped upstream, so the fallback never requests it. Firecrawl has no numeric relevance score, so one is synthesised and then gated on a shared word with the query, because a position derived score alone will happily keep a motorcycle page for a chemistry question. Firecrawl has no Cameroon proxy, but search accepts a country code and returned French language CEMAC results when asked, so the geo signal lives on search and the scrape proxy stays at its default.

Two calibration mistakes were caught in review and are worth recording, because both are easy to make again.

The first is the snippet threshold. The research measures Firecrawl descriptions at 105, 151 and 160 characters with highlights off. A floor of 150 characters would therefore classify the ordinary quick answer as useless and send almost every search into the expensive page fetching pass, which turns the cheap path into the common expensive path. The floor is 100 characters, and a result with page text and a shared word counts at any length. This is the difference between a cheap design on paper and a cheap design in the bill.

The second is the word gate's language bias. Cameroon's default country returns French pages for English queries, and a naive shared word gate would drop them as irrelevant, then fall through to a second provider for no good reason. The gate therefore keeps a result whose language differs from the query's, and always keeps the last result standing.

The engineer chose to charge one credit per useful search, and to charge only when something usable and fresh came back. That is the honest reading of "a failed search is free": a provider outage must never cost a student money, a cached answer costs nothing because no provider was paid, and the small leak of a search by a student with an empty balance is cheaper than the support conversation a failed debit would cause. The charge lands after the value is delivered, last in the call, so a bookkeeping failure is logged and the answer still arrives.

The engineer also chose a separate `readPage` tool rather than an optional `url` field. That deviates from the scope row's "one tool" wording and from the research's own conclusion, both recorded in the spec's Decision and reconciled in Follow-up. The justification is that a pasted link is a different job from a search, and one schema with two mutually exclusive modes reads worse to a model than two clearly named tools.

Two limits exist because the tool runs inside a stream. A chat turn allows five steps, so a 25 second search repeated at every step would eat a two minute turn, which is why the tool factory counts calls per request and refuses the fifth page read. And the fallback Tavily call is deliberately weaker than the one that runs today, one credit at basic depth instead of two at advanced with a generated answer, because a fallback only has to be fast and cheap, and a slow fallback would be worse than an honest empty answer.

Option 1, Firecrawl only, remains a legitimate design and would be cheaper to operate. It was not chosen because a Firecrawl rate limit was observed near 20 requests per minute against a documented ceiling, and a rate limited student at the exact moment they asked for current information is the worst moment to have no second path. If the fallback rate stays near zero after a term, the honest conclusion is that option 1 was right all along and the second provider should be retired rather than maintained.

## Evidence

Measured during `docs/research/web-search-tooling.md`, kept here rather than in a separate research folder.

| Measurement | Value |
|---|---|
| Firecrawl search, `highlights` default, 3 results | descriptions of 5,099 / 2,237 / 324 characters |
| Firecrawl search, `highlights` off, 3 results | descriptions of 105 / 151 / 160 characters, 2 credits |
| Firecrawl search with page fetch, 2 results | 6,323 characters of markdown, 3 credits |
| Tavily `basic`, default content | 1,180 to 1,340 characters per result, 1 credit, 1.83s |
| Tavily `raw_content`, one Wikipedia page | 272,524 characters |
| Tavily observed `429` | none during research; Firecrawl hit `429` near 20 requests per minute |
| Firecrawl proxy countries | 25, Cameroon absent |
| Firecrawl search with `country: CM` | French language CEMAC and BEAC results |
| Cost per 1,000 searches | about $3.20 on Firecrawl Hobby annual, about $8.00 on Tavily pay as you go |

## References

**Project sources**:
- `docs/research/web-search-tooling.md`
- `docs/specs/0010-caching-and-cold-start-speed`
- `docs/specs/0020-chat-interface-rebuild`
- `docs/scope/tutor.md`, feature 19
- `AGENTS.md`, the one pattern per job rule and the currency and credit rules
- `lib/ai/tools.ts`, `lib/ai/tool-policy.ts`, `lib/prompts/loader.ts`, `lib/cache/index.ts`

**Practices & standards**:
- Fall back on a useless answer, not only on an error
- Never retry a timed out paid call
- Treat fetched text as untrusted data
- Synthesise the missing field at the boundary instead of leaking provider shape
- Cache for latency and measurement, not to save pennies
