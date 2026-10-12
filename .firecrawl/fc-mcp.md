> ## Documentation Index
>
> Fetch the complete documentation index at: [/llms.txt](https://docs.firecrawl.dev/llms.txt)
>
> Use this file to discover all available pages before exploring further.

[Skip to main content](https://docs.firecrawl.dev/mcp-server#content-area)

Choose how the connection will authenticate. Signing in and adding an API key are two paths to the same access: both reach the full tool surface on your team’s plan.

[**Try Instantly** \\
\\
No account or key. Search, Scrape, and Parse within daily limits.\\
\\
Start keyless setup](https://docs.firecrawl.dev/mcp-server/keyless#try-keyless)

[**Sign in** \\
\\
Browser sign-in from Codex, Claude Code, or your favorite harness.\\
\\
Connect account](https://docs.firecrawl.dev/mcp-server/oauth)

[**Use an API key** \\
\\
Configure an API key in your client, no browser needed.\\
\\
Configure an API key](https://docs.firecrawl.dev/mcp-server/keyless#add-an-api-key)

Use ChatGPT, Codex or Claude? Install the native Firecrawl connector in one click:

[![](https://mintcdn.com/firecrawl/CCJGFNIrBeZmk4E5/images/agent-clients/chatgpt.svg?fit=max&auto=format&n=CCJGFNIrBeZmk4E5&q=85&s=f1da3550e42a8fb856053fbe6d8a083a)\\
\\
**Add to ChatGPT & Codex** \\
\\
Install the native Firecrawl connector in ChatGPT and Codex.\\
\\
Open in ChatGPT](https://chatgpt.com/plugins/plugin_asdk_app_6a314a73f8ac819195b0d55e36b9c609?q=firecrawl)

[![](https://mintcdn.com/firecrawl/CCJGFNIrBeZmk4E5/images/agent-clients/claude-ai.svg?fit=max&auto=format&n=CCJGFNIrBeZmk4E5&q=85&s=01e23ce8cedaa21257700fb093ed3735)\\
\\
**Add to Claude** \\
\\
Install the native Firecrawl connector in Claude.\\
\\
Open in Claude](https://claude.ai/directory/connectors/firecrawl)

## [​](https://docs.firecrawl.dev/mcp-server\#sign-in)  Sign in

Point your client at the OAuth server URL. Your client opens a browser window where you sign in to Firecrawl and approve a team:

```
{
  "mcpServers": {
    "firecrawl": {
      "type": "http",
      "url": "https://mcp.firecrawl.dev/v2/mcp-oauth"
    }
  }
}
```

No API key or headers are needed. Review and revoke connections from [MCP settings](https://www.firecrawl.dev/app/settings?tab=mcp).

This is a server URL for your MCP client, not a page to open directly in a browser. API-key connections use `https://mcp.firecrawl.dev/v2/mcp` with a bearer token instead; see [Add an API key](https://docs.firecrawl.dev/mcp-server/keyless#add-an-api-key).

## [​](https://docs.firecrawl.dev/mcp-server\#client-setup)  Client setup

[**For Agents** \\
\\
Start keyless or use an API key.](https://docs.firecrawl.dev/mcp-server/keyless)

[**For Humans** \\
\\
Sign in via browser.](https://docs.firecrawl.dev/mcp-server/oauth)

Next: [choose a tool](https://docs.firecrawl.dev/mcp-server/tools) or [run the server locally](https://docs.firecrawl.dev/mcp-server/local).

[Suggest edits](https://github.com/firecrawl/firecrawl-docs/edit/main/mcp-server.mdx) [Raise issue](https://github.com/firecrawl/firecrawl-docs/issues/new?title=Issue%20on%20docs&body=Path:%20/mcp-server)

✕

- 👋 Hi! Power AI agents with clean web data!

- I can help with search, scrape, MCP setup, or billing.