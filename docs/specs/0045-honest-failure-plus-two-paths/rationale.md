# 0045 Rationale

## Context

Tip builds quizzes inside the chat thread (the conversation where the student studies with the tutor). Generation, drawing, and marking each call a model (a remote service that writes text or art from a prompt), and each can fail under real limits: a length cutoff (the model stops mid output because the answer grew too long), a draw miss (the diagram tool returns nothing usable), or a grading error (the mark step throws or returns nothing usable).

Today the failure surface is split and partly dead. The in chat runner shows an error phase with an in chat retry plus a fresh start link, while the background build progress shows a simpler error with links. Both use the title Practice paused here, two ways to continue. The fresh links point at `/quizzes/new`, but that route does not exist in the app, so at least one tap strands the student. The forces are phone first use (small screens, costly data, short patience), trust (a dead card teaches the student that practice breaks), and cost (retries spend model budget, so the budget stays bounded). Not deciding leaves each failure to invent its own display in the build, which is how the dead links appeared.

> Premise note: the engineer chose both taps opening the full quiz page, which departs from spec 0040 where the first exit retried inside chat. This spec records that departure as deliberate: the full page is the honest home for a retry once the thread build has failed, and plain links survive reload where turn memory does not. The card still reads as two paths (small now, full as asked), only the host changes.

## Options considered

### Option 1: Fix in place with one unified card

Keep the runner, the snapshot, and the draw tool. Unify the two existing error renders into one card component in the low docked family, fix the dead `/quizzes/new` links to plain query params on the existing `/quizzes` start entry, keep the one smaller server retry for builds, keep manual retry for draws, send grading straight to the card, and persist the card as the error phase.

**Pros**:
- Smallest change with no schema change and no new route.
- Matches the loading rule the project already ships (plain notice plus retry, never a dead end).

**Cons**:
- Turn memory retry is lost on reload, so a reload during the single retry lands on the card instead of resuming.
- One retry caps the save rate, so very long requests still land on the card.

### Option 2: Queue every build through a background job with live progress

Move generation and drawing into background jobs (work that runs outside the request so slow models cannot stall the thread) with stage names and live updates in the thread, and render the card only when the job exhausts its own retries.

**Pros**:
- Survives slow models and reloads cleanly, progress is always visible.

**Cons**:
- New plumbing, new states, and new failure modes for a problem the scope bounds to one retry plus two exits.
- Slower to ship and heavier to operate than the failure at hand needs. This belongs to scope row 63, not this spec.

### Option 3: Client only fallback with no route changes

Handle everything in the runner component: catch errors locally, show fallback copy, retry by hand, link out with values held in memory.

**Pros**:
- No server work at all, fastest to write.

**Cons**:
- Cutoff detection needs the server truth (what the model actually returned), so the client would guess at failure kinds.
- Values held in memory break on reload and share, which repeats the dead card problem this spec exists to remove.

## Rationale

The failure is bounded and the recovery already exists. The full quiz page is a working handoff target, the snapshot plus the run backup already rebuild the same spot, and the label map already knows how to hide silent tools. A background job system is the right call for long builds, but this spec owns the short failure: cutoff, draw miss, grading error. One unified card keeps phone waits short and model spend capped, plain links fix the dead `/quizzes/new` taps without a new route, and text beside art keeps the answer useful when drawing fails. The runner up (background jobs) is the correct home for scope row 63 and stays out of this slice. The partial render alternative (show whatever questions parsed plus exits for the rest) was set aside because a half set with unclear marking risks more confusion than one clean retry, and it is recorded as a follow up if retry data proves otherwise.
