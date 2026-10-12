> ## Documentation Index
>
> Fetch the complete documentation index at: [/llms.txt](https://docs.firecrawl.dev/llms.txt)
>
> Use this file to discover all available pages before exploring further.

[Skip to main content](https://docs.firecrawl.dev/features/crawl#content-area)

Crawl submits a URL to Firecrawl and recursively discovers and scrapes every reachable subpage. It handles sitemaps, JavaScript rendering, and rate limits automatically, returning clean markdown or structured data for each page.

- Discovers pages via sitemap and recursive link traversal
- Supports path filtering, depth limits, and subdomain/external link control
- Returns results via polling, WebSocket, or webhook

Each page a crawl scrapes goes through the same scrape pipeline, so anything scrape can do to a page, crawl can do to every page it reaches. [Capabilities](https://docs.firecrawl.dev/capabilities) lists what that is, where each capability runs, and whether it needs an API key.

[**Try it in the Playground** \\
\\
Test crawling in the interactive playground — no code required.](https://www.firecrawl.dev/playground?endpoint=crawl)

## [​](https://docs.firecrawl.dev/features/crawl\#installation)  Installation

Python

Node

CLI

```
# pip install firecrawl-py

from firecrawl import Firecrawl

firecrawl = Firecrawl(
  # No API key needed to get started — add one for higher rate limits:
  # api_key="fc-YOUR-API-KEY",
)
```

```
// npm install firecrawl

import { Firecrawl } from 'firecrawl';

const firecrawl = new Firecrawl({
  // No API key needed to get started — add one for higher rate limits:
  // apiKey: "fc-YOUR-API-KEY",
});
```

```
# Install globally with npm
npm install -g firecrawl

# Authenticate (one-time setup)
firecrawl login
```

## [​](https://docs.firecrawl.dev/features/crawl\#basic-usage)  Basic usage

Submit a crawl job by calling `POST /v2/crawl` with a starting URL. The endpoint returns a job ID that you use to poll for results.

Python

Node

cURL

CLI

```
from firecrawl import Firecrawl

firecrawl = Firecrawl(api_key="fc-YOUR-API-KEY")

docs = firecrawl.crawl(url="https://docs.firecrawl.dev", limit=10)
print(docs)
```

```
import { Firecrawl } from 'firecrawl';

const firecrawl = new Firecrawl({ apiKey: "fc-YOUR-API-KEY" });

const docs = await firecrawl.crawl('https://docs.firecrawl.dev', { limit: 10 });
console.log(docs);
```

```
curl -s -X POST "https://api.firecrawl.dev/v2/crawl" \
  -H "Authorization: Bearer $FIRECRAWL_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://docs.firecrawl.dev",
    "limit": 10
  }'
```

```
# Start a crawl job (returns job ID)
firecrawl crawl https://firecrawl.dev

# Wait for completion with progress
firecrawl crawl https://firecrawl.dev --wait --progress --limit 100
```

Each page crawled consumes 1 credit. The default crawl `limit` is 10,000 pages. Before starting, the crawl endpoint checks that your remaining credits can cover the `limit` — if not, it returns a **402 (Payment Required)** error. Set a lower `limit` to match your intended crawl size (e.g. `limit: 100`) to avoid this. Additional credits apply for certain options: JSON mode costs 4 additional credits per page, and PDF parsing costs 1 credit per PDF page.

### [​](https://docs.firecrawl.dev/features/crawl\#scrape-options)  Scrape options

All options from the [Scrape endpoint](https://docs.firecrawl.dev/api-reference/endpoint/scrape) are available in crawl via `scrapeOptions` (JS) / `scrape_options` (Python). These apply to every page the crawler scrapes, including formats, proxy, caching, actions, location, and tags.

Python

Node

```
from firecrawl import Firecrawl

firecrawl = Firecrawl(api_key='fc-YOUR_API_KEY')

# Crawl with scrape options
response = firecrawl.crawl('https://example.com',
    limit=100,
    scrape_options={
        'formats': [\
            'markdown',\
            { 'type': 'json', 'schema': { 'type': 'object', 'properties': { 'title': { 'type': 'string' } } } }\
        ],
        'proxy': 'auto',
        'max_age': 600000,
        'only_main_content': True
    }
)
```

```
import { Firecrawl } from 'firecrawl';

const firecrawl = new Firecrawl({ apiKey: 'fc-YOUR_API_KEY' });

// Crawl with scrape options
const crawlResponse = await firecrawl.crawl('https://example.com', {
  limit: 100,
  scrapeOptions: {
    formats: [\
      'markdown',\
      {\
        type: 'json',\
        schema: { type: 'object', properties: { title: { type: 'string' } } },\
      },\
    ],
    proxy: 'auto',
    maxAge: 600000,
    onlyMainContent: true,
  },
});
```

## [​](https://docs.firecrawl.dev/features/crawl\#checking-crawl-status)  Checking crawl status

Use the job ID to poll for the crawl status and retrieve results.

Python

Node

cURL

CLI

```
status = firecrawl.get_crawl_status("<crawl-id>")
print(status)
```

```
const status = await firecrawl.getCrawlStatus("<crawl-id>");
console.log(status);
```

```
# After starting a crawl, poll status by jobId
curl -s -X GET "https://api.firecrawl.dev/v2/crawl/<jobId>" \
  -H "Authorization: Bearer $FIRECRAWL_API_KEY"
```

```
# Check crawl status using job ID
firecrawl crawl <job-id>
```

Job results are available via the API for 24 hours after completion. After this period, you can still view your crawl history and results in the [activity logs](https://www.firecrawl.dev/app/logs).

Pages in the crawl results `data` array are pages that Firecrawl successfully scraped, even if the target site returned an HTTP error like 404. The `metadata.statusCode` field shows the HTTP status code from the target site. To retrieve pages that Firecrawl itself failed to scrape (e.g. network errors, timeouts, or robots.txt blocks), use the dedicated [Get Crawl Errors](https://docs.firecrawl.dev/api-reference/endpoint/crawl-get-errors) endpoint (`GET /crawl/{id}/errors`).

### [​](https://docs.firecrawl.dev/features/crawl\#response-handling)  Response handling

The response varies based on the crawl’s status. For incomplete or large responses exceeding 10MB, a `next` URL parameter is provided. You must request this URL to retrieve the next 10MB of data. If the `next` parameter is absent, it indicates the end of the crawl data.

The `skip` and `next` parameters are only relevant when hitting the API directly.
If you’re using the SDK, pagination is handled automatically and all
results are returned at once.

Scraping

Completed

```
{
  "status": "scraping",
  "total": 36,
  "completed": 10,
  "creditsUsed": 10,
  "expiresAt": "2024-00-00T00:00:00.000Z",
  "next": "https://api.firecrawl.dev/v2/crawl/123-456-789?skip=10",
  "data": [\
    {\
      "markdown": "[Firecrawl Docs home page![light logo](https://mintlify.s3-us-west-1.amazonaws.com/firecrawl/logo/light.svg)!...",\
      "html": "<!DOCTYPE html><html lang=\"en\" class=\"js-focus-visible lg:[--scroll-mt:9.5rem]\" data-js-focus-visible=\"\">...",\
      "metadata": {\
        "title": "Build a 'Chat with website' using Groq Llama 3 | Firecrawl",\
        "language": "en",\
        "sourceURL": "https://docs.firecrawl.dev/learn/rag-llama3",\
        "description": "Learn how to use Firecrawl, Groq Llama 3, and Langchain to build a 'Chat with your website' bot.",\
        "ogLocaleAlternate": [],\
        "statusCode": 200\
      }\
    },\
    ...\
  ]\
}\
```\
\
```\
{\
  "status": "completed",\
  "total": 36,\
  "completed": 36,\
  "creditsUsed": 36,\
  "expiresAt": "2024-00-00T00:00:00.000Z",\
  "next": "https://api.firecrawl.dev/v2/crawl/123-456-789?skip=26",\
  "data": [\
    {\
      "markdown": "[Firecrawl Docs home page![light logo](https://mintlify.s3-us-west-1.amazonaws.com/firecrawl/logo/light.svg)!...",\
      "html": "<!DOCTYPE html><html lang=\"en\" class=\"js-focus-visible lg:[--scroll-mt:9.5rem]\" data-js-focus-visible=\"\">...",\
      "metadata": {\
        "title": "Build a 'Chat with website' using Groq Llama 3 | Firecrawl",\
        "language": "en",\
        "sourceURL": "https://docs.firecrawl.dev/learn/rag-llama3",\
        "description": "Learn how to use Firecrawl, Groq Llama 3, and Langchain to build a 'Chat with your website' bot.",\
        "ogLocaleAlternate": [],\
        "statusCode": 200\
      }\
    },\
    ...\
  ]\
}\
```\
\
## [​](https://docs.firecrawl.dev/features/crawl\#sdk-methods)  SDK methods\
\
There are two ways to use crawl with the SDK.\
\
### [​](https://docs.firecrawl.dev/features/crawl\#crawl-and-wait)  Crawl and wait\
\
The `crawl` method waits for the crawl to complete and returns the full response. It handles pagination automatically. This is recommended for most use cases.\
\
Python\
\
Node\
\
```\
from firecrawl import Firecrawl\
from firecrawl.types import ScrapeOptions\
\
firecrawl = Firecrawl(api_key="fc-YOUR_API_KEY")\
\
# Crawl a website:\
crawl_status = firecrawl.crawl(\
  'https://firecrawl.dev',\
  limit=100,\
  scrape_options=ScrapeOptions(formats=['markdown', 'html']),\
  poll_interval=30\
)\
print(crawl_status)\
```\
\
```\
import { Firecrawl } from 'firecrawl';\
\
const firecrawl = new Firecrawl({apiKey: "fc-YOUR_API_KEY"});\
\
const crawlResponse = await firecrawl.crawl('https://firecrawl.dev', {\
  limit: 100,\
  scrapeOptions: {\
    formats: ['markdown', 'html'],\
  }\
})\
\
console.log(crawlResponse)\
```\
\
The response includes the crawl status and all scraped data:\
\
Python\
\
Node\
\
```\
success=True\
status='completed'\
completed=100\
total=100\
creditsUsed=100\
expiresAt=datetime.datetime(2025, 4, 23, 19, 21, 17, tzinfo=TzInfo(UTC))\
next=None\
data=[\
  Document(\
    markdown='[Day 7 - Launch Week III.Integrations DayApril 14th to 20th](...',\
    metadata={\
      'title': '15 Python Web Scraping Projects: From Beginner to Advanced',\
      ...\
      'scrapeId': '97dcf796-c09b-43c9-b4f7-868a7a5af722',\
      'sourceURL': 'https://www.firecrawl.dev/blog/python-web-scraping-projects',\
      'url': 'https://www.firecrawl.dev/blog/python-web-scraping-projects',\
      'statusCode': 200\
    }\
  ),\
  ...\
]\
```\
\
```\
{\
  success: true,\
  status: "completed",\
  completed: 100,\
  total: 100,\
  creditsUsed: 100,\
  expiresAt: "2025-04-23T19:28:45.000Z",\
  data: [\
    {\
      markdown: "[Day 7 - Launch Week III.Integrations DayApril ...",\
      html: `<!DOCTYPE html><html lang="en" class="light" style="color...`,\
      metadata: [Object],\
    },\
    ...\
  ]\
}\
```\
\
### [​](https://docs.firecrawl.dev/features/crawl\#start-and-check-later)  Start and check later\
\
The `startCrawl` / `start_crawl` method returns immediately with a crawl ID. You then poll for status manually. This is useful for long-running crawls or custom polling logic.\
\
Python\
\
Node\
\
cURL\
\
CLI\
\
```\
from firecrawl import Firecrawl\
\
firecrawl = Firecrawl(api_key="fc-YOUR-API-KEY")\
\
job = firecrawl.start_crawl(url="https://docs.firecrawl.dev", limit=10)\
print(job)\
\
# Check the status of the crawl\
status = firecrawl.get_crawl_status(job.id)\
print(status)\
```\
\
```\
import { Firecrawl } from 'firecrawl';\
\
const firecrawl = new Firecrawl({ apiKey: "fc-YOUR-API-KEY" });\
\
const { id } = await firecrawl.startCrawl('https://docs.firecrawl.dev', { limit: 10 });\
console.log(id);\
\
// Check the status of the crawl\
const status = await firecrawl.getCrawlStatus(id);\
console.log(status);\
```\
\
```\
curl -s -X POST "https://api.firecrawl.dev/v2/crawl" \\
  -H "Authorization: Bearer $FIRECRAWL_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{\
    "url": "https://docs.firecrawl.dev",\
    "limit": 10\
  }'\
```\
\
```\
# Start crawl (async, returns job ID immediately)\
firecrawl crawl https://firecrawl.dev --limit 100\
\
# Then check status later\
firecrawl crawl <job-id>\
```\
\
The initial response returns the job ID:\
\
```\
{\
  "success": true,\
  "id": "123-456-789",\
  "url": "https://api.firecrawl.dev/v2/crawl/123-456-789"\
}\
```\
\
## [​](https://docs.firecrawl.dev/features/crawl\#real-time-results-with-websocket)  Real-time results with WebSocket\
\
The watcher method provides real-time updates as pages are crawled. Start a crawl, then subscribe to events for immediate data processing.\
\
Python\
\
Node\
\
```\
import asyncio\
from firecrawl import AsyncFirecrawl\
\
async def main():\
    firecrawl = AsyncFirecrawl(api_key="fc-YOUR-API-KEY")\
\
    # Start a crawl first\
    started = await firecrawl.start_crawl("https://firecrawl.dev", limit=5)\
\
    # Watch updates (snapshots) until terminal status\
    async for snapshot in firecrawl.watcher(started.id, kind="crawl", poll_interval=2, timeout=120):\
        if snapshot.status == "completed":\
            print("DONE", snapshot.status)\
            for doc in snapshot.data:\
                print("DOC", doc.metadata.source_url if doc.metadata else None)\
        elif snapshot.status == "failed":\
            print("ERR", snapshot.status)\
        else:\
            print("STATUS", snapshot.status, snapshot.completed, "/", snapshot.total)\
\
asyncio.run(main())\
```\
\
```\
import { Firecrawl } from 'firecrawl';\
\
const firecrawl = new Firecrawl({ apiKey: 'fc-YOUR-API-KEY' });\
\
// Start a crawl and then watch it\
const { id } = await firecrawl.startCrawl('https://mendable.ai', {\
  excludePaths: ['blog/*'],\
  limit: 5,\
});\
\
const watcher = firecrawl.watcher(id, { kind: 'crawl', pollInterval: 2, timeout: 120 });\
\
watcher.on('document', (doc) => {\
  console.log('DOC', doc);\
});\
\
watcher.on('error', (err) => {\
  console.error('ERR', err?.error || err);\
});\
\
watcher.on('done', (state) => {\
  console.log('DONE', state.status);\
});\
\
// Begin watching (WS with HTTP fallback)\
await watcher.start();\
```\
\
## [​](https://docs.firecrawl.dev/features/crawl\#webhooks)  Webhooks\
\
You can configure webhooks to receive real-time notifications as your crawl progresses. This allows you to process pages as they are scraped instead of waiting for the entire crawl to complete.\
\
cURL\
\
```\
curl -X POST https://api.firecrawl.dev/v2/crawl \\
    -H 'Content-Type: application/json' \\
    -H 'Authorization: Bearer YOUR_API_KEY' \\
    -d '{\
      "url": "https://docs.firecrawl.dev",\
      "limit": 100,\
      "webhook": {\
        "url": "https://your-domain.com/webhook",\
        "metadata": {\
          "any_key": "any_value"\
        },\
        "events": ["started", "page", "completed"]\
      }\
    }'\
```\
\
### [​](https://docs.firecrawl.dev/features/crawl\#event-types)  Event types\
\
| Event | Description |\
| --- | --- |\
| `crawl.started` | Fires when the crawl begins |\
| `crawl.page` | Fires for each page successfully scraped |\
| `crawl.completed` | Fires when the crawl finishes |\
| `crawl.failed` | Fires if the crawl encounters an error |\
\
### [​](https://docs.firecrawl.dev/features/crawl\#payload)  Payload\
\
```\
{\
  "success": true,\
  "type": "crawl.page",\
  "id": "crawl-job-id",\
  "data": [...], // Page data for 'page' events\
  "metadata": {}, // Your custom metadata\
  "error": null\
}\
```\
\
### [​](https://docs.firecrawl.dev/features/crawl\#verifying-webhook-signatures)  Verifying webhook signatures\
\
Every webhook request from Firecrawl includes an `X-Firecrawl-Signature` header containing an HMAC-SHA256 signature. Always verify this signature to ensure the webhook is authentic and has not been tampered with.\
\
1. Get your webhook secret from the [Advanced tab](https://www.firecrawl.dev/app/settings?tab=advanced) of your account settings\
2. Extract the signature from the `X-Firecrawl-Signature` header\
3. Compute HMAC-SHA256 of the raw request body using your secret\
4. Compare with the signature header using a timing-safe function\
\
Never process a webhook without verifying its signature first. The `X-Firecrawl-Signature` header contains the signature in the format: `sha256=abc123def456...`\
\
For complete implementation examples in JavaScript and Python, see the [Webhook Security documentation](https://docs.firecrawl.dev/webhooks/security). For comprehensive webhook documentation including detailed event payloads, payload structure, advanced configuration, and troubleshooting, see the [Webhooks documentation](https://docs.firecrawl.dev/webhooks/overview).\
\
## [​](https://docs.firecrawl.dev/features/crawl\#execution-and-result-accounting)  Execution and result accounting\
\
A crawl that finishes is not the same as a crawl that reached every page. This section describes what the crawl endpoints currently report about a run — the counters, the paging contract, the failure records, and the scope limits — so you can judge for yourself whether a run is complete enough to act on. None of these records is a guarantee of completeness.\
\
### [​](https://docs.firecrawl.dev/features/crawl\#reading-the-status-counters)  Reading the status counters\
\
Every response from [Get Crawl Status](https://docs.firecrawl.dev/api-reference/endpoint/crawl-get) (`GET /v2/crawl/{id}`) carries the counters that describe the run:\
\
| Field | Meaning |\
| --- | --- |\
| `status` | One of `scraping`, `completed`, `failed`, or `cancelled` |\
| `total` | `completed` plus the pages still in flight: active, queued, and backlogged. **Failed pages are not counted.** |\
| `completed` | The number of pages that have been successfully crawled |\
| `creditsUsed` | Credits consumed by the crawl so far |\
| `createdAt` / `completedAt` / `duration` | Start time, finish time (terminal states only), and elapsed seconds |\
| `expiresAt` | When the results stop being retrievable from the API |\
| `next` | URL for the next 10MB page of results. Also emitted whenever `status` is not `completed` — see [Paging through results](https://docs.firecrawl.dev/features/crawl#paging-through-results). |\
\
`completed == total` on a finished crawl does **not** mean every discovered page succeeded. Because `total` sums completed, active, queued, and backlogged pages and excludes failed ones, a terminal crawl always has `active`, `queued`, and `backlog` at zero — so the two counters converge whether or not pages failed. The status counters cannot tell you that anything failed. Failed pages are enumerated only by [Get Crawl Errors](https://docs.firecrawl.dev/features/crawl#failed-and-blocked-pages).\
\
The `data` array holds only pages Firecrawl successfully scraped. Pages that were attempted but never produced a result are not in `data` — read them from Get Crawl Errors, below.\
\
### [​](https://docs.firecrawl.dev/features/crawl\#paging-through-results)  Paging through results\
\
Responses are capped at 10MB. When a response is truncated, `next` carries the URL for the following page of results.`next` is not purely a “more data remains” signal: it is also emitted whenever `status` is not `completed`, so a terminal `failed` or `cancelled` crawl can return a `next` URL even though no further results exist. Do not use the absence of `next` as your loop’s exit condition — on a failed or cancelled crawl it never disappears.The terminal condition is the status field. To read a run to the end:\
\
1. Poll `GET /v2/crawl/{id}` until `status` is one of `completed`, `failed`, or `cancelled`.\
2. While `next` is present **and** the last page returned a non-empty `data` array, follow `next` to collect the remaining results.\
3. Stop when `next` is absent, or when a page returns no new documents.\
\
The official SDKs handle this paging for you and return all results at once.\
\
### [​](https://docs.firecrawl.dev/features/crawl\#failed-and-blocked-pages)  Failed and blocked pages\
\
[Get Crawl Errors](https://docs.firecrawl.dev/api-reference/endpoint/crawl-get-errors) (`GET /v2/crawl/{id}/errors`) records pages that did not make it into `data`. It returns two arrays:\
\
- `errors` — errored scrape jobs, each with `id`, `url`, `error` (the error message), and a `timestamp` of the failure. These are pages Firecrawl itself failed to scrape: network errors, timeouts, and similar. Links to an external site’s homepage that were intentionally skipped are reported here with an error code of `EXTERNAL_LINK`.\
- `robotsBlocked` — URLs that were attempted but blocked by the site’s robots.txt.\
\
This list is not guaranteed to be a complete enumeration of every failure: some internal failure classes are currently filtered out of `errors` before the response is built. Treat it as the record of failures Firecrawl reports, not as a proof that nothing else went wrong. The error code referenced above (`EXTERNAL_LINK`) is returned on error objects today but is not yet part of the published `GET /crawl/{id}/errors` schema; it is pending an API reference update.\
\
A page where the target site returned an HTTP error such as 404 is _not_ a crawl error: Firecrawl scraped it successfully, so it appears in `data` with the site’s status code in `metadata.statusCode`.\
\
### [​](https://docs.firecrawl.dev/features/crawl\#what-the-crawler-is-scoped-to-reach)  What the crawler is scoped to reach\
\
Coverage is bounded by the scope parameters you set, all documented in the [configuration reference](https://docs.firecrawl.dev/features/crawl#configuration-reference) and the [Crawl endpoint reference](https://docs.firecrawl.dev/api-reference/endpoint/crawl-post):\
\
- **Children only by default.** Crawl ignores sublinks that are not children of the URL you provide. Use `crawlEntireDomain` for sibling and parent paths, `allowSubdomains` for subdomains, and `allowExternalLinks` to follow links off the domain.\
- **`includePaths` / `excludePaths` match the URL pathname**, as regex patterns — not the full URL, and not query parameters. Set `regexOnFullURL: true` to match against the full URL including query strings instead. The starting URL is also checked against `includePaths`: if it does not match, the crawl may return 0 pages.\
- **Path patterns are Rust regex (RE2-style) and are validated up front.** Look-around and backreferences are not supported, and a pattern that does not compile is rejected with a `400` instead of being silently ignored. Each field accepts at most 1000 patterns of at most 2000 characters each, and `includePaths` and `excludePaths` together may contain at most 1000 patterns and 100,000 characters. For keyword-style filtering, send one short pattern per term (`["pricing", "docs", "blog"]`) rather than combining terms into one long alternation.\
- **Sitemap mode.** With the default `sitemap: "include"`, URLs come from the sitemap plus recursive link discovery. `"skip"` uses HTML links only, so sitemap-only pages such as PDFs or deeply nested pages are missed. `"only"` crawls the sitemap plus the start URL and does not discover links from HTML.\
- **`maxDiscoveryDepth`** caps how many link-discovery hops from the root are followed. Pages at the maximum depth are still scraped, but links found on them are not followed.\
- **`limit`** caps the number of pages, and defaults to `10000`.\
- **`ignoreQueryParameters`** avoids re-scraping the same path with different query parameters.\
- **robots.txt is respected** unless `ignoreRobotsTxt` is enabled (Enterprise only).\
\
`maxConcurrency` defaults to your team’s concurrency limit, which is set by your plan — see [Rate limits](https://docs.firecrawl.dev/rate-limits).\
\
### [​](https://docs.firecrawl.dev/features/crawl\#when-results-vary-between-runs)  When results vary between runs\
\
Crawl results may vary between runs of the same configuration. Pages are scraped concurrently, so the order in which links are discovered depends on network timing and which pages finish loading first. This means different branches of a site may be explored to different extents near the depth boundary, especially at higher `maxDiscoveryDepth` values.To make a run more reproducible:\
\
- Set `maxConcurrency` to `1`. As the [configuration reference](https://docs.firecrawl.dev/features/crawl#configuration-reference) states, `maxConcurrency` is the “maximum concurrent scrapes” — it caps how many requests are in flight at once. That reduces timing-dependent interleaving, but it does not remove run-to-run variation: sitemap discovery is enqueued outside the cap, nested sitemaps are fetched as independent jobs, and the returned `data` array is ordered by finish time rather than discovery order. Setting `delay` also forces concurrency to 1.\
- Use `sitemap: "only"` if the site has a comprehensive sitemap, so the URL set comes from the sitemap rather than from link discovery.\
\
### [​](https://docs.firecrawl.dev/features/crawl\#knowing-when-a-crawl-is-done)  Knowing when a crawl is done\
\
If you are not polling, the [webhook events](https://docs.firecrawl.dev/features/crawl#event-types) tell you the same thing: `crawl.page` fires for each page successfully scraped, and `crawl.completed` (or `crawl.failed`) fires when the run ends. Job results stay retrievable from the API for 24 hours after completion; after that, view them in the [activity logs](https://www.firecrawl.dev/app/logs).\
\
## [​](https://docs.firecrawl.dev/features/crawl\#configuration-reference)  Configuration reference\
\
The full set of parameters available when submitting a crawl job:\
\
| Parameter | Type | Default | Description |\
| --- | --- | --- | --- |\
| `url` | `string` | (required) | The starting URL to crawl from |\
| `limit` | `integer` | `10000` | Maximum number of pages to crawl |\
| `maxDiscoveryDepth` | `integer` | (none) | Maximum depth from the root URL based on link-discovery hops, not the number of `/` segments in the URL. Each time a new URL is found on a page, it is assigned a depth one higher than the page it was discovered on. The root site and sitemapped pages have a discovery depth of 0. Pages at the max depth are still scraped, but links on them are not followed. |\
| `includePaths` | `string[]` | (none) | URL pathname regex patterns to include. Only matching paths are crawled. At most 1000 patterns of 2000 characters each; see [scope](https://docs.firecrawl.dev/features/crawl#what-the-crawler-is-scoped-to-reach) for the combined limit and regex syntax. |\
| `excludePaths` | `string[]` | (none) | URL pathname regex patterns to exclude from the crawl. Same limits as `includePaths`. |\
| `regexOnFullURL` | `boolean` | `false` | Match `includePaths`/`excludePaths` against the full URL (including query parameters) instead of just the pathname |\
| `crawlEntireDomain` | `boolean` | `false` | Follow internal links to sibling or parent URLs, not just child paths |\
| `allowSubdomains` | `boolean` | `false` | Follow links to subdomains of the main domain |\
| `allowExternalLinks` | `boolean` | `false` | Follow links to external websites. External links are followed one hop (their own links are not crawled), and links pointing to an external site’s homepage are skipped — see [External links](https://docs.firecrawl.dev/features/crawl#external-links). |\
| `sitemap` | `string` | `"include"` | Sitemap handling: `"include"` (default), `"skip"`, or `"only"` |\
| `ignoreQueryParameters` | `boolean` | `false` | Avoid re-scraping the same path with different query parameters |\
| `ignoreRobotsTxt` | `boolean` | `false` | Ignore the website’s robots.txt rules. **Enterprise only** — contact [support@firecrawl.com](mailto:support@firecrawl.com) to enable. |\
| `robotsUserAgent` | `string` | (none) | Custom User-Agent string for robots.txt evaluation. When set, robots.txt is fetched with this User-Agent and rules are matched against it instead of the default. **Enterprise only** — contact [support@firecrawl.com](mailto:support@firecrawl.com) to enable. |\
| `delay` | `number` | (none) | Delay in seconds between scrapes to respect rate limits. Setting this forces concurrency to 1. |\
| `maxConcurrency` | `integer` | (none) | Maximum concurrent scrapes. Defaults to your team’s concurrency limit. |\
| `scrapeOptions` | `object` | (none) | Options applied to every scraped page (formats, proxy, caching, actions, etc.) |\
| `webhook` | `object` | (none) | Webhook configuration for real-time notifications |\
| `prompt` | `string` | (none) | Natural language prompt to generate crawl options. Explicitly set parameters override generated equivalents. |\
\
## [​](https://docs.firecrawl.dev/features/crawl\#important-details)  Important details\
\
By default, crawl ignores sublinks that are not children of the URL you provide. For example, `website.com/other-parent/blog-1` would not be returned if you crawled `website.com/blogs/`. Use the `crawlEntireDomain` parameter to include sibling and parent paths. To crawl subdomains like `blog.website.com` when crawling `website.com`, use the `allowSubdomains` parameter.\
\
- **Sitemap discovery**: By default, the crawler includes the website’s sitemap to discover URLs (`sitemap: "include"`). If you set `sitemap: "skip"`, only pages reachable through HTML links from the root URL are found. Assets like PDFs or deeply nested pages listed in the sitemap but not directly linked from HTML will be missed. For maximum coverage, keep the default setting.\
- **Credit usage**: Each page crawled costs 1 credit. JSON mode adds 4 credits per page, and PDF parsing costs 1 credit per PDF page.\
- **Result expiration**: Job results are available via the API for 24 hours after completion. After that, view results in the [activity logs](https://www.firecrawl.dev/app/logs).\
- **Crawl errors**: The `data` array contains pages Firecrawl successfully scraped. Use the [Get Crawl Errors](https://docs.firecrawl.dev/api-reference/endpoint/crawl-get-errors) endpoint to retrieve pages that failed due to network errors, timeouts, or robots.txt blocks.\
- **External links**: With `allowExternalLinks: true`, the crawler follows links pointing off your domain and scrapes each linked page once — it does not then crawl the links found on those external pages. Links to an external site’s **homepage** (a root URL with no path, e.g. `https://example.com/`) are intentionally skipped to avoid pulling in an entire unrelated site; these appear in [Get Crawl Errors](https://docs.firecrawl.dev/api-reference/endpoint/crawl-get-errors) with the code `EXTERNAL_LINK`. Redirects are followed to their destination — including a link that resolves to its canonical URL (for example `http → https` or the `www` variant) — so only redirects that land on an external homepage are skipped.\
- **Non-deterministic results**: Crawl results may vary between runs of the same configuration, because pages are scraped concurrently and link-discovery order depends on network timing. See [Execution and result accounting](https://docs.firecrawl.dev/features/crawl#execution-and-result-accounting) for what varies and how to make a run more reproducible.\
\
> Are you an AI agent that needs a Firecrawl API key? See [firecrawl.dev/agent-onboarding/SKILL.md](https://www.firecrawl.dev/agent-onboarding/SKILL.md) for automated onboarding instructions.\
\
[Suggest edits](https://github.com/firecrawl/firecrawl-docs/edit/main/features/crawl.mdx) [Raise issue](https://github.com/firecrawl/firecrawl-docs/issues/new?title=Issue%20on%20docs&body=Path:%20/features/crawl)\
\
✕