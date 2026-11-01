# Rationale: 0037 Conversion analytics

## Context

Today the product can prompt free students and can take Mobile Money, but the owner cannot see which step turns a signup into a paid semester. The scope asks for signup plus first note plus first Tip answer plus first quiz plus first limit hit plus first upgrade plus first completed purchase in one view, plus weekly versus semester take rate, plus pending to paid rate, plus search provider fallback rate, plus per student AI cost in XAF. Without this the team prices on guesswork in a market where no published student willingness study exists. The current code already writes prompt events into `KpiEvent` and already sums cost from `AiUsageEvent` in the monetization tab, so the gap is completeness plus clear definitions, not a missing store.

## Options considered

### Option 1: Grow monetization tab on KpiEvent plus domain tables

Keep `KpiEvent` for limit plus prompt plus upgrade, derive firsts from `User` plus `Note` plus chat plus `Quiz`, sum cost from `AiUsageEvent`, add the blocks to the monetization tab in `app/api/admin/metrics/route.ts`.

Pros:

1. Small change on code you run today with no new store to operate.
2. Old users count at once because firsts derive from tables.
3. One admin home keeps trust in a single number.

Cons:

1. Live sums cost more per page open than a rollup.
2. `KpiEvent` keeps serving product state plus analytics, so a future complex journey may need a dedicated table.

### Option 2: New analytics route plus nightly rollup

Write a new admin route plus a nightly Inngest job that writes daily totals into `DailyMetric`.

Pros:

1. Page reads stay fast at any volume.
2. History is stable even if raw rows age out.

Cons:

1. Two sources of truth while the job backfills.
2. New job plus new rows to own for a solo team.

### Option 3: External product analytics

Send events to an outside hosted analytics product and frame its charts in admin.

Pros:

1. Rich charts with no chart code to own.

Cons:

1. Student behavior leaves the database with unclear consent plus data control.
2. Ongoing fee plus a second login for the one reader who matters.

## Rationale

The owner needs one trusted page this week, not a platform. The store already holds every needed fact, the team is small, and a live sum over a bounded 90 day window stays fast enough. A rollup or an outside product adds moving parts before the funnel has proven its use. The choice keeps all behavior in Postgres plus the metrics route, where the current money trail already lives.
