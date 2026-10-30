# 0031. Quiz practice inside chat

**Date**: 2026-10-30
**Status**: Proposed

## Summary

Tip runs the whole quiz inside the conversation instead of sending the student away. It asks setup questions with tappable options, renders one question at a time as lettered cards that also accept typed letters, marks each answer as it lands, writes the same attempt rows the quiz page writes, and gives full correction at the end. Runs are untimed in v1 with timed practice an explicit phase 2. Retrieval first throughout: the student answers in their own words before Tip explains, so practice proves learning instead of handing over answers.

## Requirements

**User stories**:
1. As a student, I want to set up a quiz in chat by answering short setup questions so practice starts where I already study.
2. As a student, I want to answer one question at a time in chat with tap or text, see each mark plus the running score, and get full correction at completion.
3. As a student revising with heavy diagrams, I want Tip to tell me when the full quiz page fits better and link it with a reason.

**Acceptance criteria**:
1. **AC-1**: The student says setup a quiz; Tip asks topic and count one at a time with tappable options or typed answers; setup submits with the same shape as page generate.
2. **AC-2**: Questions render one at a time as lettered tappable cards (MCQ) or a text box (open), accepting taps or typed letters, with a progress line plus running score above.
3. **AC-3**: Each answer is marked as it lands with a short why, the student answers before Tip explains, full correction lands at completion, and attempts plus retakes update through the same rows the quiz page writes.
4. **AC-4**: V1 runs untimed only with no clock shown and no cutoff; timed practice is an explicit non goal of v1.
5. **AC-5**: Reloading mid run rebuilds position from the thread history; marked answers stay marked; a restart happens only when the student asks.
6. **AC-6**: An unclear answer gets one reprompt, then Tip reads the best guess; unclear input is never silently skipped and never auto marked wrong.
7. **AC-7**: When a quiz needs the full page (long diagrams, careful review, printing), Tip links the separate UI and says why; every run call checks owner plus note and attempt ownership; foreign ids read as not found.
8. **AC-8**: Generation counts, caps, and debits apply exactly as on the quiz page; chat is another surface, not another rulebook.

## Decision

**Chosen option**: Option 1: scripted runner reusing quiz rows and quiz endpoints

A fixed UI flow drives setup plus questions plus marking plus submit; the model grades and explains but never controls flow. Runs write standard QuizAttempt rows (plus two new nullable columns) through the existing generate, attempts, and retry endpoints.

## Rationale

Reasoning and options: see rationale.md.

## Feature design

**Data model sketch**:
- `QuizAttempt` (existing): add source String optional (page or chat; null on old rows, always set on new rows); add conversationId String optional (link to the chat conversation, nulled when the chat is deleted; never blocks a submit); add clientRunId String optional unique (duplicate submit returns the existing attempt). No new tables; no change to Quiz, QuizQuestion, QuizAttemptAnswer, QuizRetry.
- In progress answers live in chat state until submit; nothing stored mid run in v1.

**State transitions**: none persisted. Run states (setup, answering, marked, complete) live in the chat thread only, carried in message part data (run id, question id, pick, mark).

**API surface**:
| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| existing generate | POST | noteId, count, types (same shape as page) | quiz id, questions | bearer owner | 401 no session, 400 bad input, 402 low balance, 403 limit reached |
| existing attempts submit | POST | quizId, answers array (same shape as page) plus source chat plus conversationId | attempt, score, points | bearer owner | 401 no session, 400 bad input, 404 missing quiz, 422 bad answers |
| existing retry plus submit | POST | as today | as today | bearer owner | as today |

**Value sourcing**:
| Action | Value produced or displayed | Source |
|---|---|---|
| Setup | topic, count | topic resolves to a note id (conversation note by default, else a note picker built from the student notes); count chips 5 and 10, typed answers 1 to 10, default 5, clamped with confirm; types fixed to mixed in v1 |
| Setup | timed flag | always sent as false in v1 generate payloads (explicit, validated); true arrives with phase 2 |
| Setup | quiz plus questions | existing generate endpoint (same counts, caps, debits as page, decided in spec 0028) |
| Answer | picked letter or typed answer | lettered card tap or typed A to D for MCQ (1 to 4 map positionally, case and the word option stripped); text box for open |
| Mark | correct or not plus short why | MCQ positional match after normalization, open through gradeOpenAnswer with the same task, timeout, and cost as the page; student answer always precedes the explanation |
| Unclear | reprompt plus best guess | fixed copy asks for a tap or a letter; best guess stated out loud before scoring; open answers under 2 chars reprompt |
| Run | progress plus running score | line reads Q i of N plus correct count among marked; counts held in thread state |
| Submit | attempt rows plus score | existing attempts endpoint with source chat, conversationId, and client generated run id (duplicate run id returns the existing attempt); quiz taken event gains the chat source |
| Reload | rebuilt position | thread history replay over message parts carrying run id, question id, pick, and mark; marked answers stay marked |
| Handoff | link plus reason | trigger on 2 or more cited visuals or a review or print ask; fixed copy names the reason and links the quiz page |
| Auth | owner check | session user id against note and attempt ownership, same as page routes |
| Money | caps plus debits | PlatformSettings plus credit rows identical to page flow (decided in spec 0028); per answer grading costs what page grading costs; over cap shows the page style plain message |

**Key invariants**:
1. Chat runs write the same rows as page runs; no parallel history.
2. Retrieval first: the student answers before Tip explains, every question.
3. Client disables submit while a submit is pending; the server treats each submitted run independently.
4. Timed runs do not exist in v1; no clock is shown and no cutoff enforced.
5. Loading follows the repo loading rule: skeleton for the first question area, thin progress while grading, plain notice plus retry on failure.
6. Option cards are real buttons; progress uses the existing live region pattern.
7. Source is set by the server, never the client; conversationId is nulled when the chat is deleted.
8. Reprompt copy is fixed; a best guess is always stated out loud before scoring it.
9. Concurrent tabs count as separate runs.

**Security model**:
Owner only throughout. Every run call checks session plus note and attempt ownership exactly like the page routes. No shared threads, no public run reads. No new personal data. Study content the student already owns.

**Configuration required**:
No new env vars, no new providers, no new deps. Two nullable columns via migration (source, conversationId).

**Critical test scenarios**:
- Happy path: setup by tap, answer run with mixed right and wrong, per answer marks, submit writes attempt rows with source chat, full correction plus retakes update, verifies **AC-1**, **AC-2**, **AC-3**.
- Failure case: reload mid run rebuilds from thread with marks intact; unclear answer gets one reprompt then a best guess reading; generation failure shows a plain message plus retry, verifies **AC-5**, **AC-6**.
- Auth and permission: foreign note or attempt id receives not found on every run call, verifies **AC-7**.
- Money: generation debit plus caps behave identically for chat and page runs; over cap attempts refuse the same way, verifies **AC-8**.

## Build plan

Tracer Bullet: a thin thread through setup plus one question plus submit first, then marking depth, then hardening.

1. Migration for `QuizAttempt.source` plus `conversationId` (both nullable, no backfill), satisfies **AC-3**.
2. Chat setup flow (setup questions through reused reply chips, generate input shape as page, no timed option in v1), satisfies **AC-1**, **AC-4**, **AC-8**.
3. Question runner card (lettered tappable cards accepting typed letters, text box for open, progress plus running score) with rebuild from thread on reload, satisfies **AC-2**, **AC-5**.
4. Answer submit plus per answer mark plus end correction plus attempts and retakes write (existing endpoints, same shapes), with one reprompt on unclear input, satisfies **AC-3**, **AC-6**.
5. Handoff rule plus owner checks plus caps parity wiring (source chat passed through, conversation id stored, quiz taken event with chat source), satisfies **AC-7**, **AC-8**.
6. Tests for happy path plus reload rebuild plus reprompt plus foreign 404 plus caps parity, satisfies all ACs.

## Consequences

**Positive**:
- Practice starts where study happens; no context switch to begin a drill.
- One history everywhere: chat runs count like page runs for stats, streaks, and retakes.
- Least new code: no new tables, no new endpoints, same validation and tests as the page.

**Negative or tradeoffs**:
- Reload rebuild depends on thread history; a cleared thread loses the unsubmitted run.
- Scripted flow cannot improvise like an agentic loop; odd requests fall back to open tutoring.
- Chat runs share page caps, so heavy chat practice spends the same budget.
- Per answer grading means one model call per answer.

**Neutral**:
- Timed practice waits for phase 2; untimed v1 carries no clock code to remove later.
- Row 56 scope Done when still names timed practice; recommend a scope pass to mark timed as phase 2 so scope and spec agree.

## Follow-up

- [ ] Timed practice in chat after the hackathon (server clock decides, client countdown, late answers score late).
- [ ] Server held run state for true resume if rebuild from thread proves lossy.
