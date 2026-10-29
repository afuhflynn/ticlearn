# Rationale: 0028 page referenced answers

## Context

Quiz generation and chat both needed the same three things: page rows with analyses, owner only reads, and per use pricing. The existing quiz flow already solved batching, caching, and one debit row per quiz. The chat tool pattern already solved policy wrapping and per call debit identity. Designing both surfaces twice would drift, so one spec covers feature 51 and feature 54 together.

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

Chosen option: Option 1, flag on the existing quiz flow plus a new chat tool.

## Rationale

The two surfaces need the same three things (page rows with analyses, owner only reads, per use pricing), so designing them twice would drift. The existing quiz flow already solves the hard parts this spec would otherwise rebuild (15 question batches inside model output caps, cache keyed prompts, one debit row per quiz), and the chat tool pattern already solves policy wrapping and per call debit identity through the web search precedent. A separate pipeline buys isolation at the price of a second copy of all of that, which a small team then operates twice. The engineer confirmed both surfaces in one spec, a grounded flag, an implicit scope tool, and debit only on useful results, which all point at reuse over duplication.
