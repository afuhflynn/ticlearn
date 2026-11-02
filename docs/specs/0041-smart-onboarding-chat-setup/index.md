# 0041. Smart onboarding chat setup

**Date**: 2026-11-02
**Status**: In Progress

## Summary

You get a setup that learns who you are in under a minute and sends you to a useful next screen at once. It talks like chat (plain talk plus quick taps) instead of a long form, and it saves each step so you can leave and return later. Tip (the AI tutor in this app) reads the saved level and goal so first answers feel personal.

## Requirements

**User stories**:
1. As a new student, I want setup to ask me one thing at a time in plain chat so I finish fast.
2. As a busy student, I want to skip and still use the app, then finish later without loss.
3. As a returning student, I want to land back on the step I left so I never repeat work.
4. As a student who mistyped, I want setup to catch a bad value and ask again in plain words.

**Acceptance criteria**:
1. **AC-1**: New student finishes smart setup in under a minute and lands on dashboard with level of study plus target goal saved.
2. **AC-2**: Chat led flow asks one query at a time in order level then goal then school plus program then confirm with tappable picks plus visible progress plus skip.
3. **AC-3**: Skip sets skipped true with academic fields left empty and the app stays usable.
4. **AC-4**: Half done work saves each step to a progress store and return opens the saved step.
5. **AC-5**: Invalid model value is rejected and reasked in plain words, never saved.
6. **AC-6**: Tip reads User academic fields after finish for personal answers.
7. **AC-7**: Only the owner can read or write own setup data, others get denied.
8. **AC-8**: Double submit does not create duplicate progress rows.

## Decision

**Chosen option**: Option 2: Strangler chat beside the form

You will build a chat led setup beside the current page, save progress server side, then cut over once it proves out.

## Feature design

**Data model sketch**:
1. `User` keeps final truth. Fields: `levelOfStudy` optional text, `institution` optional text, `faculty` optional text, `program` optional text, `targetGoal` optional text, `gender` optional enum, `age` optional number, `dateOfBirth` optional time, `onboardingCompleted` boolean, `onboardingSkipped` boolean.
2. New `OnboardingProgress` keeps half done work. Fields: `id` primary text, `userId` unique text pointing to `User`, `currentStep` number, `answers` structured data, `updatedAt` time, `completedAt` optional time.
3. Relation: one `User` to one `OnboardingProgress`. One row per student at most. Finish copies final values to `User`.

**State transitions**:
1. `not started` to `in progress` on start action.
2. `in progress` to `in progress` on each save of a step.
3. `in progress` to `completed` on finish with valid level plus goal.
4. `in progress` to `skipped` on skip, academic fields stay empty.
5. `skipped` to `in progress` on resume.

**API surface**:
| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| `/api/onboarding/start` | POST | none | `progressId`, `currentStep` | session | 401 |
| `/api/onboarding/progress` | POST | `step:number`, `stepKey:text`, `answers:object`, `skipped:boolean` | `currentStep`, `saved:true` | session owner only | 400, 401, 403 |
| `/api/onboarding/progress` | GET | none | `currentStep`, `answers` | session owner only | 401, 403 |
| `/api/onboarding/finish` | POST | `levelOfStudy:text`, `targetGoal:text`, plus optional academic fields | `ok:true`, `user` | session owner only | 400, 401, 403 |

**Value sourcing**:
| Action | Value produced or displayed | Source |
|---|---|---|
| Start | `progressId`, `currentStep` | New `OnboardingProgress` row |
| Save step | `currentStep`, saved answers | Request body plus `OnboardingProgress` column |
| Resume | Step to open plus answers so far | `OnboardingProgress` columns |
| Finish | Final level plus goal plus academic fields | Request body validated then `User` columns |
| Skip | `onboardingSkipped` flag | Request choice plus `User` column |
| Tip personal reply | Level plus goal plus program in prompt at chat start | `User` columns after finish with no cache past finish (basis: your current `proxy.ts` guard reads `levelOfStudy`) |
| Progress line in UI | Step number plus total | `currentStep` plus fixed step count |
| Funnel log | Start plus step done plus finish plus skip | Server log events |

**Key invariants**:
1. One progress row per student at most, keyed by `userId`.
2. Final academic fields copy to `User` only after validation passes.
3. Skip never writes fake academic values.
4. Double submit with the same step key keeps a single row through upsert on `userId` (basis: idempotency keys for money operations applied here to setup saves).
5. Auth check runs on every setup route, owner only.
6. Stale progress rows clear after 30 days.

**Security model**:
1. Session check on all setup routes. No session gives 401.
2. Owner only. A student reads or writes own `userId` only, mismatch gives 403. No admin route in this slice.
3. Admin may view funnel counts only, no edit of student rows in this slice.
4. Ask birth date once and derive age, age stays 15 to 50, birth date must parse else 422 with plain message. Level plus goal check against fixed lists, program stays free text until catalogue lands.

**Critical test scenarios**:
1. Happy path: start then save two steps then finish, lands on dashboard with level plus goal saved, verifies **AC-1**, **AC-2**, **AC-6**.
2. Skip plus resume: skip then return, resume opens saved step, finish works, verifies **AC-3**, **AC-4**.
3. Bad value: model suggests unknown program, server rejects and reasks, nothing saved, verifies **AC-5**.
4. Auth plus double submit: other user gets denied, double tap keeps one row, verifies **AC-7**, **AC-8**.

## Build plan

1. Add migration for `OnboardingProgress` plus start plus save plus resume plus finish routes with owner checks, satisfies **AC-4**, **AC-7**, **AC-8**.
2. Thin chat led UI on a second path beside the old page with one ask plus picks plus progress plus skip, wired to the routes end to end, satisfies **AC-1**, **AC-2**.
3. Add skip with empty values plus resume to saved step plus guard update in `proxy.ts` to send done or skipped to dashboard and in progress to resume, satisfies **AC-1**, **AC-3**, **AC-4**.
4. Add validation plus reask for bad model values plus copy of final values to `User`, satisfies **AC-5**.
5. Wire Tip prompt to read `User` level plus goal after finish, satisfies **AC-6**.
6. Add funnel logs for start plus step done plus finish plus skip plus instant save timing check on slow net, satisfies **AC-1**, **AC-4**.

## Consequences

**Positive**:
1. Faster finish with less loss, since each step saves and resume works on any device.
2. First Tip answers feel personal from day one.
3. Skip keeps the funnel open while still nudging to finish later.

**Negative or tradeoffs**:
1. Two setup paths live side by side for a time, so tests and fixes touch both.
2. A progress table adds storage and cleanup work for rows that never finish.
3. Chat wording needs care and review, or students mistrust the picks.

**Neutral**:
1. Old page stays until cutover, no data move for finished students.

## Migration plan

**Strategy**: strangler
**Phases**:
1. Ship new chat path plus progress store behind the same guard, old page stays default.
2. Move half of new traffic to chat path, watch finish plus skip plus error rates.
3. Make chat path default, keep old page as fallback for one cycle, then remove old page.
**Rollback**: flip guard back to old page, keep progress rows for later retry.
**Risks**: model drift in wording, slow net loss of a step, double rows on retry.

## Follow up

1. Add edit of setup fields in settings, since settings cannot change them today.
2. Wire faculty picks to the course catalogue once that source of truth lands.
3. Watch funnel logs for a cycle and tune wording of the two slowest steps.
4. Remove the old four step page after cutover proves out.
