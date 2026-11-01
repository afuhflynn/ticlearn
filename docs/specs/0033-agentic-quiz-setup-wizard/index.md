# 0033. Agentic quiz setup wizard

**Date**: 2026-10-31
**Status**: In Progress

## Summary

Tip opens a three step wizard inside chat when you ask for a quiz. You pick topic, then level plus format, then count plus difficulty, by tap or by typing. Picks live in the browser snapshot until generation, so reload resumes and the thread never waits on a tap that never lands.

> Decision record (context, options, rationale) lives in `rationale.md`. Verify steps live in `verify.md`.

## Requirements

**User stories**:
- As a student, I want to set up a quiz in chat by answering three short steps so practice starts where I already study.
- As a student, I want to tap or type at each step and move back and forward freely so I never feel stuck.
- As a student, I want my topic to link to my notes and my level to shape the questions so the quiz fits my exam.

**Acceptance criteria**:
- **AC-1**: The student says setup a quiz or asks for practice; Tip opens the wizard at step 1 with numbered tappable options plus an inline Other box plus an Or reply directly line plus Skip.
- **AC-2**: Step 1 shows topic picks built from the student's notes and onboarding programs; each pick resolves to a note id at pick time; free text searches notes and falls back to no note with a clear notice.
- **AC-3**: Step 2 shows level plus format for Cameroon schools: GCE A Level, HND plus university, professional plus certification, plus Mixed.
- **AC-4**: Step 3 shows count plus difficulty with total marks: 5 standard around 20 marks, 5 hard around 25 marks, 10 standard around 40 marks, 10 mixed difficulty.
- **AC-5**: Next moves forward, Back returns with picks kept, Skip jumps forward with a smart default; the pager reads 1 of 3 to 3 of 3; skipped topic uses the conversation note, skipped level uses Mixed, skipped count uses 5 standard.
- **AC-6**: Typing in the inline Other box or in the composer moves the same step forward, identical to a tap.
- **AC-7**: The X control collapses the card to a small resumable line; the thread stays live; any reply resumes; no browser prompt appears at any point and the run never stalls waiting for a tap.
- **AC-8**: The ready step submits topic text plus note id plus level plus format plus count plus difficulty to generation; auth is bearer owner only; counts, caps, and debits match the quiz page exactly.
- **AC-9**: Generation failure retries once with a smaller count then links the full quiz page with a reason; no dead card is ever shown.

## Decision

**Chosen option**: Option 2: Strangler card beside chips

A new docked wizard card drives setup through a fixed UI state machine (a plain object in chat state that owns the current step and the picks). The model proposes topic cards and generates the final quiz but never controls flow, with one hybrid allowance: clear intent like give me 10 hard HND questions may prefill steps for confirm.

## Feature design

**Data model sketch**:
- `QuizSnapshot` (existing browser object in `lib/chat/quiz-snapshot.ts`, extended, no DB change): version number required; quizId string optional until generated; topicText string optional; noteId string optional (owner note, null when no match); levelChoice string optional (one of GCE, HND, PROF, MIXED); formatChoice string optional; count number optional (5 or 10); difficulty string optional (STANDARD, HARD, MIXED); totalMarks number optional; stepIndex number required (1 to 3); wizardDone boolean required; clientRunId string required; updatedAt timestamp required.
- No new tables. No change to Quiz, QuizQuestion, QuizAttempt, QuizRetry. Active pointer `ticlearn:quiz:active:<conversationId>` maps one conversation to its run id, unchanged.

**State transitions**:
- wizard step 1 to step 2 to step 3 to ready to generating to runner. Back moves to prior step with picks kept. Skip marks the step defaulted and moves forward. X moves to collapsed with picks kept. Submit moves to generating. New run clears keys. Reload replays active pointer plus snapshot to the same stepIndex.

**API surface**:
| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| /api/quizzes/wizard-generate | POST | topicText, noteId optional, levelChoice, formatChoice, count, difficulty | quizId, questions, totalMarks | bearer owner | 401 no session, 400 bad input, 404 foreign note, 402 low balance, 403 limit reached |
| /api/quizzes/generate | POST | reused inside wizard endpoint after validation | quizId, questions | bearer owner | same as page |

**Value sourcing**:
| Action | Value produced or displayed | Source |
|---|---|---|
| Step 1 list | topic cards with subtitles, ordered by recent notes first, capped at four | conversation note plus student notes search plus onboarding programs, proposed by model, resolved to noteId at pick time; subtitle from note title; empty state links upload |
| Step 1 fallback | notice when no note matches | fixed copy: studied without a linked note; topic stays as text only |
| Step 2 list | four combined level plus format cards | fixed list decided in this spec (GCE, HND, PROF, MIXED); format follows level; Mixed implies mixed format |
| Step 3 list | count plus difficulty plus marks | fixed presets decided in this spec; preview is an estimate: standard equals count times two, hard equals count times two plus five, mixed uses standard math; 10 mixed reads around 45 marks; server computes final total |
| Pager | 1 of 3 to 3 of 3 | stepIndex from snapshot |
| Defaults on Skip | topic, level, count | conversation noteId, else text only mode with notice; MIXED level; 5 STANDARD count; Next with no pick shows fixed copy: pick or type to continue |
| Typing path | step advance from text | composer text while the wizard is open belongs to the wizard; Or reply directly focuses the composer; prefilled intent like give me 10 hard HND questions shows a confirm screen with Change options |
| Collapsed state | paused line plus resume | fixed copy: Quiz setup paused plus Resume; any wizard related reply resumes; a fresh quiz ask starts a new run; reload during generating shows the generating state |
| Generate | quizId plus questions plus marks | wizard endpoint output, which validates with zod then calls existing generate logic; null noteId allowed; cost equals page generate; debit once per client run id |
| Caps | allow or refuse with message | PlatformSettings plus credit rows identical to page flow; error strings reuse page strings for 400, 402, 403 |

**Key invariants**:
1. Chat wizard writes the same quiz rows as the page; no parallel history.
2. Picks stay in snapshot until submit; nothing reaches the DB mid wizard.
3. Topic resolve runs on the server at pick time by notes search; best match wins, tie goes to most recent; deleted note falls back to text only.
4. Retrieval first still holds: the student answers before Tip explains once the runner starts.
4. Timed runs do not exist; no clock is shown.
5. Loading follows the repo loading rule: skeleton for the first card area, thin bar while generating, plain notice plus retry on failure.
6. Snapshot version mismatch drops with a plain message plus retry and clears keys.

**Security model**:
Owner only throughout. Every wizard call checks session plus note ownership exactly like page routes. Foreign note ids read as not found. No new personal data. No new secrets.

**Configuration required**:
- `TICLEARN_WIZARD_STRANGLER`: on routes quiz intent like quiz me plus setup a quiz to the wizard card, off keeps chips; log wizard open plus submit for cutover proof. No new providers, no new deps.

**Critical test scenarios**:
- Happy path: open on quiz intent, tap through three steps, typed Other on step 1 moves forward, submit returns quizId, verifies **AC-1**, **AC-2**, **AC-3**, **AC-4**, **AC-6**, **AC-8**.
- Navigation: Back keeps picks, Skip fills smart defaults, X collapses and reply resumes, reload rebuilds same step, verifies **AC-5**, **AC-7**.
- Failure case: length cutoff or 500 retries at 5 when 10 fails then hands to the full quiz page with reason Full paper lives on the quiz page plus quiz id link; a dead card means an empty error card with no retry, never shown, verifies **AC-9**.
- Auth plus money: foreign note reads not found, over cap refuses like the page, verifies **AC-8**.

## Build plan

Tracer Bullet: thin thread through snapshot plus card plus one generate first, then depth, then hardening.

1. Extend `QuizSnapshot` to version 2 with wizard fields plus stepIndex plus done flag, with loader that accepts version 1 quiz runs, satisfies **AC-2**, **AC-5**, **AC-7**.
2. Build the docked wizard card shell low above the composer with pager plus Skip plus Back plus Next plus X plus Or reply directly line, satisfies **AC-1**, **AC-5**, **AC-7**.
3. Wire topic plus level plus count cards with numbered rows plus inline Other box with send plus composer typing path plus smart defaults, satisfies **AC-2**, **AC-3**, **AC-4**, **AC-6**.
4. Add `POST /api/quizzes/wizard-generate` that validates wizard input then calls existing generate logic with same caps and debits, satisfies **AC-8**.
5. Add retry smaller then handoff plus owner checks plus caps parity wiring plus snapshot clear on submit or close, satisfies **AC-8**, **AC-9**.
6. Tests for happy path plus Back plus Skip plus resume plus reload plus foreign 404 plus caps parity, satisfies all ACs.

## Consequences

**Positive**:
- Setup matches the approved reference students already recognize.
- Practice starts in chat with fewer dead ends and no stall on a missing tap.
- One history everywhere since wizard output uses the same quiz rows.

**Negative / tradeoffs**:
- Two setup paths coexist until cutover, so short term maintenance doubles for setup.
- Snapshot stays on one device; a new device starts fresh.
- New endpoint adds surface to own even though it reuses generate logic inside.
- Per answer grading still costs one model call per answer once the runner starts.

**Neutral**:
- Old chips setup retires after proof; scope row 58 flips to in progress on build start.
- Runner docking plus marking plus reliability stay out of this spec by design.

## Migration plan

**Strategy**: strangler
**Phases**:
1. Ship wizard card behind quiz intent alongside chips; snapshot version 2 reads version 1.
2. Prove with real runs, then route all quiz intent to the wizard and retire chips setup.
**Rollback**: route intent back to chips; version 2 loader still accepts version 1 snapshots.
**Risks**: snapshot key collision across tabs; mitigated by run id keys already in use.

## Follow-up

- [ ] Retire chips setup once wizard proves out so only one pattern remains.
- [ ] Consider server held wizard state if browser snapshot loss proves painful in logs.
- [ ] Runner docked sheet plus marking plus mark scheme plus results are separate specs (scope rows 59 and 60); enroll them next if not yet planned.
