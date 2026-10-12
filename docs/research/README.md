# Research

Nine documents, one question each. They hold the evidence behind the scope in [`../scope/`](../scope/index.md). **Read the one that covers your feature before you design it**, and cite it in your spec rather than re researching.

Written 2026 with the Firecrawl CLI and parallel research agents. Anything unverified is marked as such in the document it appears in.

## Start here

| Document | Read it when you are working on |
|---|---|
| [audience-and-market.md](audience-and-market.md) | Anything user facing. Who the student is, what they earn, what they pay, the academic calendar, and when to sell. **Start here if you have not read it.** |
| [design-reference.md](design-reference.md) | Landing page, onboarding, or any visual rebuild. What to steal from which product, and what to avoid. |
| [chat-experience.md](chat-experience.md) | The chat interface, the composer, thinking and tool disclosure, suggested prompts, or chat speed. |
| [ui-toolkit.md](ui-toolkit.md) | Any component, any screen. Whether to stay on shadcn, what to adopt, what to build, and the nuqs rules. |
| [web-search-tooling.md](web-search-tooling.md) | The search tool. Firecrawl as primary, Tavily as fallback, the normalised interface, the decision order, and the caching plan. |
| [security.md](security.md) | Anything touching auth, uploads, payments, admin, or AI inputs. Twenty launch blockers, the prompt injection architecture, and a per route rate limit table. |
| [performance-and-database.md](performance-and-database.md) | Any query, any slow screen. Exact index DDL, what to move to Inngest, the caching plan, and the performance budgets. |
| [stack-and-storage.md](stack-and-storage.md) | The AI model chain, storage, Neon, and framework upgrades. Includes four claims in our own docs that the code does not support. |
| [env-inventory.md](env-inventory.md) | Any new integration. All forty six variables, five stale ones, two security findings, and where to get each new credential. |
| [email-system.md](email-system.md) | Any email. The template rebuild, the logo inlining, the DNS that is currently blocking us, and Cameroonian consent law. |

## For future agents: how this research was done

The pattern that produced these documents, so you can repeat it without rediscovering the tooling.

**The Firecrawl CLI** at `~/.config/opencode/skills/firecrawl-*`. The two you will use most:

```bash
# Search with page content, write to a file, never into context
firecrawl search "<their actual question>" --scrape -o .firecrawl/search.json --json
jq -r '.data.web[].url' .firecrawl/search.json

# Scrape one known URL
firecrawl scrape "<url>" --format markdown -o .firecrawl/page.md
```

Read `~/.config/opencode/skills/firecrawl-search/SKILL.md` before your first call. It documents the flags, the Alexandria tool discovery, and the feedback command that refunds a credit per search.

**What worked:**

1. **Delegate to parallel research agents, one question each.** Nine questions, nine agents, nine files. Each agent got the audience constraints in the prompt so it could judge a design against our students rather than describing it generically.
2. **Ask agents to audit the local code as well as the web.** The sharpest findings in `performance-and-database.md`, `security.md`, `chat-experience.md` and `env-inventory.md` came from reading our files, not from the web. Four claims in our own `AGENTS.md` turned out to be false against the code.
3. **Tell agents to cite file and line for every local claim.** It makes the finding checkable later.
4. **Tell agents to mark unverified things as unverified.** Half the value of this research is knowing which numbers are soft.
5. **Keep the write to one file per agent.** Nine agents writing nine files in one directory never collided. Asking an agent to also create a summary file gets you duplicated and contradictory output.
6. **Have each agent return only a fifteen line summary.** The detail goes in the file, where the next agent can read it instead of you carrying it.

**What to avoid:**

- Do not dump Firecrawl output into context. Use `-o` and read the file.
- Do not trust the `firecrawl scrape` screenshots for mobile claims. There is no viewport flag, so mobile findings are inferred from markup and asset dimensions. `design-reference.md` marks these.
- Do not research a whole product family in one agent. Split by question, as above.
- Do not let a research agent write application code. Every agent above was read only and the constraint is what kept them useful.
- `.firecrawl/` is scratch and **is not git-ignored**. Add it to `.gitignore` before committing.
- Send search feedback with `firecrawl search-feedback` within about two minutes of each search. It refunds a credit. Do it in the background with `--silent &` so it never blocks.

## Keeping these honest

These are point in time snapshots, not living truth. Before you act on a number, check whether it still holds, and prefer the primary source over the document. If a spec contradicts one of these documents, the spec wins and this directory is now stale; say so rather than quietly working around it.
