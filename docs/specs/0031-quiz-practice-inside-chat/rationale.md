# Rationale: 0031 quiz practice inside chat

## Context

Quiz setup in chat partly exists (the createQuiz tool builds a drill and links out), but everything after the link leaves the thread: practice, marking, attempts, and retakes all happen on the separate quiz page. Students revising in chat, often on phones under exam pressure, drop off at the handoff. The chat transcript that motivated this work shows both sides: retrieval first questioning works (the student answers before Tip explains and stays engaged), while the Take your quiz link ends the in chat arc. Outside research found no general assistant shipping tappable in chat quiz widgets; only learning apps use tappable cards with a check step, and none times quizzes in chat. The forces are a deterministic experience under pressure, one shared history instead of two, honest timing that survives clock games, and a demo date that favors reusing quiz rows and endpoints over new machinery. Prerequisites exist: QuizAttempt rows, generate plus attempts plus retry endpoints, the createQuiz tool, grading helpers, and the chat thread UI.

## Options considered

### Option 1: Scripted runner reusing quiz rows and quiz endpoints

A fixed UI flow drives setup, questions, marking, and submit; the model grades and explains but never controls flow. New columns only (source, conversationId).

**Pros**:
- Deterministic and testable under exam pressure.
- One history everywhere; retry logic reused untouched.
- Least new code and no new endpoints.

**Cons**:
- Cannot improvise beyond the scripted flow.
- Reload depends on the browser snapshot on one device.

### Option 2: Agentic loop with run tools

The model calls tools to ask, validate, advance, and submit.

**Pros**:
- Flexible; handles odd requests gracefully.

**Cons**:
- Costly per turn and flaky when it matters most.
- Flow logic lives in prompts, hard to test or pin down.

### Option 3: New chat attempt tables and endpoints

Dedicated storage and API for chat runs.

**Pros**:
- Clean split; page and chat evolve independently.

**Cons**:
- Duplicates history, stats, and retry logic.
- New migration plus queries plus endpoints for a v1.

### Option 4: Timed runs now with server clock

Build the full timed engine in v1: server stamps, countdown, late cutoff.

**Pros**:
- Complete exam simulation from day one.

**Cons**:
- Contradicts the engineer's call to hold timing until after the hackathon.
- Clock, cutoff, and dispute handling before untimed practice is proven.

## Rationale

Determinism wins for exam revision: a scripted runner behaves the same every run, costs one grading call per answer, and stays testable, while the model still does what it does best (grade plus explain). Reuse wins over new tables and endpoints because the feature's own Done when demands shared history; separate stores would split stats, streaks, and retakes on day one. Outside research backs both calls: tappable cards with a check step is the only proven in chat quiz pattern, and nobody times quizzes in chat, which supports holding timing for phase 2. Timed practice is therefore an explicit non goal with a named follow up, not a silent cut.
