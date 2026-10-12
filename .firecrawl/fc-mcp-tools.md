\> ## Documentation Index
\> Fetch the complete documentation index at: https://docs.firecrawl.dev/llms.txt
\> Use this file to discover all available pages before exploring further.

\# Firecrawl MCP tools

\> Choose a Firecrawl MCP tool and understand its availability and operating behavior.

Firecrawl MCP exposes tools for finding, extracting, interacting with, and monitoring web content. Your MCP client receives the exact input schema for every available tool when it connects.

\## Tool availability

\| Connection mode \| Available tools \|
\| \- \| \- \|
\| Hosted OAuth \| Full tool surface, subject to plan and team policy \|
\| Hosted API key \| Full tool surface, subject to plan and team policy \|
\| Hosted keyless \| \`firecrawl\_search\`, \`firecrawl\_scrape\`, and \`firecrawl\_parse\` \|
\| Local with the Firecrawl cloud API \| API-backed tools; direct local-file Parse is unavailable \|
\| Local with a self-hosted Firecrawl API \| Tools supported by the services enabled in that deployment \|

Start with \[Get Started\](/mcp-server) and pick \[For Agents\](/mcp-server/keyless) or \[For Humans\](/mcp-server/oauth). Some optional tools can be disabled by environment or team policy.

\## Choose a tool

\| Job \| Tool \| Use it when \|
\| \- \| \- \| \- \|
\| Read one page \| \`firecrawl\_scrape\` \| You know the URL and need page content or structured fields. \|
\| Extract structured data \| \`firecrawl\_scrape\` with JSON format \| You have the URL and want data matching a prompt or JSON schema. \|
\| Discover site URLs \| \`firecrawl\_map\` \| You need to find pages before deciding what to extract. \|
\| Search the web \| \`firecrawl\_search\` \| You have a query rather than a known URL. \|
\| Get data from a third-party provider \| \`firecrawl\_find\_tools\`, then \`firecrawl\_scrape\` with \`alexandria\` \| You need typed records from a provider in the \[Alexandria\](/features/alexandria) catalogue. Authenticated \`firecrawl\_search\` also returns matching tools in \`data.tools\`. \|
\| Parse a file \| \`firecrawl\_parse\` \| You need content from a PDF, document, spreadsheet, or HTML file. \|
\| Extract many pages \| \`firecrawl\_crawl\` and \`firecrawl\_check\_crawl\_status\` \| You need to traverse a site or section. The crawl tool polls the job to a terminal state before returning. \|
\| Run autonomous research \| \`firecrawl\_agent\` and \`firecrawl\_agent\_status\` \| The task spans multiple sources and the exact pages are not known. \|
\| Operate a live page \| \`firecrawl\_interact\` and \`firecrawl\_interact\_stop\` \| You need clicks, form fills, navigation, or dynamic-page extraction. \|
\| Search scientific literature \| \`firecrawl\_research\_\*\` \| You need to find papers, read passages from inside one, or follow citations. Searches the \[Research Index\](/features/research) of PubMed, bioRxiv, medRxiv, and arXiv paper abstracts. \|
\| Answer a programming question \| \`firecrawl\_developer\_search\` \| You need primary-source answers from issues, merged pull requests, READMEs, and curated docs. \|
\| Answer a legal or regulatory question \| \`firecrawl\_gov\_search\` \| You need statutes, regulations, codes, court opinions, or other government publications from the \[Firecrawl Government Index\](/features/gov). \|
\| Monitor changes \| \`firecrawl\_monitor\_\*\` \| You need recurring checks, diffs, and webhook or email notifications. \|
\| Send product feedback \| \`firecrawl\_search\_feedback\` and \`firecrawl\_feedback\` \| You want to rate search results or report endpoint-level quality. \|

 The former Extract MCP tool is deprecated and is not part of the current tool surface. Use Scrape with JSON format for a known page, or Agent when Firecrawl must discover the sources. See \[Choosing the Data Extractor\](/developer-guides/usage-guides/choosing-the-data-extractor) for the full comparison.

 Use the schema shown by your MCP client for the current arguments. The feature guides below explain the underlying Firecrawl behavior without duplicating those schemas here.

\## Important behavior

 A local MCP server connected to a self-hosted Firecrawl API can read \`filePath\` directly. The hosted server cannot read files from your machine, so it uses a two-call handoff:

 1\. Call \`firecrawl\_parse\` with \`filePath\` to receive an upload command and \`uploadRef\`.
 2\. Run the upload command on the machine that can read the file.
 3\. Call \`firecrawl\_parse\` again with the returned \`uploadRef\`.

 The upload command uses a short-lived signed target and does not contain your Firecrawl API key. Use \`firecrawl\_scrape\` for a public document URL.

 \`firecrawl\_crawl\` normally starts a crawl and polls it to a terminal state before returning. If that wait times out, resume the job with \`firecrawl\_check\_crawl\_status\` and the crawl ID. Use the same status tool for a crawl created outside the current MCP call.

 \`firecrawl\_agent\` is asynchronous: it returns a job identifier, and \`firecrawl\_agent\_status\` checks that job until it completes or fails.

 Start with a \`url\`, or reuse the \`scrapeId\` from a previous Scrape call. When the workflow is finished, call \`firecrawl\_interact\_stop\` with the \`scrapeId\` to release the session.

 The \`firecrawl\_monitor\_\*\` family creates, lists, updates, runs, and inspects recurring monitors. \`firecrawl\_monitor\_delete\` permanently removes a monitor and should be called only when the user explicitly intends to delete it.

 \[Alexandria\](/features/alexandria) tools need an authenticated session. Keyless sessions get no Alexandria tools.

 1\. \*\*Discover.\*\* Authenticated \`firecrawl\_search\` uses \`sources: \["web", "alexandria"\]\` by default and returns matching tools in \`data.tools\`. Use \`sources: \["alexandria"\]\` for tools only, or \`sources: \["web"\]\` to omit semantic tool discovery.
 2\. \*\*Inspect.\*\* Call \`firecrawl\_find\_tools\` with no arguments to browse categories, then providers, then tools. Use \`query\` or \`urls\` to find tools for a task or a website. Use \`capabilities\` to read the full contract of a tool. Follow the returned \`nextTool\` for the next step.
 3\. \*\*Run.\*\* Call \`firecrawl\_scrape\` with \`alexandria: {provider, capability, options}\` instead of \`url\`. Send an array of up to 10 calls to run them together. Each result in \`data.alexandria\` has \`data\` or an \`error\`.

 Discovery is free. Each run costs the price listed on its tool. If a provider needs accepted terms, the tool returns \`THIRD\_PARTY\_DATA\_TERMS\_REQUIRED\` with \`requiresAction.url\`. Give that URL to an org admin, who accepts the terms in the Firecrawl dashboard. The agent must not accept terms. After the admin confirms, send the same call again.

 Set \`FIRECRAWL\_NO\_SEARCH\_FEEDBACK=1\` to prevent \`firecrawl\_search\_feedback\` from being registered. Set \`FIRECRAWL\_NO\_ENDPOINT\_FEEDBACK=1\` to prevent \`firecrawl\_feedback\` from being registered.


\## Feature guides

 Extract content or structured fields from one URL.

 Find relevant web, news, image, and developer sources.

 Search papers, read passages, and follow citations.

 Answer coding questions from issues, PRs, READMEs, and docs.

 Search statutes, regulations, codes, and court opinions.

 Traverse and extract a site or section.

 Convert files into LLM-ready output.

 Operate dynamic pages in a live browser session.

 Run autonomous multi-source research.

 Track page changes and receive notifications.

 Find and run data tools from third-party providers.


\## Troubleshooting

\\* \*\*A tool is missing:\*\* confirm the connection mode on \[Get Started\](/mcp-server), reconnect or restart the client, and check whether team policy disables optional tools.
\\* \*\*The client returns \`401\`:\*\* check the configured server URL first.
 \\* If the configured URL is \`/v2/mcp-oauth\`, sign in again through the client.
 \\* If it is \`/v2/mcp\`, either replace the API key on that server or update the existing server URL to \`/v2/mcp-oauth\` and complete sign-in.
 \\* Start a new client session after either change.
\\* \*\*The client is rate-limited:\*\* review the current \[rate limits\](/rate-limits), wait for the retry interval, or move from keyless to authenticated access.

This documentation is built and hosted on \[Mintlify\](https://mintlify.com), a developer documentation platform.