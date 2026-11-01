# 0034. Mobile money payments for the pass

**Date**: 2026-11-01
**Status**: In Progress

_Decision record for spec 0034. The build spec lives in `index.md`._

## Context

The pass sale runs today through Fapshi (a payment provider that moves Mobile Money). The rows exist. Subscription holds one row per student. CreditPurchaseOrder holds typed buys. The initiate route and the status route and the webhook route exist.

The sale loses trust at three points. A PIN timeout reads as an error. A pending buy shows no next step and no recheck. A paid buy with a missed webhook leaves a paid student locked. The scope asks for MTN Mobile Money first with Orange Mobile Money always present, amounts from buttons for the pass, a typed amount path for credits, calm waiting words, pending with a recheck, receipt by email, webhook use of the stored amount, retry reuse of the same row, and no replay that grants twice.

The team is solo plus agents. The win is conversion within the first month. The audience is Anglophone university students on a tight term budget with a phone first study habit. The free tier must work alone. Money is XAF in whole units (whole francs, no cents). Credits are a separate balance from money.

> Premise note resolved after cross check: the scope basis asks for MTN first always. The interview first chose live Fapshi order. Cross check showed the live list shape is unnamed and adds a failure path. The spec now ships a static MTN first then Orange pair, which matches scope and kills the fetch.

## Options considered

### Option 1: Fix in place with reuse

Keep Fapshi alone. Reuse `Subscription` plus `CreditPurchaseOrder` plus `lib/fapshi.ts`. Add provider plus phone columns. Add typed credit initiate. Polish wording plus pending plus receipt plus poll bridge. Guard with stored amount plus unique Fapshi id plus one award per row.

1. Pros:
   1. Smallest change that meets the scope. Reuses live rows and live helper.
   2. One provider means one webhook path to operate at 2am.
   3. Retry reuse plus replay guard fit the current one row per student shape.
2. Cons:
   1. Live provider list adds a fetch that can fail, so a fallback must be kept.
   2. Poll that can write needs care so it cannot fight the webhook.

### Option 2: One new pay table

Build a single new payment order table for both pass and credit buys. Keep old tables for history only. Point all routes at the new table.

1. Pros:
   1. One shape for every money move. Cleaner to read in a year.
   2. Fresh constraints with no legacy nulls.
2. Cons:
   1. Data move for live subs plus credit orders. Higher risk for solo build.
   2. Two tables stay live during the move. Harder to operate than a fix in place.

### Option 3: Add a second provider now

Keep Fapshi and add a second Mobile Money provider beside it for failover. Add provider choice plus two webhook paths plus reconciliation.

1. Pros:
   1. Failover when one provider is down.
   2. Leverage if fees differ.
2. Cons:
   1. Doubles webhook plus poll plus support paths.
   2. No measured outage forces it now. Adds ops load before conversion pays.

## Rationale

The forces are solo operation, a conversion win needed in weeks, and trust lost on timeout plus pending plus missed webhook. A fix in place meets the scope with the least new surface to run. A new table moves live money data for no buyer visible gain. A second provider doubles the paths to watch before any outage proves the need. The engineer picks match this call: Fapshi alone, reuse the helper, Inngest for receipt, live list with fallback. The one place this spec first overruled the scope basis was provider order. Scope basis asks MTN first always. The interview chose live Fapshi order. Cross check reversed that call because the list endpoint plus shape plus cache are unnamed. The spec now ships static MTN first then Orange, back in line with scope, with no fetch to fail.
