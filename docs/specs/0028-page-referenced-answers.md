# 0028. Page referenced answers from course material

**Date**: 2026-10-29
**Status**: Proposed

## Summary

Quiz generation and the chat tutor both learn to cite page numbers. Generation reads the note text together with the stored visual descriptions from spec 0027, and every question it writes keeps the page numbers it came from. Chat gets a page lookup tool scoped to the conversation note, so the model answers show me the page number from real stored data instead of guessing. The student pays per grounded question and per useful lookup from two new tunable prices, and missing scan data degrades to text only rather than blocking.

## Requirements

**User stories**:
- As a student, I generate a quiz from my course PDF and each question shows the page numbers it came from so I can revise the right page.
- As a student, I ask Tip which page covers a topic and it names the page number from my note, not from memory.
- As a student, I pay a clear per question and per lookup price for grounded answers, and I am told when I cannot afford one.

**Acceptance criteria**:
- **AC-1**: Grounded generation reads the note extracted text together with completed visual analyses (visual type, description, page number) for that note.
- **AC-2**: Each generated question stores its source page numbers, and the quiz detail response returns them.
- **AC-3**: The chat page lookup tool returns the conversation note pages with their analyses, and the model cites page numbers in its answer.
- **AC-4**: A grounded quiz debits unit price times question count in one row keyed on the quiz id; a useful page lookup debits once keyed on the tool call id; insufficient balance blocks with a plain message.
- **AC-5**: A note with no page data still generates from text only, and the tool returns pending or empty; neither path blocks the student.
- **AC-6**: A Muse failure falls through to the OpenRouter chain, and pages with failed analyses are excluded from generation input.
- **AC-7**: Generation requires note ownership and the tool reads only the caller owned conversation note; a foreign note is unreachable.

## Options considered

### Option 1: Flag on the existing quiz flow plus a new chat tool (chosen)

A grounded flag on POST /api/quizzes/generate picks the grounded price and passes page data into the existing quiz job. A new getNotePages chat tool reads Page plus VisualAnalysis rows for the conversation note. Both share one read layer, one owner rule, and one cost posture.

**Pros**: reuses batching, caching, the idempotent debit, and the tool policy wrapper; one read layer serves both surfaces; smallest new code.

**Cons**: the quiz route and the job gain a branch each; the grounded price lives beside the plain price, which the admin UI must present clearly.

### Option 2: Separate grounded endpoint plus job

A new endpoint and Inngest function own grounded generation end to end, leaving the plain flow untouched.

**Pros**: clean split, no branches in the hot quiz path; plain generation can never regress.

**Cons**: duplicates batching, caching, debit plumbing, and retry behavior; two quiz pipelines to operate; the same input assembly written twice.

### Option 3: Quiz grounding only, chat later

Ship feature 51 now and enroll chat page lookup as its own feature with its own spec.

**Pros**: smallest review; chat design gets its own full interview.

**Cons**: the read layer, owner rule, and pricing get designed twice; the demo story (ask in chat, drill in quiz) stays split across releases.

## Decision

**Chosen option**: Option 1, flag on the existing quiz flow plus a new chat tool.

Grounded generation rides the quiz pipeline with a grounded flag; chat lookup is a new getNotePages tool scoped to the conversation note; both read the spec 0027 tables and both debit student credits from two new tunable prices.

## Rationale

The two surfaces need the same three things (page rows with analyses, owner only reads, per use pricing), so designing them twice would drift. The existing quiz flow already solves the hard parts this spec would otherwise rebuild (15 question batches inside model output caps, cache keyed prompts, one debit row per quiz), and the chat tool pattern already solves policy wrapping and per call debit identity through the web search precedent. A separate pipeline buys isolation at the price of a second copy of all of that, which a small team then operates twice. The engineer confirmed both surfaces in one spec, a grounded flag, an implicit scope tool, and debit only on useful results, which all point at reuse over duplication.

## Feature design

**Data model sketch**:

- `QuizQuestion` (existing) gains `sourcePages Int[] @default([]) @map("source_pages")`: snapshot page numbers, deliberately no foreign key, so a rescan never rewrites old questions.
- `PlatformSettings` (existing) gains `creditCostGroundedQuestion Int @default(5)` and `creditCostPageLookup Int @default(1)`: per grounded question and per useful lookup, tunable in the admin row like every other cost. Defaults match the practice question price (5) and the web search price (1).
- `CreditType` (existing enum) gains `PAGE_LOOKUP`: honest accounting for lookup debits, separate from quiz and tutor spend.
- `Page`, `VisualAnalysis` (spec 0027): read only, no changes.
- No Concept table: concepts stay ephemeral inside the generation call and questions carry the refs; feature 52 can add concepts later.

**State transitions**: none new. Generation reuses quiz GENERATING to READY to ERROR. Page refs are snapshots written once with the question.

**API surface**:

| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| /api/quizzes/generate | POST | existing fields plus grounded:boolean (opt) | quiz, GENERATING | bearer | 402 insufficient credits, 400 note not ready, 404 note not found |
| chat tool getNotePages | tool call | none, implicit from the conversation note | pages with pageNumber, visualType, description, confidence, status; plus scanPending flag when the scan has not run | bearer, conversation owner | tool error when the conversation has no note or a foreign note |
| /api/visual-analysis/[noteId] | GET | existing | existing, unchanged | bearer owner only | unchanged |

**Value sourcing**:

| Action | Value produced / displayed | Source |
|---|---|---|
| Assemble generation input | note text plus per page lines | note.extractedText truncated at MAX_CHARACTERS_FOR_QUIZ_NOTE_CONTEXT; per completed analysis: pageNumber, visualType, confidence, description from VisualAnalysis joined through Page filtered by noteId |
| Choose source pages | sourcePages per question | model output constrained by the grounded prompt to pages present in the input; pages with failed or missing analyses never enter the input |
| Price a grounded quiz | total debit | creditCostGroundedQuestion times resolved question count, plan multiplier applied through getEffectiveCreditCost, one spendCredits row with referenceId quiz.id and type QUIZ_GENERATION |
| Price a lookup | per call debit | creditCostPageLookup, plan multiplier applied, spendCredits inside the tool with type PAGE_LOOKUP and referenceId pagelookup plus the tool call id; only when at least one returned page carries a completed analysis |
| Block when broke | plain message with numbers | getUserCreditBalance compared before the quiz row is created and before a useful lookup is returned; 402 on the route, tool error in chat |
| Degrade without pages | text only quiz, pending tool answer | no Page rows or no completed analyses: generation input is text only; tool returns scanPending true and empty pages, no debit |
| Cite in chat | page numbers in prose | chat system prompt gains one citation line; values come from the tool result, never from model memory |
| Show on the card | page tag per question | quiz detail response already includes questions; the question card reads question.sourcePages |

**Key invariants**:
- A page is cited only when its analysis completed; failed or pending pages never enter generation input or tool output as sources.
- sourcePages are snapshot ints; rescans, deletes, or reanalysis never mutate old questions.
- Every read filters by the note owner; the tool resolves the note from the caller owned conversation, never from a model supplied id.
- One debit row per quiz (referenceId quiz id) and one per useful lookup (referenceId tool call id); retries never double charge.
- Grounded totals scale with question count; a 10 question grounded quiz costs the same as a plain one at defaults.

**Security model**:
- Owner only throughout: quiz generation keeps its existing note ownership check; the tool reads the conversation then the note, both filtered by the caller id; no cross tenant reads.
- The tool takes no note id, so prompt injection cannot steer it to a foreign note.
- No new regulated data; study notes the student already owns.

**Configuration required**: no new env vars. Muse and Baseten keys already exist. New tunables live in PlatformSettings (creditCostGroundedQuestion, creditCostPageLookup) and surface in the admin settings API.

**Critical test scenarios**:
- Happy path: PDF note with one visual page analyzed; grounded quiz stores that page number on its questions and the card shows the tag, verifies AC-1 AC-2.
- Failure case: Muse key missing mid generation; the existing quiz_gen walk falls through to OpenRouter and the quiz still completes, verifies AC-6.
- Auth/permission: tool call on a conversation whose note belongs to someone else; the tool errors and no pages leak, verifies AC-7.
- Money: balance below the grounded total; route answers 402 with required and balance, verifies AC-4. Lookup returning only pending pages; no debit row, verifies AC-4 AC-5.

## Build plan

Tracer Bullet: thin thread first (migration plus prompt plus generation with refs), then the chat tool, then display and admin surface, tests at each landing.

1. Migrate: sourcePages on QuizQuestion, the two cost columns, PAGE_LOOKUP enum value, satisfies AC-2 AC-4.
2. Add prompts/quiz/grounded_from_note.md: excerpt slot plus page description slots, fixed JSON with sourcePages per question, satisfies AC-1.
3. Extend generateQuizFromNote with an optional pages input, append page lines, persist sourcePages with each question, satisfies AC-1 AC-2 AC-6.
4. Add the grounded flag to POST /api/quizzes/generate: grounded cost math, balance check, pass pages and flag into the quiz/generate job, satisfies AC-4 AC-5.
5. Add the getNotePages tool with userScope plus chatInputCap policies, owner scoped reads, pending shape, per useful call debit, plus its prompt description file, satisfies AC-3 AC-4 AC-5 AC-7.
6. Add the page citation line to the chat system prompt, satisfies AC-3.
7. Show the page tag on the quiz question card from question.sourcePages, satisfies AC-2.
8. Expose the two columns in the admin platform settings API and UI, satisfies AC-4.
9. Add tests: input assembly with and without analyses, ref persistence, tool auth and debit identity, 402 path, degrade paths, satisfies all ACs.

## Consequences

**Positive**:
- Questions and chat answers cite real stored pages, which is the demo story the hackathon plan promises.
- Reuse keeps one batching, caching, debit, and policy implementation instead of two.
- Grounded totals match plain quiz cost at defaults for a 10 question quiz, so pricing stays familiar.
- Unanalyzed notes keep working from text, so the scan pipeline is never a blocker.

**Negative / tradeoffs**:
- Longer grounded quizzes cost more than plain ones because the total scales with question count.
- Chat turns that use the tool cost extra beyond the message, which students must learn; the pending shape softens this by never charging for empty answers.
- Tool output grows the turn context whenever a note has many analyzed pages.
- A wrong model cited page number looks authoritative; the prompt constrains citations to returned pages but cannot prove each one.

**Neutral**:
- No new environment variables and no new provider; Muse and Baseten keys already exist.
- The quiz_gen registry task is reused unchanged; cache keys differ naturally because the prompt differs.
- Attempt review does not show refs yet; questions and chat do.

## Follow-up

- [ ] Relies on the spec 0027 pipeline tables and job; 0027 is built but not yet Accepted, keep the two in step.
- [ ] Point feature 51 at this spec and enroll a scope row for chat page lookup pointing here too.
- [ ] Feature 52 retry can add a Concept table later; this spec deliberately leaves concepts ephemeral.
- [ ] Attempt review pages refs are out of scope; questions and chat cite, review does not yet.
