# 0035. Marking plus mark scheme plus results plus save

**Date**: 2026-10-31
**Status**: In Progress

## Summary

Tip now marks each chat answer the moment it lands and shows where each mark comes from in plain words. The run ends on a results screen with percent plus counts plus per question review plus Start over, and the run saves to the same attempt rows the quiz page writes so progress counts. You build this on the runner plus wizard you already ship, with no new provider and no new table.

## Requirements

**User stories**:
1. As a student, I want each answer marked at once with the mark scheme so I see where each mark comes from.
1. As a student, I want a results screen with percent plus review plus Start over so I can judge the run and try again.
1. As a student, I want the run saved to attempts so chat practice counts like page practice.

**Acceptance criteria**:
1. **AC-1**: Each choice answer marks at once with correct plus incorrect styling plus the full scheme for that question, with one line per mark plus common lost mark plus examiner note where present.
1. **AC-2**: Each short typed answer marks through the grade route with the same scheme shape as choice, with one reprompt on unclear input then a best guess read aloud before scoring.
1. **AC-3**: A running line during the run reads question i of N plus correct count among marked, and it updates on every mark without a page reload.
1. **AC-4**: The docked card keeps dots plus Back plus Next plus Show hint, taps answer at once, Back keeps picks and marks, reload rebuilds the same spot with marks kept.
1. **AC-5**: The end screen shows percent plus correct count plus total questions plus per question review with you answered plus correct answer was plus scheme, plus Start over plus weak area follow up.
1. **AC-6**: Start over clears marks in place and restarts the same questions with no new generate cost and a fresh client run id.
1. **AC-7**: The run writes one attempt with all answers once at View results, with source chat plus conversation id plus client run id, and a repeated client run id returns the existing attempt with duplicate true.
1. **AC-8**: Total marks show as estimate in setup and as actual sum at results, where actual equals the sum of per question marks stored on the questions.
1. **AC-9**: After results Tip offers a harder choice set on weak areas plus an open typed set for marking, each as a tappable offer that starts a new run on accept.
1. **AC-10**: Generation or marking failure retries once with a smaller count then links the full quiz page with a reason, and never leaves a dead card with no retry.
1. **AC-11**: Owner only throughout, foreign quiz or note or attempt ids read as not found, no shared reads and no public results link in v1.
1. **AC-12**: Quiz only in v1 with no flashcards toggle, and no clock shown with no cutoff, matching the untimed rule you already ship.

## Decision

**Chosen option**: Option 1: Fix in place

You extend what you ship. Add marks plus scheme to the question, copy it to the attempt answer at submit, extend the grade reply to carry the scheme, render instant marking plus a results screen in the docked runner, and save once at finish through the attempts route you already own.

See `rationale.md` for the context plus options plus rationale behind this choice.

## Feature design

**Data model sketch**:
1. `QuizQuestion` gets `marks Int` required with default 1 (total marks this question can earn) and `markSchemeMd String Text` nullable (one line per mark in plain words) and `examinerNote String Text` nullable (short teacher note plus common lost mark).
1. `QuizAttemptAnswer` gets `marksEarned Int` required with default 0 plus `marksTotal Int` required with default 1 plus `markSchemeMd String Text` nullable (copy of the scheme shown at mark time, so history outlives question edits).
1. `QuizAttempt` keeps `score Float` plus `totalQuestions` plus `correctAnswers`, and adds `totalMarks Int` with default 0 plus `marksEarned Int` with default 0 for the percent math in results.
1. `QuizSnapshot` moves to version 4. `QuizMark` grows to hold `marksEarned` plus `marksTotal` plus `schemeMd` plus `examinerNote` beside `isCorrect` plus `why`, so reload plus dots plus review replay without a new model call.

**State transitions**:
1. answering to marked on tap or grade reply, snapshot writes on every mark and every index move.
1. marked to complete on last Next or View results, submit writes attempt once.
1. complete to answering on Start over with same quiz id plus cleared answers plus new client run id, snapshot cleared then reseeded.
1. collapsed or minimized keeps marks, any reply resumes, close or new run clears keys.

**API surface**:
| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| /api/quizzes/grade | POST | questionId, question, type MCQ or OPEN, userAnswer, correctAnswer | questionId, isCorrect, why, marksEarned, marksTotal, schemeMd, examinerNote | bearer owner | 401 no session, 400 bad input, 404 foreign question |
| /api/quizzes/wizard-generate | POST | topicText, noteId optional, levelChoice, count, difficulty | quizId, questions with marks plus scheme, totalMarks | bearer owner | 401 no session, 400 bad input, 402 low balance, 403 limit reached |
| /api/quizzes/attempts | POST | quizId, answers array with userAnswer plus marksEarned, source hint chat, conversationId, clientRunId | attempt with score plus marks, duplicate true on repeat run id | bearer owner | 401 no session, 400 bad input, 404 missing quiz, 422 bad answers |
| /api/quizzes/generate/from-weak-areas | POST | attemptId or topic plus weak concepts | quizId, questions | bearer owner | 401 no session, 404 foreign attempt, 402 low balance |

**Value sourcing**:
| Action | Value produced or displayed | Source |
|---|---|---|
| Setup | count plus difficulty plus total estimate | wizard presets, standard equals count times two, hard equals count times two plus five, server computes final total from question marks |
| Generate | questions with marks plus scheme plus examiner note | wizard endpoint output, validated with zod then existing generate logic, null note id allowed with studied without a linked note notice |
| Mark choice | correct or not plus scheme | positional match after normalization, scheme read from question row |
| Mark typed | correct or not plus scheme plus why | gradeOpenAnswer through the grading task with no cache, student answer always precedes the explanation |
| Running line | question i of N plus correct among marked | thread state plus snapshot marks |
| Results percent | marksEarned sum divided by marksTotal sum times one hundred | attempt row sums, rounded to whole percent for display |
| Per question review | you answered plus correct answer was plus scheme | attempt answer rows with scheme copy |
| Start over | same quiz id with cleared marks | runner state plus new client run id, no generate call |
| Weak area offers | harder set plus open typed set | weak concepts are the top 2 missed concepts from wrong answers, harder set through weak areas endpoint and open set through wizard generate with OPEN types, each offer persists as a chip until accepted or dismissed, cost equals page generate |
| Save | attempt plus answers plus points | attempts endpoint with source chat, conversation id stored and nulled when the chat is deleted, client run id unique, score Float holds marks percent as a number, close before View results writes nothing |
| Reload | same step plus marks kept | active pointer plus snapshot version 4 replay, version mismatch drops with plain message plus retry |

**Key invariants**:
1. Retrieval first, the student answers before Tip explains on every question.
1. Chat runs write the same rows as page runs, no parallel history.
1. One submit per run id, repeat run id returns duplicate true with no new row and no extra points, guarded by the unique column in the database so a double tap cannot double write.
1. Choice marking is full or zero in v1 with no partial marks, typed marking caps earned at total so a model reply can never exceed the max.
1. Timed runs do not exist in v1, no clock shown and no cutoff enforced.
1. Loading follows the repo loading rule, skeleton for first card area, thin bar while grading, plain notice plus retry on failure.
1. Quiz only in v1, no flashcards toggle and no shared link.
1. Setup total reads about X marks as an estimate only, results use the server sum of per question marks, percent is by marks and rounded to a whole number.
1. Unclear typed input under 2 chars gets one fixed reprompt then a best guess scored, choice uses trimmed case sensitive match against the stored letter in v1.
1. Start over keeps question order with cleared marks and a fresh run id, close before View results keeps nothing server side and shows a plain notice that the run was lost.

**Security model**:
Owner only throughout. Every run call checks session plus note plus quiz plus attempt ownership exactly like the page routes. Foreign ids read as not found. No new personal data. No new secrets. Study content the student already owns.

**Configuration required**:
No new env vars. No new providers. No new deps. Migration adds nullable plus defaulted columns only.

**Critical test scenarios**:
1. Happy path: wizard to runner, answer mix of right and wrong, instant scheme plus running score, View results shows percent plus review, submit writes attempt with source chat, verifies **AC-1**, **AC-3**, **AC-5**, **AC-7**.
1. Typed path plus reprompt: short typed answer marks through grade route, unclear input gets one reprompt then best guess scored, verifies **AC-2**.
1. Reload plus Start over: reload rebuilds same index with marks kept, Start over restarts same quiz with fresh run id and no generate cost, verifies **AC-4**, **AC-6**.
1. Failure plus money: length cutoff retries smaller then hands to quiz page with reason, over cap refuses like the page, verifies **AC-10**.
1. Auth: foreign quiz or note reads as not found on every run call, verifies **AC-11**.

## Build plan

Tracer Bullet, thin thread through every layer first, then marking depth, then results plus save hardening.

1. Migration for question marks plus scheme plus examiner note and attempt marks plus totals plus scheme copy, with defaults so old rows stay valid, satisfies **AC-1**, **AC-8**.
1. Extend wizard generate to produce marks plus scheme per question and totalMarks as the sum, with null note allowed, satisfies **AC-8**.
1. Extend grade reply to return marksEarned plus marksTotal plus schemeMd plus examinerNote for choice and typed, with no cache on grading, satisfies **AC-1**, **AC-2**.
1. Runner instant marking with correct plus incorrect styling plus scheme plus running line plus dots plus Back plus Next plus Show hint, with snapshot version 4 writes on mark and move, satisfies **AC-1**, **AC-2**, **AC-3**, **AC-4**.
1. Results screen with percent plus counts plus per question review plus scheme plus Start over same quiz with fresh run id, satisfies **AC-5**, **AC-6**.
1. One submit at finish through attempts with source chat plus conversation id plus client run id plus duplicate true on repeat, plus weak area offers for harder set and open typed set, satisfies **AC-7**, **AC-9**.
1. Retry smaller then handoff plus owner checks plus caps parity plus reload rebuild plus tests for happy path plus reprompt plus foreign 404, satisfies **AC-10**, **AC-11**, **AC-12**.

## Consequences

**Positive**:
1. Practice reads like a marked paper, each mark earned is visible.
1. One history everywhere, chat runs count for stats plus retakes plus weak area follow up.
1. Least new surface, no new table and no new auth model.

**Negative or tradeoffs**:
1. Per answer grading costs one model call per typed answer, heavy runs spend budget faster.
1. Old attempts lack scheme copy, so past review stays thin until new runs land.
1. Snapshot stays in session storage on one device, a cleared snapshot loses the unsubmitted run.

**Neutral**:
1. Total marks math changes from points to marks sums, stats readers must use the new totals.
1. Flashcards stay out of v1 by choice, add later without touching the mark shape.

## Migration plan

**Strategy**: no migration needed beyond additive columns
**Phases**:
1. Add nullable plus defaulted columns to question plus attempt plus answer, deploy code that writes both old and new fields.
1. Backfill old questions with marks 1 and empty scheme text where null, backfill old attempts with totals from points for display only.
**Rollback**: revert to prior commit, new columns stay unused with no read break.
**Risks**: snapshot version 4 mismatch on old tabs, mitigated by version check that drops with plain message plus retry and clears keys.

## Follow-up

1. [ ] Consider server held run state if browser snapshot loss proves painful in logs.
1. [ ] Add flashcards toggle later once marking plus results prove out, reusing the same scheme copy.
1. [ ] Add open typed set cost guard so the follow up offer respects the same caps as the page.
1. [ ] Revisit past attempt review once new scheme copies dominate history, to decide if backfill copy is worth it.
