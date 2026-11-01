# 0037. Conversion analytics

**Date**: 01 Nov 2026
**Status**: In Progress

## Summary

This spec grows the live admin metrics area to show the full path from signup to paid in one place. It uses event rows plus domain tables you own today, with no new pipeline. A busy reader can see take rate plus pending to paid plus provider fallback plus AI cost without a manual query.

## Requirements

**User stories**:

1. As the owner, I want the full signup to paid funnel in admin so that I see where students stop.
2. As the owner, I want weekly versus semester take rate on all signups so that I see which pass wins.
3. As the owner, I want pending to paid plus fallback plus AI cost beside the funnel so that I see money plus provider plus model spend together.
4. As a student, I want my identity kept out of analytics so that totals never expose my contact detail.

**Acceptance criteria**:

1. **AC-1**: Admin sees funnel counts for signup plus first note plus first Tip answer plus first quiz plus first limit hit plus first upgrade start plus first completed purchase for the chosen window.
2. **AC-2**: Admin sees weekly take rate plus semester take rate where the base is all verified student accounts and the numerator is first ACTIVE per plan.
3. **AC-3**: Admin sees pending to paid rate defined as `paid_success` divided by `upgrade_start` in the window.
4. **AC-4**: Admin sees search fallback rate defined as searches served by Tavily after Firecrawl divided by all searches in the window.
5. **AC-5**: Admin sees total AI cost in XAF plus cost per paid user, summed live from `AiUsageEvent`.`costXaf`.
6. **AC-6**: Page shows totals only with no names plus no emails plus no per student rows.
7. **AC-7**: Counts compute live on page open using server day windows with a short cache of minutes.
8. **AC-8**: When cost or fallback logs are missing for a window, the block shows zero with a plain note naming the ship date, and rows stay readable for 90 days.

## Decision

**Chosen option**: Option 1: Grow monetization tab on KpiEvent plus domain tables

Grow the monetization tab in place using `KpiEvent` plus domain tables plus `AiUsageEvent`, with totals only and server day windows.

## Feature design

**Data model sketch**:

1. `User`: id plus role plus email verified flag plus createdAt. Base for signup count plus take rate base is role USER with verified email true. Window places on createdAt. No change.
2. `Note`: id plus userId plus createdAt. First note derives as min createdAt per user, window places on that min date. No change.
3. `ChatMessage`: id plus userId plus role plus createdAt. First Tip answer derives as min createdAt per user over assistant rows only, ignoring tool plus error rows. Window places on that min date. No change.
4. `Quiz`: id plus userId plus createdAt. First quiz derives as min createdAt per user, window places on that min date. No change.
5. `KpiEvent`: id plus userId plus event plus metadata plus createdAt. Holds `limit_hit` plus `prompt_shown` plus `prompt_clicked` plus `prompt_dismissed` plus `upgrade_start` plus `paid_success`. Metadata holds surface plus kind. Counts use distinct users per event per window. No change.
6. `Subscription`: id plus userId plus plan (`WEEKLY` or `PRO`) plus status (`PENDING` or `ACTIVE`) plus amount plus activatedAt. Paid means status ACTIVE and it is the canonical purchase count. `paid_success` shows beside it as a check. `WEEKLY` maps to weekly copy. `PRO` maps to semester copy. Take rate numerator is first ever ACTIVE per plan. Base is all time verified users. No change.
7. `AiUsageEvent`: id plus userId plus costXaf plus createdAt. Cost sums from `costXaf`. Null counts as zero, which covers free Muse calls. Cost per paid user divides by distinct ACTIVE users. No change.
8. `WebSearchEvent`: id plus userId plus tool plus servedBy plus fallbackUsed plus createdAt. Fallback means tool `webSearch` with fallbackUsed true. Rate divides fallback count by all `webSearch` rows in window. Zero rows shows zero with a note. No change.
9. No migration. No new table. No new column.

**State transitions**:

1. Funnel is read only with no state. Each step counts distinct users once per window.
2. Subscription states reuse the live flow: `PENDING` to `ACTIVE` on webhook success.
3. Missing logs stay at zero with a note. No backfill state.

**API surface**:

1. `app/api/admin/metrics/route.ts` GET with tab monetization returns summary plus money trail plus funnel plus take rates plus fallback plus cost. Inputs: from plus to as date strings plus tab. Server caps the window at 90 days. Outputs: JSON with funnel counts plus rates plus cost plus window plus note. Memory cache of 5 minutes serves repeats, stale serves on error. Auth: ADMIN only. Errors: 401 when no session, 403 when not ADMIN.
2. `app/api/admin/conversion/route.ts` GET stays as is for the last 30 day prompt counts. No change to its shape.
3. No new route. Client calls through `lib/api-client.ts`. No raw fetch path.

**Value sourcing**:

1. Signup count: source `User` count where role is USER with verified email true, window on createdAt.
2. First note count: source min `Note`.createdAt per user, window on that min date.
3. First Tip answer count: source min `ChatMessage`.createdAt per user over assistant rows only, ignoring tool plus error rows, window on that min date.
4. First quiz count: source min `Quiz`.createdAt per user, window on that min date.
5. Limit hit count: source distinct users in `KpiEvent` where event is `limit_hit` in window.
6. Upgrade start count: source distinct users in `KpiEvent` where event is `upgrade_start` in window.
7. Completed purchase count: canonical source `Subscription` where status is ACTIVE in window by activatedAt, with `KpiEvent` where event is `paid_success` shown beside it as a check.
8. Weekly take rate: source first ever ACTIVE where plan is `WEEKLY` divided by all time verified USER count.
9. Semester take rate: source first ever ACTIVE where plan is `PRO` divided by all time verified USER count.
10. Pending to paid rate: source distinct users with `paid_success` divided by distinct users with `upgrade_start` in the same window, cohort linked by user, zero when the base is zero.
11. Fallback rate: source `WebSearchEvent` where tool is `webSearch` and fallbackUsed is true divided by all `WebSearchEvent` where tool is `webSearch` in window, zero rows shows zero with a note.
12. Total AI cost: source sum of `AiUsageEvent`.`costXaf` in window, null counts as zero.
13. Cost per paid user: source total AI cost divided by distinct ACTIVE users in window, zero when no paid users.
14. Window bounds: source server day start plus end, same as the metrics route today, capped at 90 days.
15. Zero note text: source constant naming the ship date of fallback logging.

**Key invariants**:

1. Money stays XAF in whole units. Cost sums round down at display with no minor units.
2. Free has no plan row. Take rate base is all USER rows with no plan filter.
3. Paid means ACTIVE only. PENDING never counts as paid.
4. Firsts count once per user by min date. Event steps count distinct users per window. Retakes plus reloads never move the funnel.
5. Totals only. No email plus no name plus no per user row reaches the client.
6. Event writes never block study. Analytics failure shows cached plus retry like spec 0035.
7. Zero base shows zero rate, never an error. Null cost counts as zero.

**Security model**:

Admin role only for all new fields. Session read uses `auth.api.getSession` with headers at the top, 401 with no session, 403 when role is not ADMIN. Student rows stay aggregate. No new secret. No compliance scope beyond existing auth plus payment data owned by prior specs.

**Configuration required**:

None. No new env vars. Reuses plan catalogue plus platform settings plus Fapshi secret.

**Critical test scenarios**:

1. Happy path: seeded signup plus note plus quiz plus limit plus upgrade plus ACTIVE shows each step rise by one, verifies **AC-1** plus **AC-2**.
2. Happy path: upgrade start then paid success moves pending to paid from zero to full, verifies **AC-3**.
3. Failure case: empty cost plus empty fallback shows zero with a plain note, verifies **AC-8**.
4. Auth case: no session gets 401, student role gets 403, verifies **AC-6**.
5. Data case: second quiz by same user leaves first quiz count at one, verifies **AC-1**.

## Build plan

Ordered as Tracer Bullet slices. Each slice runs end to end through route plus query plus page and works before the next starts. No migration in any slice.

1. Thin thread: funnel counts plus take rates on the monetization tab. Add funnel query in `lib/kpi.ts` plus extend the monetization branch in `app/api/admin/metrics/route.ts` plus render steps bar plus take rate cards with skeleton plus empty states, satisfies **AC-1** plus **AC-2** plus **AC-7**.
2. Money plus cost: pending to paid plus total AI cost plus cost per paid user from `AiUsageEvent`, with zero plus note behavior, satisfies **AC-3** plus **AC-5** plus **AC-8**.
3. Fallback plus hardening: fallback rate from `WebSearchEvent` fallbackUsed plus totals only guard plus 90 day cap plus 5 minute cache plus tests for happy plus auth plus empty plus double count, satisfies **AC-4** plus **AC-6** plus **AC-8**.

## Consequences

**Positive**:

1. Owner sees signup to paid plus take rate plus money plus cost in one admin home.
2. No new store keeps build plus ops cost low for a solo team.
3. Old users count on day one because firsts derive from tables.

**Negative / tradeoffs**:

1. Live sums add query load per page open, so a very large base will need a rollup later.
2. Server day windows keep a known Douala gap until the shared day helper lands.
3. `KpiEvent` keeps double duty as product state plus analytics, which may need a split as journeys grow.

**Neutral**:

1. Weekly at 500 XAF and semester at 3000 XAF stay owned by the plan catalogue. A price change flows with no code change.
2. Plan limits stay in the three known maps named in `app/api/AGENTS.md`. This spec reads them, it does not unify them.

## Follow up

1. Confirm Douala midnight helper in one shared day module so prompt day plus usage day plus funnel day agree.
2. Watch live sum latency after ship. If page open slows, add a nightly rollup into `DailyMetric`.
3. Confirm fallback log shape in `lib/web-search` so the rate counts the same retry the chat path takes.
