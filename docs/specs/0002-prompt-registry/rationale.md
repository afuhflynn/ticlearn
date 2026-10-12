# 0002. Prompt registry · rationale

Decision record for spec 0002. The build reads index.md only.

## Context

AI wording today lives inline in code in about ten files. Quiz plus summary plus exam text lives in `lib/ai/index.ts`. Paper 3 tutor text plus guide builders live in `lib/paper3/prompts.ts`. Job prompts live in `lib/inngest/paper3-functions.ts` and nearby job files. Tool text that the model sees lives beside chat code in `lib/ai/tools.ts`. Each spot builds strings in its own way.

This spread makes review hard. A wording fix needs a code edit plus a rebuild plus a deploy. Two callers can drift apart while meaning the same thing. Paper 3 uses a parallel AI layer (separate marking code) so drift there is easy to miss. Tool text can fall out of sync with the prompt that frames it. The cache today is an in memory map (short lived store per server) keyed by prompt text, so identical wording shares answers across students.

Students use low memory phones on slow networks, so behaviour must stay predictable. Wording changes should be visible in git history, reviewable as prose, and live on the next request without new infrastructure. Secrets must stay in server settings, never in prompt files.

## Options considered

### Option 1: Document plus enforce going forward

Define the one right way, add an automated check, require all new code to comply, leave current inline text as tracked debt to move file by file.

* **Pros**:
  * * Smallest first change with low review load
  * * New drift stops at once while old text moves when touched
* **Cons**:
  * * Two patterns coexist for a long span, review must allow both
  * * Done state stays open till the last file moves

### Option 2: Document plus single migration PR

Define the one right way, move every prompt file at once in one coordinated change, add an automated check so new inline text fails review.

* **Pros**:
  * * One home at once, no long span with two patterns
  * * Review sees the full shape, later slices build on settled ground
* **Cons**:
  * * Larger first review across about ten files
  * * Any missed caller breaks at once, needs careful search plus testing

### Option 3: Document only

Write the convention, rely on human review, add no automated check.

* **Pros**:
  * * Almost no tooling work to start
  * * Keeps full freedom per caller while guidance exists
* **Cons**:
  * * Drift returns under time pressure since nothing blocks it
  * * Review load grows with each new prompt

## Rationale

The problem is spread, not depth. About ten files hold the wording, each readable in isolation, so a single coordinated move is sized to review in one pass. Leaving debt would keep two patterns alive across the exact files students depend on for quizzes plus exams plus marking, which prolongs the sync risk the scope wants closed. A check at the loader plus a simple search in CI (automated tests on each push) keeps the standard alive without new services to run at 2am.
