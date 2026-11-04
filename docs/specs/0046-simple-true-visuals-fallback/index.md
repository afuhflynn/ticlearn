# 0046. Simple true visuals with fallback

**Date**: 2026-11-04
**Status**: In Progress

## Summary

You already draw small diagrams in chat and this spec locks what good looks like. You may keep the art as clean line art with plain labels so a light ray stays readable on a small phone. You may keep short teaching steps beside the art so the answer still teaches when a draw fails. A failed draw may show a calm notice plus a retry and never a dead card.

## Requirements

**User stories**:
- As a student, I want a science sketch to read clearly at a glance so that I grasp the idea without zooming or guessing.
- As a student, I want short steps beside the visual so that I learn the idea even when the draw fails.
- As a student, I want a failed draw to explain plainly and offer a retry so that I never face a dead card.

**Acceptance criteria**:
- **AC-1**: A light ray or similar ask shows a readable visual with plain labels and clean strokes with no fills or shadows that harm reading.
- **AC-2**: Text steps sit beside the visual where room allows and stack below it on a narrow phone with no squeeze or overlap.
- **AC-3**: A failed draw shows a plain notice plus a manual retry while numbered steps stay on screen so teaching continues.
- **AC-4**: A bad payload or an over size payload reads as a failed draw with the same notice plus retry and no raw markup reaches you.
- **AC-5**: Every successful draw carries one plain alt text sentence (a short description for screen readers) plus one short caption.
- **AC-6**: The activity line reads with the human draw label while building and the plain failure sentence when it fails.
- **AC-7**: While building, the art slot shows a shape matched skeleton and the answer text may stream beside it with no spinner anywhere.

## Decision

**Chosen option**: Option 1: Polish in place on the current art path

You may polish the current path in place and leave the two format paths plus the read plus retry wiring untouched.

## Feature design

**Data model sketch**:
No model change. You may reuse VisualArtifact rows for drawn art (fields id plus owner plus note or answer link plus format plus payload plus alt text plus caption plus created time, rows stay immutable after create). You may reuse Page scan rows for page figures through the unified read (derived per page with page number plus image plus alt text, capped per note). Retry taps stay in browser session storage per message thread with a max of two taps and no server column.

**State transitions**:
Draw states stay as they run today: idle then building then ready or failed or capped. Building shows the skeleton. Ready shows art plus caption plus steps. Failed shows notice plus retry plus steps. Capped shows the limit notice plus steps with no retry control. Reload keeps the saved message parts and any successful redraw beside history since message parts stay immutable once stored.

**API surface**:
| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| /api/artifacts/generate | POST | noteId plus concept, or answerId for quiz linked draws | artifact id, format, payload, altText, caption, textSteps | bearer owner | 401 no session, 400 bad input, 404 foreign id, 429 cap reached |
| /api/artifacts | GET | noteId or answerId query | scans plus drawn rows in page order | bearer owner | 401 no session, 400 bad query, 404 foreign id |

No new routes. You may keep retry as a repost to the same generate route and page figures as a refetch of the same read.

**Value sourcing**:
| Action | Value produced or displayed | Source |
|---|---|---|
| Draw call | format plus payload | model output through the explain and draw prompt, mermaid for flows and charts, svg for free form physics |
| Draw call | altText plus caption plus textSteps | model output, server trims, whitespace only counts as empty |
| Art slot | readable line art | ArtCard render from artifact row, thin strokes plus plain labels, no script plus no event handlers plus no foreign objects |
| Art slot beside text | steps beside art on wide screens, stacked on phones | layout in chat art wrapper plus answer text, art above steps on narrow widths |
| Failed draw | plain notice plus retry plus steps | draw output with ok false, concept from tool input for the retry call, steps from model output |
| Bad payload | same notice plus retry, no raw markup | server and client validation of format plus payload size plus parse check |
| Activity line | human draw label plus failure sentence | activity label map for drawVisual and drawDiagram |
| While building | skeleton in art slot, streaming text beside | ArtSkeleton plus streamed answer text |
| Caps | daily draw limit message | server cap check at three per idea per day |

**Key invariants**:
- Labels stay plain text, never code or links or page claims inside the payload.
- Svg carries no script plus no handlers plus no foreign objects, mermaid stays parseable to the allowed diagram kinds.
- Text steps never invent page numbers, page cites live in answer text only.
- A failed draw never blocks the answer, steps stay on screen in every failure path.
- No spinner acts as a loading state, the skeleton plus streamed text carry the wait.

**Security model**:
Owner only. You may trigger and read art for notes and conversations you own. Foreign ids read as not found with no data leak. The server validates ownership before any model call and checks the daily cap before spend. Sanitized vector art is stored, raw scripts never persist.

**Configuration required**:
No new env vars. You may reuse the current model key plus the current cap settings.

**Critical test scenarios**:
- Happy path: a light ray ask draws clean line art with alt text plus caption plus three steps beside it, verifies **AC-1**, **AC-2**, **AC-5**
- Failure case: the model returns a broken payload or the call errors, the slot shows notice plus retry with steps intact and no raw markup, verifies **AC-3**, **AC-4**
- Auth or permission: a foreign note id returns not found with no art, verifies Security model
- Loading and activity: while building the slot shows a skeleton with streamed text and the activity line shows the draw label, verifies **AC-6**, **AC-7**

## Build plan

1. You may tighten the draw prompt to line art first with plain labels plus required alt text plus caption plus three steps, satisfies **AC-1**, **AC-5**
2. You may adjust the art card style to thin strokes with no fills or shadows and confirm mermaid plus svg both render in that look, satisfies **AC-1**
3. You may lay out steps beside art on wide screens and stacked below on narrow phones with no overlap, satisfies **AC-2**
4. You may unify the failed draw plus bad payload plus capped paths to the calm notice plus retry plus steps pattern with no dead card, satisfies **AC-3**, **AC-4**
5. You may keep the activity labels for building plus failure as they read today and confirm the silent tool names stay out of the answer, satisfies **AC-6**
6. You may wire the skeleton plus streamed text wait state with no spinner and honor reduced motion, satisfies **AC-7**

## Consequences

**Positive**:
- Science asks read faster with art you can trust on a small screen.
- Every failure still teaches because steps stay beside the notice.
- No new tables plus no new routes plus no new keys to operate.

**Negative or tradeoffs**:
- Line art first feels plainer than rich color, which some students may call less fun.
- Keeping two format paths keeps two renderers to own instead of one.
- Browser only retry memory means a reload resets the tap count, which you accept to avoid server state.

## Follow-up

- [ ] You may confirm the approved line art look against one light ray shot plus one flow shot before you close this out.
