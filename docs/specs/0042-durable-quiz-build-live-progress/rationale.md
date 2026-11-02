# Rationale: 0042 durable quiz build with live progress

Decision record only. The build spec lives in index.md.

## Context

Quiz generation from a note already runs as a background job with a GENERATING row. The gap is what the student feels on a long build. A 40 question build fans out into batches that each call the model. Today the thread shows little while batches run, the quiz page polls a status with no counts, a cutoff can strand the run, and a job that never returns leaves a row in GENERATING with no exit.

The forces are simple. Phones on metered links need proof of life in seconds. Model output limits make long outputs fragile, so the design must expect a cutoff and keep going. Credits are real money value, so a retry must never double charge. The loading rule in this repo says a process shows a bar with a real number, never a skeleton and never a spinner. The existing job plus polling pattern stays, this spec thickens it into something durable and honest.

## Options considered

### Option 1: Columns on Quiz plus poll the detail row

Add build stage plus counts to the Quiz row, update them from the job after each batch, and extend the existing quiz detail response. Clients poll while status is GENERATING.

**Pros**:

* One read path for chat and page.
* Matches the note stage pattern already in the codebase.
* No new channel to operate.

**Cons**:

* Polling lags by the poll interval.
* Frequent polls add read load on long builds.

### Option 2: Live push channel for batch events

Keep columns plus push each batch event over a live channel for instant updates.

**Pros**:

* Instant updates with no poll delay.

**Cons**:

* New channel to build, secure, scale, and keep alive on poor networks.
* Two truth paths when the socket drops and poll resumes.

### Option 3: Metadata only with no schema change

Keep progress inside the existing metadata JSON and parse it on read.

**Pros**:

* No migration.

**Cons**:

* Counts are untyped and hard to query for the stale sweeper.
* Every reader parses JSON and risks drift.

## Rationale

The repo already proves the pattern. Notes move through a stage column, quizzes already poll a GENERATING row, and Inngest already runs batches as steps. Polling is boring and it works on poor networks where sockets drop. Typed columns give the sweeper and the detail route a single truth. Push can come later if polls ever prove too slow.
