> ## Documentation Index
>
> Fetch the complete documentation index at: [/llms.txt](https://docs.firecrawl.dev/llms.txt)
>
> Use this file to discover all available pages before exploring further.

[Skip to main content](https://docs.firecrawl.dev/rate-limits#content-area)

Rate limits cap how many requests your team can make per minute, while concurrency limits cap how many jobs can run in parallel. Both are set by your plan; exceeding either returns a `429` response. See [Errors](https://docs.firecrawl.dev/api-reference/errors) for the full error catalog and a retry-with-backoff snippet.

## [​](https://docs.firecrawl.dev/rate-limits\#concurrent-browser-limits)  Concurrent Browser Limits

Concurrent browsers control how many pages Firecrawl can process for you in parallel. Your plan sets the ceiling; any jobs beyond it wait in a queue until a browser frees up.Time spent in the queue counts against the request’s [`timeout`](https://docs.firecrawl.dev/advanced-scraping-guide#timing-and-cache) parameter, so you can set a lower timeout to fail fast instead of waiting. To see current availability before sending work, call the [Queue Status](https://docs.firecrawl.dev/api-reference/endpoint/queue-status) endpoint. Jobs that are waiting in your concurrency queue will time out after a maximum of 48 hours.

### [​](https://docs.firecrawl.dev/rate-limits\#current-plans)  Current Plans

| Plan | Concurrent Browsers | Max Queued Jobs |
| --- | --- | --- |
| Free | 2 | 50,000 |
| Hobby | 5 | 50,000 |
| Standard | 25 | 50,000 |
| Growth | 50 | 100,000 |
| Scale / Enterprise | 100+ | 200,000+ |

Each team has a maximum number of jobs that can be waiting in the concurrency queue. If you exceed this limit, new jobs will be rejected with a `429` status code until existing jobs complete. For larger plans with custom concurrency limits, the max queued jobs is 2,000 times your concurrency limit, capped at 2,000,000.If you require higher concurrency limits, [contact us about enterprise plans](https://firecrawl.dev/enterprise).

## [​](https://docs.firecrawl.dev/rate-limits\#api-rate-limits)  API Rate Limits

Rate limits are measured in requests per minute and are primarily in place to prevent abuse. When configured correctly, your real bottleneck will be concurrent browsers. Rate limits are applied per team, so all API keys on the same team share the same rate limit counters.

### [​](https://docs.firecrawl.dev/rate-limits\#keyless-no-api-key)  Keyless (no API key)

The hosted Firecrawl MCP keyless endpoint exposes exactly **Search, Scrape, and Parse** without an API key. Other hosted MCP tools require an account connection or an API key.For official Firecrawl clients, the CLI, SDKs, and REST API, keyless access also includes **Interact**. On Firecrawl Cloud, research, developer, and government search endpoints can also be used without an API key. No other endpoints (crawl, extract, map, batch scrape, etc.) are available without a key.Keyless usage is free and capped per IP address per day by **two limits**, and exceeding either returns a `429`:

- A maximum number of **requests** per day.
- A maximum number of **credits** per day. Operations cost different amounts of credits (for example, Interact and JSON extraction cost more than a basic scrape), so heavier usage reaches the credit cap sooner.

[Sign up for a free API key](https://firecrawl.dev/) to get 1,000 credits and higher rate limits at no cost — official clients automatically use your key once it’s configured.

### [​](https://docs.firecrawl.dev/rate-limits\#current-plans-2)  Current Plans

| Plan | /scrape | /map | /crawl | /search | /agent | /crawl/status | /agent/status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Free | 10 | 10 | 2 | 10 | 2 | 500 | 500 |
| Hobby | 100 | 100 | 20 | 100 | 20 | 5000 | 5000 |
| Standard | 500 | 500 | 100 | 500 | 100 | 25000 | 25000 |
| Growth | 5000 | 5000 | 1000 | 5000 | 1000 | 250000 | 250000 |
| Scale | 10000 | 10000 | 2000 | 10000 | 2000 | 500000 | 500000 |

These rate limits are enforced to ensure fair usage and availability of the API for all users. If you require higher limits, please contact us at [help@firecrawl.com](mailto:help@firecrawl.com) to discuss custom plans.

### [​](https://docs.firecrawl.dev/rate-limits\#extract-endpoints)  Extract Endpoints

The extract endpoints share limits with the corresponding /agent rate limits.

### [​](https://docs.firecrawl.dev/rate-limits\#batch-scrape-endpoints)  Batch Scrape Endpoints

The batch scrape endpoints share limits with the corresponding /crawl rate limits.

### [​](https://docs.firecrawl.dev/rate-limits\#browser-sandbox)  Browser Sandbox

The browser sandbox endpoints have per-plan rate limits that scale with your subscription:

| Plan | /interact | /interact/{id}/execute |
| --- | --- | --- |
| Free | 2 | 10 |
| Hobby | 20 | 100 |
| Standard | 100 | 500 |
| Growth | 1,000 | 5,000 |
| Scale | 1,500 | 7,500 |

In addition, each team’s plan determines how many browser sessions can be active simultaneously (see Concurrent Browser Limits above). If you exceed this limit, new session requests will return a `429` status code until existing sessions are destroyed.

[Suggest edits](https://github.com/firecrawl/firecrawl-docs/edit/main/rate-limits.mdx) [Raise issue](https://github.com/firecrawl/firecrawl-docs/issues/new?title=Issue%20on%20docs&body=Path:%20/rate-limits)

✕

- 👋 Hi! Power AI agents with clean web data!

- I can help with search, scrape, MCP setup, or billing.