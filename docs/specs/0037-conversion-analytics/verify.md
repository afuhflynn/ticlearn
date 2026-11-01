# Verify: conversion analytics · spec 0037 · updated 01 Nov 2026
_Steps derived from spec 0037 acceptance criteria. `/verify-release` runs these; `/test-engineer` locks the durable ones._
## UI / manual
- [ ] Open `/admin/metrics?tab=monetization` as ADMIN with from and to set to a window with known signups → expect the funnel card to show signup plus first note plus first Tip answer plus first quiz plus first limit hit plus first upgrade start plus completed purchase counts, each rising by one for a seeded user → AC-1
- [ ] On the same tab → expect weekly take rate plus semester take rate computed against all verified student accounts, with WEEKLY mapped to weekly copy and PRO mapped to semester copy → AC-2
- [ ] Create an upgrade start then a paid success for one user in the window → expect pending to paid to move from zero toward full → AC-3
- [ ] Open a window with web searches where some used Tavily after Firecrawl → expect fallback rate to equal fallback rows divided by all webSearch rows → AC-4
- [ ] Open a window with AI usage rows → expect total AI cost in XAF plus cost per paid user summed live from AiUsageEvent costXaf → AC-5
- [ ] View page source and network JSON for the monetization tab → expect totals only, no names, no emails, no per student rows → AC-6
- [ ] Reload the monetization tab twice in a row → expect the second load to serve fast from the short minute cache with the same numbers → AC-7
- [ ] Open a window with no cost rows and no fallback rows → expect zero with a plain note naming the ship date → AC-8
- [ ] Add a second quiz for the same user in the window → expect first quiz count to stay at one → AC-1
- [ ] Set from and to more than 90 days apart → expect the window capped at 90 days with a capped note → AC-8
## Commands
- [ ] `pnpm test --run tests/app/api/admin-metrics.test.ts` → expect pass → AC-3
- [ ] `pnpm exec tsc --noEmit` → expect pass → AC-1
## Acceptance-criteria coverage
- AC-1 covered by funnel steps and double quiz step · AC-2 covered by take rate step · AC-3 covered by pending to paid step · AC-4 covered by fallback step · AC-5 covered by AI cost step · AC-6 covered by totals only step · AC-7 covered by live reload step · AC-8 covered by zero note and 90 day cap steps
