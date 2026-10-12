> ## Documentation Index
>
> Fetch the complete documentation index at: [/llms.txt](https://docs.firecrawl.dev/llms.txt)
>
> Use this file to discover all available pages before exploring further.

[Skip to main content](https://docs.firecrawl.dev/features/search#content-area)

Search the web and get clean, structured content from every result in a single API call. Pass a query to `/search` and Firecrawl returns titles, descriptions, and URLs. Add `scrapeOptions` to also retrieve full-page markdown, HTML, links, or screenshots for each result.Search results include query-relevant [Highlights](https://docs.firecrawl.dev/features/search-highlights) by default. Set `highlights` to `false` when you want each website’s plain description or snippet instead.For the full parameter list, see the [Search Endpoint API Reference](https://docs.firecrawl.dev/api-reference/endpoint/search).

[**Try it in the Playground** \\
\\
Test searching in the interactive playground — no code required.](https://www.firecrawl.dev/playground?endpoint=search)

## [​](https://docs.firecrawl.dev/features/search\#performing-a-search-with-firecrawl)  Performing a Search with Firecrawl

### [​](https://docs.firecrawl.dev/features/search\#/search-endpoint)  /search endpoint

Used to perform web searches and optionally retrieve content from the results.

### [​](https://docs.firecrawl.dev/features/search\#installation)  Installation

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

### [​](https://docs.firecrawl.dev/features/search\#basic-usage)  Basic Usage

Python

Node

cURL

CLI

```
from firecrawl import Firecrawl

firecrawl = Firecrawl(
  # No API key needed to get started — add one for higher rate limits:
  # api_key="fc-YOUR-API-KEY",
)

results = firecrawl.search(
    query="firecrawl",
    limit=3,
)
print(results)
```

```
import { Firecrawl } from 'firecrawl';

const firecrawl = new Firecrawl({
  // No API key needed to get started — add one for higher rate limits:
  // apiKey: "fc-YOUR-API-KEY",
});

const results = await firecrawl.search('firecrawl', {
  limit: 3,
  scrapeOptions: { formats: ['markdown'] }
});
console.log(results);
```

```
# No API key needed to get started — add -H "Authorization: Bearer $FIRECRAWL_API_KEY" for higher rate limits:
curl -s -X POST "https://api.firecrawl.dev/v2/search" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "firecrawl",
    "limit": 3
  }'
```

```
# Search the web
firecrawl search "firecrawl web scraping" --limit 5 --pretty
```

### [​](https://docs.firecrawl.dev/features/search\#response)  Response

SDKs will return the data object directly. cURL will return the complete payload.

JSON

```
{
  "success": true,
  "data": {
    "web": [\
      {\
        "url": "https://www.firecrawl.dev/",\
        "title": "Firecrawl - The Web Data API for AI",\
        "description": "The web crawling, scraping, and search API for AI. Built for scale. Firecrawl delivers the entire internet to AI agents and builders.",\
        "position": 1\
      },\
      {\
        "url": "https://github.com/firecrawl/firecrawl",\
        "title": "mendableai/firecrawl: Turn entire websites into LLM-ready ... - GitHub",\
        "description": "Firecrawl is an API service that takes a URL, crawls it, and converts it into clean markdown or structured data.",\
        "position": 2\
      },\
      ...\
    ],
    "images": [\
      {\
        "title": "Quickstart | Firecrawl",\
        "imageUrl": "https://mintlify.s3.us-west-1.amazonaws.com/firecrawl/logo/logo.png",\
        "imageWidth": 5814,\
        "imageHeight": 1200,\
        "url": "https://docs.firecrawl.dev/",\
        "position": 1\
      },\
      ...\
    ],
    "news": [\
      {\
        "title": "Y Combinator startup Firecrawl is ready to pay $1M to hire three AI agents as employees",\
        "url": "https://techcrunch.com/2025/05/17/y-combinator-startup-firecrawl-is-ready-to-pay-1m-to-hire-three-ai-agents-as-employees/",\
        "snippet": "It's now placed three new ads on YC's job board for “AI agents only” and has set aside a $1 million budget total to make it happen.",\
        "date": "3 months ago",\
        "position": 1\
      },\
      ...\
    ]
  }
}
```

**SDK users:** search results are grouped by source type, not under a generic `.data` array. Access web results with `result.web`, news with `result.news`, and images with `result.images`.

Python

```
result = firecrawl.search("query")
for item in result.web or []:
    print(item.url, item.title)
```

JavaScript

```
const result = await firecrawl.search("query");
for (const item of result.web ?? []) {
  console.log(item.url, item.title);
}
```

## [​](https://docs.firecrawl.dev/features/search\#search-result-types)  Search result types

In addition to regular web results, Search supports specialized result types via the `sources` parameter:

- `web`: standard web results (default)
- `news`: news-focused results
- `images`: image search results
- `alexandria`: data tools from [Alexandria](https://docs.firecrawl.dev/features/alexandria), the Firecrawl catalogue of third-party data providers

You can request multiple sources in a single call (e.g., `sources: ["web", "news"]`). When you do, the `limit` parameter applies **per source type** — so `limit: 5` with `sources: ["web", "news"]` returns up to 5 web results and up to 5 news results (10 total). If you need different parameters per source (for example, different `limit` values or different `scrapeOptions`), make separate calls instead.

### [​](https://docs.firecrawl.dev/features/search\#alexandria-tools)  Alexandria tools

When `sources` includes `alexandria`, Search returns matching data tools in `data.tools` (`result.tools` in the SDKs). A tool is a provider and a capability that you can run with [Scrape](https://docs.firecrawl.dev/features/scrape#alexandria-data-tools). Tool discovery is free. Use `sources: ["alexandria"]` to get tools only, or `["web", "alexandria"]` to also get web results, which are billed normally.

cURL

```
curl -X POST https://api.firecrawl.dev/v2/search \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer fc-YOUR_API_KEY" \
  -d '{
    "query": "podcast conversations about AI agents",
    "sources": ["web", "alexandria"],
    "limit": 2
  }'
```

- By default, each tool has only its `provider`, `capability`, and `description`. Set `toolDetail` to `"summary"` for more metadata, or to `"full"` for the input and output contracts.
- Search also adds tools that match the websites in your results. Set `domainTools: false` to turn off this domain matching.
- Tool discovery needs an API key. It is not available with zero data retention.

See [Alexandria](https://docs.firecrawl.dev/features/alexandria) for the full workflow and [Find Tools](https://docs.firecrawl.dev/features/alexandria#find-tools) to browse the catalogue.

## [​](https://docs.firecrawl.dev/features/search\#search-categories)  Search Categories

Filter search results by specific categories using the `categories` parameter:

- `research`: Restrict web search to academic and research websites (arxiv.org, nature.com, pubmed.ncbi.nlm.nih.gov, and similar). Changes on 2026-11-16 to search the [Research Index](https://docs.firecrawl.dev/features/research) and return paper records, see the warning below
- `pdf`: Search for PDFs
- `developer`: Search the [Developer Index](https://docs.firecrawl.dev/features/developer) — issues, merged pull requests, and READMEs from public code repositories, alongside curated documentation sites
- `gov`: Search the [Firecrawl Government Index](https://docs.firecrawl.dev/features/gov) — statutes, regulations, codes, court opinions, and other government publications

**The `research` category changes on 2026-11-16.** It will search the [Research Index](https://docs.firecrawl.dev/features/research) (PubMed, bioRxiv, medRxiv, arXiv) instead of filtering web results to 14 academic websites. Results will move from `data.web` to `data.research` and come back as paper records: `paperId`, `primaryId`, `ids`, `title`, `abstract`, `score`. Until then every response that uses it carries a `warnings` entry.If you want paper records, update your parsing before that date or call [`GET /search/research/papers`](https://docs.firecrawl.dev/api-reference/endpoint/research-search-papers) today. If you want web pages from academic sites, switch to [`includeDomains`](https://docs.firecrawl.dev/features/search#domain-filters).

### [​](https://docs.firecrawl.dev/features/search\#research-category-search)  Research Category Search

Restrict web search to academic and research websites. This returns web pages hosted on those domains — landing pages, abstract pages, publisher pages — with the usual snippets:

cURL

```
curl -X POST https://api.firecrawl.dev/v2/search \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer fc-YOUR_API_KEY" \
  -d '{
    "query": "machine learning transformers",
    "categories": ["research"],
    "limit": 10
  }'
```

To search the papers themselves rather than the websites that host them, use the [Research Index](https://docs.firecrawl.dev/features/research), which searches paper abstracts across PubMed, bioRxiv, medRxiv, and arXiv and can read passages from inside a paper:

cURL

```
curl -s "https://api.firecrawl.dev/v2/search/research/papers?query=CRISPR%20base%20editing%20off-target%20effects&k=10"
```

### [​](https://docs.firecrawl.dev/features/search\#developer-category-search)  Developer Category Search

Search the [Developer Index](https://docs.firecrawl.dev/features/developer) for primary sources on a coding question:

cURL

```
curl -X POST https://api.firecrawl.dev/v2/search \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer fc-YOUR_API_KEY" \
  -d '{
    "query": "how do I configure retries",
    "categories": ["developer"],
    "limit": 10
  }'
```

Developer results come back in the standard `web` group, each carrying `category: "developer"`; the `developer` category cannot be combined with other categories. For ranked results with the matched passages, and for the repository and documentation-source filters, use the [developer search endpoint](https://docs.firecrawl.dev/features/developer#search-the-developer-index).

### [​](https://docs.firecrawl.dev/features/search\#gov-category-search)  Gov Category Search

Search the [Government Index](https://docs.firecrawl.dev/features/gov) for primary law and regulatory material:

cURL

```
curl -X POST https://api.firecrawl.dev/v2/search \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer fc-YOUR_API_KEY" \
  -d '{
    "query": "food labeling requirements for allergens",
    "categories": ["gov"],
    "limit": 10
  }'
```

Gov results are the same results as the [Government Index search endpoint](https://docs.firecrawl.dev/features/gov#search-the-government-index). They come back in the standard `web` group, each carrying `category: "gov"`; the `gov` category cannot be combined with other categories.Gov results add no search credits.

### [​](https://docs.firecrawl.dev/features/search\#mixed-category-search)  Mixed Category Search

Combine multiple categories in one search:

cURL

```
curl -X POST https://api.firecrawl.dev/v2/search \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer fc-YOUR_API_KEY" \
  -d '{
    "query": "neural networks",
    "categories": ["research", "pdf"],
    "limit": 15
  }'
```

## [​](https://docs.firecrawl.dev/features/search\#domain-filters)  Domain Filters

Use `includeDomains` to restrict search results to specific domains, or `excludeDomains` to remove specific domains from the search. These fields add `site:` and `-site:` operators to the query internally, so pass domains only without a protocol or path.

`includeDomains` and `excludeDomains` are mutually exclusive. Use one or the other in a single request.

### [​](https://docs.firecrawl.dev/features/search\#include-domains)  Include Domains

cURL

```
curl -X POST https://api.firecrawl.dev/v2/search \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer fc-YOUR_API_KEY" \
  -d '{
    "query": "web scraping",
    "includeDomains": ["firecrawl.dev", "docs.firecrawl.dev"],
    "limit": 10
  }'
```

### [​](https://docs.firecrawl.dev/features/search\#exclude-domains)  Exclude Domains

cURL

```
curl -X POST https://api.firecrawl.dev/v2/search \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer fc-YOUR_API_KEY" \
  -d '{
    "query": "web scraping tools",
    "excludeDomains": ["example.com"],
    "limit": 10
  }'
```

### [​](https://docs.firecrawl.dev/features/search\#category-response-format)  Category Response Format

Each search result includes a `category` field indicating its source:

```
{
  "success": true,
  "data": {
    "web": [\
      {\
        "url": "https://arxiv.org/abs/2024.12345",\
        "title": "Advances in Neural Network Architecture",\
        "description": "Research paper on neural network improvements",\
        "category": "research"\
      },\
      {\
        "url": "https://example.com/neural-networks.pdf",\
        "title": "Neural Networks Survey",\
        "description": "A survey of neural network architectures",\
        "category": "pdf"\
      }\
    ]
  }
}
```

Examples:

cURL

```
curl -X POST https://api.firecrawl.dev/v2/search \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer fc-YOUR_API_KEY" \
  -d '{
    "query": "openai",
    "sources": ["news"],
    "limit": 5
  }'
```

cURL

```
curl -X POST https://api.firecrawl.dev/v2/search \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer fc-YOUR_API_KEY" \
  -d '{
    "query": "jupiter",
    "sources": ["images"],
    "limit": 8
  }'
```

### [​](https://docs.firecrawl.dev/features/search\#hd-image-search-with-size-filtering)  HD Image Search with Size Filtering

Use images operators to find high-resolution images:

cURL

```
curl -X POST https://api.firecrawl.dev/v2/search \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer fc-YOUR_API_KEY" \
  -d '{
    "query": "sunset imagesize:1920x1080",
    "sources": ["images"],
    "limit": 5
  }'
```

cURL

```
curl -X POST https://api.firecrawl.dev/v2/search \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer fc-YOUR_API_KEY" \
  -d '{
    "query": "mountain wallpaper larger:2560x1440",
    "sources": ["images"],
    "limit": 8
  }'
```

**Common HD resolutions:**

- `imagesize:1920x1080` \- Full HD (1080p)
- `imagesize:2560x1440` \- QHD (1440p)
- `imagesize:3840x2160` \- 4K UHD
- `larger:1920x1080` \- HD and above
- `larger:2560x1440` \- QHD and above

## [​](https://docs.firecrawl.dev/features/search\#search-with-content-scraping)  Search with Content Scraping

Search and retrieve content from the search results in one operation.

Python

Node

cURL

CLI

```
from firecrawl import Firecrawl

firecrawl = Firecrawl(
  # No API key needed to get started — add one for higher rate limits:
  # api_key="fc-YOUR_API_KEY",
)

# Search and scrape content
results = firecrawl.search(
    "firecrawl web scraping",
    limit=3,
    scrape_options={
        "formats": ["markdown", "links"]
    }
)
```

```
import { Firecrawl } from 'firecrawl';

const firecrawl = new Firecrawl({
  // No API key needed to get started — add one for higher rate limits:
  // apiKey: "fc-YOUR-API-KEY",
});

const results = await firecrawl.search('firecrawl', {
  limit: 3,
  scrapeOptions: { formats: ['markdown'] }
});
console.log(results);
```

```
# No API key needed to get started — add -H "Authorization: Bearer fc-YOUR_API_KEY" for higher rate limits:
curl -X POST https://api.firecrawl.dev/v2/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "firecrawl web scraping",
    "limit": 3,
    "scrapeOptions": {
      "formats": ["markdown", "links"]
    }
  }'
```

```
# Search and scrape results
firecrawl search "firecrawl" --scrape --scrape-formats markdown --limit 5 --pretty
```

Every option in scrape endpoint is supported by this search endpoint through the `scrapeOptions` parameter.

### [​](https://docs.firecrawl.dev/features/search\#response-with-scraped-content)  Response with Scraped Content

```
{
  "success": true,
  "data": [\
    {\
      "title": "Firecrawl - The Ultimate Web Scraping API",\
      "description": "Firecrawl is a powerful web scraping API that turns any website into clean, structured data for AI and analysis.",\
      "url": "https://firecrawl.dev/",\
      "markdown": "# Firecrawl\n\nThe Ultimate Web Scraping API\n\n## Turn any website into clean, structured data\n\nFirecrawl makes it easy to extract data from websites for AI applications, market research, content aggregation, and more...",\
      "links": [\
        "https://firecrawl.dev/pricing",\
        "https://firecrawl.dev/docs",\
        "https://firecrawl.dev/guides"\
      ],\
      "metadata": {\
        "title": "Firecrawl - The Ultimate Web Scraping API",\
        "description": "Firecrawl is a powerful web scraping API that turns any website into clean, structured data for AI and analysis.",\
        "sourceURL": "https://firecrawl.dev/",\
        "statusCode": 200\
      }\
    }\
  ]
}
```

## [​](https://docs.firecrawl.dev/features/search\#search-then-scrape-two-step-pattern)  Search then Scrape (Two-Step Pattern)

If you need to filter or process search results before scraping, use a two-step approach: search first, then scrape the URLs you want.

Python

JavaScript

```
from firecrawl import Firecrawl

firecrawl = Firecrawl(api_key="fc-YOUR_API_KEY")

# Step 1: Search
results = firecrawl.search("firecrawl web scraping", limit=5)

# Step 2: Scrape each result URL for full content
for item in results.web or []:
    page = firecrawl.scrape(item.url, formats=["markdown"])
    print(page.markdown[:200])
```

```
import Firecrawl from '@mendable/firecrawl-js';

const firecrawl = new Firecrawl({ apiKey: "fc-YOUR_API_KEY" });

// Step 1: Search
const results = await firecrawl.search("firecrawl web scraping", { limit: 5 });

// Step 2: Scrape each result URL for full content
for (const item of results.web ?? []) {
  const page = await firecrawl.scrape(item.url, { formats: ["markdown"] });
  console.log(page.markdown?.substring(0, 200));
}
```

**When to use which approach:**

- **One-step** (`scrapeOptions` in search): You want content from all results. Simpler and faster.
- **Two-step** (search then scrape): You want to filter, rank, or selectively scrape results. More flexible.

Both approaches use Firecrawl for the scrape step. Do not use generic HTTP fetching or summarize from search snippets alone — the full page content from Firecrawl scrape is what makes results grounded and complete.

## [​](https://docs.firecrawl.dev/features/search\#advanced-search-options)  Advanced Search Options

Firecrawl’s search API supports various parameters to customize your search:

### [​](https://docs.firecrawl.dev/features/search\#location-customization)  Location Customization

Python

Node

cURL

CLI

```
from firecrawl import Firecrawl

firecrawl = Firecrawl(
  # No API key needed to get started — add one for higher rate limits:
  # api_key="fc-YOUR_API_KEY",
)

# Search with location settings (Germany)
search_result = firecrawl.search(
    "web scraping tools",
    limit=5,
    location="Germany"
)

# Process the results
for result in search_result.data:
    print(f"Title: {result['title']}")
    print(f"URL: {result['url']}")
```

```
import { Firecrawl } from 'firecrawl';

const firecrawl = new Firecrawl({
  // No API key needed to get started — add one for higher rate limits:
  // apiKey: "fc-YOUR-API-KEY",
});

// Search with location settings (Germany)
const results = await firecrawl.search('web scraping tools', {
  limit: 5,
  location: "Germany"
});

// Process the results
console.log(results);
```

```
# No API key needed to get started — add -H "Authorization: Bearer fc-YOUR_API_KEY" for higher rate limits:
curl -X POST https://api.firecrawl.dev/v2/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "web scraping tools",
    "limit": 5,
    "location": "Germany"
  }'
```

```
# Search with location
firecrawl search "local restaurants" --location "San Francisco,California,United States" --country US --pretty
```

### [​](https://docs.firecrawl.dev/features/search\#time-based-search)  Time-Based Search

Use the `tbs` parameter to filter results by time. Note that `tbs` only applies to `web` source results — it does not filter `news` or `images` results. If you need time-filtered news, consider using a `web` source with the `site:` operator to target specific news domains.

Python

Node

cURL

CLI

```
from firecrawl import Firecrawl

firecrawl = Firecrawl(
  # No API key needed to get started — add one for higher rate limits:
  # api_key="fc-YOUR-API-KEY",
)

results = firecrawl.search(
    query="firecrawl",
    limit=5,
    tbs="qdr:d",
)
print(len(results.get('web', [])))
```

```
import { Firecrawl } from 'firecrawl';

const firecrawl = new Firecrawl({
  // No API key needed to get started — add one for higher rate limits:
  // apiKey: "fc-YOUR-API-KEY",
});

const results = await firecrawl.search('firecrawl', {
  limit: 5,
  tbs: 'qdr:d', // past day
});

console.log(results.web);
```

```
# No API key needed to get started — add -H "Authorization: Bearer fc-YOUR_API_KEY" for higher rate limits:
curl -X POST https://api.firecrawl.dev/v2/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "latest web scraping techniques",
    "limit": 5,
    "tbs": "qdr:w"
  }'
```

```
# Search with time filter (past week)
firecrawl search "firecrawl updates" --tbs qdr:w --limit 5 --pretty
```

Common `tbs` values:

- `qdr:h` \- Past hour
- `qdr:d` \- Past 24 hours
- `qdr:w` \- Past week
- `qdr:m` \- Past month
- `qdr:y` \- Past year
- `sbd:1` \- Sort by date (newest first)

For more precise time filtering, you can specify exact date ranges using the custom date range format:

Python

JavaScript

cURL

```
from firecrawl import Firecrawl

# Initialize the client with your API key
firecrawl = Firecrawl(api_key="fc-YOUR_API_KEY")

# Search for results from December 2024
search_result = firecrawl.search(
    "firecrawl updates",
    limit=10,
    tbs="cdr:1,cd_min:12/1/2024,cd_max:12/31/2024"
)
```

```
import { Firecrawl } from 'firecrawl';

// Initialize the client with your API key
const firecrawl = new Firecrawl({apiKey: "fc-YOUR_API_KEY"});

// Search for results from December 2024
firecrawl.search("firecrawl updates", {
  limit: 10,
  tbs: "cdr:1,cd_min:12/1/2024,cd_max:12/31/2024"
})
.then(searchResult => {
  console.log(searchResult.data);
});
```

```
curl -X POST https://api.firecrawl.dev/v2/search \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer fc-YOUR_API_KEY" \
  -d '{
    "query": "firecrawl updates",
    "limit": 10,
    "tbs": "cdr:1,cd_min:12/1/2024,cd_max:12/31/2024"
  }'
```

You can combine `sbd:1` with time filters to get date-sorted results within a time range. For example, `sbd:1,qdr:w` returns results from the past week sorted newest first, and `sbd:1,cdr:1,cd_min:12/1/2024,cd_max:12/31/2024` returns results from December 2024 sorted by date.

### [​](https://docs.firecrawl.dev/features/search\#custom-timeout)  Custom Timeout

Set a custom timeout for search operations:

Python

JavaScript

cURL

```
from firecrawl import Firecrawl

# Initialize the client with your API key
firecrawl = Firecrawl(api_key="fc-YOUR_API_KEY")

# Set a 30-second timeout
search_result = firecrawl.search(
    "complex search query",
    limit=10,
    timeout=30000  # 30 seconds in milliseconds
)
```

```
import { Firecrawl } from 'firecrawl';

// Initialize the client with your API key
const firecrawl = new Firecrawl({apiKey: "fc-YOUR_API_KEY"});

// Set a 30-second timeout
firecrawl.search("complex search query", {
  limit: 10,
  timeout: 30000  // 30 seconds in milliseconds
})
.then(searchResult => {
  // Process results
  console.log(searchResult.data);
});
```

```
curl -X POST https://api.firecrawl.dev/v2/search \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer fc-YOUR_API_KEY" \
  -d '{
    "query": "complex search query",
    "limit": 10,
    "timeout": 30000
  }'
```

### [​](https://docs.firecrawl.dev/features/search\#safe-search)  Safe Search

Set `safe` to `true` to filter explicit content from your search results (SafeSearch). When omitted, results are returned unfiltered, exactly as before.

cURL

```
curl -X POST https://api.firecrawl.dev/v2/search \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer fc-YOUR_API_KEY" \
  -d '{
    "query": "firecrawl",
    "safe": true
  }'
```

## [​](https://docs.firecrawl.dev/features/search\#zero-data-retention-zdr)  Zero Data Retention (ZDR)

For teams with strict data handling requirements, Firecrawl offers Zero Data Retention (ZDR) options for the `/search` endpoint via the `enterprise` parameter. ZDR search is available on Enterprise plans — visit [firecrawl.dev/enterprise](https://www.firecrawl.dev/enterprise) to get started.

This is separate from the `zeroDataRetention` scrape option, which controls ZDR for scraping operations. See [Scrape ZDR](https://docs.firecrawl.dev/features/scrape#zero-data-retention-zdr) for details. The `enterprise` parameter only applies to the search portion of the request.

### [​](https://docs.firecrawl.dev/features/search\#end-to-end-zdr)  End-to-End ZDR

With end-to-end ZDR, both Firecrawl and our upstream search provider enforce zero data retention. No query or result data is stored at any point in the pipeline.

- **Cost:** 10 credits per 10 results
- **Parameter:**`enterprise: ["zdr"]`

cURL

```
curl -X POST https://api.firecrawl.dev/v2/search \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer fc-YOUR_API_KEY" \
  -d '{
    "query": "sensitive topic",
    "limit": 10,
    "enterprise": ["zdr"]
  }'
```

### [​](https://docs.firecrawl.dev/features/search\#anonymized-zdr)  Anonymized ZDR

With anonymized ZDR, Firecrawl enforces full zero data retention on our side. Our search provider may cache the query, but it is fully anonymized — no identifying information is attached.

- **Cost:** 2 credits per 10 results
- **Parameter:**`enterprise: ["anon"]`

cURL

```
curl -X POST https://api.firecrawl.dev/v2/search \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer fc-YOUR_API_KEY" \
  -d '{
    "query": "sensitive topic",
    "limit": 10,
    "enterprise": ["anon"]
  }'
```

### [​](https://docs.firecrawl.dev/features/search\#combining-search-zdr-with-scrape-zdr)  Combining Search ZDR with Scrape ZDR

If you are using search with content scraping (`scrapeOptions`), the `enterprise` parameter automatically enforces ZDR for any resulting scrapes. The following example request enforces ZDR on both the search and scrape portions of the process:

cURL

```
curl -X POST https://api.firecrawl.dev/v2/search \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer fc-YOUR_API_KEY" \
  -d '{
    "query": "sensitive topic",
    "limit": 5,
    "enterprise": ["zdr"],
    "scrapeOptions": {
      "formats": ["markdown"]
    }
  }'
```

## [​](https://docs.firecrawl.dev/features/search\#cost-implications)  Cost Implications

The cost of a search is 2 credits per 10 results, rounded up (1–10 results = 2 credits, 11–20 = 4 credits, and so on). Searches with the `gov` category add no search credits. If scraping options are enabled, the standard scraping costs apply to each search result:

- **Basic scrape**: 1 credit per webpage
- **PDF parsing**: 1 credit per PDF page
- **JSON mode**: 4 additional credits per webpage

To help control costs:

- Set `parsers: []` if PDF parsing isn’t required
- Limit the number of search results with the `limit` parameter

## [​](https://docs.firecrawl.dev/features/search\#advanced-scraping-options)  Advanced Scraping Options

For more details about the scraping options, refer to the [Scrape Feature documentation](https://docs.firecrawl.dev/features/scrape). Everything except for the FIRE-1 Agent and Change-Tracking features are supported by this Search endpoint.

> Are you an AI agent that needs a Firecrawl API key? See [firecrawl.dev/agent-onboarding/SKILL.md](https://www.firecrawl.dev/agent-onboarding/SKILL.md) for automated onboarding instructions.

## [​](https://docs.firecrawl.dev/features/search\#measured-performance)  Measured Performance

Independent evaluators have benchmarked Firecrawl Search against other search APIs. The figures below are pulled directly from each evaluator’s published results as of the date shown.

| Metric | Value | Source | Date | n / ± |
| --- | --- | --- | --- | --- |
| Agent Score (Mean Relevant × Quality) | 14.58, rank 2 of 8 (Mean Relevant 4.30/5, Quality 3.39/5) | [AIMultiple — Agentic Search Benchmark](https://aimultiple.com/agentic-search) | Dec 2025 (source updated May 25, 2026) | 95% CI 13.12–15.98, n=100 AI/LLM-domain queries drawn from AIMultiple’s own organic search traffic (10,000 bootstrap resamples); the source notes results don’t generalize to other domains |

These are third-party measurements, each with its own harness, task set, and methodology — they are not directly comparable to one another or to Firecrawl’s own benchmarks. Point-estimate rank 2 of 8; paired-bootstrap testing found no statistically significant gap versus Brave, Exa, or Parallel Search Pro. Firecrawl’s own first-party benchmark pages, including the open-source Developer Index evaluation, live at [firecrawl.dev/benchmarks](https://www.firecrawl.dev/benchmarks).

## [​](https://docs.firecrawl.dev/features/search\#search-feedback)  Search feedback

When a search result is useful or misses important content, submit feedback with `POST /v2/search/{jobId}/feedback`. The first feedback submission for a search job can refund 1 credit, subject to team limits, and helps improve Firecrawl search quality. See [Search Feedback](https://docs.firecrawl.dev/api-reference/endpoint/search-feedback).

[Suggest edits](https://github.com/firecrawl/firecrawl-docs/edit/main/features/search.mdx) [Raise issue](https://github.com/firecrawl/firecrawl-docs/issues/new?title=Issue%20on%20docs&body=Path:%20/features/search)

✕