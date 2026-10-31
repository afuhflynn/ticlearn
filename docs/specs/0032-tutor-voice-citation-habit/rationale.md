# Rationale: 0032 Tutor voice and citation habit

Decision record sections moved out of `index.md` when `verify.md` was added.
Build spec stays in `index.md`. What follows is decision history, not build input.

## Context

Tip teaches inside TiCLearn from notes the student owns, from quiz history, and from web search when the note does not cover the point. The current chat prompt tells Tip to quote before it explains and to say which note and which part it is reading. In long revision chats that rule repeats on every turn, so the lesson reads like a search result with a preamble instead of a teacher talking.

A separate page tag effort already gives Tip a page lookup tool scoped to the conversation note, so real page numbers are available without guessing (basis: docs/specs/0028-page-referenced-answers/index.md). The scope row for this work asks for the teacher voice to stay steady while the trace stops interrupting the lesson, with citations kept short and shown only where proof matters (basis: docs/scope/tutor.md). The risk of doing nothing is that students skim past repeated openers and miss the teaching underneath.

## Options considered

### Option 1: Minimal naming with per claim proof

Tip names the note only when naming helps or when asked, and it chooses a short tag or a short quote per claim based on whether proof matters in that spot. The checking question appears only for vague asks or handover asks.

**Pros**:
1. Matches the engineer's call for a teacher voice that does not announce its sources on every turn.
2. Keeps groundedness because the read still happens, only the writing about the read gets shorter.

**Cons**:
1. Reviewers cannot tell from prose alone whether a silent turn was grounded, so audits must look at tool calls.
2. The model must judge where proof matters, which will vary until examples pin it down.

### Option 2: Name once per topic with tags only

Tip names the note once when a topic starts, then uses only short page tags after that, with no quoted sentences at all.

**Pros**:
1. Simple to check with a script, one naming plus tags.
2. Shortest possible answers on small screens.

**Cons**:
1. A bare tag does not prove a disputed point, so challenges would need a second pass to add the quote.
2. Ignores the engineer's call to let the model choose quote or tag per claim.

### Option 3: Verbose citation every turn

Keep the current quote before you explain rule and extend it to every output, with full note name and part on each answer.

**Pros**:
1. Every answer carries its own trace, easy to audit from prose alone.
2. No prompt change to quiz correction, one rule everywhere by keeping the old rule.

**Cons**:
1. Repeats the preamble problem the scope row asks to fix, so revision chats keep reading like search results.
2. Long answers cost more tokens and more student attention for little gain.

## Rationale

Reasoning and options: see rationale in this file. The Context shows repetition is the harm and real page numbers are already available from the page tool, so the fix is to shorten the writing about sources, not to add new sources. The engineer chose naming only when needed, per claim proof, prompt only change, chat then quiz landing, and sources only references, and each of those points toward Option 1 over the fixed once per topic rule or the verbose rule. Option 1 keeps the read once per topic discipline, which preserves groundedness while letting the prose stay quiet (basis: teach from the note without announcing it, a named practice for tutor prompts).

## References

**Project sources**:
1. `docs/scope/tutor.md`, slice 57 intent and done when for tutor voice and citation habit.
2. `docs/specs/0028-page-referenced-answers/index.md`, page lookup tool and owner scoped reads reused here.
3. `prompts/chat/chat_system.md`, version 13 quote plus name rule revised by this spec.
4. `AGENTS.md`, Tracer Bullet build approach that orders chat first then quiz.

**Practices and standards**:
1. Teach without announcing sources, a tutor prompt practice that keeps the lesson ahead of the trace.
2. Short citations where proof matters, a readability practice for small screens.
3. Read once per topic with reread on shift, a context economy practice that limits repeated tool reads.
