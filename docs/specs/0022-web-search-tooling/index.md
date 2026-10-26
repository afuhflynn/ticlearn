# 0022. Web search tooling

**Date**: 2026-10-26
**Status**: Built 2026-10-26 (`/feature-build`, 47 tests across five new files, full suite 995 passing). `/verify-release`, `/peer-review` and `/tech-writer` are still open. One reading is recorded here because AC-3 and AC-17 pull against each other: any Firecrawl hard failure, a rejected key included, skips the second Firecrawl pass and goes to Tavily, so "fails fast" means no wasted second pass and no Tavily call spent confirming a missing key, not "no fallback at all".

## Summary

Tip searches the web through one hidden chain: Firecrawl first, Tavily only when Firecrawl fails or returns nothing a student can use. The model sees two plain tools, `webSearch` and `readPage`, and never learns which company answered. Every call is capped, deduplicated and logged, a repeat question is served from the shared cache and costs nothing, and a fresh useful search costs the student one credit. Reasoning and options: see [rationale.md](rationale.md).

## Requirements

**User stories**:

- As a student, I want Tip to find current information online so that an answer is not stale or invented.
- As a student, I want a bad search to cost me nothing and never invent a citation, so that I can trust what I read.
- As the engineer, I want to know which provider actually served each answer, so that a broken Firecrawl key shows up as a number instead of a slow rumour.

**Acceptance criteria** (the contract):

- **AC-1**: `webSearch` is the only search surface the model sees. Its input is `query`, `depth` (`quick` or `thorough`, default `quick`), `recency` (`any`, `day`, `week`, `month`, `year`, default `any`) and `country` (ISO code, default `CM`). No provider name, `limit`, `timeout`, domain filter or language appears in the schema.
- **AC-2**: When `FIRECRAWL_API_KEY` is set, every `webSearch` tries Firecrawl first.
- **AC-3**: A hard failure from Firecrawl (`401`, `403`, `429`, `5xx`, timeout, network error, malformed body) goes straight to Tavily. A timed out or rate limited call is never retried on Firecrawl.
- **AC-4**: A Firecrawl answer is classified not useful when it returns zero results, or no result is usable, or every result is blocked, or every result is paywalled. A result is usable when it shares a word with the query and either its snippet is at least 100 characters or it carries page text. A result with no shared word is dropped, unless its language differs from the query's language or it is the last result standing. A not useful answer gets exactly one more Firecrawl call in the other mode, and only when the reason is zero results or no readable body.
- **AC-5**: Tavily is called only when Firecrawl hard failed, or when Firecrawl returned nothing useful after both modes.
- **AC-6**: Every result from either provider is normalised to one shape: `url`, `domain`, `title`, `snippet`, `body`, `bodyTruncated`, `score`, `publishedAt`, `language`, `warnings`. `publishedAt` and `language` stay null when a provider does not send them, and are never invented. Nothing downstream branches on provider.
- **AC-7**: Results are collapsed on a canonical URL before the model reads them. On a collision the merged result keeps the longer snippet, the body that exists, both warnings, and the higher score.
- **AC-8**: Text handed to the model is capped at 6,000 characters for `quick` and 12,000 for `thorough`, with a per result cap, truncated at a sentence or heading boundary and marked with `TRUNCATED`.
- **AC-9**: When no provider has anything useful, the tool returns `ok: false`, an empty result list and `degraded: true`. The prompt tells the model to say it could not verify online and never to invent a URL.
- **AC-10**: `readPage` reads one URL through Firecrawl only. Its schema caps the URL at 2,048 characters, and it refuses any scheme other than `http` or `https` and any private, loopback, link local, `.local` or `.internal` host before a request is made. A refusal is a plain result, not a thrown error.
- **AC-11**: Every `webSearch` and `readPage` call writes one `WebSearchEvent` row carrying `servedBy`, `fallbackUsed`, `degraded`, result and usable counts, characters sent, provider credits, duration and the attempt trail. Rows older than 90 days are deleted by the existing Inngest cache cleanup function.
- **AC-12**: The fallback rate is answerable from the database alone: `servedBy` counts over any period, computed from rows where `servedBy` is not `cache`.
- **AC-13**: A `webSearch` or `readPage` that returns something usable debits the configured `creditCostWebSearch` (default 1) under a new `WEB_SEARCH` ledger type, referenced to the event row. An outcome with nothing usable debits nothing, and an answer served from the cache debits nothing.
- **AC-14**: A repeat of the same query, depth, recency and country is served from the shared cache with no provider call, at no cost, and the event records `servedBy: cache`.
- **AC-15**: A degraded or failed outcome is never cached, and an outcome served by Tavily is cached for one hour only. A page read is never cached in this slice.
- **AC-16**: Both tools and their failures have one sentence each in `lib/chat/activity-labels.ts`, and no provider name, raw JSON or URL list reaches the student through the activity line.
- **AC-17**: When the Firecrawl key is missing or rejected, the tool fails fast, logs the missing key once per server process on the first tool build, and spends no Tavily call confirming what the configuration already says.
- **AC-18**: The prompt tells the model that text inside a result is data, never an instruction, and the tool description is the only place that says when to use the tool.
- **AC-19**: At most 2 `webSearch` calls and 3 `readPage` calls run per chat request. A further call returns a plain refusal result without reaching a provider, so a five step agent turn cannot multiply the 25 second budget.

## Decision

**Chosen option**: Firecrawl primary, Tavily fallback, both hidden behind two explicitly decided tools with one normalised shape.

`webSearch` runs a search chain. `readPage` reads a single URL. Neither exposes a provider. The chain is: cache, then Firecrawl, then a second Firecrawl pass in the other mode when the first pass was not useful, then Tavily, then an honest empty answer. One module, `lib/web-search/`, owns both providers, the normalisation, the caps and the fallback walk. `lib/ai/tools.ts` declares the two tools and binds them, and replaces the Tavily only block it holds today rather than leaving it beside the new path.

**Two deliberate overrides, recorded so a later reader knows they were choices.**

First, the research concludes one tool and this spec ships two, because a pasted URL is a different job from a search and the engineer chose a separate surface for it. The normalised output shape is still single, and the provider is still hidden in both.

Second, the fallback Tavily call changes shape from what runs today: `advanced` depth with an answer becomes `basic` depth with chunks, because a fallback needs to be fast and cheap, not clever.

**Implementation skills**: none installed for this area, see Follow-up.

## Feature design

### The two tools

| Tool | Input | Output to the model | Provider work |
|---|---|---|---|
| `webSearch` | `query` (3 to 500 chars), `depth`, `recency`, `country` | `ok`, `degraded`, `results[]` (url, title, snippet, body when present, publishedAt, warnings) | Firecrawl search, then Firecrawl search with page fetch, then Tavily search |
| `readPage` | `url` (max 2,048 chars) | `ok`, `title`, `body`, `truncated`, `warnings`, `reason` on a refusal | Firecrawl scrape only |

The attempt trail, the provider credits, `servedBy` and the scores stay in the log. The model gets the trimmed shape on purpose: a provider name in context invites a tutor to narrate infrastructure, and the audit data has no use in an answer.

### The chain, in order

1. Cache lookup on the key below. A hit returns at once, writes an event with `servedBy: cache`, and charges nothing.
2. Per request call count check (AC-19). Over the cap returns a refusal result.
3. Configuration gate. A missing Firecrawl key starts the chain at step 7, with no Firecrawl probe spent.
4. Firecrawl pass one, search only. `limit: 6`, `sources: ["web"]`, `domainTools: false`, `highlights: false` (the default is true and returns whole pages), `safe: true`, `country` from input, `ignoreInvalidURLs: true`. Budget 8s. Two provider credits.
5. Classify. A useful `quick` answer stops here.
6. Firecrawl pass two, pages fetched. This is the normal `thorough` path and the single retry for `quick` when the reason was zero results or no readable body. `limit: 3`, `scrapeOptions` with markdown, `onlyMainContent: true`, `maxAge` 24 hours, `timeout` 12s, PDF parsing on. Budget 12s.
7. Tavily. `search_depth: basic`, `max_results: 5`, `chunks_per_source: 2`, `include_answer: true`, `include_raw_content: false`, `include_usage: true`, `safe_search: true`, no country (the measured boost hurt relevance). Budget 5s.
8. Merge, dedupe, cap. Only Firecrawl's two passes merge into one answer. A Tavily answer stands alone.
9. Write the event row, then write the cache on a cacheable outcome, then debit the credit. The debit is last and references the event id, which is what makes "no debit without a row" mechanical rather than a convention.

A hard failure skips step 6 entirely. Calling a provider again seconds after it returned `429` is a bug dressed as resilience.

The debit is wrapped the way `createQuiz` wraps its spend: a failure is logged with the event id and the results are returned anyway. A student never loses a good answer to a bookkeeping error, and there is no balance check before the search, because the charge lands after the value is delivered.

### Caps

| Budget | `quick` | `thorough` | `readPage` |
|---|---|---|---|
| Max results | 5 | 3 | 1 |
| Snippet (chars) | 1,200 | 2,000 | none |
| Body (chars) | none fetched | 4,000 | 8,000 |
| Total text (chars) | 6,000 | 12,000 | 8,000 |

Truncation happens at the last sentence or heading boundary within the final 15 percent of the cap, followed by `… [truncated]`. Headings survive a truncated body so the model can still judge what kind of document it is holding.

### The score, since Firecrawl has none

```
firecrawl: 1 / (1 + (position - 1) * 0.35) * (body ? 1.0 : 0.6) * (snippet >= 200 ? 1.0 : 0.7)
tavily:    provider score * (body ? 1.0 : 0.9)
```

Position derived scores are weak on their own, so the usability rule (AC-4) also requires a shared word, and the score only orders results. The shared word list is one exported constant: `what, how, why, when, where, which, who, explain, compare, find, best, does, is, are, the, a, an, of, to, for, in, on, and, or`, matched on lowercase words of three characters or more. Without that list, "how" would match every page and the gate would pass everything.

The gate never empties the answer on language grounds. A French page returned for an English query in Cameroon is a real source, so a result whose `language` differs from the query's is kept, and the last result standing is always kept. This is what stops the gate from hiding a correct local source behind a language bias.

### Data model

```prisma
enum CreditType {
  // existing values
  WEB_SEARCH
}

model WebSearchEvent {
  id               String   @id @default(cuid())
  userId           String?  @map("user_id")
  tool             String   @map("tool")            // webSearch | readPage
  query            String?  @map("query")           // null for readPage
  url              String?  @map("url")             // null for webSearch
  queryHash        String   @map("query_hash")
  requestedDepth   String?  @map("requested_depth")
  requestedRecency String?  @map("requested_recency")
  country          String   @default("CM") @map("country")
  servedBy         String?  @map("served_by")       // firecrawl | tavily | cache
  fallbackUsed     Boolean  @default(false) @map("fallback_used")
  degraded         Boolean  @default(false) @map("degraded")
  resultCount      Int      @default(0) @map("result_count")
  usableCount      Int      @default(0) @map("usable_count")
  contextChars     Int      @default(0) @map("context_chars")
  contextTruncated Boolean  @default(false) @map("context_truncated")
  providerCredits  Int      @default(0) @map("provider_credits")
  creditsCharged   Int      @default(0) @map("credits_charged")
  durationMs       Int      @default(0) @map("duration_ms")
  attempts         Json     @map("attempts")
  errorCode        String?  @map("error_code")
  createdAt        DateTime @default(now()) @map("created_at")

  user User? @relation("WebSearchEvents", fields: [userId], references: [id], onDelete: SetNull)

  @@index([createdAt])
  @@index([queryHash, createdAt])
  @@index([userId, createdAt])
  @@index([servedBy, createdAt])
  @@map("web_search_events")
}
```

`User` gains `webSearchEvents WebSearchEvent[] @relation("WebSearchEvents")`.

`query` holds the raw scrubbed query, which is what the student asked. `queryHash` holds the normalised form. For `readPage`, `queryHash` is the sha256 of the page key, so the column is never null.

The cache is not a new table. It uses the shared cache from spec 0010 under namespace `web_search`, keyed by a sha256 of `ws:v1`, the normalised query (lowercased, whitespace collapsed, stopwords removed), `depth`, `recency` and `country`. The query is normalised before hashing, or near duplicates never hit. `depth` must be in the key, because a stored entry may or may not carry a body and a `thorough` caller must never receive a bodyless one.

Reads and writes go through `getByKey` and `setByKey`, not `withKey`. The TTL depends on the outcome (an hour for a fallback answer, never for a degraded one), and `withKey` fixes its TTL before the work runs, so it would cache failures for days.

| Condition | TTL |
|---|---|
| `quick`, `recency: any` | 7 days |
| `thorough`, `recency: any` | 3 days |
| any explicit `recency` | 1 hour |
| served by Tavily | 1 hour |
| degraded or failed | not cached |
| `readPage` | not cached |

### Tool result shape

```ts
type WebSearchToolResult = {
  ok: boolean;
  degraded: boolean;          // true only when nothing usable came back
  results: {
    url: string;
    title: string;
    snippet: string;
    body: string | null;      // thorough only
    publishedAt: string | null;
    warnings: ("BLOCKED" | "PAYWALLED" | "NO_BODY" | "TRUNCATED")[];
  }[];
};
```

No `servedBy`, no credits, no attempts, no score. The log holds those. `LOW_RELEVANCE` is deliberately absent: results with no shared word are dropped, so a warning code for them could never fire.

### Value sourcing

| Action | Value produced or displayed | Source |
|---|---|---|
| `webSearch` | `servedBy` | the attempt marked served, written by the module |
| `webSearch` | `fallbackUsed` | true when the served attempt is Tavily |
| both | `creditsCharged` | `creditCostWebSearch` from `PlatformSettings`, 0 when nothing usable or served by the cache, 0 when the debit fails |
| both | `creditsCharged` written to the ledger | `lib/credits.spendCredits`, reference id is the `WebSearchEvent` id |
| `webSearch` | `queryHash` | sha256 of the normalised query, computed in the module |
| `readPage` | `queryHash` | sha256 of the page cache key, computed in the module |
| `webSearch` | cache key | sha256 of version, normalised query, depth, recency, country |
| `webSearch` | `country` | the tool input, default `CM` |
| `readPage` | `custom error` on refusal | the host guard and scheme check in the module |
| `webSearch` | activity label | `lib/chat/activity-labels.ts` reading the tool input query |
| both | refusal after the per request cap | the counter in the `createChatTools` closure |
| both | `userId` | the chat session, passed in by `createChatTools({ userId })` |
| both | retention sweep | the existing Inngest cache cleanup function |

### Key invariants

- A provider name never crosses the module boundary into a tool result.
- A result whose host is private, loopback, link local or `.local` / `.internal` is dropped before the cap runs, and `readPage` refuses it before any request.
- A debit never happens without a `WebSearchEvent` row, and the debit is the last step of the call.
- A cached answer is never charged, and a page read is never cached.
- A cached entry is never served for a different depth, recency or country.
- A timed out call is never retried on the same provider.
- A refusal is a result, never a thrown error, so the student reads a sentence instead of a failure.

### Security model

Every call is scoped to the session user, and the event row carries that user. No email, phone number or other account identifier enters the tool schema, the prompt or the result. `webSearch` keeps the existing `webSearchScrub` policy (email, phone and instruction patterns are refused, and the query is capped at 500 characters). `readPage` gains its own guard: the URL is capped at 2,048 characters in the schema, and scheme and host are checked in the module before any fetch. Returned page text is untrusted: the prompt says so, no result is executed, and Firecrawl's paid injection scan stays off. There is no public read path for `WebSearchEvent`; only the database and an admin query see it. Retention is 90 days, deleted by the same Inngest function that prunes the cache.

### Configuration required

- `FIRECRAWL_API_KEY`: the primary search and page read key. Absent means the chain starts at Tavily, logged once per process.
- `TAVILY_API_KEY`: already present, becomes the fallback only.
- `PlatformSettings.creditCostWebSearch`: new integer, default 1, in the existing admin settings route and form beside the tutor message cost.

### Critical test scenarios

- Happy path: a `quick` search with a mocked Firecrawl response for three good pages returns the capped result set, writes one event with `servedBy: firecrawl`, and debits the configured cost, verifies **AC-2**, **AC-8**, **AC-11**, **AC-13**.
- Short snippets still count: a mocked `quick` answer whose descriptions are 105 to 160 characters is classified useful and does not trigger the expensive second pass, verifies **AC-4**.
- Empty then retried: a mocked empty Firecrawl answer triggers exactly one further Firecrawl call in page reading mode, and no Tavily call when that second call succeeds, verifies **AC-4**.
- Hard failure: a mocked `429` on the first Firecrawl call produces one Tavily call, no second Firecrawl call, `fallbackUsed: true`, and the Tavily answer cached for one hour, verifies **AC-3**, **AC-5**, **AC-15**.
- Nothing anywhere: both providers empty returns `ok: false`, debits nothing, caches nothing, and the prompt path says it could not verify, verifies **AC-9**, **AC-13**.
- Repeat question: the same query twice calls one provider once, serves the second from the cache with `servedBy: cache`, and charges 0, verifies **AC-14**, **AC-13**.
- Debit failure: a mocked `InsufficientCreditsError` leaves the results in place, records `creditsCharged: 0`, and logs, verifies **AC-13**.
- Per request cap: a fifth `readPage` call in one request returns a refusal without a provider call, verifies **AC-19**.
- Unsafe URL: `readPage` with `http://127.0.0.1/x`, `file:///etc/passwd` and `http://printer.local` is refused with no outbound request and a readable result, verifies **AC-10**.
- Duplicates: two results with the same canonical URL in one merge produce one result with the longer snippet and the higher score, verifies **AC-7**.
- Missing key: with `FIRECRAWL_API_KEY` unset the warning logs once for the process and no Firecrawl request is attempted, verifies **AC-17**.
- Student surface: the activity line reads a sentence, never `firecrawl` or a URL list, verifies **AC-16**.

## Build plan

Built as a tracer bullet: one thin working thread from the tool the model calls through the module to a provider and back, with the event row written on the first pass, then each behaviour thickened.

1. [x] Add the migration for `WebSearchEvent`, the `WEB_SEARCH` `CreditType` and the `creditCostWebSearch` setting, then generate the client, satisfies **AC-11**, **AC-13**. `prisma/migrations/20261026142424_add_web_search_tooling/`, applied and read back in Postgres
2. [x] Create `lib/web-search/types.ts`: the normalised result, attempt, outcome, error taxonomy and warning codes, plus the stopword list, satisfies **AC-6**, **AC-9**
3. [x] Build the Firecrawl client on a thin typed fetch with an 8 second `AbortSignal.timeout`, reading `data.web[]` and tolerating a bare `data` array, with `highlights: false` explicit, satisfies **AC-2**, **AC-6**
4. [x] Add normalisation, the canonical URL dedupe, the usability and shared word rules, and the cap with boundary truncation, satisfies **AC-4**, **AC-7**, **AC-8**
5. [x] Bind `webSearch` in `createChatTools` with the new schema, keep it behind `webSearchScrub`, rewrite `prompts/tools/web_search.md` as the only place that says when to search, and confirm its existing label, satisfies **AC-1**, **AC-16**, **AC-18**
6. [x] Write the event row on every call, read and write the shared cache through `getByKey` and `setByKey`, and add the 90 day sweep to the existing Inngest cache cleanup function, satisfies **AC-11**, **AC-12**, **AC-14**, **AC-15**
7. [x] Add the second Firecrawl pass in page reading mode with the 12 second budget, satisfies **AC-4**
8. [x] Add the Tavily client on the same fetch module and map it to the shared shape, with no country, no raw content and `include_usage`, satisfies **AC-3**, **AC-5**
9. [x] Debit `creditCostWebSearch` on a usable outcome, last in the call, referencing the event row and wrapped so a failure never costs the answer, satisfies **AC-13**
10. [x] Add `readPage` with its schema cap, host guard, `prompts/tools/read_page.md` and its label, satisfies **AC-10**, **AC-16**
11. [x] Add the per request counter in the tool factory and the search once guidance in the tool description, satisfies **AC-19**, **AC-18**
12. [x] Add the configuration gate with one log per process, then remove the `@tavily/core` dependency and the old Tavily block, satisfies **AC-17**
13. [x] Remove the duplicated search rules from the chat system prompt and leave tool choosing to the tool description, satisfies **AC-18**
14. [x] Tests at the provider boundary for every scenario above, with **AC-1**, **AC-9**, **AC-10**, **AC-16** covered by their own files. `tests/lib/web-search/` holds `search-chain`, `normalize`, `url-guard` and `tool-surface`, and `tests/lib/chat/activity-labels.test.ts` holds AC-16

## Rationale

Reasoning, the options weighed, and the measured vendor behaviour: see [rationale.md](rationale.md).

## Consequences

**Positive**:
- One place decides which provider answers, so the model cannot pick a broken one and the answer shape cannot drift.
- A failed search is free and honest, and a repeat question is free too, so a student is never charged twice for one curiosity.
- The fallback rate and the credit cost per answer are a query away instead of a guess.
- Firecrawl is three to ten times cheaper per call than Tavily, and it is now the path that runs.

**Negative / tradeoffs**:
- Two tools to label and maintain instead of one, against the scope row's original wording.
- A second provider means two response shapes, two error sets and a merge rule to keep honest, forever.
- The 25 second worst case runs inside a five step loop, which is why the per request cap exists. Without it, one chat turn could spend two minutes searching.
- A cached answer earns nothing, so the same popular question is free for every student after the first. That is the intended trade for latency and for a clean fallback rate.
- Storing query text for 90 days is student authored content in a new table, with the same care a chat message needs.
- A student with an empty balance can still search and read, because the charge is post paid. That is deliberate, and it is a small revenue leak.

**Neutral**:
- One additive migration: a new table, one enum value and one settings column. No existing row changes, and reverting the commit leaves an unused table.
- `@tavily/core` leaves the dependency list once the new module holds Tavily, because the project forbids two patterns for one job.
- The shared cache from spec 0010 gains a namespace, so its cleanup job already covers these entries. The event table needs its own delete, added to the same function.
- The fallback Tavily call is cheaper than today's call, one credit instead of two, at the cost of brevity.

## Follow-up

- [ ] Reconcile the feature 19 line in `docs/scope/tutor.md`, which still says one tool. This change ships two by decision.
- [ ] Add the `lib/web-search/` boundary rule (providers live here, never in a route) to `lib/ai/AGENTS.md` when the build lands, beside the existing AI rules.
- [ ] Add `creditCostWebSearch` to the admin platform settings form if the build only adds the column and the route field.
- [ ] Stampede guard: reading through `getByKey` loses the in flight guard `withKey` gives. Two students asking the same thing in the same minute can both pay. Revisit once there is traffic data.
- [ ] Firecrawl search feedback refunds one credit per search on a bad rating and must run from an Inngest step, never inline. Not this slice.
- [ ] Warm the cache nightly from the top query hashes once there is a week of traffic. Guessing the warm list before that burns credits for nothing.

## References

**Project sources**:
- `docs/research/web-search-tooling.md`, the measured vendor behaviour this decision rests on
- `docs/specs/0010-caching-and-cold-start-speed`, the shared cache this reuses
- `docs/specs/0020-chat-interface-rebuild`, the activity line and tool part rendering
- `AGENTS.md`, the rule that a new abstraction replaces the old one and the credit and currency rules
- `lib/ai/tool-policy.ts`, the existing query scrub this keeps
- `lib/credits.ts`, the spend path a failed debit must never break

**Practices & standards**:
- Fall back on a useless answer, not only on an error, because an empty answer is a mode problem while an error is a provider problem
- Synthesise the missing field rather than leak provider shape into the caller
- Treat text fetched from the open web as data, never as instruction
- Never retry a timed out paid call, because the provider keeps working after the socket closes
- Spend booking runs after the value is delivered, and a booking failure never destroys the value
