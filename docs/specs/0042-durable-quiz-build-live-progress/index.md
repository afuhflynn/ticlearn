# 0042. Durable quiz build with live progress

**Date**: 2026-11-02
**Status**: Accepted

## Summary

Long quiz builds now run in background jobs that survive slow models. The student sees true stage names plus a real bar plus a live count in the thread and on the quiz page. A cutoff retries smaller on its own so practice never ends dead.

## Requirements

**User stories**:

* As a student, I want to see live progress for a long quiz build so that I know it is working.
* As a student, I want a cutoff to recover on its own so that I get a full set without asking again.
* As a student, I want a failed build to offer clear next steps so that practice never ends dead.

**Acceptance criteria**:

* **AC-1**: A 40 question note build shows QUEUED then GENERATING with done of total plus percent on both the chat card and the quiz page, first paint inside 5 seconds, polling every 3 seconds until READY or ERROR or 10 minutes.
* **AC-2**: A batch cutoff retries once with a smaller count then continues remaining batches with no student action. Cutoff means isCutoffMessage is true or a batch returns fewer than asked after a length error. Smaller means half of ask rounded down with a floor of 5. When ask is 5 or less there is no smaller retry and the run fails with exits.
* **AC-3**: A finished build flips status to READY, persists all questions in order, and both surfaces refresh to the runner with no manual reload.
* **AC-4**: Only the owner may read build progress, a foreign id reads as not found.
* **AC-5**: A build past its 10 minute budget flips to failed by a sweeper that runs every 5 minutes and the card offers retry smaller plus a full page link. A late batch that lands after ERROR is ignored and never flips ERROR back to READY.
* **AC-6**: Credit cost is reserved at create with referenceId quiz id, refunded once on terminal fail by the job owner, and retries never double charge. Cost keys are creditCostQuizGeneration and creditCostGroundedQuestion with getEffectiveCreditCost for the plan multiplier.
* **AC-7**: The progress card shows a thin bar plus stage name plus done of total, respects reduced motion, and uses no spinner.
* **AC-8**: Page entry caps at 40 and chat note entry caps at 10, each rejects above its max with a plain message. The chat tool path shares the 10 cap so caps stay in parity.

## Decision

**Chosen option**: Option 1: Columns on Quiz plus poll the detail row

All note linked builds use one durable path with true stages and polled progress.

## Feature design

**Data model sketch**:

* Quiz gains buildStage as text nullable with values QUEUED plus GENERATING plus SAVING, builtCount as int default 0, buildTotal as int default 0, buildError as text nullable, buildStartedAt as timestamptz nullable.
* Status stays GENERATING during the build, READY on success, ERROR on terminal fail.
* QuizQuestion stays unchanged, rows append in order as batches land.
* Relationships stay as today. Quiz belongs to User and optionally to Note. Owner id is the tenant key.

**State transitions**:

GENERATING with QUEUED then GENERATING with counts then SAVING then READY. SAVING shows as Saving your quiz with the final count. Any terminal fail moves to ERROR with buildError set. Copy for a cutoff fail reads That set came out too long so it stopped short. Copy for a generic fail reads Quiz build failed. A stale GENERATING past 10 minutes moves to ERROR by the sweeper. Late writes after ERROR are dropped by a status guard.

**Poll contract**:

Poll the quiz detail every 3 seconds only while status is GENERATING. Stop on READY or ERROR or 10 minutes. When buildTotal is 0 show 0 percent with no divide. Elapsed note reads Building for N seconds and appears after 10 seconds.

**Batch and retry**:

Batch size is 15 and batches run in order, one after the other. Retry reuses the same quiz id and the same reserve, it never creates a new quiz row and never takes a new reserve. Partial rows from a cut batch are kept, the smaller retry fills the gap up to the batch target so rows never duplicate.

**API surface**:

| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| /api/quizzes/generate | POST | noteId, questionCount max 40, questionTypes | quiz id, status GENERATING, buildTotal | session owner | 401, 400 note not ready, 403 limit, 402 credits |
| /api/quizzes/wizard-generate | POST | topicText, noteId optional, count max 10 in chat path | quiz id plus GENERATING for note path, READY for text only path | session owner | 401, 404 note not found, 403 limit, 402 credits |
| /api/quizzes/[id] | GET | id in path | quiz plus buildStage plus builtCount plus buildTotal plus status | session owner | 401, 404 not found or foreign |
| chat startQuiz tool | tool | noteId or topicText, count max 10 | wizard card plus progress card | session owner | limit reached, note not ready |

**Value sourcing**:

| Action | Value produced or displayed | Source |
|---|---|---|
| Create build | buildTotal | resolved questionCount capped at 40 from request input |
| Batch land | builtCount | sum of persisted questions for quiz id, written by job |
| Progress card | stage name | Quiz.buildStage column |
| Progress card | percent | derived from builtCount divided by buildTotal, rounded down in client |
| Progress card | elapsed note | derived from buildStartedAt column plus client clock |
| Ready refresh | question list | QuizQuestion rows ordered by order for quiz id |
| Fail card | retry smaller count | derived from smallerRetryCount helper applied to buildTotal, half rounded down floor 5 |
| Fail card | full page link | quiz id plus /quizzes/[id] path |
| Debit | reserve amount | quizCost from platform settings plus plan multiplier at create |
| Refund | refund amount | same reserve row keyed by referenceId quiz id, owner is the generate job, sweeper never refunds twice |

**Key invariants**:

* buildTotal is set once at create and never grows mid build.
* builtCount never exceeds buildTotal. Readers reconcile as the smaller of builtCount and the actual persisted question count.
* Status READY implies persisted question count equals builtCount and is greater than zero.
* Credit movement keys on referenceId quiz id, so job retries are idempotent. Refund runs once.
* Late batch writes check status first and drop when status is ERROR or READY.
* A foreign user id never learns whether a quiz id exists.

**Security model**:

Owner only for create, read, and poll. Session check at the top of each route with 401 when missing. Note lookup scopes by user id. Quiz read scopes by user id so foreign reads return 404. No new public surface. Admin gets no special read in this slice.

**Configuration required**:

No new env vars. Tunables live in platform settings as today. Time budget is 10 minutes and sweeper cadence is 5 minutes, both beside the existing quiz cost settings.

**Critical test scenarios**:

* Happy path: create a 40 question build from a note, see QUEUED then counts climb on card and page, land on READY with 40 ordered questions, verifies **AC-1**, **AC-3**.
* Failure case: force a batch cutoff, see one smaller retry then completion with no student tap, verifies **AC-2**.
* Auth and permission: poll a foreign quiz id as another user, receive 404 with no counts leaked, verifies **AC-4**.

## Build plan

1. Add Quiz columns plus index for stale sweep and extend quiz detail read, satisfies **AC-1**, **AC-4**.
2. Thin thread: create plus one batch plus progress write plus card poll every 3 seconds plus page poll for a small note build, satisfies **AC-1**, **AC-3**, **AC-7**.
3. Batch loop of 15 in order with per batch progress writes plus SAVING plus READY ordering for 40, satisfies **AC-1**, **AC-3**.
4. Cutoff detect with isCutoffMessage plus one smaller retry per batch then continue with status guard against late writes, satisfies **AC-2**.
5. Reserve at create plus once only refund on terminal fail keyed by quiz id, satisfies **AC-6**.
6. Stale sweeper every 5 minutes for 10 minute budget plus fail card with retry smaller plus /quizzes/[id] link, satisfies **AC-5**.
7. Cap at 40 on page path and 10 on chat paths with plain errors plus caps parity tests, satisfies **AC-8**.
8. Card polish to the loading rule plus reduced motion plus empty and error states, satisfies **AC-7**.

## Consequences

**Positive**:

* Long builds feel alive in seconds on both surfaces.
* Cutoffs heal without student action.
* No dead GENERATING rows left behind.

**Negative and tradeoffs**:

* Polling adds read load during builds.
* Reserve plus refund adds ledger writes even for failed builds.
* 40 cap refuses larger asks that the old 100 limit once accepted.

**Neutral**:

* One migration adds nullable columns, old rows read as zero progress until rebuilt.

## Follow-up

* [ ] Reconcile the three plan limit copies noted in app/api/AGENTS.md before build, so the 40 cap and quiz counts read one truth.
* [ ] Consider a push channel later only if poll load or lag proves painful in production.

## Migration plan

**Strategy**: strangler
**Phases**:

1. Add nullable columns with defaults, deploy readers that tolerate nulls.
2. Cut writers to the new path, backfill old GENERATING rows to failed with exits.

**Rollback**: revert the writer commit, columns stay nullable and harmless.
**Risks**: old GENERATING rows poll forever until backfilled, so the backfill ships with phase 1.
