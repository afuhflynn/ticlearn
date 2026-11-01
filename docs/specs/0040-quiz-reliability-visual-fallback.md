# 0040. Quiz reliability plus visual fallback

**Date**: 2026-11-01
**Status**: In Progress

## Summary

Chat quiz practice stays dependable when models hit limits. A length cutoff runs one smaller retry in the same turn, then hands to a fresh prefilled quiz start with two live exits, never a dead card. A failed diagram shows a plain notice with text steps that still teach, plus a retry tap, while the activity line reads Drawing your diagram and duplicate warnings stay in server logs only.

## Context

Tip runs the whole quiz inside the conversation thread (the chat page where the student studies with the tutor). Generation, marking, and drawing each call a model (a remote service that writes text or art from a prompt), and each can fail under real limits: a length cutoff (the model stops mid output because the answer grew too long), a draw failure (the diagram tool returns nothing usable), or a duplicate message warning (an internal note that two writes raced). Today a cutoff can land on a dead Quiz not available card with no next step, the draw tool has no proper activity label so the Working line reads generically, and duplicate warnings risk leaking into the student view.

The forces are phone first use (small screens, costly data, short patience), trust (a dead card teaches the student that practice breaks), and cost (retries spend model budget, so the budget must be bounded). The existing system already owns a quiz runner component, a snapshot helper that rebuilds the same spot on reload, an activity label map with a silent tool set, and a full quiz page that can take over when chat cannot. Not deciding leaves each failure to invent its own display in the build, which is how the dead card appeared.

> Premise note: none. This stays a single hardening decision on the existing runner and draw path. The durable background build with live progress (scope row 63) and the simple true visuals work (scope row 67) are separate specs and are not designed here.

## Requirements

**User stories**:
- As a student, I want practice in chat to never end on a dead card so that a model hiccup never wastes my study time.
- As a student, I want a failed diagram to still teach me with text steps plus a retry so that art never blocks learning.
- As a student, I want the activity line to tell me plainly what is happening so that waiting feels honest.

**Acceptance criteria** (the contract, each criterion is IDed and independently checkable):
- **AC-1**: Generation never ends on a dead card. Every generation outcome is one of: questions rendered, a smaller retry in progress, or a handoff card with live exits.
- **AC-2**: On a length cutoff (a length stop reason, or truncated output that fails validation with fewer questions than asked), the server runs one automatic retry with a smaller question count in the same turn, then shows the handoff card if the retry also fails. When the asked count is 3 or less, it skips the retry and shows the handoff card at once. All other error kinds go straight to handoff with no retry.
- **AC-3**: The handoff card offers two live exits: start a smaller chat quiz now with the same note plus topic plus format, and open a fresh quiz start prefilled with the same note plus topic plus count plus format. Both controls work by tap.
- **AC-4**: A draw failure shows a plain notice with the text steps beside it plus a retry control. The answer still lands and still teaches. The draw retry is manual, capped at two taps with debounce, and after the second miss the retry control hides while the text stays.
- **AC-5**: While the draw tool runs, the activity line reads Drawing your diagram, collapses with the other steps, and expands on tap. The generic Working text never appears for a draw.
- **AC-6**: Duplicate message warnings are written to server logs only and never render in the thread, in the activity line, or in the expanded detail. Detection dedupes by AI SDK message id in the chat route and logs a sampled warn row with message id plus quiz id.
- **AC-7**: Topic mix stays student choice. Quiz and Flashcards remain available where recall helps, including inside the retry and handoff paths, with the same format the student chose.

## Options considered

### Option 1: Fix in place with one retry plus handoff plus text fallback

Keep the current runner, snapshot, and draw tool. Add cutoff detection with one smaller retry run inside the server tool wrapper, the two exit handoff card pointing at a prefilled fresh start, the Drawing your diagram label with its failure sentence, text fallback with manual retry on draw failure, and move duplicate warnings to server logs (a private record the student never sees).

**Pros**:
- Smallest change with the least migration risk, no schema change.
- Matches the existing label map and honest failure pattern already in the codebase.

**Cons**:
- Turn memory retry is lost on reload, so a reload mid retry starts over from the handoff state.
- One retry may still fail on very long requests, leaving the handoff as the save.

### Option 2: Queue every build through a background job with live progress

Move all generation and drawing into background jobs (work that runs outside the request so slow models cannot stall the thread) with stage names and live updates in the thread.

**Pros**:
- Survives slow models and reloads cleanly, progress is always visible.

**Cons**:
- New plumbing, new states, and new failure modes for a problem the scope row bounds to one retry plus handoff.
- Slower to ship and heavier to operate than the failure at hand needs. This belongs to scope row 63, not this spec.

### Option 3: Client only fallback with no route changes

Handle everything in the runner component: catch errors locally, show fallback copy, offer retry by hand.

**Pros**:
- No server work at all, fastest to write.

**Cons**:
- Cutoff detection needs the server truth (what the model actually returned), so the client would guess at failure kinds.
- Duplicates the failure logic across surfaces instead of fixing it once where the tools run.

## Decision

**Chosen option**: Option 1: Fix in place with one retry plus handoff plus text fallback (basis: your AGENTS.md, the Tracer Bullet rule that each slice works through every layer before the next starts; basis: scope row 61 in docs/scope/tutor.md, one retry then handoff with text instead plus retry).

Tighten the existing generate plus grade plus draw tool outputs to carry a cutoff flag, a text fallback, and a retry signal. No new routes. No schema change. The server tool wrapper runs the one retry internally and drops the failed long output before retrying so the retry starts lean. The handoff points at a fresh prefilled quiz start because a failed generate creates no row to link to. Draw runs parallel to text so the text lands first, and the draw prompt always returns payload plus text steps together so the fallback never has to invent steps.

## Rationale

The failure is bounded and the recovery already exists. The full quiz page is a working handoff target, the snapshot already rebuilds the same spot, and the label map already knows how to hide silent tools. A background job system would be the right call for long builds, but this spec owns the short failure: cutoff, draw miss, noisy warning. One retry keeps phone waits short and model spend capped, the handoff keeps practice alive when the retry misses, and text beside art keeps the answer useful when drawing fails. The runner up (background jobs) is the correct home for scope row 63 and should not be pulled into this slice. The partial render alternative (show whatever questions parsed plus handoff for the rest) was considered and set aside because a half set with unclear marking risks more confusion than one clean retry, and it is recorded as a follow up if retry data proves otherwise.

## Feature design

**Data model sketch**:
No new entities and no migration. Reuses Quiz (id, title, noteId owner scoped, status, questions JSON), QuizAttempt (id, quizId, answers JSON, score), and the chat snapshot (run id plus current index plus marks, held client side with existing helpers). Retry count is turn memory only, never persisted. Draw status leaves no row on failure, matching the drawn artifact rule that failures leave no row. The handoff persists in the snapshot as the error phase with its two exits, and a reload never resumes an automatic retry.

**State transitions**:
Runner phases stay setup to generating to answering to complete to error. New behavior inside generating: cutoff to retrying (one automatic server pass with a smaller count, rendered as a thin bar over the dimmed setup) to handoff (the error phase carrying two live exits) when the retry also fails or the count is 3 or less. Draw runs inline to complete; on failure the surface shows notice plus text plus manual retry, with no persisted state.

**API surface**:
| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| /api/quizzes/generate | POST | noteId:string (req), count:int (req), format:string (req, quiz or flashcards), topic:string (opt) | quiz id, title, questions, cutoff:boolean, retryWithCount:int or null, noteId plus topic plus format echoed | bearer, quiz owner | 401 no session, 404 foreign note, 422 bad count |
| /api/quizzes/grade | POST | attemptId:string (req), answers:array (req) | score, per question marks, markSchemeMd | bearer, attempt owner | 401 no session, 404 foreign attempt |
| draw tool (chat tool, name drawDiagram, not HTTP) | tool call | concept:string (req), shape hint:string (opt) | mermaid or svg payload plus textSteps always paired, altText, failed:boolean | chat session owner | tool failure yields text fallback plus manual retry, never a throw to the thread |

**Value sourcing** (every value each action produces, computes, or displays names where it comes from):
| Action | Value produced or displayed | Source |
|---|---|---|
| Generate | questions shown | model output stored in Quiz.questions JSON |
| Generate | cutoff flag | server check: length stop reason, or truncated output that fails validation with fewer questions than asked |
| Generate | smaller count for the retry | derived from the asked count as half rounded down with a floor of 3; at 3 or less no retry runs |
| Generate | note plus topic plus format on retry and handoff | echoed from the generate inputs through the cutoff response, decided in this spec |
| Generate | who runs the retry | server tool wrapper runs it internally and drops the failed long output first; the client only renders the retrying state |
| Handoff card | smaller chat quiz control | new generate call with the smaller count plus echoed note plus topic plus format |
| Handoff card | fresh quiz start link | prefill route carrying note plus topic plus count plus format; never a quiz row id since failure creates no row |
| Draw | diagram shown | model output payload, sanitized before render per spec 0030 |
| Draw | text steps beside art | draw tool output paired with the payload in the same response, shown always so failure still teaches |
| Draw | activity label | LABELS entry named drawDiagram in lib/chat/activity-labels.ts reading Drawing your diagram |
| Draw | failure notice plus retry | FAILURE_LABELS entry for drawDiagram reading Could not draw that. Steps below. Retry is manual, max two taps with debounce |
| Draw | text first ordering | draw runs parallel to the answer text so the text lands even if the draw leg is slow |
| Thread hygiene | duplicate warning record | dedupe by AI SDK message id in the chat route, sampled server warn log with message id plus quiz id, never a thread part |

**Key invariants**:
- No thread part ever carries a raw tool identifier or raw JSON.
- A cutoff never renders a dead card; it renders retry progress or the handoff card.
- Draw failures never block the answer; text steps always render, with text landing before art.
- Retry budget is exactly one automatic pass per turn, skipped at counts of 3 or less, with failed output dropped before the pass.
- Draw retry is manual only, max two taps; after the second miss the retry hides and the text stays.
- A reload never resumes an automatic retry; the handoff persists as error with exits.
- Flashcards availability never narrows because a fallback ran.

**Security model**:
Quiz owner only. The retry, the fallback text, and the handoff exits all check the same ownership as practice today: session user id equals the quiz owner, and foreign ids read as not found. The prefill link carries only the note id plus topic plus count plus format the owner already supplied. No new roles. No compliance scope beyond the existing student data handling.

**Configuration required**:
None. Reuses the existing per leg timeout (15 seconds, the longest one model attempt may run) and the existing model chain with its fallback. No new env vars.

**Critical test scenarios** (each maps to an acceptance criterion in ## Requirements):
- Happy path: student starts practice in chat and answers through to correction with no failure injected, verifies **AC-1**, **AC-7**
- Failure case: length cutoff injected on first pass, smaller retry succeeds and renders questions with the same note plus topic plus format, verifies **AC-2**, **AC-7**
- Failure case: cutoff injected on both passes, handoff card shows with two working exits including the prefilled fresh start, verifies **AC-1**, **AC-3**
- Failure case: asked count of 3 with cutoff injected, no retry runs and the handoff shows at once, verifies **AC-2**
- Failure case: draw failure injected, notice plus text steps plus working retry render and the answer still lands with text first, verifies **AC-4**
- Failure case: draw retried twice and missed twice, retry control hides while text stays, verifies **AC-4**
- Activity case: draw tool runs and the collapsed line reads Drawing your diagram, verifies **AC-5**
- Hygiene case: duplicate write raced, warning appears in server logs and nowhere in the thread, verifies **AC-6**
- Reload case: reload during retrying lands on the handoff error state with no resumed auto retry, verifies **AC-1**, **AC-2**
- Auth case: foreign quiz id requested, receives not found with no fallback content leaked, verifies **AC-7**

## Build plan

Ordered as thin Tracer Bullet slices (the project rule that each slice works through every layer before the next starts, from your AGENTS.md): label plus hygiene first so the thread reads clean, then the cutoff spine, then draw fallback, then mix parity.

1. Add the drawDiagram label plus failure sentence to the activity label map and move duplicate warnings to sampled server logs with message id dedupe, satisfies **AC-5**, **AC-6**
2. Add cutoff detection to the generate path with the cutoff flag plus smaller count hint plus echoed note plus topic plus format, satisfies **AC-2**
3. Build the one automatic smaller server side retry with trimmed failed output plus the handoff card with the prefilled fresh start exit, satisfies **AC-1**, **AC-2**, **AC-3**
4. Add draw text fallback with notice plus manual retry capped at two taps, running parallel to the answer text, satisfies **AC-4**
5. Lock Quiz plus Flashcards availability across the retry and handoff paths with owner checks on each exit, satisfies **AC-7**

## Consequences

**Positive**:
- Practice in chat survives the two most common model failures without stranding the student.
- The activity line stays honest and the thread stays free of internal warnings.
- No schema change means no migration risk and no backfill.

**Negative / tradeoffs**:
- Turn memory retry is lost on reload, so a reload during the single retry lands on the handoff instead of resuming.
- One retry caps the save rate; very long requests will still land on the handoff card.
- Text fallback keeps teaching but cannot replace a diagram the student explicitly asked to see.

**Neutral**:
- The 15 second leg budget now doubles as the draw timeout; a slow draw shows text at 15 seconds.
- Usage logs gain cutoff versus draw fail kinds; dashboards that count fallbacks should read the new kind field.

## Follow-up

- [ ] Scope row 63 (durable quiz build with live progress) should take the background job path deliberately left out here once this slice ships.
- [ ] Scope row 67 (simple true visuals) should refine the art quality; this spec only guarantees the fallback, not the beauty.
- [ ] If retry data shows cutoffs staying common, revisit the partial render alternative (render valid parsed questions plus handoff for the rest) as its own decision.
- [ ] Consider a reload safe retry marker in the quiz snapshot if reload during retry proves common in real use.

## References

**Project sources** (verifiable, in this repo):
- Scope row 61 in docs/scope/tutor.md, the done when that seeds AC-1 through AC-6
- Spec 0030 in docs/specs/0030-visual-output-chat-quizzes/index.md, artifact plus sanitized render plus text degrade rule
- Spec 0031 in docs/specs/0031-quiz-practice-inside-chat/index.md, runner plus handoff plus caps parity pattern
- lib/chat/activity-labels.ts, the one label map with silent tool set and server only unknown tool log
- Root AGENTS.md, Tracer Bullet slices plus the loading states rule (plain notice plus retry, no spinner)

**Practices & standards**:
- Honest failure with live exits (a failed build offers a next step, never a dead end)
- Silent internals (duplicate write warnings belong in logs, not in the user view)
- Bounded retries (one smaller retry before handoff caps cost and wait)

**Links** (web verified only):
- none verified (no landscape check ran; this reuses the existing stack, no new tool was chosen)
