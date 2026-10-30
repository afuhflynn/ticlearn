# 0029. Targeted retry and progress update

**Date**: 2026-10-30
**Status**: In Progress

## Summary

A miss on the quiz review page now teaches. The student sees a short explanation of the misconception with page proof, answers one fresh question on the same idea, and watches the quiz record update its weak area. This uses Muse Spark reasoning with OpenRouter as fallback, stays free in prototype, and keeps all reads owner only.

## Requirements

**User stories**:
1. As a student, I want a miss to explain my error with page proof so I can revise the right page.
2. As a student, I want one fresh question on the same idea so I can prove I understood.
3. As a student, I want my retry result saved and my weak area updated so review reflects progress.

**Acceptance criteria**:
1. **AC-1**: On the attempt review page, each wrong answer shows a misconception explanation with concept name plus source pages plus a snapshot excerpt when pages exist, and excerpt only when page data is missing. The excerpt is a snapshot stored with the retry.
2. **AC-2**: Each wrong answer offers one fresh generated question on the same concept, with four choices labeled A to D and a known correct answer stored as option text.
3. **AC-3**: Submitting the retry answer saves the retry result linked to the original answer row, marks the retry completed or failed, and writes the weak concept plus source pages into the quiz metadata record under the key weakAreas.
4. **AC-4**: Only the owner can create, read, or submit a retry. A foreign id receives not found and sees no data.
5. **AC-5**: If Muse Spark fails within 8 seconds per leg, the call falls through to the OpenRouter chain within a 15 second total create budget. If both fail, the retry is marked failed and the review page shows a plain retry control. Review never blocks.
6. **AC-6**: Retry generation and scoring create no debit in prototype, with a cap of 3 creates per answer per day. Each generation still writes a usage log row with model name, pages used, and latency.

## Decision

**Chosen option**: Option 1: new retry table plus inline two routes

The review page creates a retry from an answer row and submits the answer through a second route, with generation inline and bounded timeouts.

## Feature design

**Data model sketch**:

1. `QuizRetry` (new). Fields: `id` String required primary key, `userId` String required owner, `attemptId` String required, `answerId` String required, `quizId` String required, `questionId` String optional, `concept` String required short name max 80 chars, `sourcePages` Int list default empty validated as subset of the question sourcePages plus note page numbers, `sourceExcerpt` Text optional snapshot max 6000 chars, `feedbackMd` Text optional markdown max 2000 chars that explains without revealing the retry key, `retryQuestion` Text required once generated, `retryOptions` String list required once generated exactly four entries, `retryCorrectAnswer` Text required once generated stored as option text, `status` String required pending then completed or failed, `isCorrect` Boolean optional set on submit, `userAnswer` Text optional set on submit as option text, `model` String required which model produced it, `latencyMs` Int optional measured from generation start to generation end, `createdAt` timestamp required, `completedAt` timestamp optional.
2. Relations: user has many retries, attempt has many retries, answer starts a retry chain, quiz has many retries. Every read filters by `userId` plus the parent owner check through attempt. Input path is answerId then QuizAttemptAnswer then QuizAttempt then Quiz then Note. Excerpt source is Note extracted text truncated to 6000 chars. Page join is Page filtered by noteId ordered by pageNumber joined to VisualAnalysis completed only.
3. Unique: one active pending retry per answer row enforced in app code with 409 on conflict, so concurrent creates receive 409. Failed rows allow a fresh create up to the daily cap. Pending expires after 10 minutes and reads as failed with a fresh create allowed. Completed rows block a new create.
4. `Quiz.metadata` (existing Json): gains weakAreas list under the key weakAreas. Each entry holds concept plus sourcePages plus retryId plus isCorrect plus updatedAt. Merge replaces the entry for the same concept and preserves other keys. A correct retry keeps the entry with isCorrect true and a fresh updatedAt, so progress stays visible.
5. `QuizAttempt`, `QuizAttemptAnswer`, `QuizQuestion`, `UserStats` (existing): read only, no changes.

**State transitions**:

Pending then completed on scored submit. Pending then failed on generation failure after fallback or on submit error. Completed and failed are terminal. A failed retry allows one fresh create from the same answer row.

**API surface**:

| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| /api/retries | POST | answerId String required, rejects correct rows and rows outside a completed attempt | retry id, status pending, concept, sourcePages, sourceExcerpt, feedbackMd, retryQuestion, retryOptions, correct answer withheld | bearer owner | 401 no session, 400 bad answerId, 404 answer missing or foreign, 409 active retry exists, 429 daily cap reached |
| /api/retries/[id]/submit | POST | userAnswer String required as option text, empty rejected | isCorrect, correctAnswer revealed, updated weakAreas | bearer owner | 401 no session, 400 bad userAnswer, 404 retry missing or foreign, 409 already completed |
| /api/retries?answerId= | GET | answerId String required query | latest retry row plus status, correct answer withheld until completed, excerpt included | bearer owner | 401 no session, 400 bad answerId, 404 answer missing or foreign |

**Value sourcing**:

| Action | Value produced or displayed | Source |
|---|---|---|
| Create retry | concept name | model output constrained to pages in input, stored in QuizRetry.concept |
| Create retry | sourcePages shown as page tags | QuizQuestion.sourcePages plus VisualAnalysis page numbers joined through Page filtered by noteId, fallback empty |
| Create retry | feedbackMd explanation | model output grounded in note excerpt plus page descriptions, stored in QuizRetry.feedbackMd |
| Create retry | retryQuestion plus options plus correct answer | model output fixed JSON, stored in QuizRetry retry fields |
| Create retry | status pending returned at once | server default on insert, expired after 10 minutes |
| Create retry | sourceExcerpt snapshot shown in review | Note extracted text truncated to 6000 chars stored in QuizRetry.sourceExcerpt |
| Submit retry | isCorrect | trimmed case free compare of userAnswer input to QuizRetry.retryCorrectAnswer, empty input rejected with 400 |
| Submit retry | updated weakAreas in review | Quiz.metadata weakAreas list merged by concept from QuizRetry concept plus sourcePages plus isCorrect, written in the same transaction as the retry submit |
| Display review | explanation plus pages plus excerpt plus retry question | QuizRetry row columns read by owner, correct answer withheld until completed, pending shows waiting, failed shows plain create control, closed browser resumes through GET |
| Usage proof | model plus pages used plus latency | one usage log row per create through lib/ai/usage.ts with final model name, count of pages used, latencyMs, failed total logged as failed |
| Block foreign access | 404 | session user id compared to QuizAttempt.userId resolved through answerId, foreign ids read as missing |

**Key invariants**:

1. One active pending retry per answer row. A second create while pending returns 409. Daily cap is 3 creates per answer.
2. Every retry read and write filters by owner through the attempt. Foreign ids return 404.
3. sourcePages are snapshots validated against the question plus note pages. Rescans never mutate old retries.
4. Completed never reopens. Failed allows a fresh create within the cap. Expired pending reads as failed.
5. Prototype writes no debit row for retry. Usage log still records the call with final model plus latency.
6. Correct answer stays withheld until completed. Feedback never reveals the retry key.
7. Submit writes the retry row and the metadata weakAreas list in one transaction.

**Security model**:

Owner only throughout. Create resolves the answer then the attempt, both filtered by caller id, so a forged id yields not found. Read and submit filter retry by caller id. No cross user reads. Invalid model JSON counts as generation failure and marks the retry failed. No new regulated data. Study notes the student already owns.

**Configuration required**:

No new env vars. Muse and Baseten keys already exist. OpenRouter fallback uses the existing chain. New prompt file `prompts/retry/explain_and_retry.md` holds the explanation plus fresh question contract. New registry task `retry_explain` routes to Muse with no cache and OpenRouter fallback, 8 seconds per Muse leg inside the 15 second create budget.

**Critical test scenarios**:

1. Happy path: wrong answer with pages creates retry, shows explanation plus excerpt plus question, submit correct updates weakAreas, verifies **AC-1**, **AC-2**, **AC-3**.
2. Failure case: Muse plus OpenRouter both fail or output invalid JSON, retry marked failed, review shows plain retry control, verifies **AC-5**.
3. Auth and permission: caller requests a foreign answer id, receives not found and no data leaks, verifies **AC-4**.
4. Money: balance low still creates retry with no debit while usage log records the call, fourth create in a day receives 429, verifies **AC-6**.

## Build plan

Tracer Bullet: thin thread first through every layer, then thicken display and edge handling.

1. Add QuizRetry model plus migration plus weakAreas shape doc plus excerpt snapshot, satisfies **AC-3**, **AC-4**.
2. Add `prompts/retry/explain_and_retry.md` plus generation helper with Muse first then OpenRouter fallback plus 8 second legs inside 15 seconds plus invalid output as failure, satisfies **AC-1**, **AC-2**, **AC-5**.
3. Build POST /api/retries with owner checks plus eligibility plus 409 on active retry plus 429 cap plus usage log, satisfies **AC-1**, **AC-2**, **AC-4**, **AC-6**.
4. Build POST /api/retries/[id]/submit with trimmed scoring plus one transaction for retry plus metadata, satisfies **AC-3**, **AC-4**.
5. Build GET read for the review page with owner checks plus redaction plus resume, satisfies **AC-1**, **AC-4**.
6. Build review panel UI showing explanation plus pages plus excerpt plus one question plus weakAreas update plus pending and failed states, satisfies **AC-1**, **AC-2**, **AC-3**.
7. Add tests for happy path plus fallback failure plus foreign access as 404 plus cap plus no debit, satisfies all ACs.

## Consequences

**Positive**:
1. Misses become teachable moments with page proof, which is the demo story.
2. Narrow table plus two routes reuse quiz patterns the team already operates.
3. Free in prototype removes balance friction during evaluation.

**Negative or tradeoffs**:
1. Inline generation can hold requests open, so slow models need timeout tuning.
2. Quiz metadata is a flexible store, so weak area shape needs discipline to stay queryable.
3. One question per miss proves less than a set, accepted for prototype speed.

**Neutral**:
1. No new providers and no new env vars.
2. Concept mastery stays future work. Metadata carries the signal until a dedicated table earns its keep.

## Follow-up

1. Link this spec from the scope row for feature 52 and mark the design step done.
2. Add concept mastery table later if metadata queries grow painful.
3. Price retries later with a tunable when prototype ends.
4. Confirm demo path uses upload then grounded quiz then miss then retry then metadata update.
