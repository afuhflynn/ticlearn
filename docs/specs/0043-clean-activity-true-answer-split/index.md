# 0043. Clean activity true answer split

**Date**: 2026-11-02
**Status**: In Progress

## Summary

Tip shows one small activity line while it works and one clean final answer when it lands. All tool work and progress talk stays inside the expandable line. The final text starts below it with no repeats, so inner chatter never leaks to the student. This covers the thread only and adds no new quiz logic.

## Requirements

**User stories**:
- As a student, I want one activity line while Tip works so that I see progress without noise.
- As a student, I want the final answer to start clean below the activity so that I read teaching once.
- As a student, I want to tap the activity line to see steps and sources so that I can check the work when I care.

**Acceptance criteria** (the contract):
- **AC-1**: While streaming, the thread shows exactly one activity line above the final text, with a human label and elapsed time, and it expands on tap into ordered steps plus sources.
- **AC-2**: All tool calls, reasoning notes, and progress sentences render inside the activity line only and never as answer text.
- **AC-3**: The final answer streams below the activity line while work continues and settles into one clean block with no repeated setup or progress sentences.
- **AC-4**: The collapsed line reuses the existing human label map, shows counts where useful such as searched sources read, and shows Working only for an unlabeled tool while logging the tool name server side.
- **AC-5**: The suggest replies tool never appears as a step, and suggestion chips appear only under the newest answer for the live turn.
- **AC-6**: On stop, the thread keeps partial answer text plus a plain stopped note with a retry action and drops no finished content.
- **AC-7**: A failed step shows as a plain sentence inside the expanded list with technical detail collapsed, and the final answer still lands where it should.
- **AC-8**: Quiz runner and visual cards sit below the clean text as the answer body owns them, and reload of a saved thread shows collapsed activity plus saved answer with no duplication.

## Decision

**Chosen option**: Option 1: Strict split in the thread renderer

The thread owns one activity line plus one answer body and enforces which part goes where.

## Feature design

**Data model sketch**:
No schema change. This is render only from streamed message parts already saved on the chat message. Entities touched in memory only: activity steps derived from tool parts, sources derived from source parts, answer text derived from text parts. Nullability and relations unchanged.

**State transitions**:
Streaming answer: activity visible plus answer streaming below it, then activity settles to a thought for time line plus final answer static. Stopped: partial answer kept plus stopped note. Failed step: expanded list shows plain note, answer still completes. Reload: collapsed activity plus saved answer.

**API surface**:

| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| No new endpoint | None | None | None | Session on existing chat route | None |

The existing chat route keeps sending typed parts. No input or output shape changes.

**Value sourcing** (every value each action produces names where it comes from):

| Action | Value produced / displayed | Source |
|---|---|---|
| Render activity line | Collapsed label such as Searching the web | Derived from tool parts through `lib/chat/activity-labels.ts` |
| Render activity line | Elapsed time such as Worked for 55s | Derived from stream start time on the client |
| Expand activity | Ordered steps plus source list plus failed note | Derived from tool parts plus source parts in stream order |
| Render answer | Clean teaching text | Derived from text parts only, filtered for echoed build sentences |
| Render cards | Quiz runner or visual below text | Derived from existing card parts, placed after text |
| Reload thread | Collapsed activity plus saved answer | Derived from saved message parts through existing normalize helpers |

**Key invariants**:
- Exactly one activity line per assistant message while streaming.
- The clock starts at submit, ticks each second, and settles to Thought for Ns when the stream ends.
- When two tools overlap, the last active label wins in the collapsed line and steps order by start time.
- No tool name, plan sentence, or searched count appears in answer text.
- Echo filter uses a small known sentence list such as I will, Let me, I am going to, Searching, Reading, Checking, matched case insensitive as substring, placed in MessageBody before render. Reasoning parts go to activity, never to answer.
- Counts read as searched equals webSearch calls, read equals readPage calls, sources equals saved source parts.
- Suggest replies never render as an activity step.
- Newest means the last assistant message of the live turn, fed from live suggestions on finish and cleared on send.
- Unknown tool shows Working in UI and logs the real name server side through the existing unknown tool log.
- On stop, in flight steps drop, complete cards stay, retry regenerates the last answer.
- On fail, the expanded list shows a plain note such as a source did not load with the tool name plus error code inside the existing disclosure, and the answer stays clean with at most one short note.
- Cards order as text then quiz then visual and never render inside the activity line.
- On reload, parts rebuild through the stored parts normalizer, activity defaults collapsed, and if the filter would leave the answer empty the thread shows a short fallback line plus expanded activity instead of a blank.

**Security model**:
No change. The student sees only their own thread. No new PII, no new role, no compliance scope.

**Configuration required**:
None. No new env vars or credentials.

**Critical test scenarios** (each maps to an acceptance criterion in ## Requirements):
- Happy path: long web answer streams one line plus clean text with no repeat, verifies **AC-1**, **AC-2**, **AC-3**
- Failure case: one read fails mid run, expanded list shows plain note and answer still lands, verifies **AC-7**
- Auth/permission: student opens another student's thread id and receives not found, verifies existing thread scoping, related to **AC-8**
- Stop case: student stops mid stream, partial text kept plus stopped note with retry, verifies **AC-6**
- Reload case: reload shows collapsed activity plus saved answer once, verifies **AC-8**

## Build plan

Ordered through Tracer Bullet, thin thread first through every layer then thicken. Each slice works end to end before the next starts.

1. Single activity owner in `chat-message-list.tsx` plus `activity-block.tsx`: guarantee one line per assistant message, activity above text, expand on tap, satisfies **AC-1**
2. Part router plus echo filter: text parts to answer only, tool plus source plus plan sentences to activity only, strict no repeat filter on answer text, satisfies **AC-2**, **AC-3**
3. Label polish in `lib/chat/activity-labels.ts`: reuse map, add counts, Working fallback plus server log for unknown tool, keep suggest replies silent, satisfies **AC-4**, **AC-5**
4. Stop plus fail plus cards plus reload: keep partial with stopped note, plain failed note inside expanded list, cards below text, collapsed plus saved on reload, satisfies **AC-6**, **AC-7**, **AC-8**

## Consequences

**Positive**:
- Thread reads calm on a phone, one line while working and one teaching block after.
- No repeat means shorter answers and less confusion during revision.
- Reload and stop behave the same as live, so trust holds across sessions.

**Negative / tradeoffs**:
- A strict echo filter can strip a sentence the model meant as teaching if the wording matches a progress pattern, so patterns need care plus tests.
- One line hides useful detail by default, so students who never tap see less about sources.

**Neutral**:
- Prompt and transport unchanged, so no migration and no new ops.

## Follow-up

- [ ] Add scope row subtasks for feature 64 pointing to this spec, so the build tracks AC by AC.
- [ ] Confirm the echo filter patterns against real long runs after the first slice, to avoid stripping true teaching.
