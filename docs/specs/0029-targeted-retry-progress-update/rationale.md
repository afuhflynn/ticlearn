# Rationale: 0029 targeted retry and progress update

## Context

Quiz review today shows what was missed but does not close the loop. The hackathon demo needs a visible arc from miss to understanding to proof. The forces are a short deadline, a prototype tier where cost must not block, stored page proof from earlier specs that may be missing on text notes, and a schema where the old topic performance table is gone so progress needs a home that exists today. Without this decision the builder would invent storage, pricing, and progress targets mid build.

## Options considered

### Option 1: New retry table plus inline two routes

Create a QuizRetry table linked to the answer row, generate inline in the create route, score inline in the submit route, update quiz metadata on completion.

**Pros**:
1. History stays traceable to the exact miss.
2. Two simple routes match the existing quiz REST shape.
3. Inline generation keeps prototype UI fast without job plumbing.

**Cons**:
1. Slow model calls hold a request open, so timeouts need care.
2. A new table adds one migration to review.

### Option 2: Job plus poll like quiz generation

Enqueue an Inngest job on miss, poll for feedback plus question, submit when ready.

**Pros**:
1. Resilient to slow models and easy to requeue.
2. Matches the quiz generation pattern already in the codebase.

**Cons**:
1. Heavier client states for a single question.
2. More moving parts than a prototype demo needs.

### Option 3: Ephemeral retry with no storage

Generate and score in memory, update UI only, persist nothing.

**Pros**:
1. Smallest build, no migration.
2. No storage to secure.

**Cons**:
1. No history for the demo or for later progress.
2. Refresh loses proof of learning.

## Rationale

The demo needs proof that a miss became understanding, so storage is required and Option 3 drops the core value. Option 2 is sound for production scale but adds job states and polling for a single question, which slows a prototype with a fixed date. Option 1 keeps the smallest surface that still saves history, reuses the quiz route shape the team already operates, and isolates model slowness with timeouts plus fallback. The new table is narrow and the migration is small.
