# Web Search Tooling: Firecrawl primary, Tavily fallback

**Status:** research only. No application code was changed.
**Date:** 2026-10-12
**Applies to:** `lib/ai/tools.ts` (`webSearch` tool), `app/api/ai/chat/route.ts` (tool binding + system prompt), `lib/ai/cache.ts`, `lib/ai/registry.ts`.

Everything marked **verified** was confirmed either by reading the vendor's own API reference or by a live call made during this research (scratch files in `.firecrawl/`). Anything marked **unverified** could not be confirmed.

---

## 0. Executive summary

- Firecrawl `/v2/search` is the better primary for this app because it can return **clean markdown of the actual result pages in the same call** (`scrapeOptions`), and it exposes **`cacheState` / `creditsUsed` per call**, which is what makes the fallback measurable and the cache honest.
- Firecrawl's **default search highlights are a token hazard**: measured live, a 3-result search returned `description` values of **5,099 / 2,237 / 324 characters** — effectively a page dump, not a snippet — at the same 2 credits as a plain search. Turn highlights off for the first pass.
- Firecrawl has **no Cameroon proxy**. `CM` is absent from the 25 supported proxy countries; Firecrawl silently substitutes the nearest of EU/US and only fakes the browser location. Use `location`/`country` on **search** (verified working: `--country CM` returned French-language CEMAC/BEAC results) and leave the **scrape** proxy default.
- Tavily's default `content` is **1,180–1,340 characters of three ~500-char chunks** (measured live), not page markdown. Its `raw_content` is page markdown and is **enormous** (272,524 characters for one Wikipedia page, measured live). It is the fallback, so default to chunks; never request `raw_content` without a hard cap.
- Tavily gives you a **numeric relevance `score`; Firecrawl does not** (it gives `position` only). The normalisation layer has to synthesise a score.
- Cost is genuinely a non-issue at this scale: 2,500 searches/month costs ~5,000 Firecrawl credits (Hobby, **$16/month** annual). Caching should be built for **latency and for measuring the fallback ratio**, not for saving credits.
- Ship **one tool**, fallback inside it. Two tools would make provider choice a model decision, and a model cannot know which provider is failing.

---

## 1. Firecrawl as a search and scrape tool for the agent

Source of truth: `docs.firecrawl.dev`, API reference at `https://docs.firecrawl.dev/api-reference/endpoint/{search,scrape,extract,map,crawl}`, pricing at `https://www.firecrawl.dev/pricing`, rate limits at `https://docs.firecrawl.dev/rate-limits`. SDK: npm `firecrawl` (latest **4.46.0**, verified via `npm view`). Docs are machine-readable as `.md` (e.g. `https://docs.firecrawl.dev/features/search.md`) and indexed at `https://docs.firecrawl.dev/llms.txt` — both verified.

### 1.1 `/v2/search` — what it does

Web search that optionally returns page content from the results in the same request.

**Request** (body fields verified against the API reference, all of them):

```jsonc
POST https://api.firecrawl.dev/v2/search
Authorization: Bearer fc-XXXX
Content-Type: application/json

{
  "query": "photosynthesis equation 6CO2",
  "limit": 5,                      // CLI: default 5, max 100
  "sources": ["web"],              // web | news | images | alexandria
  "domainTools": false,            // off = no Alexandria matching
  "toolDetail": "compact",
  "categories": [],                // research | pdf | developer | gov
  "includeDomains": ["mincom.gov.cm"],
  "excludeDomains": [],            // mutually exclusive with includeDomains
  "tbs": "qdr:w",                  // qdr:h|d|w|m|y, sbd:1, cdr:1,cd_min:..,cd_max:..
  "location": "Cameroon",
  "country": "CM",                 // ISO-3166-1 alpha-2, default "US"
  "safe": true,                    // SafeSearch
  "timeout": 60000,                // ms
  "ignoreInvalidURLs": false,
  "highlights": false,             // DEFAULT IS TRUE — see below
  "enterprise": [],                // ["zdr"] | ["anon"]
  "scrapeOptions": { },            // any /scrape option
  "threatProtection": { }
}
```

**Response** (verified, live):

```jsonc
{
  "success": true,
  "id": "01a12de0-3200-71ef-af1d-255b4c0ef49c",   // Firecrawl search job id
  "creditsUsed": 2,
  "warnings": null,                              // present; carries the research-category deprecation notice
  "data": {
    "web": [
      {
        "url": "https://ssec.si.edu/stemvisions-blog/what-photosynthesis",
        "title": "What is Photosynthesis | Smithsonian Science Education Center",
        "description": "## What is Photosynthesis\nWhen you get hungry…",  // highlight text, NOT a snippet
        "position": 1
      }
    ]
    // "news": [{ title, url, snippet, date, position }]
    // "images": [{ title, imageUrl, imageWidth, imageHeight, url, position }]
    // "tools":  [...]   // only when sources includes "alexandria"
  }
}
```

With `scrapeOptions` set, each web item gains `markdown` and `metadata` (verified, live). **Note the shape change**: the docs' example shows `data` as a bare array; the current API returns `data.web[]` whether or not `scrapeOptions` is set. Write the parser against `data.web` and tolerate `data` being an array.

Observed `metadata` keys on a real result: `sourceURL, statusCode, contentType, language, timezone, title, description, robots, cacheState, cachedAt, creditsUsed, scrapeId, proxyUsed, concurrencyLimited, publishedTime, modifiedTime, indexId, favicon, viewport, og*/twitter:*`.

**Does it return page content?** Only two ways:
1. `highlights` (default on) puts query-relevant excerpts into `description`. Cheap (included in the 2 search credits) but **unbounded** — measured 5,099 chars.
2. `scrapeOptions.formats: ["markdown"]` fetches and converts the pages. Costs **1 credit per page** on top of the search credits.

`limit` applies **per source type**, so `sources:["web","news"]` with `limit:5` can return 10 items (verified in docs).

**Query operators supported** (verified, docs): `""`, `-`, `site:`, `filetype:`, `inurl:`, `allinurl:`, `intitle:`, `allintitle:`, `related:`, `imagesize:`, `larger:`. This matters — you can express "give me the official GCE syllabus PDF" without `includeDomains`.

### 1.2 `/v2/scrape` — what it does

Turns one URL into clean data. This is the endpoint that actually produces the readable body.

**Formats** (verified, docs). String forms: `markdown`, `html` (cleaned), `rawHtml` (as served), `rawBase64` (must be the only format), `links`, `images`, `summary` (LLM), `branding`, `product`. Object forms: `{"type":"json", prompt?, schema?}`, `{"type":"screenshot", fullPage?, quality?, viewport?}`, `{"type":"changeTracking", modes?, tag?, schema?, prompt?}`, `{"type":"attributes", selectors:[…]}`, plus `query`/`question` (LLM answer in `answer`) and `highlights`. Default is `["markdown"]`.

Note `changeTracking` and the FIRE-1 agent are **not** available through `search`'s `scrapeOptions` (verified, docs).

**Behavioural options that matter here** (verified, docs + live):

| Option | Default | Why it matters |
|---|---|---|
| `onlyMainContent` | `true` | Strips nav/footer. Deterministic HTML filter, no LLM. Keep on. |
| `maxAge` | `172800000` (2 days) | Return Firecrawl's cached copy if fresher. **Set `0` to force fresh.** Still costs 1 credit on a hit. |
| `timeout` | `60000` ms | Min 1000, **max 300000**. |
| `waitFor` | `0` | Extra wait on top of smart-wait. Use sparingly. |
| `location` | `US` | Proxy + language + timezone. **No `CM` proxy available** (see §1.7). |
| `proxy` | `auto` | `basic` \| `enhanced` \| `auto`. `auto` retries via enhanced on 401/403/429 only. Same 1 credit either way. |
| `parsers` | `["pdf"]` | `[]` skips PDF parsing → flat 1 credit and base64 back. |
| `mobile` | `false` | Emulate mobile. Useful for Cameroon mobile-bandwidth sites. |
| `blockAds`, `removeBase64Images`, `headers`, `skipTlsVerification` | — | Token-shaping levers. |
| `checkPromptInjection` | `false` | Scans before any LLM format; detection → `403` + `SCRAPE_PROMPT_INJECTION_DETECTED`, +4 credits. |
| `lockdown` | `false` | **Cache-only, never makes an outbound request.** Miss → `404` + `SCRAPE_LOCKDOWN_CACHE_MISS`. 5 credits on hit, 1 on miss. Useful if you ever need an air-gapped proof, irrelevant for a student app. |
| `storeInCache` | `true` | Set `false` for privacy-sensitive scraping. Forced `false` if you use `actions`/`headers`. |

**Two status layers — do not conflate** (verified, docs):
- API status: HTTP `200` + `success: true` means *Firecrawl* succeeded.
- Page status: `data.metadata.statusCode` is what the **target site** returned.

A `403` or `404` page is still returned to you and **is charged** 1 credit (verified, pricing FAQ). A scrape that returns no result is not charged (verified, pricing FAQ — and observed: a 2-result `search --scrape` reported `creditsUsed: 3`, i.e. 2 search + 1 scrape, because one page produced no result).

### 1.3 `/v2/extract` — structured data over many URLs

`POST /v2/extract` with `urls` (supports wildcards like `example.com/*`), `prompt` and/or `schema`, `enableWebSearch`, `scrapeOptions`. It is an **async job**: you get a job id, poll, results are retained **24 hours** after completion.

Billing note (verified, docs): Extract now bills in credits, "each credit is worth 15 tokens". Rate limits **share the `/agent` limits** (verified, rate-limits page): 2 rpm Free, 20 rpm Hobby, 100 rpm Standard.

**For this app, do not use `/extract`.** It answers "give me typed records matching a schema", not "what does the web say about X". It also costs LLM tokens on Firecrawl's side, runs as a job with polling, and is a much worse fit for a sub-15s chat turn. The Firecrawl MCP `extract` tool is explicitly deprecated (verified, `docs.firecrawl.dev/mcp-server/tools`).

### 1.4 `/v2/crawl` and `/v2/map`

- **`/map`** — given a domain, return URLs. 1 credit per page returned. Has `--search` filter and sitemap modes. Right choice when you know the site but not the page ("all past-paper PDFs on mincom.gov.cm").
- **`/crawl`** — recursive fetch of many pages, 1 credit/page, async job, heavily rate-limited (2 rpm Free, 20 rpm Hobby). Right choice for ingesting a whole document set. Wrong for a chat turn.

Neither is needed for the student question-answering tool. Keep `/map` in mind for a future "ingest the official GCE syllabus and past papers" job; it is a much better fit than `/crawl`.

### 1.5 The right combination for "search the web and give me readable content of the best pages"

Two distinct answers, and picking the wrong one is the main cost risk:

**(a) Default / cheap pass — `search` with highlights off, no `scrapeOptions`.**
2 credits. Returns 5–8 titles, URLs, and 100–200 char descriptions. Correct when the model mostly needs to *pick* a source and then the question is simple. Measured: descriptions of 105 / 151 / 160 chars, `creditsUsed: 2`.

**(b) Grounded pass — `search` with `highlights: false` + `scrapeOptions`.**
2 credits + 1 credit per page. Returns real page markdown, 1 per result. Correct when the answer must be grounded in the actual page text — which for a tutoring app is the normal case. Measured: 6,323 characters of markdown from a LibreTexts page, `creditsUsed: 3` for a 2-result query where one page returned nothing.

**When each endpoint is the right choice, plainly:**

| Situation | Use |
|---|---|
| "What is the capital of X?" / quick fact | `/v2/search`, `highlights: false`, no `scrapeOptions`. 2 credits. |
| "Explain this exam topic / current syllabus point" | `/v2/search` + `scrapeOptions.formats:["markdown"]`, `onlyMainContent:true`, `limit:3`. ~5 credits. |
| The user pasted a URL | `/v2/scrape` directly. 1 credit. No search. |
| You know the site, not the page | `/v2/map`, then `/v2/scrape` the top N. |
| You need typed records matching a schema | `/v2/extract` (async). Or `/scrape` with `json` format for one page. |
| Legal / regulatory primary sources | `categories: ["gov"]` — adds **no** search credits (verified). |
| GitHub issues / PRs / READMEs | `categories: ["developer"]`. Cannot be combined with other categories. |
| Papers (PubMed/bioRxiv/arXiv) | `GET /v2/search/research/papers` — free on every plan. |
| A whole documentation site | `/v2/crawl`, off the chat path. |

**`highlights: true` is a trap in this app.** It is on by default, it costs nothing extra, and it returns whole passages (measured 5,099 chars on one result of three). At `limit: 10` that is a plausible 20–30k characters of context before the model has read the question. Set `highlights: false` explicitly and never rely on the default.

### 1.6 Cost, rate limits, auth (verified, pricing + rate-limits pages)

Credit unit: **1 credit = 1 page** on a basic scrape/crawl/map. **Search = 2 credits per 10 results, rounded up** (1–10 results = 2 credits). Search with `gov` adds no search credits. Additive surcharges: `json` +4/page, `question`/`highlights` +4/page each, PII redaction +4/page, PDF +1/page, audio/video +4/page.

| Plan | Credits/mo | Price | Concurrent browsers | `/scrape` `/map` `/search` rpm | `/crawl` `/agent` rpm |
|---|---|---|---|---|---|
| Free | 1,000 | $0 | 2 | 10 | 2 |
| Hobby | 5,000 | $16/mo annual ($19 monthly) | 5 | 100 | 20 |
| Standard | 100,000 | $83/mo annual | 25 | 500 | 100 |
| Growth | 500,000 | $333/mo annual | 50 | 5,000 | 1,000 |
| Scale | 1,000,000 | $599/mo annual | 100 | 10,000 | 2,000 |

Derived cost per 1,000 units (published plan prices ÷ credits, arithmetic on the published figures):
- **Per 1,000 pages scraped:** $3.20 (Hobby annual) → **$0.83 (Standard)** → $0.67 (Growth) → $0.60 (Scale).
- **Per 1,000 searches** (5 results each = 2 credits per call): $3.20 Hobby → $0.83 Standard.
- **Per 1,000 grounded answers** (search + 3 pages scraped = 5 credits): $16 Hobby → $4.15 Standard.
- Pay-as-you-go top-ups: Hobby 1,000 credits per $5 ($0.005/credit); Standard 2,000 per $5; Growth 2,500 per $5; Scale 5,000 per $5.

Also: credits roll over only on Scale and Enterprise; monthly plans are pay-as-you-go with a cap you set in the dashboard; a failed scrape is free but an error *page* costs 1 credit.

**Rate limits are per team, shared across all API keys.** Concurrency is a separate ceiling and queue time counts against your request `timeout` — set a low client timeout to fail fast rather than sitting in the queue.

**Auth:** `Authorization: Bearer fc-...` on every request. Keyless access works for `/search`, `/scrape`, `/parse` (plus `/interact` for official clients) but is capped per-IP-per-day by both a request count and a credit count; `/crawl`, `/extract`, `/map` and batch scrape require a key. Use a key.

**Practical note:** during this research the account hit `429` at ~20 requests/min while the Free/Hobby table says 10 or 100. Treat the published table as a ceiling, not a target, and make the client resilient to `429` regardless of plan.

### 1.7 Caching, proxy, "stealth", geo — and what they mean for Cameroon

**Caching (Firecrawl-side).** `maxAge` defaults to **2 days**. On a hit you get the cached copy instantly; credits are still charged (verified, `features/fast-scraping`). A cache hit requires these parameters to match exactly: `url`, `mobile`, `location`, `waitFor`, `blockAds`, `screenshot` (enabled + fullPage), and enhanced-proxy mode. Check `metadata.cacheState` (`"hit"` / `"miss"`) — **verified live**, returns `"hit"`, along with `cachedAt`. There is also `metadata.concurrencyLimited`, which tells you the request queued.

**Proxy.** Three strategies: `basic`, `enhanced`, `auto` (recommended). `auto` escalates to enhanced **only** on `401`, `403`, or `429` — not on `404` or `5xx`, because a different proxy would not change the answer — and escalates at most once per request. **Enhanced costs the same as basic** (1 credit), so there is no reason not to leave `auto` on.

**Supported proxy countries (verified, `features/proxies`):** AE, AT, AU, BE, BR, CA, CH, CN, DE, DK, EG, ES, FR, GB, GR, IL, IN, IT, JP, MX, NL, PL, QA, SE, TR, US. **Enhanced-proxy support exists only for NL and US.**

**Cameroon specifically — four things to know:**
1. **`CM` is not a Firecrawl proxy location.** Firecrawl's documented behaviour: if you request a country with no proxy, it uses the closest available region (EU or US) **and sets the browser location to your requested country**. So a CM scrape renders with a US/EU IP but Cameroonian locale/timezone. Fine for content extraction; misleading for anything geo-sensitive or IP-gated. Firecrawl explicitly says: *"We highly recommend leaving `location` unspecified unless you are sure you need it."* Do that.
2. **Geo on search is a different mechanism and it works.** `/v2/search` accepts `location` (free-text, e.g. `"Cameroon"`, `"Douala, Cameroon"`) and `country` (ISO code, default `"US"`). Verified live: `--country CM` for `CEMAC BAC_general mathematics` returned `cemac.int`, `cemac.int/decisions/`, and a BEAC PDF — **French-language, correct-region** results. For Cameroon student queries, default `country: "CM"` on search and leave scrape location alone. Full location list: `https://firecrawl.dev/search_locations.json` (**unverified** — the URL is documented but the fetch did not return JSON during this research; test before relying on it).
3. **Cameroonian content is mostly French.** Firecrawl has no `language` parameter on `/search` (only `location`/`country`); Tavily has both `country` and `language` **and** `filter_by_language` for a hard filter. That asymmetry matters — see §3.
4. **Bandwidth.** Cameroonian mobile connections are slow and metered. `onlyMainContent: true`, `removeBase64Images: true` and a hard per-result character cap are not just token hygiene; they are the difference between a usable feature and a broken one.

**"Stealth mode": there is no such parameter.** Firecrawl has `proxy: "enhanced"` (retry-on-403 via better IPs) and `lockdown` (never leaves Firecrawl's servers). Neither is a CAPTCHA solver or an anti-bot evasion product, and neither is documented as such. If a page is Cloudflare-walled, `auto` escalation is the whole answer. **Unverified:** whether `enhanced` reliably defeats specific bot-detection vendors — Firecrawl publishes no claim.

### 1.8 Firecrawl MCP server — relevant here?

Yes, it exists; **no, it is not relevant to this app.**

Hosted servers: `https://mcp.firecrawl.dev/v2/mcp` (bearer API key) and `https://mcp.firecrawl.dev/v2/mcp-oauth` (OAuth). Keyless exposes **only** `search`, `scrape`, `parse`. The full tool surface is `firecrawl_search`, `firecrawl_scrape`, `firecrawl_map`, `firecrawl_crawl`, `firecrawl_check_crawl_status`, `firecrawl_parse`, `firecrawl_find_tools`, `firecrawl_agent`, `firecrawl_agent_status`, `firecrawl_interact`, `firecrawl_interact_stop`, `firecrawl_research_*`, `firecrawl_developer_search`, `firecrawl_gov_search`, `firecrawl_monitor_*`, `firecrawl_search_feedback`, `firecrawl_feedback`. The `extract` MCP tool is **deprecated**.

Why it is the wrong choice here:
- This app needs the **normalised result** to flow into its own prompt, its own context budget, its own credit accounting, and its own caching. An MCP server hands the model raw provider output and a second tool namespace — the model, not your code, decides what reaches the context.
- It adds a network hop (app → MCP server → Firecrawl) to a path that is already latency-critical.
- Your agent is a Next.js route binding tools at request time with AI SDK `tool({ inputSchema, execute })`. That is the natural integration point, and it is where your fallback, timeout and dedup logic has to live anyway.

**Consider Firecrawl MCP only if** you later want an autonomous research agent (`/agent`, 5 free daily runs, dynamic pricing) that runs outside the chat request. Not for the student Q&A tool.

---

## 2. Tavily as the fallback

Sources: `docs.tavily.com/documentation/api-reference/endpoint/{search,extract}`, `docs.tavily.com/documentation/api-credits`, `docs.tavily.com/documentation/rate-limits`, `www.tavily.com/pricing`, `docs.tavily.com/documentation/mcp`. Live calls were made with the project's existing `TAVILY_API_KEY` to confirm response shapes; the key itself was not read or logged.

### 2.1 `/search` options (verified, docs)

`POST https://api.tavily.com/search`, `Authorization: Bearer tvly-...`

| Field | Default | Notes |
|---|---|---|
| `query` | — | required |
| `search_depth` | `basic` | `advanced` \| `basic` \| `fast` \| `ultra-fast`. **Cost: 1 credit for basic/fast/ultra-fast, 2 for advanced.** |
| `chunks_per_source` | `3` | Range 1–3. Chunks ≈500 chars (basic/fast), ≈800 (advanced). Shapes `content`. |
| `max_results` | `10` | Range **0–20**. |
| `topic` | `general` | `general` \| `news` \| `finance`. |
| `time_range` | — | `day`/`week`/`month`/`year` (or `d`/`w`/`m`/`y`). |
| `start_date` / `end_date` | — | `YYYY-MM-DD`. |
| `include_published_date` | `false` | beta; forced on for `topic: news`. |
| `filter_by_published_date` | `false` | Also *removes* undated results. Set `false` and just ask for the date. |
| `include_answer` | `false` | `true` \| `basic` \| `advanced`. LLM-generated answer. |
| `include_raw_content` | `false` | `true` \| `markdown` \| `text`. Full page markdown. **Very large — cap it.** |
| `include_images`, `include_image_descriptions`, `include_favicon` | `false` | |
| `include_domains` | — | Max **300**. |
| `exclude_domains` | — | Max **150**. |
| `include_domains_mode` | `restrict` | `restrict` (hard filter) \| `prefer` (boost, others may appear). |
| `country` | — | **Boost only**, not a filter. Enum of country names, **includes `cameroon`** (verified). Only valid when `topic: general`. |
| `language` | `en` | ISO 639-1 or English name. Boost only by default. |
| `filter_by_language` | `false` | Hard filter. 400 if `language` is unset. |
| `auto_parameters` | `false` | Tavily picks params. **Costs 2 credits.** |
| `exact_match` | `false` | Honours quoted phrases. |
| `safe_search` | `false` | Not supported with `fast`/`ultra-fast`. |
| `include_usage` | `false` | Returns `usage.credits`. **Always set it — see §4.6.** |

**Response** (verified live):

```jsonc
{
  "query": "photosynthesis equation 6CO2",
  "follow_up_questions": [...],
  "answer": "…",                       // present only when include_answer
  "images": [],
  "results": [
    { "url": "...", "title": "...", "content": "…", "score": 0.89, "raw_content": null, "id": "..." }
  ],
  "response_time": 1.83,
  "usage": { "credits": 1 },           // present when include_usage: true
  "request_id": "..."
}
```

Measured content lengths, `basic` depth, no raw content: **1,180 / 1,340 / 1,331 characters**, scores **0.835 / 0.856 / 0.892**. With `advanced` + `include_raw_content: "markdown"`: one result gave `content` 2,234 / `raw_content` 6,459; the other gave `content` **144** / `raw_content` **0** — Tavily returned a 200 with a near-empty result rather than failing it. That is a concrete case for the "not useful" classifier in §3.4.

`usage.credits` observed: `1` for basic, `2` for advanced. Confirms the published cost table.

### 2.2 `/extract`

`POST https://api.tavily.com/extract` — `urls` (string **or** string array; verified live with an array), `query` (reranks extracted chunks), `chunks_per_source` (1–5, ≈800 chars each, **only when `query` is given**), `extract_depth` `basic`|`advanced`, `format` `markdown`|`text`, `include_images`, `include_favicon`, `timeout` (1–60s; defaults 10s basic / 30s advanced), `include_usage`.

Response (verified live): `{ results: [{ url, title, raw_content, images }], failed_results: [], response_time, usage, request_id }`.

Costs: **1 credit per 5 successful basic extractions, 2 per 5 advanced. Failed extractions are never charged.** Live confirmation: two URLs extracted, `usage.credits: 0` — the counter has not yet crossed 5.

Live content sizes: Firecrawl's own search doc page came back at **38,460 characters**; English Wikipedia's Photosynthesis page at **272,524 characters**. Uncapped `raw_content` will blow any context budget and most model context windows.

**For the fallback path, `/extract` is not needed.** Tavily `/search` already returns ~1.2k chars of query-relevant content per result without a second round trip. Reach for `/extract` only when you already have specific URLs and need their full text.

### 2.3 Pricing and free tier (verified)

| Plan | Credits/mo | Price | $/credit |
|---|---|---|---|
| Researcher (free) | 1,000 | $0 | — |
| Project | 4,000 | $30 | $0.0075 |
| Bootstrap | 15,000 | $100 | $0.0067 |
| Startup | 38,000 | $220 | $0.0058 |
| Growth | 100,000 | $500 | $0.005 |
| Pay as you go | — | — | **$0.008** |

Free tier: 1,000 credits/month, no card, resets on the 1st. Tavily also advertises a free student account.

**Per 1,000 basic searches** (1 credit each): **$8.00** on PAYG, **$7.50** on Project, **$3.75** on Bootstrap, **$2.92** on Startup, **$5.00** on Growth. Advanced searches (2 credits) are double.

**Firecrawl is roughly 3–10× cheaper per search than Tavily on comparable plans.** That is a second, independent reason to make Firecrawl primary: the fallback is also the expensive path, so you want the fallback *rate* low.

### 2.4 Rate limits (verified)

Per key, per endpoint class: **Development 100 rpm, Production 1,000 rpm.** Crawl and the usage endpoint have separate limits. Over-limit returns `429` with a `Retry-After` header. Other documented statuses: `400` bad request, `401` unauthorized, `422` validation, `432` plan usage limit exceeded, `433` pay-as-you-go limit exceeded, `500` server error.

### 2.5 Tavily MCP

Yes — `https://mcp.tavily.com/mcp/?tavilyApiKey=<key>`, or npm `@tavily/mcp` (`tavily-ai/tavily-mcp` on GitHub). Exposes exactly two tools: **`tavily-search`** and **`tavily-extract`**. Same conclusion as Firecrawl MCP — irrelevant for a tool you bind yourself in an AI SDK route.

### 2.6 Firecrawl vs Tavily result shape

| | Firecrawl `/v2/search` | Tavily `/search` |
|---|---|---|
| Grouping | `data.web[]`, `data.news[]`, `data.images[]`, `data.tools[]` | flat `results[]` |
| Per-result relevance signal | **`position` only — no score** | numeric **`score`** (0–1) |
| Per-result readable body | `markdown` (full page) when `scrapeOptions` is set | `content` = 3 chunks ≈1.2k chars by default; `raw_content` = full page (huge) |
| Per-result page status | `metadata.statusCode`, `cacheState`, `creditsUsed` | **none** — a dead URL just yields a thin `content` |
| Per-result date | `metadata.publishedTime` / `modifiedTime` | `published_date` (needs `include_published_date`) |
| Per-result language | `metadata.language` | none |
| Answer | none | `answer` (LLM, opt-in) |
| Cost accounting | top-level `creditsUsed` | `usage.credits` (needs `include_usage: true`) |
| Domain filter | `includeDomains` hard filter | `include_domains_mode: restrict` hard filter, or `prefer` |
| Geo | `country` (ISO, default US) + `location` | `country` (enum incl. `cameroon`), boost only |
| Language filter | **none** | `language` + `filter_by_language` (hard) |
| Structured data | `json` format (schema/prompt), +4 credits/page | none (search is snippet-only) |
| Caching | `maxAge` + Firecrawl-side cache, `cacheState` observable | none exposed |

Three asymmetries the normalisation layer must paper over: Firecrawl has no score, Tavily has no page status, and only Tavily can hard-filter by language.

---

## 3. The tool interface

### 3.1 One tool or two? — One.

Argued from the agent's side, because that is the only perspective that matters for a decision the model is nominally making:

1. **The model cannot know which provider is down.** If the surface is `webSearch` + `webSearchFallback`, then every failure becomes a reasoning problem the model will solve badly — it will retry the broken provider, it will hallucinate a preference, and it will sometimes call neither. Provider health is a *runtime* fact the model has no access to. Hiding it inside the tool is not a simplification for the model; it is the correct amount of information.
2. **Provider choice has no user-visible meaning.** A student asking "explain the律 law of sines" does not care whether Britannica or Tavily answered. Exposing the choice invites the model to narrate infrastructure ("let me try another source") and to produce answers that differ run to run for no reason.
3. **The model's context budget is the scarce resource.** One tool with a `depth` parameter gives you a single place to enforce the character cap, dedup, and truncation. Two tools means two places, and one of them will be forgotten.
4. **It preserves the ability to expose the provider later.** `outcome.servedBy` and `outcome.attempts` give you the data to build a second, explicit tool later without changing any downstream code — because downstream code only sees the normalised shape.

The one thing you lose is observability of *why* Tavily was chosen. That is solved by logging (§4.6), not by giving the model the decision.

### 3.2 The tool input

Keep the model's surface deliberately small. Five fields, two of which are enums.

```ts
// lib/ai/web-search/types.ts  (proposed — not created in this task)

export type WebSearchDepth = "quick" | "thorough";

export interface WebSearchToolInput {
  query: string;
  depth?: WebSearchDepth;       // default "quick"
  recency?: "any" | "day" | "week" | "month" | "year";  // default "any"
  country?: string;             // ISO-3166-1 alpha-2. Default "CM".
}
```

Model-facing description (this exact string is what goes in the front matter `description` field — see §6):

> Search the web for current information, recent changes, live facts, or anything not answerable from the user's uploaded notes. Returns titles, URLs and readable excerpts. Use `depth: "thorough"` when the answer must quote or paraphrase the actual page text (syllabus wording, exact definitions, exam-format questions); use the default `quick` for general facts. Prefer your own knowledge over searching when the question is about the user's notes, quizzes or progress — use `searchNotes` / `getNoteContext` for those. Do not search for a fact you already know.

Field descriptions for the zod schema:

| Field | Description string |
|---|---|
| `query` | "A specific web search query. Use natural keywords, not a full question." |
| `depth` | "`quick` for general facts. `thorough` fetches full page text from the top results — slower and more expensive, use only when the answer must come from the page." |
| `recency` | "Restrict to recently published pages. Use when the user asks about 'current', 'latest', 'this year'." |
| `country` | "Two-letter country code to prefer local sources. Defaults to CM (Cameroon). Only set it to override that." |

Deliberately **not** exposed to the model: `domains`, `language`, `mode`, provider, limit, timeout, cache TTL, domain mode. Every one of those is a judgement call the codebase should make, and most are static (Cameroon defaults, `safe: true`).

### 3.3 The normalised output

Downstream code — prompt assembly, citation rendering, logging, analytics — must never branch on provider.

```ts
export type WebSearchProvider = "firecrawl" | "tavily";

export type WebSearchWarningCode =
  | "BLOCKED"           // 401/403/429 on the page, or bot-wall boilerplate
  | "PAYWALLED"         // "subscribe to continue" style interstitial
  | "NO_BODY"           // no readable text (JS-only, PDF that failed to parse, empty)
  | "TRUNCATED"
  | "LOW_RELEVANCE";    // synthesised score below floor

export interface WebSearchResult {
  url: string;
  domain: string;
  title: string;
  snippet: string;              // 150–2,000 chars, query-relevant, always present
  body: string | null;          // full markdown; only in "thorough" and only if it beat the cap
  bodyTruncated: boolean;
  score: number;                // 0..1, synthesised — see §3.5
  publishedAt: string | null;   // ISO-8601 or null
  language: string | null;      // ISO 639-1 or null
  warnings: WebSearchWarningCode[];
}

export interface WebSearchAnswer {
  text: string;
  source: "provider_answer" | "none";   // Tavily's LLM answer, when it exists
}

export interface WebSearchAttempt {
  provider: WebSearchProvider | "cache";
  ok: boolean;
  durationMs: number;
  creditsUsed: number | null;   // Firecrawl: top-level creditsUsed. Tavily: usage.credits.
  cacheHit: boolean | null;     // Firecrawl metadata.cacheState, when scraped
  errorCode: WebSearchErrorCode | null;
  outcome: "served" | "not_useful" | "hard_failure" | "cache_hit" | "skipped";
  detail: string | null;
}

export interface WebSearchOutcome {
  ok: boolean;
  query: string;
  servedBy: WebSearchProvider | null;   // null only when ok === false
  fallbackUsed: boolean;
  degraded: boolean;                    // true when the result is thin and we want the model to say so
  answer: WebSearchAnswer | null;
  results: WebSearchResult[];
  attempts: WebSearchAttempt[];         // full audit trail, for logs/analytics
  contextChars: number;                 // chars actually handed to the model
  contextTruncated: boolean;
}
```

`ok: false` is reserved for "we have nothing at all". The agent's prompt should tell the model that `ok: false` means *answer from your own knowledge and say you could not verify it online* — never to invent a citation.

### 3.4 Error taxonomy

Two classes, and the class is what drives the fallback decision.

```ts
export type WebSearchErrorCode =
  // ---- hard failure: the provider cannot answer right now ----
  | "MISSING_API_KEY"        // FAIL_FAST: never fall back, never retry
  | "UNAUTHORIZED"           // 401 / 403 on the API (bad key, revoked) — FAIL_FAST
  | "QUOTA_EXHAUSTED"        // 402, Tavily 432/433, Firecrawl out of credits
  | "RATE_LIMITED"           // 429
  | "TIMEOUT"                // client AbortSignal fired
  | "UPSTREAM_ERROR"         // 5xx
  | "NETWORK"                // DNS/TLS/socket
  | "MALFORMED_RESPONSE"     // shape check failed
  // ---- not useful: the provider answered, the answer is unusable ----
  | "ZERO_RESULTS"
  | "NO_READABLE_BODY"
  | "ALL_BLOCKED"            // every result 401/403/429 or bot-wall
  | "ALL_PAYWALLED"
  | "WRONG_REGION"           // every result's language/location is not what the query needs
  | "LOW_RELEVANCE";         // every result's synthesised score below floor
```

`FAIL_FAST` on `MISSING_API_KEY` and `UNAUTHORIZED` is important. If the key is wrong, both providers are wrong, and burning a Tavily call on every student question just to confirm what a startup health check already told you is pure waste. Handle those at the edge: a boot-time check that logs loudly, plus an env-var-present check at bind time.

### 3.5 "Not useful" — how to decide

The distinction is **hard failure vs. answer-but-unusable**. Both must be measured separately in logs; only the first two classes below are worth an immediate retry.

`isNotUseful(outcome, query)` returns true when **any** of:

1. **Zero results.** `results.length === 0`. (Both providers can legitimately return this for a query nothing matches.)
2. **No readable body in thorough mode.** Every result has `body === null` or `body.length < 200` after truncation. This is the common one for JS-only SPAs, PDF parse failures, and "click to continue" interstitials.
3. **All blocked or paywalled.** ≥1 result carries `BLOCKED` or `PAYWALLED`, **and** the survivors have `snippet.length < 200`. The detection: Firecrawl `metadata.statusCode ∈ {401,403,429}`, or a `MARKETING_COPY` heuristic on the markdown (`subscribe to continue`, `sign in to read`, `create an account to view`, `this content is for members only`). Heuristics are brittle — treat them as a signal that lowers confidence, never as a hard gate.
4. **All paywalled**, specifically: every result matches the paywall heuristic list. Sub-case of 3, tracked separately because it is a *content* problem, not an *access* problem, and the second provider will usually hit the same walls.
5. **Wrong country or language.** Query was French (`country: "CM"`) and every result's `metadata.language` is neither `fr` nor `en`. Or the query named a Cameroonian institution and every result is `.com`/`.org` from a different country. Only evaluated when the caller passed an explicit language/region expectation — do not run it on open-ended English queries.
6. **Low relevance.** Every result's synthesised `score < 0.15`. Note the asymmetry: Tavily gives a real `score`; for Firecrawl you must synthesise one (§4.6). Because the synthesised score is position-derived and weak, **do not use rule 6 as a standalone trigger.** Only use it in combination with a lexical-overlap check against the query — otherwise you will fall back on every niche-but-correct query.

**Synthesised score, cross-provider.** Normalise both to 0–1:

```
firecrawl: score = 1 / (1 + (position - 1) * 0.35)     // position 1 → 1.00, 2 → 0.74, 3 → 0.59, 5 → 0.36
           × (hasBody ? 1.0 : 0.6)                     // penalise snippet-only hits
           × (snippet.length >= 200 ? 1.0 : 0.7)

tavily:   score = raw score (already 0–1; observed 0.835–0.892 for good hits)
           × (hasBody ? 1.0 : 0.9)                     // Tavily content is always present, so a lighter penalty
```

Then apply one shared lexical gate to every result regardless of provider: `tokenOverlap(result.title + result.snippet, query)`. Drop results with overlap `=== 0` for queries of ≥4 content tokens. This is what catches the "obvious but useless" hits — a YouTube video and a Harley-Davidson page both scored reasonably in testing.

### 3.6 Timeouts

A chat turn currently gets `timeout: { totalMs: 120_000, stepMs: 60_000, chunkMs: 10_000 }` (`app/api/ai/chat/route.ts`) and `stopWhen: stepCountIs(5)`. The web-search tool should consume at most ~20s of that, and on a student-facing mobile connection much less.

| Call | Budget | Rationale |
|---|---|---|
| Firecrawl attempt 1 — search only | **8s** | Measured `search` alone completes in a few seconds. Firecrawl's own API default is 60s, but that is the server's patience, not yours. |
| Firecrawl attempt 2 — search + scrape | **12s** | This fetches and renders up to 3 pages. Sequential scrapes dominate. Send `timeout: 12000` inside `scrapeOptions` so Firecrawl aborts internally rather than you waiting on the socket. |
| Tavily — search only | **5s** | Measured `response_time: 1.83s`. 5s is ~3× headroom. |
| **Total tool budget** | **25s** | Leaves the step plenty of room for the model's own generation. |

Enforce with `AbortSignal.timeout()` on the fetch (or the SDK's per-call `timeout`). Do **not** rely on the provider-side `timeout` field — that is a server-side abort and still costs you the socket wait. **Never** retry a timed-out call: Firecrawl keeps scraping the page after you disconnect, and you get billed for it.

If the 25s total is at risk, the honest move is to shorten `thorough` to 2 pages, not to extend the budget. A Cameroonian 3G round trip to three sites is the worst-case scenario this tool has.

### 3.7 Deduplication and context capping

Do both **after** normalisation, **before** anything reaches the model.

**URL canonicalisation** (both providers, same function):
1. Parse; reject non-`http(s)` schemes.
2. Lowercase the host; strip a leading `www.`.
3. Drop the fragment.
4. Sort remaining query params; **strip** `utm_*`, `gclid`, `fbclid`, `mc_cid`, `mc_eid`, `ref`, `_ga`.
5. Strip a single trailing slash.
6. Reject hosts that are IP literals, `localhost`, or end in `.local`/`.internal` (defence in depth — the SSRF risk is in any `fetch`-ing tool, and a search result is attacker-influenceable text).

**Dedup:** key on the canonical URL, preserving provider priority order (`firecrawl` before `tavily`). On collision, merge: keep the longer `snippet`, prefer the non-null `body`, union `warnings`, take the max `score`, and record both providers in an internal `alsoSeenIn` set that is **stripped** before returning to the model.

**Context cap — the numbers that matter for a tutoring app:**

| Budget | `quick` | `thorough` |
|---|---|---|
| Max results | 5 | 3 |
| Per-result snippet cap | 1,200 chars | 2,000 chars |
| Per-result body cap | — (no body fetched) | 4,000 chars |
| **Total text budget** | **6,000 chars** | **12,000 chars** |
| Approx. tokens | ~1,800 | ~3,600 |
| Minimum viable result | snippet ≥ 150 chars, else dropped | body ≥ 400 chars, else fall back to the snippet |

6,000 and 12,000 characters (~1.8k and ~3.6k tokens) against a `gemini-2.5-flash` context window is a very small fraction of the budget, and it is roughly the amount of text a student will actually read. Going wider costs tokens linearly and buys almost no answer quality — the model only ever cites 1–3 of these results.

Truncate at a **sentence or heading boundary** within the last 15% of the cap and append `… [truncated]`. Never hard-cut mid-table; tables are common in syllabus documents and a half-table is worse than no table. Also, for `thorough`, preserve all `#`/`##` headings from the page even when the body is truncated — the heading skeleton alone tells the model what kind of document it is looking at, which is often enough to decide whether to cite it.

For reference on why this cap is not optional: the Tavily extract of one Wikipedia page measured **272,524 characters**.

---

## 4. The fallback logic

### 4.1 Decision order

1. **Cache lookup.** On a fresh hit, return immediately with `attempts: [{ provider: "cache", outcome: "cache_hit" }]`. No provider call, no latency.
2. **Configuration gate.** If `FIRECRAWL_API_KEY` is unset, skip straight to step 7. This is a startup misconfiguration, not a runtime condition.
3. **Firecrawl attempt 1 — search only.** `POST /v2/search` with `limit: 6`, `highlights: false`, `sources: ["web"]`, `domainTools: false`, `safe: true`, `country` from input (default `CM`), `tbs` from `recency`, `ignoreInvalidURLs: true`. **No `scrapeOptions`.** Client budget 8s. 2 credits.
4. **Classify.** Run `isNotUseful()` on the normalised result. If **useful** and the input was `depth: "quick"`, we are done — **go to step 9**.
5. **Firecrawl attempt 2 — only when a second call is genuinely warranted.** Skip it entirely when attempt 1 was a `hard_failure`; a second call to a provider that just timed out or returned 429 is a bug, not a fallback. Run it when either:
   - the input said `depth: "thorough"`, **or**
   - attempt 1 was classified `NO_READABLE_BODY` / `ZERO_RESULTS` — i.e. the pages exist but are thin or unfetchable, which a *different mode* can plausibly fix.
   Request: same query, `limit: 3`, `highlights: false`, `scrapeOptions: { formats: ["markdown"], onlyMainContent: true, maxAge: 86400000, timeout: 12000, parsers: ["pdf"] }`. Client budget 12s. ~5 credits.
6. **Re-classify.** If now useful, done — **go to step 9**. If not, fall through to step 7.
7. **Tavily attempt — terminal fallback.** `POST /search` with `search_depth: "basic"`, `max_results: 5`, `include_answer: true`, `include_raw_content: false`, `include_usage: true`, `safe_search: true`, `country` mapped to Tavily's lowercase enum (`"cameroon"`), `time_range` from `recency`, `chunks_per_source: 2`. Client budget 5s. 1 credit.
   - Use `basic`, not `advanced`: it is half the cost, measured 1.83s, and the fallback does not need to be clever.
   - **No `include_raw_content`.** It is not capped by Tavily and measured up to 272k characters.
8. **Classify Tavily.** If useful, done. If not, return `ok: false, servedBy: null, degraded: true` and let the prompt tell the model to answer from its own knowledge and say it could not verify online.
9. **Merge, dedupe, cap.** Apply §3.7. Merge only results from **Firecrawl's own two attempts**. Tavily results are not merged into a Firecrawl answer — if Firecrawl served, Firecrawl served, and a merged answer would double the latency for a marginal gain in recall.
10. **Cache on success** (§5), then return.
11. **Log every attempt** (§4.6).

### 4.2 Answer these directly

- **When to try Firecrawl:** always, unless the key is missing. There is no query class where Tavily should go first — Firecrawl is 3–10× cheaper and returns better-shaped content.
- **When to fall back to Tavily:** when Firecrawl **hard-fails** (429, 5xx, timeout, network) **or** returns something classified not-useful, **and** attempt 2 was either not warranted or also failed.
- **Fall back on empty results, or only on errors?** **Both, but through different paths.** A hard failure skips Firecrawl attempt 2 entirely and goes straight to Tavily. A not-useful result gets one more Firecrawl call in a different mode first, because the most common cause (thin/unfetchable pages) is a *mode* problem, not a provider problem. Zero results from both `highlights` and a scrape is unusual and usually means the query is bad — falling back is still correct, but log it loudly, because a rising `ZERO_RESULTS` rate on Firecrawl-with-Tavily-succeeding is a query-quality signal, not a provider-health signal.
- **Second Firecrawl call in a different mode?** Yes, exactly once, under the two conditions in step 5, and never after a hard failure.
- **How to log which provider served:** §4.6.

### 4.3 Pseudocode

```typescript
async function runWebSearch(input: WebSearchToolInput): Promise<WebSearchOutcome> {
  const t0 = Date.now();
  const params = normaliseParams(input);              // depth, recency, country, limit per depth
  const attempts: WebSearchAttempt[] = [];

  // 1 ── cache
  const hit = await cacheGet(cacheKey(params));
  if (hit) {
    attempts.push({ provider: "cache", ok: true, outcome: "cache_hit",
                    durationMs: Date.now() - t0, creditsUsed: 0, cacheHit: true,
                    errorCode: null, detail: null });
    return { ...hit, attempts };
  }

  // 2 ── configuration gate
  const fc = firecrawlClient();                        // null when FIRECRAWL_API_KEY is unset
  const tv = tavilyClient();                          // null when TAVILY_API_KEY is unset

  let raw: NormalisedSearch | null = null;

  if (fc) {
    // 3 ── Firecrawl attempt 1: search only, no page fetches, no highlights
    const a1 = await attempt({
      provider: "firecrawl", budgetMs: 8_000, attempts,
      run: () => fc.search({
        query: params.query,
        limit: 6,
        sources: ["web"],
        domainTools: false,
        highlights: false,                             // DEFAULT IS TRUE — always explicit
        safe: true,
        country: params.country,                      // "CM"
        ...(params.tbs ? { tbs: params.tbs } : {}),
        ignoreInvalidURLs: true,
        // NOTE: no scrapeOptions on this pass
      }),
      map: (r) => fromFirecrawlSearch(r),               // data.web[] -> WebSearchResult[]
      readCredits: (r) => r.creditsUsed ?? null,
      readCacheHit: () => null,                        // no pages fetched
    });
    if (a1.ok) raw = a1;

    // 4 ── classify
    if (raw && isNotUseful(raw, params)) {
      const why = classifyNotUseful(raw, params);
      raw = null;

      // 5 ── second Firecrawl call, DIFFERENT MODE, only when a hard failure did not occur
      if (why.retryableInAnotherMode) {
        const a2 = await attempt({
          provider: "firecrawl", budgetMs: 12_000, attempts,
          run: () => fc.search({
            query: params.query,
            limit: 3,
            sources: ["web"],
            domainTools: false,
            highlights: false,
            safe: true,
            country: params.country,
            ...(params.tbs ? { tbs: params.tbs } : {}),
            scrapeOptions: {
              formats: ["markdown"],
              onlyMainContent: true,
              maxAge: 86_400_000,                       // 24h; let Firecrawl's own cache work
              timeout: 12_000,
              parsers: ["pdf"],
            },
          }),
          map: (r) => fromFirecrawlSearch(r),           // now with markdown -> body
          readCredits: (r) => r.creditsUsed ?? null,
          readCacheHit: (r) => r.data?.web?.[0]?.metadata?.cacheState === "hit",
        });
        if (a2.ok && !isNotUseful(a2, params)) raw = a2;
      }
    }
  }

  // 7 ── Tavily: terminal fallback. Only reached on hard failure, missing Firecrawl,
  //        or Firecrawl returning nothing usable after both modes.
  if (!raw && tv) {
    const a3 = await attempt({
      provider: "tavily", budgetMs: 5_000, attempts,
      run: () => tv.search({
        query: params.query,
        search_depth: "basic",                         // 1 credit, measured 1.83s
        max_results: 5,
        chunks_per_source: 2,
        include_answer: true,
        include_raw_content: false,                    // UNCAPPED upstream - never true
        include_usage: true,
        safe_search: true,
        country: params.country.toLowerCase(),         // "cameroon" — enum, not ISO
        ...(params.tavilyTimeRange ? { time_range: params.tavilyTimeRange } : {}),
      }),
      map: (r) => fromTavilySearch(r),
      readCredits: (r) => r.usage?.credits ?? null,
      readCacheHit: () => null,
    });
    if (a3.ok && !isNotUseful(a3, params)) raw = a3;
  }

  // 8 ── nothing anywhere
  if (!raw) {
    const outcome = emptyOutcome(params.query, attempts, { degraded: true });
    await logSearch(queryId, params, outcome);         // log failures too
    return outcome;
  }

  // 9 ── merge (Firecrawl only), dedupe, cap
  const results = capContext(dedupe(merge(raw.results)), params.budget);
  const outcome: WebSearchOutcome = {
    ok: true,
    query: params.query,
    servedBy: attempts.findLast(a => a.outcome === "served")?.provider ?? null,
    fallbackUsed: attempts.some(a => a.provider === "tavily" && a.outcome === "served"),
    degraded: results.length === 0,
    answer: raw.answer,
    results,
    attempts,
    contextChars: results.reduce((n, r) => n + r.snippet.length + (r.body?.length ?? 0), 0),
    contextTruncated: results.some(r => r.bodyTruncated || r.warnings.includes("TRUNCATED")),
  };

  // 10 ── cache only on success
  await cacheSet(cacheKey(params), outcome, ttlFor(params));

  // 11 ── one row per attempt
  await logSearch(queryId, params, outcome);
  return outcome;
}
```

`attempt()` wraps one provider call and converts every thrown or malformed case into a `WebSearchAttempt`:

```typescript
async function attempt<P, R>(o: {
  provider: WebSearchProvider;
  budgetMs: number;
  attempts: WebSearchAttempt[];
  run: () => Promise<R>;
  map: (r: R) => NormalisedSearch;
  readCredits: (r: R) => number | null;
  readCacheHit: (r: R) => boolean | null;
}): Promise<NormalisedSearch | null> {
  const t = Date.now();
  try {
    const r = await o.run();                                  // fetch with AbortSignal.timeout(budgetMs)
    const n = o.map(r);
    if (!Array.isArray(n.results)) throw new MalformedResponse();
    return n;
  } catch (e) {
    o.attempts.push({
      provider: o.provider, ok: false, durationMs: Date.now() - t,
      creditsUsed: null, cacheHit: null,
      errorCode: classifyError(e),                              // see §3.4
      outcome: classifyError(e) === "MISSING_API_KEY" || classifyError(e) === "UNAUTHORIZED"
        ? "hard_failure" : "hard_failure",
      detail: redact(e),
    });
    return null;
  }
}
```

Mark the serving attempt after normalisation succeeds, not inside `attempt()` — the provider does not know whether its answer was *useful*, only whether it answered.

### 4.4 `isNotUseful`

```typescript
function isNotUseful(n: NormalisedSearch, p: NormalisedParams): boolean {
  if (n.results.length === 0) return true;                        // rule 1

  const viable = n.results.filter(r =>
    r.snippet.length >= 150 && r.score >= 0.10 && tokenOverlap(r, p.query) > 0);

  if (viable.length === 0) return true;                            // rules 2 + 6 combined
  if (n.results.every(r => r.warnings.includes("BLOCKED"))) return true;      // rule 3
  if (n.results.every(r => r.warnings.includes("PAYWALLED"))) return true;    // rule 4
  if (p.expectLanguage && n.results.every(r => r.language && !p.expectLanguage.includes(r.language)))
    return true;                                                 // rule 5

  return false;
}

// "retryableInAnotherMode": only these justify a second Firecrawl call
function retryableInAnotherMode(why: string): boolean {
  return why === "ZERO_RESULTS" || why === "NO_READABLE_BODY";
}
```

### 4.5 Per-provider option mapping

One table, one direction, no branching downstream:

| Normalised param | Firecrawl | Tavily |
|---|---|---|
| `query` | `query` | `query` |
| `depth: "quick"` | `limit: 6`, no `scrapeOptions` | `search_depth: "basic"`, `max_results: 5` |
| `depth: "thorough"` | `limit: 3` + `scrapeOptions.formats:["markdown"]` | same (Tavily has no equivalent; chunks only) |
| `recency` | `tbs: qdr:d \| qdr:w \| qdr:m \| qdr:y` | `time_range: day \| week \| month \| year` |
| `country` | `country: "CM"` (ISO) | `country: "cameroon"` (enum name) |
| safe search | `safe: true` | `safe_search: true` |
| highlights | `highlights: false` (always) | n/a (`content` is already chunked) |
| readable body | `markdown` via `scrapeOptions` | `content` (default) — **never** `raw_content` |
| score | synthesised from `position` | native `score` |

The two genuinely non-mappable params: Firecrawl has no language filter, Tavily has no page-status signal. Both are handled in normalisation (§3.5, §3.6), not here.

### 4.6 Logging and measurement

One `WebSearchQueryLog` row per tool invocation, plus the `attempts` array persisted as JSONB. The fields that actually earn their keep:

| Column | Why |
|---|---|
| `queryHash` | aggregate "what are students asking" without storing student text if you prefer |
| `userId`, `createdAt` | per-student search rate, the abuse vector |
| `requestedDepth`, `requestedRecency` | did the model actually pick `thorough` when it should? |
| `servedBy` | **the number that matters** — `firecrawl` \| `tavily` \| `null` |
| `fallbackUsed` | `servedBy === "tavily"` |
| `attempts` (JSONB) | full trail with per-attempt `errorCode`, `durationMs`, `creditsUsed`, `cacheHit` |
| `resultCount`, `usableCount` | distinguishes "found 6, kept 1" from "found 6, kept 6" |
| `contextChars`, `contextTruncated` | is the cap actually binding, and are we wasting calls? |
| `providerCredits` | Firecrawl `creditsUsed` + Tavily `usage.credits`, summed |

Also send Firecrawl search feedback (`POST /v2/search/{jobId}/feedback`) for `bad` results. The first submission per search job **refunds 1 credit** — that halves the cost of every Firecrawl search — but it must land within ~2 minutes and requires `--missing-content` or `--query-suggestions` for a `bad` rating. It is fire-and-forget from the request path: do it in an Inngest step, never inline. Cap it: once the daily refund cap (`creditsRefundedToday` / `dailyCapReached` in the response) is hit, stop. **Unverified:** exact wording of the refund-cap response fields beyond `dailyCapReached`.

The dashboard that matters:

- **Firecrawl success rate** = `servedBy=firecrawl` ÷ total. Target ≥95%. Below that, the fallback is masking a provider problem and the logs will tell you which `errorCode` is responsible.
- **Fallback rate** = `servedBy=tavily` ÷ total. Target <3%. A rising rate is an incident, not a tuning knob.
- **`ZERO_RESULTS` rate**, split by whether Tavily then succeeded. High on both = bad queries. High on Firecrawl only = a Firecrawl issue.
- **`creditsPerServedAnswer`** = `providerCredits` ÷ `servedBy != null`. This is the number that justifies your cache TTL.
- **`hard_failure` with `MISSING_API_KEY`** must be zero after boot. Anything else is a broken deploy.

---

## 5. Caching and cost

### 5.1 The economics, honestly

1,000–3,000 XAF per user per month is roughly **$0.65–$1.95** at current rates. For a few hundred active students that is a few hundred to a couple of thousand US dollars per month of *total* budget.

Search calls are a rounding error against that. If 500 students each make 5 searches a month in `thorough` mode (5 credits each), that is 12,500 credits — **Firecrawl Standard at $83/month**, or Hobby at $16 if most calls are `quick`. Meanwhile a single unanswered chat turn costs more in tokens than a week of searches.

So: **cache for latency and for clean fallback-rate measurement, not to save credits.** Do not let cost pressure drive a design that makes answers worse.

### 5.2 Where it lives: Postgres

The stack is Next.js + Postgres + Inngest. There is **no Redis** (`lib/ai/cache.ts` is a plain in-memory `Map`, and its own comment says it does not survive multiple instances). An in-process cache would give every serverless instance a different view, which makes the fallback-rate dashboard lie. Adding Redis for one cache is not justified.

**Use a Postgres table.** Reasons specific to this stack: one more schema migration and no new infrastructure; writes are already happening on this path (`WebSearchQueryLog`); and Inngest already gives you a place to run the warm/prefetch jobs. Postgres `UNIQUE` on the key hash gives you read-through dedup and stampede protection for free via `INSERT ... ON CONFLICT DO NOTHING`.

```sql
CREATE TABLE "WebSearchCache" (
  "key"        TEXT PRIMARY KEY,          -- sha256 hex of the cache key below
  "provider"   TEXT NOT NULL,             -- 'firecrawl' | 'tavily'
  "queryHash"  TEXT NOT NULL,             -- for aggregating/reuse lookups
  "paramsHash" TEXT NOT NULL,             -- depth|recency|country, for reuse lookups
  "payload"    JSONB NOT NULL,            -- the NORMALISED WebSearchOutcome minus `attempts`
  "creditsUsed" INTEGER NOT NULL DEFAULT 0,
  "resultCount"  INTEGER NOT NULL DEFAULT 0,
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT now(),
  "expiresAt"  TIMESTAMPTZ NOT NULL
);
CREATE INDEX ON "WebSearchCache" ("queryHash", "createdAt" DESC);
CREATE INDEX ON "WebSearchCache" ("expiresAt");   -- for the sweeper
```

### 5.3 Cache key

```typescript
function cacheKey(p: NormalisedParams): string {
  return sha256([
    "ws:v1",                          // bump when the normalised shape or caps change
    p.query,                          // normalised query — see below
    p.depth,
    p.recency,
    p.country,
  ].join(" "));
}

// Normalise the query BEFORE hashing, or near-duplicates never hit:
//   lowercase → collapse whitespace → strip trailing punctuation
//   → drop question words (what/who/how/why/explain/tell me about)
//   → sort nothing else. Do NOT stem or synonym-map: too aggressive,
//     and "graph theory" must not collide with "graphical theory".
```

`depth` **must** be in the key: a `quick` entry has no `body`, and serving it to a `thorough` caller would silently degrade the answer. `recency` and `country` must be in the key for the same reason — a non-Cameroon or stale answer is wrong for a Cameroon or "current" question.

Note what is deliberately **not** in the key: `userId`, plan tier, and locale. The content is the same for everyone; the *prompt* around it is already per-user, and per-user keys would make the cache useless.

### 5.4 TTL

| Condition | TTL | Reasoning |
|---|---|---|
| `recency === "any"` and `depth === "quick"` | **7 days** | Syllabus and definitional content. Matches the existing `reasoning`/`quiz_gen` TTLs in `lib/ai/registry.ts`, so the codebase is already consistent. |
| `recency === "any"` and `depth === "thorough"` | **3 days** | Full page text goes staler faster, and students re-ask syllabus questions across a term. |
| `recency` is `day`/`week`/`month` | **1 hour** (or `min(ttl, 1h)`) | Freshness is the point of the query. |
| `country` is not the default, or the query looks time-sensitive | **1 hour** | Same reasoning. |
| Outcome was `ok: false` / `degraded: true` | **do not cache** | A transient outage would be pinned for the whole TTL. |
| Outcome has `fallbackUsed: true` | **1 hour, not 7 days** | A fallback result is measurably worse; re-check it soon. |

Add a small in-process LRU (a few hundred entries, the existing `lib/ai/cache.ts` `Map` is fine) **in front of** Postgres to absorb repeat lookups within a warm lambda. Never rely on it for correctness — it is an optimisation, and the Postgres row is the truth.

### 5.5 Firecrawl's own cache is the second tier

Leave `maxAge` at its 2-day default for the `thorough` scrape path. It costs nothing extra in credits (verified) and makes repeat scrapes of a syllabus page near-instant. Log `metadata.cacheState` per attempt — a persistently `miss` rate on repeated URLs suggests your `maxAge` is set to 0 somewhere or the cache-key parameters are drifting between calls (verified: a hit requires `url`, `mobile`, `location`, `waitFor`, `blockAds`, `screenshot` and enhanced-proxy mode to match exactly).

### 5.6 Warm-up via Inngest (optional, later)

A nightly Inngest cron that reads the top 50 `queryHash`es from the last 7 days grouped by `paramsHash`, and re-primes the cache for the ones expiring, gives you a warm Monday morning for free. Do this **after** the read-through cache has a week of real data — there is no point guessing which queries to prewarm, and guessing wrong burns credits.

### 5.7 Stampede protection

When a cache miss has a `WebSearchCache` row absent but a `WebSearchQueryLog` row inside the last 60s for the same `queryHash + paramsHash`, another student already asked this. Serve them the freshest result you have from `WebSearchCache` if one exists at any age (marked stale in the log), rather than issuing a second provider call. On a syllabus-heavy app, popular questions cluster hard and this is where the real win is.

---

## 6. Prompt and tool description guidance

The stated direction: move every prompt out of code into editable markdown files with front matter. The `webSearch` tool description is a prompt in exactly this sense — it is prose the model reads, and prose you will want to iterate on without a deploy.

### 6.1 The bind-time constraint

The model needs the tool `description` and `inputSchema` **at the moment `streamText({ tools })` is called**. Nothing about that forces the description to live in code — it forces the description to be **loadable synchronously**, or at least before `streamText`, on every request path that binds tools.

That rules out reading the markdown from disk inside `execute()`. It also rules out a filesystem read with a cold cache on the request path if you can avoid it. Three workable shapes:

- **(a) Build-time codegen.** Read all prompt markdown at build time, emit a typed module of `{ id, description, ... }`. Best latency, best type safety, worst DX — editing a prompt needs a rebuild.
- **(b) `fs.readFileSync` + an in-process cache, warmed at module init.** Editing a prompt file is a dev-server reload away. Works because the prompt files live inside the Next.js bundle's reach and the module init runs once per instance.
- **(c) Postgres + `unstable_cache`.** Editing a prompt is a database row. Best for non-engineers. Adds a DB read on the bind path unless aggressively cached, and needs a cache-invalidation story.

**(b) is the right default** for this codebase. It matches the existing `lib/ai/registry.ts` "config object per task" shape, requires no new infrastructure, and prompt edits become a file save. Keep the front matter schema **narrow and typed** so a typo fails at parse time with a clear message rather than shipping a subtly wrong tool description to the model.

### 6.2 Front matter for a tool-enabled prompt

```markdown
---
# ── identity ────────────────────────────────────────────────────────────────
id: tool.web_search
version: 3                     # bump on any semantic change; goes in the prompt cache key
enabled: true

# ── what the model sees ─────────────────────────────────────────────────────
# `description` is the ONLY field the model reads as a tool description.
# Keep it under ~500 chars. Every word here is permanent prompt surface.
description: |
  Search the web for current information, recent changes, live facts, or anything
  not answerable from the user's uploaded notes. Returns titles, URLs and readable
  excerpts. Use depth "thorough" when the answer must quote or paraphrase the actual
  page text. Prefer searchNotes/getNoteContext over this for anything about the
  user's own notes, quizzes or progress.

# ── input surface (must match the zod schema exactly; validated at load) ────
input_schema: tool.web_search.input        # a KEY into the TS zod schema registry
                                                 # the schema itself stays in TS
input_examples:                             # few-shot steering; strong, cheap win
  - query: "GCE A-Level Computer Science topic 3 syllabus"
    depth: thorough
  - query: "latest UTBM admission deadline"
    recency: month

# ── behaviour ───────────────────────────────────────────────────────────────
guidance: |                                 # injected into the SYSTEM prompt, not the tool description
  Cite sources with their URL. Prefer 1–3 sources over a longer list.
  If the result has degraded=true, say you could not verify online and answer
  from your own knowledge instead. Never invent a URL or a source you did not see.
  Do not search twice for the same question — adjust the query instead.

# ── execution policy (never shown to the model) ─────────────────────────────
provider_order: [firecrawl, tavily]       # drives §4; order is a code default,
                                            # this front matter makes it editable
limits:
  max_results_quick: 5
  max_results_thorough: 3
  snippet_cap_chars: 2000
  body_cap_chars: 4000
  total_context_chars: 12000
  timeout_ms: { firecrawl_quick: 8000, firecrawl_thorough: 12000, tavily: 5000 }
cache:
  ttl_days: { default: 7, thorough: 3, recency_bound: 0.04 }   # 0.04d ≈ 1h
safety:
  safe_search: true                        # SafeSearch on both providers
  prompt_injection_check: false            # enable +4 credits/page; see open questions
  block_private_networks: true             # reject IP-literal / .local hosts post-normalisation
geo:
  default_country: CM
  default_language: [fr, en]
observability:
  emit_query_log: true

# ── rollout ─────────────────────────────────────────────────────────────────
tiers: [FREE, STARTER, STANDARD, PREMIUM]   # who gets the tool at all
rate_limit:
  max_calls_per_conversation: 3            # stops a runaway loop burning credits
  max_calls_per_day: 25
---

<body markdown>

Rules for using this tool:
- Use it for facts you cannot verify from the user's own materials.
- Ask one focused query. Do not stack synonyms into one query.
- Prefer `quick`. Escalate to `thorough` only when you need the page's own wording.
...
```

**Where each field belongs, and why:**

| Field | Read by | Why it lives there |
|---|---|---|
| `description` | the model, as the tool description | The only model-facing prose. Everything else is engineering policy. |
| `guidance` | the model, injected into the system prompt | Long prose in a tool description dilutes every *other* tool's description. Guidance belongs in the system prompt where it has room to be specific about citations and degradation. |
| `input_schema` | `ts` (a key, not a literal) | Zod cannot live in YAML. A key into a TS registry gives you validation and completions without losing type safety. **Fail the build, not the request, if the key is unknown.** |
| `input_examples` | the model | Few-shot examples in tool descriptions measurably reduce malformed calls. Cheapest quality win available. |
| `provider_order`, `limits`, `cache`, `safety`, `geo`, `rate_limit` | `ts` only | Operational policy. Editable by an engineer without a model-in-the-loop change, and never occupying prompt budget. |
| `version` | the prompt cache key | Bump on any change that alters the model's behaviour. Without it, `version` changes silently multiply cost via prompt-cache misses. |

**Three rules that will save you pain:**

1. **Do not let `description` and the system prompt contradict each other.** Today the system prompt at `app/api/ai/chat/route.ts` says `webSearch: use for current information, recent changes, live facts, and up-to-date web knowledge`, and `TOOL USAGE RULES` says `Use webSearch when a question depends on current external information`. That is the tool description duplicated in the system prompt. Pick one home. Recommendation: the tool `description` owns *"what this tool is and when to reach for it"*; the system prompt owns *"how to behave once you have results"* (cite sources, don't invent URLs, prefer `searchNotes` for the user's own material). Move the duplicate out of the system prompt when you do the extraction.
2. **The tool description is part of the prompt cache prefix.** Put the tool block at a stable position in the system prompt so editing one tool does not invalidate the entire cached prefix.
3. **Validate the front matter at module load and throw on failure**, with a message naming the file and the offending key. A silently-dropped `limits:` block means every query quietly uses the code defaults, and you will spend a week wondering why the cap is wrong.

---

## 7. Open questions

1. **`/search` default `sources` is ambiguous.** The API reference example shows `"sources": ["web"]`; the CLI and the search skill document state the default is `web,alexandria`. If the REST default really includes Alexandria, every unconfigured call returns a `data.tools` array the app does not want — token bloat at best. Mitigation regardless: send `sources: ["web"]` and `domainTools: false` explicitly. **Worth one live REST call without those fields to settle.**
2. **Is there any cap on the length of a search `description` highlight?** Measured 5,099 characters with `limit: 3`. If it is unbounded, `highlights: true` at `limit: 10` is a context-incident waiting to happen and the `false` must be non-optional. Not documented either way.
3. **Does `scrapeOptions.timeout` inside `/search` actually apply per page or to the whole search?** The docs say "Every option in scrape endpoint is supported by this search endpoint through `scrapeOptions`", which is suggestive but not explicit. This determines whether a 3-page `thorough` call needs a 12s or a 36s client budget.
4. **Firecrawl error codes.** The full catalogue at `docs.firecrawl.dev/api-reference/errors` was not read. The `errorCode` union in §3.4 is inferred from observed responses (`UNKNOWN_ERROR`, `SCRAPE_PROMPT_INJECTION_DETECTED`, `SCRAPE_LOCKDOWN_CACHE_MISS`) plus HTTP status. Pin the real list before relying on code-level branching — in particular, confirm whether Firecrawl signals "out of credits" distinctly from "rate limited", because those need opposite fallback behaviour (`QUOTA_EXHAUSTED` should trip a circuit breaker, not fall back).
5. **The observed rate limit did not match the published table.** `429` fired at ~20 req/min against a plan documented at 10 or 100 rpm. Confirm the real plan tier and whether there is an undocumented global ceiling. This directly sets the client-side concurrency you can safely use.
6. **`https://firecrawl.dev/search_locations.json` did not return parseable JSON** during this research. The endpoint is documented for "the complete list of supported locations" and is what you would need to confirm whether `CM` is now a valid *search* location (independent of it not being a valid *proxy* location). Retest before shipping `location: "Cameroon"`.
7. **Does Firecrawl's `enhanced` proxy reliably get past Cloudflare/bot walls?** Unverified and undocumented. If a meaningful share of student-relevant pages (Cameroonian news sites, exam board portals) are bot-walled, this could change the design from "search + scrape" to "search + Tavily extract on the same URLs".
8. **`checkPromptInjection` pricing and semantics for our use.** It is +4 credits per page and fails the request with `403` on detection. For a student-facing tool, is dropping the whole result on detection right, or should it be a `BLOCKED` warning that drops just that result? Needs a product call, and a cost check (4 extra credits on every thorough scrape is 5× the base scrape).
9. **Tavily `country` boost actively hurt relevance in testing.** With `country: "cameroon"` + `search_depth: "advanced"`, a query about a chemistry formula returned a Harley-Davidson page as the top hit. Since `country` is boost-only on Tavily, a bad boost is worse than no boost. Consider not passing `country` to Tavily at all on the fallback path — Firecrawl already applied the geo signal on the primary path, and a student whose query deserved French results would have got them.
10. **How much does search actually need a fallback at all?** Tavily's own `answer` field means a Firecrawl total outage could still be absorbed by `include_answer` alone. Before building the full normalised-shape fallback, it may be worth confirming that Firecrawl's failure modes are severe enough to justify it — the honest counter-argument to this whole design is that Firecrawl's error rate may simply be low enough that a simpler "Firecrawl only, degrade to own-knowledge" tool would be better.
11. **What is the real distribution of student questions?** The `WebSearchQueryLog` needs a few weeks of data before `input_examples`, the `top 50` Inngest warm-up list, and the fallback threshold are anything other than guesses. Do not over-invest in the fallback machinery before that data exists.
12. **Interaction with the credits system.** `lib/ai/tools.ts` already has `getEffectiveCreditCost` / `spendCredits` in the module. Whether a web search should cost students credits, and whether `providerCredits` should be charged at cost or at a flat rate, is a product decision that this document does not touch.

---

## Appendix A — Firecrawl CLI surface (for verification during development)

`firecrawl --help`, CLI v1.26.3, authenticated. Useful during implementation because it lets you confirm a hypothesis against the real API without writing code.

```
firecrawl scrape "<url>" --only-main-content --format markdown --json --pretty -o .firecrawl/out.json
firecrawl scrape "<url>" --format markdown,json --json     # json format needs {type,json,schema}
firecrawl search "<query>" --sources web --limit 5 --no-highlights --json -o .firecrawl/s.json
firecrawl search "<query>" --sources web --limit 3 --scrape --scrape-formats markdown --json
firecrawl search "<query>" --country CM --location "Cameroon"
firecrawl search "<query>" --tbs qdr:w
firecrawl map "https://example.com" --search "syllabus" --limit 20 --json
firecrawl --status          # version, auth, concurrency, credits
firecrawl credits          # team credit usage
firecrawl search-feedback <searchId> --rating bad --missing-content '[{"topic":"...","description":"..."}]' --silent &
firecrawl agent --help     # autonomous extraction; not for the chat path
firecrawl mcp-server docs: https://docs.firecrawl.dev/mcp-server
```

The CLI `--json` output **unwraps** a single-format scrape (`{ markdown, metadata }` at the top level, no `success` envelope) but keeps the full envelope for `search`. Do not write assertions against the CLI's shape — assert against the REST response shape from the API reference.

## Appendix B — Verification commands run for this document

```bash
firecrawl --status
firecrawl scrape "https://docs.firecrawl.dev/features/search" --only-main-content
firecrawl scrape "https://docs.firecrawl.dev/features/scrape" --only-main-content
firecrawl scrape "https://docs.firecrawl.dev/features/extract" --only-main-content
firecrawl scrape "https://docs.firecrawl.dev/advanced-scraping-guide" --only-main-content
firecrawl scrape "https://docs.firecrawl.dev/features/proxies.md" --only-main-content
firecrawl scrape "https://docs.firecrawl.dev/features/fast-scraping.md" --only-main-content
firecrawl scrape "https://docs.firecrawl.dev/features/enhanced-mode.md" --only-main-content
firecrawl scrape "https://docs.firecrawl.dev/features/search-highlights.md" --only-main-content
firecrawl scrape "https://docs.firecrawl.dev/mcp-server{,/tools}.md" --only-main-content
firecrawl scrape "https://docs.firecrawl.dev/{rate-limits,llms.txt,sdks/node.md}" --only-main-content
firecrawl scrape "https://www.firecrawl.dev/pricing" --only-main-content
firecrawl scrape "https://docs.tavily.com/documentation/api-reference/endpoint/{search,extract}"
firecrawl scrape "https://docs.tavily.com/documentation/{api-credits,rate-limits,mcp}"
firecrawl scrape "https://help.tavily.com/articles/3240802908-rate-limits"
firecrawl scrape "https://www.tavily.com/pricing"
# live API probes
firecrawl search "what is photosynthesis" --sources web --limit 3 --json
firecrawl search "photosynthesis equation" --sources web --limit 3 --no-highlights --json
firecrawl search "photosynthesis equation 6CO2" --sources web --limit 2 --scrape --scrape-formats markdown --json
firecrawl search "CEMAC BAC_general mathematics" --sources web --limit 3 --country CM --json
node .firecrawl/tv-probe.mjs    # Tavily /search basic, response shape + content lengths
node .firecrawl/tv-probe2.mjs   # Tavily /search advanced+raw, and /extract on a URL list
```

## Appendix C — Note on `.firecrawl/`

`firecrawl --status` reports `.gitignore: present - .firecrawl ignored: no`. The scratch directory used for this research is **not** git-ignored in this repo. Add `.firecrawl/` to `.gitignore` before anyone commits. One of the files in the scratch directory, `tv-probe.mjs`, reads `TAVILY_API_KEY` out of `.env` — it reads the value, uses it, and never prints it, but it is the kind of file that should not survive into a commit.