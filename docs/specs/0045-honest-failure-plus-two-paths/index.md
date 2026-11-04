# 0045. Honest failure plus two paths

**Date**: 2026-11-04
**Status**: In Progress

## Summary

When a quiz build fails in chat, the student now sees one calm card with plain words and two live taps. Both taps open the full quiz page, one prefilled small and one prefilled as asked, so practice never ends dead. The same frame covers draw and grading failures with words that name the cause, while lost connection keeps its own notice.

## Requirements

**User stories**:
- As a student, I want a failed build to show a calm card with two live exits so that a model hiccup never wastes my study time.
- As a student, I want a failed drawing to still teach me with text steps plus a retry so that art never blocks learning.
- As a student, I want grading failures to hand me forward cleanly so that a mark error never ends practice dead.

**Acceptance criteria** (the contract, each criterion is IDed and independently checkable):
- **AC-1**: No failure ends on a dead card. Every build, draw, or grading failure renders either questions, a retry in progress, teaching text with retry, or the calm card with two live taps.
- **AC-2**: On a length cutoff (provider stop reason length, or output that parses but validates with fewer questions than asked after invalid filtering), the server runs one automatic retry with a smaller count in the same turn, then shows the card if the retry also fails. When the asked count is 3 or less, it skips the retry and shows the card at once. All other build errors go straight to the card with no retry.
- **AC-3**: The card offers two live exits, both opening the full quiz page: a smaller start prefilled with the same note plus topic plus format and the smaller count, and a full start prefilled with the same note plus topic plus format and the asked count. When the smaller count equals the asked count (asked 3 or less), the small tap hides and only the full tap shows with a short line. Both taps work by tap and survive reload.
- **AC-4**: A draw failure shares the card frame with draw specific words, shows text steps beside the miss, keeps the answer landed and teaching, and offers manual retry capped at two taps with 1 second debounce. The concept plus hint for the retry come from the snapshot handoff. The text comes from the same draw response when present, else one short model pass for steps only. The two tap budget lives in the snapshot so reload keeps count. After the second miss the retry hides while the text stays.
- **AC-5**: A grading failure goes straight to the card with no automatic retry, carrying the same two exits rebuilt from the Quiz row (count from stored questions length) plus snapshot topic plus format plus note, starting fresh with answers discarded.
- **AC-6**: The card persists as the error phase with both exits. The snapshot is truth and the run backup is written on failure under the client run id, so reload rebuilds the card from snapshot plus backup and never resumes an automatic retry. Taps are plain links with an offline guard on click; when offline the card stays with a short line. A failed tap shows the same card again, never a dead end.
- **AC-7**: Quiz owner only. The retry, the fallback text, and both exits check the same ownership as practice today. The check runs at card render and again at `/quizzes` load. Foreign ids read as not found.
- **AC-8**: Quiz and Flashcards stay available on both exits with the same format the student chose. The card never narrows topic mix.
- **AC-9**: The card reads calm and modern: title Practice paused as the card heading, one plain cause line by kind (build: That set came out too long, so it stopped short. draw: Could not draw that. Steps below. grade: Could not mark that. Two ways to continue.), two stacked buttons reading Try smaller quiz and Open full quiz, one polite live region around the cause line, focus to the title on first show only (never on reload rebuild), instant when reduced motion is asked, and no spinner anywhere.
- **AC-10**: Each card show writes one sampled server log on the card data fetch, sample 1 in 10, once per client run id so reload never double logs. The row carries cause plus count plus format plus owner id only, with no note title text and no topic text.

## Decision

**Chosen option**: Option 1: Fix in place with one unified card.

Unify the failure surface into one calm card in the low docked family, with both exits as plain links to the full quiz page carrying the same values, keeping the retry budgets split by kind and persisting the card as the error phase.

## Feature design

**Data model sketch**:
No new entities and no migration. Reuses Quiz (id, title, noteId owner scoped, status, questions JSON), QuizAttempt (id, quizId, answers JSON, score), the chat snapshot (run id plus current index plus marks plus draw retry count plus handoff with noteId plus noteTitle plus topicText plus formatChoice plus level plus difficulty plus retryWithCount, held client side in session storage with helpers), and the server run backup row (the same JSON mirrored for new devices, written on failure under the client run id even when no Quiz row exists). Retry count is turn memory only, never persisted. The snapshot is truth on reload and the backup is the fallback. Draw leaves no row on failure. The card persists in the snapshot as the error phase with its two exits, and a reload rebuilds the card from snapshot plus backup.

**State transitions**:
Runner phases stay setup to generating to answering to complete to error. New behavior inside generating for builds: cutoff to retrying (one automatic server pass with a smaller count, rendered as a thin bar over the dimmed setup) to failed card (the error phase carrying two live exits) when the retry also fails or the count is 3 or less. Draw runs inline to complete; on failure the surface shows the shared frame plus notice plus text plus manual retry, max two taps, then the retry hides. Grading runs marking to failed card with no automatic retry. Reload on the card rebuilds the error phase with both exits and never resumes an automatic retry.

**API surface**:
| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| /api/quizzes/generate | POST | noteId:string (req), count:int (req), format:string (req, quiz or flashcards), topic:string (opt) | quiz id, title, questions, cutoff:boolean, retryWithCount:int or null, note plus topic plus format echoed | bearer, quiz owner | 401 no session, 404 foreign note, 422 bad count |
| /api/quizzes/wizard-generate | POST | noteId:string (req), count:int (req), format:string (req), topic:string (opt), level:string (opt), difficulty:string (opt) | quiz id, title, questions, cutoff:boolean, retryWithCount:int or null, values echoed | bearer, quiz owner | 401 no session, 404 foreign note, 422 bad count |
| /api/quizzes/grade | POST | attemptId:string (req), answers:array (req) | score, per question marks, markSchemeMd | bearer, attempt owner | 401 no session, 404 foreign attempt, grading error surfaces card |
| draw tool (chat tool, named drawDiagram, not HTTP) | tool call | concept:string (req), shape hint:string (opt) | diagram payload plus textSteps always paired, altText, failed:boolean | chat session owner | tool failure yields text fallback plus manual retry, never a throw to the thread |
| /quizzes page (existing start entry) | GET | noteId:string (opt), topic:string (opt), count:int (opt), format:string (opt), level:string (opt), difficulty:string (opt) | create dialog prefilled with the same values and opened at load, ready to start | bearer, note owner checked at load | 404 foreign note id in query, 422 bad count in query (dialog still opens with valid values) |

**Value sourcing** (every value each action produces, computes, or displays names where it comes from):
| Action | Value produced or displayed | Source |
|---|---|---|
| Generate | questions shown | model output stored in Quiz.questions JSON |
| Generate | cutoff flag | server check: provider stop reason length, or output that parses but validates with fewer questions than asked after invalid filtering |
| Generate | smaller count for the retry and the small tap | derived from the asked count as half rounded down with a floor of 3; at 3 or less no retry runs and the card shows at once with the small tap hidden |
| Generate | note plus topic plus format plus level plus difficulty on retry and card | echoed from the generate inputs through the cutoff response, decided in this spec; empty topic omitted from query; canonical keys noteId topic count format level difficulty |
| Generate | who runs the retry | server tool wrapper runs it internally and drops the failed long output first; the client only renders the retrying state |
| Card | title plus cause line | static copy decided in this spec: Practice paused plus one plain cause line by kind (build too long, draw miss, grading error, exact lines in AC-9) |
| Card | smaller full page tap | plain link to /quizzes with query carrying echoed note plus topic plus smaller count plus format plus level plus difficulty when present; hidden when smaller equals asked |
| Card | full full page tap | plain link to /quizzes with query carrying echoed note plus topic plus asked count plus format plus level plus difficulty when present |
| Card | tap failure behavior | offline guard on click decided in this spec; when offline the card stays with a short line since plain links give no failure callback |
| Card | who may see and tap | session user id equals quiz owner checked at render and at /quizzes load; foreign ids read as not found |
| Draw | diagram shown | model output payload, sanitized before render per spec 0030 |
| Draw | text steps beside art | draw tool output paired with the payload in the same response when present, else one short model pass for steps only, shown always so failure still teaches |
| Draw | retry concept plus hint | snapshot handoff concept plus hint decided in this spec |
| Draw | manual retry budget | snapshot count decided in this spec, max two taps with 1 second debounce, then the retry hides |
| Grade | grading failure signal | grade route error or empty mark output, surfaced as the card with no retry |
| Grade | exits for grading failure | rebuilt from Quiz row questions length as count plus snapshot topic plus format plus note, fresh start with answers discarded, decided in this spec |
| Thread | card show record | sampled server log on the card data fetch decided in this spec: sample 1 in 10, once per client run id, cause plus count plus format plus owner id only |
| Thread | duplicate warning record | dedupe by AI SDK message id in the chat route, sampled server log with message id plus quiz id, never a thread part |

**Key invariants**:
- No thread part ever carries a raw tool identifier or raw JSON.
- A cutoff never renders a dead card; it renders retry progress or the calm card.
- Both exits are plain links that work after reload; a failed build creates no quiz row id to link to.
- Retry budget is exactly one automatic pass per turn for builds, skipped at counts of 3 or less with the small tap hidden, with failed output dropped before the pass.
- Draw retry is manual only, max two taps with 1 second debounce tracked in the snapshot; after the second miss the retry hides and the text stays.
- Grading never auto retries; it hands to the card at once with exits rebuilt from the Quiz row plus snapshot.
- A reload never resumes an automatic retry; the card persists as error with exits, snapshot truth first then backup.
- Plain links give no failure callback, so taps carry an offline guard on click and the card stays when offline.
- Flashcards availability never narrows because a fallback ran.

**Security model**:
Quiz owner only. The retry, the fallback text, and both exits check the same ownership as practice today: session user id equals the quiz owner, checked at card render and again at `/quizzes` load, and foreign ids read as not found. The prefill query carries only the note id plus topic plus count plus format plus level plus difficulty the owner already supplied, with topic echoed as plain text and readable as not found when foreign. No new roles. No compliance scope beyond the existing student data handling. The card log carries no note title text and no topic text.

**Configuration required**:
None. Reuses the existing per leg timeout (15 seconds, the longest one model attempt may run) and the existing model chain with its fallback. No new env vars.

**Critical test scenarios** (each maps to an acceptance criterion in ## Requirements):
- Happy path: student starts practice in chat and answers through to correction with no failure injected, verifies **AC-1**, **AC-8**
- Failure case: length cutoff injected on first build pass, smaller retry succeeds and renders questions with the same note plus topic plus format, verifies **AC-2**
- Failure case: cutoff injected on both passes, card shows with two working full page links carrying small and asked counts, verifies **AC-1**, **AC-3**
- Failure case: asked count of 3 with cutoff injected, no retry runs and the card shows at once with only the full tap plus a short line, verifies **AC-2**, **AC-3**
- Failure case: draw failure injected, shared frame plus text steps plus working manual retry render and the answer still lands with text first, verifies **AC-4**
- Failure case: draw retried twice and missed twice, retry hides while text stays, verifies **AC-4**
- Failure case: grading error injected, card shows at once with both exits and no retry progress, verifies **AC-5**
- Reload case: reload on the card rebuilds both exits from snapshot truth plus backup written on failure with no resumed auto retry, verifies **AC-6**
- Tap failure case: full page open fails while offline, thread still shows the same card with both exits live plus a short line, verifies **AC-6**
- Auth case: foreign note id in prefill query reads as not found with no content leaked, verifies **AC-7**
- Access case: card announces politely through one live region, focus lands on the title on first show only, reduced motion shows instantly, no spinner appears anywhere on the path, verifies **AC-9**
- Logging case: card show writes one sampled log row once per client run id with cause plus counts plus format, verifies **AC-10**

## Build plan

Ordered as thin Tracer Bullet slices (the project rule that each slice works through every layer before the next starts, from root AGENTS.md): card first so the thread reads clean, then links, then the cutoff spine, then draw and grade parity.

1. Build the unified calm card component in the low docked family with the decided copy plus stacked buttons plus polite live region plus focus on first show only plus reduced motion behavior, satisfies **AC-1**, **AC-9**
2. Rewire both call sites (runner error phase and build progress error) to the one card and fix the dead `/quizzes/new` links to plain query params on the existing `/quizzes` start entry with canonical keys plus auto open plus offline guard, with reload rebuild from snapshot truth plus backup written on failure, satisfies **AC-3**, **AC-6**
3. Add cutoff detection to the generate paths with the cutoff flag plus smaller count derivation plus hidden small tap at 3 or less plus echoed values, with one automatic smaller server pass that drops failed output first, satisfies **AC-2**
4. Share the frame for draw failures with draw specific words plus text steps beside art plus manual retry capped at two taps, running parallel to the answer text, satisfies **AC-4**
5. Send grading failures straight to the card plus lock Quiz plus Flashcards parity plus owner checks on each exit plus the sampled card show log, satisfies **AC-5**, **AC-7**, **AC-8**, **AC-10**

## Consequences

**Positive**:
- Practice in chat survives the three most common model failures without stranding the student.
- Two plain links replace dead taps, so the card keeps its promise after reload and share.
- One frame for three causes keeps the thread honest and easy to reason about.

**Negative / tradeoffs**:
- Turn memory retry is lost on reload, so a reload during the single retry lands on the card instead of resuming.
- One retry caps the save rate; very long requests still land on the card.
- Both taps leave chat for the full page, so a student who wanted to stay in chat takes one extra hop by design.

**Neutral**:
- The 15 second leg budget now doubles as the draw timeout; a slow draw shows text at 15 seconds.
- Usage logs gain card show rows by cause; dashboards that count fallbacks should read the new kind field.

## Follow-up

- [ ] Scope row 63 (durable quiz build with live progress) takes the background job path deliberately left out here once this slice ships.
- [ ] Scope row 67 (simple true visuals) refines the art quality; this spec only guarantees the shared frame plus the text fallback, not the beauty.
- [ ] If retry data shows cutoffs staying common, revisit the partial render alternative (render valid parsed questions plus exits for the rest) as its own decision.
- [ ] Consider a reload safe retry marker in the quiz snapshot if reload during retry proves common in real use.
- [ ] Update docs/scope/tutor.md row 66 sub tasks from this spec Build plan once the engineer confirms, keeping tasks in the scope row as pointers and this spec as the source of truth.
