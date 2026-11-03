# Rationale: 0043 Clean activity true answer split

## Context

The chat thread already collapses tool work into an activity block with human labels, and it already streams a final text answer below it. In practice two faults remain. Build narration repeats inside the final text, so the student reads the plan twice, once as gray progress and once as answer prose. Multiple activity rows also stack or flicker during a long run, so the thread feels noisy instead of calm.

The reference shots point to the fix. One shot shows a single summary line that expands into ordered step rows with a failed marker where a read fails, then a clean answer that starts with the result. The other shots show a worked for time line that expands into plan sentences and searched counts, then a clean assessment that never repeats the plan. The student should see the same shape in Tip. One line while building, tap to see detail, then one answer that teaches.

The forces are trust and thumb reach. A student on a phone must see progress in seconds and must trust that the answer below is the teaching, not a log. Reload must show the same split from saved parts. A stopped stream must keep partial teaching plus a plain stopped note. A failed step must read as a plain sentence inside the expanded list, never as a red block in the answer.

## Options considered

### Option 1: Strict split in the thread renderer

Keep the stream as is and enforce the split where parts become UI. Text parts go to the answer only. Tool parts, source parts, and plan sentences go to activity only. A small filter drops any echoed build sentence from answer text.

**Pros**:
- Small blast radius, no stream or prompt change.
- Fixes both leak and stacking at the place the student sees.

**Cons**:
- A model sentence that mixes teaching with progress still needs a rule to place it.

### Option 2: Prompt only fix

Rewrite the chat prompt to forbid progress talk in the final text and trust the model to obey.

**Pros**:
- No UI code change.

**Cons**:
- The model drifts under load, so the leak returns on long runs with no guard in the renderer.

### Option 3: Separate activity channel

Move activity to a second stream or event feed apart from the message parts.

**Pros**:
- Clean separation at the transport layer.

**Cons**:
- New plumbing for Inngest plus route plus client state, with reload and stop edge cases to rebuild.

## Rationale

The fault lives in rendering, not in transport. The stream already carries typed parts for text, tools, and sources (basis: your AGENTS.md, the AI SDK stream boundary). The prompt already asks for clean teaching and silent suggestion calls, yet long runs still echo the plan into text. A renderer rule is the only place that holds on every run. The prompt stays as guidance, the transport stays as is, and the UI guarantees the split the references describe (basis: progressive disclosure, one summary now with detail on demand). Failure stays quiet and plain for the same reason (basis: error message guidelines, plain visible notice that preserves effort).

## References

**Project sources** (verifiable, in this repo):
- `AGENTS.md`, chat plus Inngest plus loading rules that shape this slice
- `docs/scope/tutor.md`, feature 64 intent plus the done when line
- Spec 0020, activity line with human labels plus silent suggest replies
- `lib/chat/activity-labels.ts`, the label map plus fallback that this spec reuses
- `components/chat/activity-block.tsx` plus `components/chat/chat-message-list.tsx`, the current split owners

**Practices & standards**:
- Progressive disclosure, summary now with detail on demand
- Error message guidelines, plain visible notice that preserves effort

**Links** (web verified only):
- Chatbot Tool Usage: https://ai-sdk.dev/docs/ai-sdk-ui/chatbot-tool-usage
- Progressive Disclosure, Nielsen Norman Group: https://www.nngroup.com/articles/progressive-disclosure/
- Error-Message Guidelines, Nielsen Norman Group: https://www.nngroup.com/articles/error-message-guidelines/
