# 0032. Tutor voice and citation habit

**Date**: 31 Oct 2026
**Status**: In Progress

## Summary

Tip will read like a calm teacher in every answer it writes (grounded means tied to the note it read). It will name a note only when naming helps the lesson or when the student asks for the source, and it will show proof as a short page tag or a short quote only where proof matters. This spec revises the chat prompt first and the quiz correction voice second, so each can be read on its own.

## Requirements

**User stories**:
1. As a student revising from my note, I want Tip to teach without repeating the note opener, so I can follow the idea.
2. As a student who doubts a point, I want a short page tag or quote where it matters, so I can check it.
3. As a student with a thin note, I want Tip to say what is missing and offer practice, so I am not taught from invented proof.

**Acceptance criteria**:
1. **AC-1**: In a revision chat on one topic, Tip names the note title at most once unless the student asks for the source or the topic changes, and later turns carry no from your notes preamble. On a fresh chat the landing already says hello, so the first model answer carries at most one short intro and no second hello, and later answers carry no greeting unless asked.
2. **AC-2**: Proof appears only where it matters, as a short page tag in the form (p 3) or a single short quoted sentence with its tag, never a repeated full quote of the same passage across turns.
3. **AC-3**: Tip asks a checking question only when the request is vague or asks for a finished answer to be handed over, otherwise it teaches first and checks at the close.
4. **AC-4**: On a grounded turn Tip reads the conversation note through the available note tools once per topic and teaches from that reading across turns, rereading only when the topic shifts. A shift means the student names a different chapter, note section, or past question.
5. **AC-5**: When the note has no useful text or pages for the question, Tip says what is missing in plain words, names no page tag or quote, and offers practice or a related note instead.
6. **AC-6**: The same voice and proof habit apply in chat answers and in quiz correction and practice prompts inside chat, with no separate verbose style in either place.
7. **AC-7**: A sample revision chat of at least six turns reads clean, with at most one note naming, no banned preamble phrase, and no duplicate quote of the same passage.

## Decision

**Chosen option**: Option 1: Minimal naming with per claim proof

Tip names the note only when needed or asked, chooses tag or quote per claim, asks the checking question only for vague or handover asks, and uses the same habit in chat and in quiz correction (basis: docs/scope/tutor.md, the minimal trace ask).

## Feature design

**Data model sketch**:
1. No new entities and no migration. The prompt text in `prompts/chat/chat_system.md` and the quiz practice prompt path in `prompts/chat/chat_system.md` carry the change. Tool tables from spec 0028 stay read only.

**State transitions**:
1. None. No new lifecycle and no new flags. The prompt version moves from 13 to 14 in one edit per slice.

**API surface**:
1. No endpoint change. Chat route `app/api/ai/chat/route.ts` and quiz practice routes keep their inputs and outputs. The change is system prompt wording plus validator wording for correction text.

**Value sourcing**:
1. Note title shown at most once: source is the conversation note record resolved by owner, same source the chat route already loads.
2. Page tag (p 3): source is the `getNotePages` tool result for the conversation note, never model memory.
3. Short quote: source is note extracted text or attachment text already in context, quoted once and not repeated.
4. Checking question: source is the vagueness of the student ask as judged in the prompt, no new input.
5. Practice offer on thin evidence: source is the empty or pending tool result plus the quiz tool the prompt already owns.

**Key invariants**:
1. Never invent a page tag or quote. If the tool returns pending or empty, Tip says what is missing.
2. Never repeat the same quoted passage across turns on one topic. Cite again with a tag if needed, not a second full quote.
3. Never name a page number from memory. Page numbers come only from `getNotePages`.
4. The same habit governs chat and quiz correction. Neither surface uses the old preamble.
5. The landing owns the hello. When `components/chat/chat-landing.tsx` already greeted, the model answer carries no greeting. The first model answer carries at most one short intro, later answers carry none unless asked.

**Security model**:
1. Owner only reads stay as today. The prompt change adds no new data access and no new regulated data. Note scoping and tool policies from spec 0028 remain in force (basis: docs/specs/0028-page-referenced-answers/index.md).

**Configuration required**:
1. None. No new env vars and no new platform settings. Prompt version bump only.

**Critical test scenarios**:
1. Happy path: six turn revision chat on one topic, names the note once, later turns use short tags where proof matters, verifies **AC-1** and **AC-2**.
2. Failure case: note with no useful text, Tip states the gap, shows no tag, offers practice, verifies **AC-5**.
3. Auth and permission: conversation with a foreign note, no pages leak and no citation is invented, verifies **AC-4** and **AC-5**.
4. Voice parity: quiz correction for the same note uses short tags and no preamble, verifies **AC-6**.
5. Checking discipline: vague ask gets one scoping question, clear ask gets teaching first, verifies **AC-3**.

## Build plan

Ordered by the Tracer Bullet approach in `AGENTS.md`, thin thread first, then the second surface. Each task names the AC it satisfies.

1. Revise `prompts/chat/chat_system.md` to version 14 for chat: minimal naming rule, per claim tag or quote rule, checking question only when vague or handover, thin evidence pivot to practice, satisfies **AC-1**, **AC-2**, **AC-3**, **AC-5**.
2. Add prompt examples and validator wording for short tags and single quotes in `prompts/chat/voice_examples.md`, plus the banned preamble list in the same file used by tests, satisfies **AC-2**, **AC-7**.
3. Add tests for chat voice: sample threads assert at most one naming, no banned preamble, no duplicate quote, tags only from tool pages, satisfies **AC-1**, **AC-2**, **AC-4**, **AC-7**.
4. Extend the same habit to quiz correction and practice prompts inside chat, with one shared wording block that lives in `prompts/chat/chat_system.md` and is reused by quiz correction, satisfies **AC-6**.
5. Add tests for quiz correction parity and thin evidence pivot, including pending tool result with no debit of invented proof, satisfies **AC-5**, **AC-6**.
6. Run lint and format and the full test suite, satisfies all ACs.

## Consequences

**Positive**:
1. Revision chats read like a teacher talking, with proof kept short and shown where it helps.
2. No schema or endpoint change, so rollout is a prompt version bump that is easy to revert.
3. Consistent voice in chat and quiz correction, so practice inside chat feels like one tutor.

**Negative and tradeoffs**:
1. Silent turns hide their groundedness from prose, so audits must read tool calls instead of answers alone.
2. Per claim judgment will vary across models until examples and tests pin the boundary.
3. Two slices mean quiz correction lags chat by one landing, so voice differs briefly during rollout.

**Neutral**:
1. Page tool, debit rules, and credit prices stay as spec 0028 defined them. This spec changes wording only.
2. Prompt cache span stays a week. Version 14 naturally busts the cached version 13 text.

## Follow-up

1. [ ] Enroll scope row 57 in `docs/scope/tutor.md` with spec link `../specs/0032-tutor-voice-citation-habit/index.md` once confirmed.
2. [ ] Revisit the banned preamble list after ten real revision chats, add any new repeat phrasing found.
3. [ ] Consider a lightweight audit that joins tool calls to answers to show groundedness on silent turns, if reviewers miss prose trace.
