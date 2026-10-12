# 0003. AI model chain

**Date**: 2026-10-12
**Status**: In Progress

## Summary

You route every AI call through OpenRouter (a single gateway that forwards to many model labs) with an ordered chain of six models. If the head model fails you try the next one inside a shared 10 second budget. A dead model stays skipped for 2 minutes and spend shows per student per day in XAF (Central African franc, the money you bill in). Fusion (a parallel consensus mode on OpenRouter that asks several models at once and merges answers) stays opt in only for rare high value research, never the default path.

## Requirements

**User stories**:

1. As a student, I want answers even when one model is down so that study never blocks.
2. As a student, I want to see my own AI spend per day in XAF so that cost feels clear.
3. As an admin, I want to see AI spend split by model and by task so that pricing stays sound.

**Acceptance criteria**:

1. **AC-1**: Forced failure on the head model falls through to the next model and completes inside the 10 second budget.
2. **AC-2**: A model that trips stays skipped for a 2 minute cooldown on every instance.
3. **AC-3**: Schema failures (output that fails validation, a Zod shape mismatch) never trip the breaker.
4. **AC-4**: Per student AI cost is readable per day in XAF with tokens plus model plus task recorded.
5. **AC-5**: The chain holds at least six models across frontier labs and open weight labs through OpenRouter.
6. **AC-6**: Chat fallback happens only before the first token streams, once streaming starts the model stays put.
7. **AC-7**: When every model is down the student sees a friendly error with no retry storm.
8. **AC-8**: Paper3 generation and marking use the same chain path, no separate Gemini path remains.

## Decision

**Chosen option**: Option 2: Ordered fallback chain with shared breaker and ledger.

You keep full use of the Vercel AI SDK (the `ai` package with `generateObject` plus `generateText` plus `streamText`) pointed at OpenRouter through the installed compatible provider, walk an ordered list of six model IDs in code, guard each model with a shared Postgres breaker, enforce one shared deadline per request, and log usage with XAF math per student per day. Fusion stays available as a separate explicit call for rare deep research only.

## Feature design

**Data model sketch**:

```
model AiModelHealth {
  modelId    String   // e.g. google/gemini-2.5-flash
  status     String   // healthy or open
  failCount  Int
  trippedAt  DateTime?
  updatedAt  DateTime
}
model AiUsageEvent {
  id               String
  userId           String
  task             String   // e.g. quiz_gen
  modelId          String   // actual model that served
  promptTokens     Int
  completionTokens Int
  costUsd          Float
  costXaf          Int
  latencyMs        Int
  createdAt        DateTime
}
```

1. `AiModelHealth` holds one row per model ID with status plus fail count plus last trip time.
2. `AiUsageEvent` holds one row per served call with user plus task plus model plus tokens plus cost in USD (dollars, source price) plus cost in XAF plus latency.
3. `AiUsageEvent.userId` links to `User.id` as many to one, reads join for per student totals.
4. Unique rule: one row per `modelId` in `AiModelHealth`.
5. Index rule: index `AiUsageEvent` on `userId` plus `createdAt` for daily totals, and on `modelId` plus `createdAt` for admin split.

**State transitions**:

1. healthy to open when 3 transport faults occur in 1 minute, schema faults never count.
2. open allows one single flight probe after the 2 minute cooldown, success closes and clears fail count.
3. open stays open when the probe fails and trip time resets.
4. Schema failure causes no transition, count stays still.
5. Breaker read failure means try the head model and log the miss.

**API surface**:

1. `generate` keeps its current inputs and outputs, now walks the chain inside, satisfies **AC-1**, **AC-3**, **AC-5**.
2. `generateTextWithFallback` keeps its current inputs and outputs, now walks the chain inside, satisfies **AC-1**, **AC-5**.
3. `streamChat` keeps its current inputs and outputs, tries the next model only before the first token, satisfies **AC-6**.
4. `GET /api/me/ai-usage` returns the signed in student's daily totals in XAF with date from plus date to plus page, auth session required, satisfies **AC-4**.
5. `GET /api/admin/ai-usage` returns totals by student plus by model plus by task with counts plus tokens plus latency, admin role required, satisfies **AC-4**.
6. `runFusionResearch` is a separate explicit call for rare deep work, never called by default, satisfies follow up scope control.

**Value sourcing**:

1. Action generate, value served model ID, source `response.model` from OpenRouter.
2. Action generate, value prompt tokens plus completion tokens, source `usage` object on the served response.
3. Action generate, value cost USD, source `usage.cost` from OpenRouter with static price table as fallback when absent.
4. Action generate, value cost XAF, source cost USD times USD to XAF rate, ceil to whole XAF at write time, rate copied onto the row.
5. Action generate, value latency, source measured wall time around the served attempt.
6. Action list cost, value daily total per student, source sum of `AiUsageEvent.costXaf` grouped by calendar day in Africa Douala time for that `userId`.
7. Action breaker check, value skip or try, source `AiModelHealth.status` plus `trippedAt` read at chain start.

**Key invariants**:

1. One chain definition in code owns order, prompt files hold logical task only and never pin a model.
2. Only transport faults trip the breaker, validation faults never do.
3. Shared 10 second budget splits evenly across models left to try, abort propagates to the AI SDK call.
4. Cache key stays model free, fallback checks cache first, grading still never caches.
5. Every served call writes one usage row, even when served by a fallback model.
6. Total failure still writes one row with zero tokens plus zero cost plus error code.
7. Usage write failure never fails the student request, it logs plus metrics only.
8. Streaming never switches model mid stream, first token means first text delta.
9. Jobs keep a longer internal budget with a per attempt cap inside the shared walk.

**Security model**:

1. Students may read only their own usage rows through the mine endpoint, scoped by session user ID.
2. Admins may read all usage rows through the admin endpoint, guarded by the existing admin check.
3. OpenRouter key lives server side only and never reaches client code.
4. Forced failure flag works only in non production or with admin role, never for students in production.

**Configuration required**:

1. `OPENROUTER_API_KEY`: server key for OpenRouter, required in production.
2. `AI_CHAIN_ORDER`: locked ordered IDs for first version, seed default in code, override by env when needed.
3. `AI_HEAD_FAIL_ONCE`: test flag that forces the head to fail one time per request for fallback proof, staging and test only.
4. `USD_TO_XAF_RATE`: rate used for XAF math with code default 650, value copied onto each usage row.
5. `AI_FUSION_ALLOW`: flag that gates the Fusion path, off by default, admin only with cost cap when on.

**Critical test scenarios**:

1. Happy path: quiz generation serves through head model and writes a usage row, verifies **AC-4**, **AC-5**.
2. Failure case: head forced to fail, next model serves inside 10 seconds, verifies **AC-1**.
3. Breaker case: tripped model stays skipped until cooldown passes, verifies **AC-2**.
4. Validation case: bad schema output fails fast with no breaker trip, verifies **AC-3**.
5. Stream case: head fails before first token, fallback streams cleanly with no mid stream switch, verifies **AC-6**.
6. All down case: every model open, student sees friendly error and no retry storm, verifies **AC-7**.
7. Auth case: student blocked from admin usage read, admin allowed, verifies **AC-4** scoping.

## Build plan

1. Add `OPENROUTER_API_KEY` plus chain order plus rate plus test flags to env example and settings, satisfies **AC-4**, **AC-5**.
2. Create migration for `AiModelHealth` plus `AiUsageEvent` with indexes, thin thread first, satisfies **AC-2**, **AC-4**.
3. Point orchestrator at OpenRouter through the compatible provider with full AI SDK calls and ordered walk plus shared deadline, thin end to end through quiz generation, satisfies **AC-1**, **AC-5**, **AC-8**.
4. Add shared Postgres breaker with transport only trip rules plus 2 minute cooldown plus probe, satisfies **AC-2**, **AC-3**.
5. Add usage writer plus XAF math plus mine and admin reads, satisfies **AC-4**.
6. Wire streaming fallback before first token plus friendly all down error, satisfies **AC-6**, **AC-7**.
7. Migrate Paper3 plus jobs onto the same chain path and remove direct Gemini imports with CI check that blocks direct provider imports, satisfies **AC-8**.
8. Add forced failure flag plus fallback proof test plus cost proof test, satisfies **AC-1**, **AC-2**, **AC-3**, **AC-4**.
9. Add separate Fusion helper gated by flag for rare deep research with cost guard, manual walk preferred over native auto fallback for shared deadline plus per model breaker plus per model cost rows, satisfies follow up scope control.

## Consequences

**Positive**:

1. Study stays up when one lab is down, fallback happens inside the same request.
2. Spend becomes visible per student per day in XAF, pricing choices gain facts.
3. One AI path replaces scattered direct calls, future model swaps touch one file.

**Negative / tradeoffs**:

1. Worst case latency grows when fallback runs, some requests take the full budget.
2. Postgres breaker adds a read per AI call, a small cost on every request.
3. Usage rows grow fast, retention plus rollup work becomes needed over time.
4. Fusion remains costly and slow, so it must stay gated or bills spike.

**Neutral**:

1. Prompt files keep logical names, model choice moves fully to chain order.
2. Cache behavior stays as today, grading still never caches.

## Follow-up

1. [ ] Decide retention for raw usage rows plus daily rollup shape once volume is known.
2. [ ] Review static price table quarterly against OpenRouter list prices.
3. [ ] Consider Fusion for one high value research task only after fallback proves stable, with a hard cost cap.
4. [ ] Point the scope row for feature 4 at this spec and mark ready to build.

## Migration plan

**Strategy**: strangler
**Phases**:

1. Phase 1: Ship chain beside current Gemini path behind a flag, migrate quiz generation first and prove fallback plus cost rows in staging.
2. Phase 2: Migrate exam plus chat plus Paper3 plus jobs one by one, then remove direct provider imports and enforce OpenRouter only in checks.
   **Rollback**: Flip flag back to direct path, chain code stays idle, no data loss since usage rows are additive.
   **Risks**: Key misconfig routes all traffic to fallback at once, breaker table contention under burst load, price table drift from list prices.

## Rationale

Reasoning and options: see rationale.md.
